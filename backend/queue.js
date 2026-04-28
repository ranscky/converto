const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const { transcribeAudio, summarizeText, generateStructuredNotes, translateText } = require('./hf');
const { MongoClient } = require('mongodb');
const storage = require('./storage');
const brain = require('./services/brain');

const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
});

const meetingQueue = new Queue('meeting-processing', { connection: redisConnection });

const worker = new Worker('meeting-processing', async (job) => {
  const { inputPath, fileName, selectedLanguages, meetingID } = job.data;
  console.log(`Processing job ${job.id} for meeting ${meetingID}...`);

  try {
    let outputPath = inputPath;

    // 1. Video to Audio Conversion
    if (job.data.mimetype === 'video/mp4') {
      outputPath = path.join('uploads', `${job.data.filename}.wav`);
      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .output(outputPath)
          .audioCodec('pcm_s16le')
          .withAudioChannels(1)
          .withAudioFrequency(16000)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
    }

    // 2. AI Pipeline
    const transcription = await transcribeAudio(outputPath);
    const summary = await summarizeText(transcription);
    const structuredNotes = await generateStructuredNotes(transcription);
    
    const translations = {};
    const translationPromises = selectedLanguages.map(async (lang) => {
      const text = await translateText(transcription, lang);
      return { lang, text };
    });
    const translationResults = await Promise.all(translationPromises);
    translationResults.forEach(({ lang, text }) => {
      translations[lang] = text;
    });

    // 3. Persistence
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const database = client.db('converto');
    await database.collection('transcripts').insertOne({
      meetingID,
      transcription,
      summary,
      structuredNotes,
      translations,
      fileName,
      timestamp: new Date()
    });
    await client.close();

    // 4. Institutional Memory Indexing
    await brain.remember(meetingID, transcription);

    // 5. Cleanup using Storage Wrapper
    await storage.delete(inputPath);
    if (outputPath !== inputPath) {
      await storage.delete(outputPath);
    }

    return { meetingID, status: 'completed' };
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    throw error;
  }
}, { connection: redisConnection });

module.exports = { meetingQueue, worker };
