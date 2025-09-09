require('dotenv').config();
const { MongoClient } = require('mongodb')
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const { generateText, transcribeAudio, translateText, summarizeText } = require('./hf');
const app = express();
const port = 3001;

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

// File upload and conversion configuration
app.post('/api/upload', upload.single('audio'), async (req, res) => {
  // Validate file presence
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded or invalid file type' });
  } 
  const inputPath = req.file.path;
  let outputPath = path.join('uploads', `${req.file.filename}.wav`);
  const selectedLanguages = req.body.languages ? req.body.languages.split(',') : ['es', 'fr', 'ru', 'zh'];

  try {
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

  // Optional: Summarize transcription
  const summary = await summarizeText(transcription);

  // Optional: Translate transcription
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
    translations,
    fileName: req.file.originalname,
    timestamp: new Date()
  });
  // Clean up uploaded files
  await fs.unlink(inputPath);
  if(req.file.mimetype === 'video/mp4') {
    await fs.unlink(outputPath);
  }
  res.json({message: 'File processed and stored', transcription, meetingID, summary, translations});
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

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});