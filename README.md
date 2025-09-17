# Converto

A modern meeting intelligence platform that transforms audio recordings into actionable insights through AI-powered transcription, analysis, and integration.

## 🚀 Features

- **Audio Processing**: Upload and process meeting recordings
- **AI Analysis**: Generate summaries and insights using Hugging Face AI
- **Data Storage**: Secure meeting data storage with MongoDB Atlas
- **API Integration**: Ready for Slack, Jira, and Google Calendar integration

## 🛠️ Tech Stack

### Frontend
- Next.js
- TailwindCSS
- React

### Backend
- Node.js
- Express
- MongoDB Atlas

### AI & Integration
- Hugging Face Inference API
- Multer for file handling
- Various API integrations (planned)

## 🏁 Getting Started

### Prerequisites
- Node.js (LTS version)
- MongoDB Atlas account
- Hugging Face API key

### Installation

1. **Clone and Setup**
```bash
git clone https://github.com/yourusername/converto.git
cd converto
```

2. **Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

3. **Backend Setup**
```bash
cd backend
npm install
```

4. **Environment Configuration**
Create `backend/.env`:
```plaintext
MONGODB_URI=your_mongodb_uri
HUGGINGFACE_API_KEY=your_huggingface_key
```

5. **Start the Server**
```bash
node index.js
```

## 📝 Usage

1. Access the app at `http://localhost:3000`
2. Upload an audio file
3. Use the text generation feature to test AI capabilities

## 🚧 Development Status

## Week 1–2: Foundations & Core Setup

Goal: Get the development environment, repository, and base application running.

Tasks completed:
- Set up GitHub repository with main and dev branches.
- Scaffolded Next.js frontend and Node.js (Express) backend.
- Integrated TailwindCSS for styling and responsive layout.
- Configured MongoDB Atlas and added basic connection code.
- Created .env setup for API keys (HUGGINGFACE_API_KEY, GOOGLE_CALENDAR, SLACK, JIRA).
- Added Hugging Face Inference client integration in the backend for future transcription and model calls.

## Week 3–4: Automatic Speech Recognition (ASR) Pipeline

Goal: Process meeting audio/video into reliable text.

Tasks completed:
- Implemented file upload endpoint accepting .mp3, .wav, and .mp4 (Multer).
- Integrated Hugging Face ASR (Whisper) for server-side transcription.
- Persisted raw transcripts and meeting metadata to MongoDB; added GET /api/transcripts.
- Exposed summarization and structured-notes hooks downstream of transcription.
- Added frontend transcript list and meeting detail view to surface raw transcripts and metadata.
- Implemented experimental WebRTC live transcription as an optional stretch feature.

## Week 5–6: Translation & Summarization

Goal: Make transcripts multilingual and concise.

Tasks completed:
- Integrated translations for Spanish, French, Mandarin, and Russian using Hugging Face models.
- Added summarization using facebook/bart-large-cnn to produce concise meeting briefs.
- Implemented structured meeting notes extraction with JSON normalization and debug output.
- Enabled user-selected output languages in the frontend UI and translation pipeline.
- Added PDF export to include transcripts, summaries, and structured notes.
