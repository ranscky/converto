require('dotenv').config();

const express = require('express');
const app = express();
const port = 3001;
const cors = require('cors');
const { MongoClient } = require('mongodb')
const { generateText } = require('./hf');
const axios = require("axios");


app.use(cors());
app.use(express.json());
const uri = process.env.MONGODB_URI
const client = new MongoClient(uri);

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


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});