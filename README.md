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

## 🚧 Current Development Status

- ✅ Basic frontend UI
- ✅ File upload system
- ✅ MongoDB integration
- ✅ Hugging Face AI integration
- 🔄 Processing pipeline in development
- 🔄 Live recording and chunked upload support
- ✅ Transcript display and meeting ID assignment
- ⚠️ Error handling and file cleanup improvements
- 📅 API integrations planned