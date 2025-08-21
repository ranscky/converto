require('dotenv').config();

const express = require('express');
const app = express();
const port = 3001;
const cors = require('cors');
const { MongoClient } = require('mongodb')
const { generateText } = require('./hf');
const axios = require("axios");
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

//configure multer with file type validation
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'video/mp4'];
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
const uri = process.env.MONGODB_URI
const client = new MongoClient(uri);

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
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded or invalid file type' });
  } 
  const inputPath = req.file.path;
  const outputPath = path.join('uploads', `${req.file.filename}.wav`);

  if (req.file.mimetype === 'video/mp4') {
    try {
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
      res.json({ message: 'File uploaded and converted successfully', filePath: outputPath });
    } catch (e) {
      res.status(500).json({ message: 'Error processing video file' + e.message });
    }
  } else {
    // For audio files, just return the file path
    res.json({ message: 'File uploaded successfully', file: req.file.path });
  }
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});