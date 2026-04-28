const { Pinecone } = require('@pinecone-database/pinecone');
const axios = require('axios');

/**
 * Institutional Memory Service
 * Handles embedding generation and vector search across all meeting transcripts.
 */
class Brain {
  constructor() {
    this.pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    this.index = this.pc.index(process.env.PINECONE_INDEX);
  }

  async embedText(text) {
    // Use Hugging Face for embeddings to keep the stack lean
    const response = await axios.post(
      'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
      { inputs: text },
      { headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` } }
    );
    return response.data;
  }

  async remember(meetingID, content) {
    const chunks = this.chunkText(content);
    const embeddings = await Promise.all(chunks.map(text => this.embedText(text)));
    
    const vectors = chunks.map((text, i) => ({
      id: `${meetingID}_${i}`,
      values: embeddings[i],
      metadata: { meetingID, text }
    }));

    await this.index.upsert(vectors);
  }

  async query(question) {
    const queryEmbedding = await this.embedText(question);
    const queryResponse = await this.index.query({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true
    });

    const context = queryResponse.matches
      .map(match => match.metadata.text)
      .join('\n---\n');

    return { context, matches: queryResponse.matches };
  }

  chunkText(text, size = 500) {
    const chunks = [];
    for (let i = 0; i < text.length; i += size) {
      chunks.push(text.substring(i, i + size));
    }
    return chunks;
  }
}

module.exports = new Brain();
