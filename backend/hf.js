const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

// Function to generate text using Hugging Face's chat completion API
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

// Function to transcribe audio using Hugging Face's Whisper model
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
          "Content-Type": "audio/mpeg", // or "audio/wav" based on your file type
        },
        method: "POST",
        body: audioBuffer // send raw audio file
      }
    );

    const result = await response.json();

    
    return result.text || JSON.stringify(result);
  } catch (e) {
    return `Transcription Error: ${e.message}`;
  }
}

// Function to translate text using Hugging Face translation models
async function translateText(text, targetLanguage) {
  const modelMap = {
    'ru': 'Helsinki-NLP/opus-mt-en-ru', // German
    'es': 'Helsinki-NLP/opus-mt-en-es', // Spanish
    'fr': 'Helsinki-NLP/opus-mt-en-fr', // French
    'zh': 'Helsinki-NLP/opus-mt-en-zh', // Chinese
    // Add more language mappings as needed
  };
  try {
    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${modelMap[targetLanguage]}`,
      { inputs: text },
      { headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` } },
    );
    return response.data[0].translation_text;
  } catch (error) {
    return `Translation Error: ${error.message}`;
  }
}

// Function to summarize text using Hugging Face's summarization model
async function summarizeText(text) {
  try {
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
      { inputs: text },
      { headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` } },
    );
    return response.data[0].summary_text;
  } catch (error) {
    return `Summarization Error: ${error.message}`;
  }
}

// Function to generate structured notes (decisions, tasks, deadlines) from summary
async function generateStructuredNotes(summary) {
  const prompt = `You are an AI meeting assistant. 
    From the following meeting summary, extract ONLY the clear decisions, tasks, and deadlines mentioned. 
    Return valid JSON without any extra text. 
    If none are found, return empty arrays.

    Summary: "${summary}"

    Format:
      {
        "decisions": ["..."],
        "tasks": ["..."],
        "deadlines": ["..."]
      }`;

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
    let content = response.data.choices[0].message.content;

    // 🧹 Clean markdown formatting if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    return JSON.parse(content);
  } catch (e) {
    return { decisions: [], tasks: [], deadlines: [], error: e.message };
  }
}

module.exports = { 
  generateText, 
  transcribeAudio, 
  translateText, 
  summarizeText, 
  generateStructuredNotes
};
