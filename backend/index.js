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

  // Validate file presence
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded or invalid file type' });
  } 
  const inputPath = req.file.path;
  let outputPath = path.join('uploads', `${req.file.filename}.wav`);
  const selectedLanguages = req.body.languages ? req.body.languages.split(',') : ['es', 'fr', 'ru', 'zh'];
  const cacheKey = `${req.file.originalname}_${selectedLanguages.join(',')}`;

  // Check cache
  try {
    if (cache.has(cacheKey)) {
      const cachedData = cache.get(cacheKey);
      return res.json(cachedData);
    }    
    // Convert video to audio if needed
    if (req.file.mimetype === 'video/mp4') {
      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
        .output(outputPath)
        .audioCodec('pcm_s16le')
        .withAudioChannels(1)
        .withAudioFrequency(16000) //Whisper requires 16kHz audio
        .on('end', resolve)
        .on('error', reject)
        .run();
      });
  } else {
    outputPath = inputPath; //Use original file for .mp3/.wav
  }
  // Transcribe audio
  const transcription = await transcribeAudio(outputPath);

  // Summarize transcription
  const summary = await summarizeText(transcription);

  // Generate structured notes
  const structuredNotes = await generateStructuredNotes(transcription); // it should be summary not transcription. this is for testing purpose only 

  // Translate transcription
  const translations = {};
  for (const lang of selectedLanguages) {
    translations[lang] = await translateText(transcription, lang);
  }

  // Store transcription in MongoDB
  await client.connect();
  const database = client.db('converto');
  const meetingID = `meeting_${Date.now()}`;
  await database.collection('transcripts').createIndex({ meetingID: 1 });
  await database.collection('transcripts').insertOne({
    meetingID,
    transcription,
    summary,
    structuredNotes,
    translations,
    fileName: req.file.originalname,
    timestamp: new Date()
  });

  // Clean up uploaded files
  await fs.unlink(inputPath);
  if(req.file.mimetype === 'video/mp4') {
    await fs.unlink(outputPath);
  }
  const response = {message: 'File processed and stored', meetingID, transcription, summary, translations, structuredNotes };
  cache.set(cacheKey, response);
  res.json(response);
  } catch (e) {
    res.status(500).json({ message: 'Error processing file - '+ e.message });
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

    // Create PDF
    const pdfDoc = new PDFDocument();

    // Register font
    // const fontPath = path.join(__dirname, 'fonts', 'NotoSansCJK-Regular.ttc'); 
    // pdfDoc.registerFont('Noto', fontPath);
    // pdfDoc.font('Noto');

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${meetingID}.pdf`);
    pdfDoc.pipe(res);

    // Header
    pdfDoc.fontSize(16).text(`Converto - Meeting Notes (ID: ${meetingID})`, { align: 'center' });
    pdfDoc.moveDown();
    pdfDoc.fontSize(12).text(`Date: ${new Date(doc.timestamp).toLocaleString()}`);
    pdfDoc.text(`File: ${doc.fileName}`);
    pdfDoc.moveDown();

    // Transcript
    pdfDoc.fontSize(14).text('Transcript');
    pdfDoc.fontSize(12).text(doc.transcription);
    pdfDoc.moveDown();

    // Summary
    if (doc.summary) {
      pdfDoc.fontSize(14).text('Summary');
      pdfDoc.fontSize(12).text(doc.summary);
      pdfDoc.moveDown();
    }

    // Structured Notes
    if (doc.structuredNotes) {
      pdfDoc.fontSize(14).text('Structured Notes');
      if (doc.structuredNotes.decisions) {
        pdfDoc.fontSize(12).text('Decisions:');
        doc.structuredNotes.decisions.forEach(d => {
          pdfDoc.text(`-  ${d}`);
        });
      }
      if (doc.structuredNotes.tasks) {
        pdfDoc.fontSize(12).text('Tasks:');
        doc.structuredNotes.tasks.forEach(t => {
          pdfDoc.text(`-  ${t}`);
        });
      }
      if (doc.structuredNotes.deadlines) {
        pdfDoc.fontSize(12).text('Deadlines:');
        doc.structuredNotes.deadlines.forEach(d => {
          pdfDoc.text(`-  ${d}`);
        });
      }
      pdfDoc.moveDown();
    }

    // Translations
    if (doc.translations) {
      pdfDoc.fontSize(14).text('Translations');
      Object.entries(doc.translations).forEach(([lang, text]) => {
        pdfDoc.fontSize(12).text(`${
          lang === 'es' ? 'Spanish' :
          lang === 'fr' ? 'French' :
          lang === 'ru' ? 'Russian' :
          lang === 'zh' ? 'Chinese' : lang
        }:`);
        pdfDoc.text(text);
      });
      }
    pdfDoc.end();
  } catch (e) {
    res.status(500).json({ message: 'Error generating PDF - '+ e.message });
  }
})
// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});