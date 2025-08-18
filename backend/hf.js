const axios = require('axios');
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

module.exports = { generateText };
