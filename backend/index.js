require('dotenv').config();
const { MongoClient } = require('mongodb')
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const PDFDocument = require('pdfkit');
const { generateText, transcribeAudio, translateText, summarizeText, generateStructuredNotes } = require('./hf');
const app = express();
const port = 3001;

const { meetingQueue, worker } = require('./queue');
const storage = require('./storage');
const { SlackProvider, JiraProvider } = require('./services/integrations');
const brain = require('./services/brain');
const billing = require('./services/billing');
const cache = new Map();

const axios = require("axios");

const fs = require('fs').promises;

//configure multer with file type validation
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'video/mp4', 'audio/webm'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only audio and video files are allowed.'));
      }
  },
  limits: { fileSize: 100 * 1024 * 1024 } // limit file size to 100MB
});

app.use(cors());
app.use(express.json());

// MongoDB configuration
const uri = process.env.MONGODB_URI
const client = new MongoClient(uri, {
  ssl: true,
});

// AI Text Generation configuration
app.post('/api/generate', async (req, res) => {
  try {
    const response = await axios.post(
      "https://router.huggingface.co/v1/chat/completions",
      {
        model: "openai/gpt-oss-20b:fireworks-ai", 
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: req.body.prompt || "Test Converto" }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({ generated: response.data.choices[0].message.content });
  } catch (error) {
    if (error.response) {
      res
        .status(error.response.status)
        .json({ error: error.response.data });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// File upload and processing endpoint
app.post('/api/upload', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded or invalid file type' });
  }

  const meetingID = `meeting_${Date.now()}`;
  const selectedLanguages = req.body.languages ? req.body.languages.split(',') : ['es', 'fr', 'ru', 'zh'];

  try {
    // Trigger background job
    const job = await meetingQueue.add('process-meeting', {
      inputPath: req.file.path,
      filename: req.file.filename,
      fileName: req.file.originalname,
      mimetype: req.file.mimetype,
      selectedLanguages,
      meetingID,
    });

    res.json({ 
      message: 'File uploaded and processing started', 
      jobId: job.id, 
      meetingID 
    });
  } catch (e) {
    res.status(500).json({ message: 'Error queuing file - ' + e.message });
  }
});

// Execution endpoint to push tasks/decisions to external tools
app.post('/api/execute', async (req, res) => {
  try {
    const { provider, type, content, config, userId } = req.body;

    if (!provider || !type || !content || !userId) {
      return res.status(400).json({ message: 'Missing provider, type, content, or userId' });
    }

    const userTier = await billing.getUserTier(userId);
    if (!billing.checkEntitlement(userTier, 'hasAgenticExecution')) {
      return res.status(403).json({ message: 'This feature requires a PRO or SOVEREIGN plan' });
    }

    let service;
    if (provider === 'slack') {
      service = new SlackProvider(config.token, config.channelId);
    } else if (provider === 'jira') {
      service = new JiraProvider(config.domain, config.email, config.token);
    } else {
      return res.status(400).json({ message: 'Unsupported provider' });
    }

    const result = type === 'task' 
      ? await service.pushTask(content) 
      : await service.pushDecision(content);

    res.json({ message: 'Successfully pushed to ' + provider, result });
  } catch (e) {
    res.status(500).json({ message: 'Execution failed - ' + e.message });
  }
});

// Institutional Memory query endpoint
app.post('/api/query', async (req, res) => {
  try {
    const { question, userId } = req.body;
    if (!question || !userId) return res.status(400).json({ message: 'Question and userId are required' });

    const userTier = await billing.getUserTier(userId);
    if (!billing.checkEntitlement(userTier, 'hasRAG')) {
      return res.status(403).json({ message: 'Institutional Memory requires a PRO or SOVEREIGN plan' });
    }

    const { context } = await brain.query(question);
    
    const prompt = \`You are the Institutional Memory Brain of Converto. 
Using the following snippets from past meetings, answer the user's question accurately. 
If the answer isn't in the context, say you don't know.

Context:
\${context}

Question: \${question}\`;

    const response = await axios.post(
      "https://router.huggingface.co/v1/chat/completions",
      {
        model: "openai/gpt-oss-20b:fireworks-ai", 
        messages: [{ role: "user", content: prompt }]
      },
      {
        headers: { Authorization: \`Bearer \${process.env.HUGGINGFACE_API_KEY}\` }
      }
    );

    res.json({ answer: response.data.choices[0].message.content });
  } catch (e) {
    res.status(500).json({ message: 'Query failed - ' + e.message });
  }
});

// Transcript retrieval endpoint
app.get('/api/transcripts', async(req, res) => {
  try {
    await client.connect();
    const database = client.db('converto');
    const transcripts = await database.collection('transcripts').find({}).toArray();
    res.json({transcripts});
  } catch (e) {
    res.status(500).json({ message: 'Error fetching transcripts - '+ e.message });
  }
});

// PDF generation endpoint
app.get('/api/download/:meetingID', async(req, res) => {
  try {
    await client.connect();
    const database = client.db('converto');
    const { meetingID } = req.params;
    const doc = await database.collection('transcripts').findOne({ meetingID });

    if (!doc) {
      res.status(404).json({ message: 'Meeting not found' });
    }

    const pdfDoc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', \`attachment; filename=\${meetingID}.pdf\`);
    pdfDoc.pipe(res);

    pdfDoc.font('Helvetica-Bold').fontSize(16).fillColor('navy').text(\`Converto - Meeting Notes (ID: \${meetingID})\`, { align: 'center' });
    pdfDoc.moveDown();
    pdfDoc.font('Helvetica').fontSize(12).fillColor('black').text(\`Date: \${new Date(doc.timestamp).toLocaleString()}\`);
    pdfDoc.text(\`File: \${doc.fileName}\`);
    pdfDoc.moveDown();

    pdfDoc.font('Helvetica').fontSize(14).text('Transcript');
    pdfDoc.font('Helvetica').fontSize(12).text(doc.transcription, { align: 'justify' });
    pdfDoc.moveDown();

    if (doc.summary) {
      pdfDoc.font('Helvetica').fontSize(14).text('Summary');
      pdfDoc.font('Helvetica').fontSize(12).text(doc.summary, { align: 'justify' });
      pdfDoc.moveDown();
    }

    if (doc.structuredNotes) {
      pdfDoc.font('Helvetica').fontSize(14).text('Structured Notes');
      if (doc.structuredNotes.decisions) {
        pdfDoc.font('Helvetica').fontSize(12).text('Decisions:');
        doc.structuredNotes.decisions.forEach(d => {
          pdfDoc.text(\`-  \${d}\`);
        });
      }
      if (doc.structuredNotes.tasks) {
        pdfDoc.font('Helvetica').fontSize(12).text('Tasks:');
        doc.structuredNotes.tasks.forEach(t => {
          pdfDoc.text(\`-  \${t}\`);
        });
      }
      if (doc.structuredNotes.deadlines) {
        pdfDoc.font('Helvetica').fontSize(12).text('Deadlines:');
        doc.structuredNotes.deadlines.forEach(d => {
          pdfDoc.text(\`-  \${d}\`);
        });
      }
      pdfDoc.moveDown();
    }

    if (doc.translations) {
      pdfDoc.font('Helvetica').fontSize(14).text('Translations');
      Object.entries(doc.translations).forEach(([lang, text]) => {
        const langName = { 'es': 'Spanish', 'fr': 'French', 'ru': 'Russian', 'zh': 'Chinese' }[lang] || lang;
        pdfDoc.font('Helvetica').fontSize(12).text(\`\${langName}:\`);
        pdfDoc.text(text, { align: 'justify' });
      });
    }
    pdfDoc.end();
  } catch (e) {
    res.status(500).json({ message: 'Error generating PDF - '+ e.message });
  }
})

app.listen(port, () => {
    console.log(\`Server running at http://localhost:\${port}\`);
});
