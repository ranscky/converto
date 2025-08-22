const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

async function generateText(prompt) {
  try {
    const response = await axios.post(
      "https://router.huggingface.co/v1/chat/completions",
      {
        model: "openai/gpt-oss-20b:fireworks-ai", // ✅ pick any supported chat model
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    if (error.response) {
      return `Error ${error.response.status}: ${JSON.stringify(error.response.data)}`;
    }
    return "Error: " + error.message;
  }
}

async function transcribeAudio(filepath) {
  try {
    // Read the audio file into a buffer
    const audioBuffer = fs.readFileSync(filepath);

    // Call Hugging Face router with Whisper
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3",
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "audio/wav",
        },
        method: "POST",
        body: audioBuffer, // send raw audio file
      }
    );

    const result = await response.json();

    // Some responses have { text: "..."} while others may include full object
    return result.text || JSON.stringify(result);
  } catch (e) {
    return `Transcription Error: ${e.message}`;
  }
}

module.exports = { generateText, transcribeAudio };
