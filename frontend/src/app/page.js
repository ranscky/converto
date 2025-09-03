"use client";
import { useEffect, useState, useRef } from "react";

export default function Home() {
    const [ prompt, setPrompt ] = useState("");
    const [ generated, setGenerated ] = useState("");
    const [ fileMessage, setFileMessage ] = useState("");
    const [ transcript, setTranscript ] = useState("");
    const [ meetingID, setMeetingID ] = useState("");
    const [ transcripts, setTranscripts ] = useState([]);
    const [ isRecording, setIsRecording ] = useState(false);

    const mediaRecorderRef = useRef(null);

    // Fetch previous transcripts on load
    useEffect(() => {
        fetch('http://localhost:3001/api/transcripts')
            .then(res => res.json())
            .then(data => setTranscripts(data.transcripts || []));
    }, []);

    // AI generation handler
    const handleGenerate = async () => {
        const res = await fetch("http://localhost:3001/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        setGenerated(data.generated);
    }

    // File upload handler
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append("audio", file);
        const res = await fetch('http://localhost:3001/api/upload', {
            method: 'POST',
            body: formData,
        });
        const data = await res.json();
        setFileMessage(data.message || "File uploaded successfully");
        setTranscript(data.transcription || "");
        setMeetingID(data.meetingID || "");
        // Refresh transcripts list
        fetch('http://localhost:3001/api/transcripts')
            .then(res => res.json())
            .then(data => setTranscripts(data.transcripts || []));
    };

    // Live recording handlers
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.start();
            setIsRecording(true);
            mediaRecorderRef.current.ondataavailable = async (event) => {
                const formData = new FormData();
                formData.append("audio", event.data, "recording.webm");
                const res = await fetch('http://localhost:3001/api/upload', {
                    method: 'POST',
                    body: formData,
                });
                const data = await res.json();
                setFileMessage(data.message || "Recording uploaded successfully");
                setTranscript(data.transcription || "");
                setMeetingID(data.meetingID || "");
                // Refresh transcripts list
                fetch('http://localhost:3001/api/transcripts')
                    .then(res => res.json())
                    .then(data => setTranscripts(data.transcripts || []));
            }
        } catch (error) {
            setFileMessage ("Error accessing microphone: " + error.message);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        };
    }
    

    return (
        
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex flex-col items-center p-6">
            <h1 className="text-5xl font-extrabold text-blue-700 mb-6">Converto</h1>
            <p className="text-xl text-gray-600 mb-8">Transform your meetings with AI-powered transcription</p>
            <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg p-6"></div>
            <input 
                type="file"
                accept="audio/*, video/mp4"
                onChange={handleFileUpload}
                className="mt-4 p-2 border rounded text-gray-400"
            />
            {/* Recording controls */}
            <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`mb-4 p-3 rounded-lg ${
                    isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                } text-white`}
            >
                {isRecording ? 'Stop Recording' : 'Start Live Recording'}
            </button>

            <p className="text-green-600 mb-4">{fileMessage}</p>
            {transcript && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h2 className="text-2xl font-semibold text-gray-800">Transcript (ID: {meetingID})</h2>
                    <p className="mt-2 text-gray-700">{transcript}</p>
                </div>
            )}
            <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Previous Transcripts</h2>
                {transcripts && transcripts.map(t => (
                    <div key={t.meetingID} className="mt-4 p-4 bg-gray-50 rounded lg">
                        <h3 className="text-lg font-medium text-gray-500">Meeting ID: {t.meetingID}</h3>
                        <p className="text-sm text-gray-400">File: {t.fileName}</p>
                        <p className="text-sm text-gray-400">Date: {new Date(t.timestamp).toLocaleString()}</p>
                        <p className="mt-2 text-gray-400">{t.transcription.substring(0, 100)}...</p>
                    </div>
                ))}
            </div>
            <hr className="w-full border-gray-300 my-6" />
            <h2 className="text-3xl font-bold text-gray-800 mb-4">AI Chatbot</h2>
            <p className="text-gray-600 mb-4">Ask questions or generate content based on your transcripts</p>
            <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt here..."
                className="p-3 border border-gray-400 rounded-lg mb-4"
            />
            <button
                onClick={handleGenerate}
                className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 "
            >
                Generate Response
            </button>
            <p className="mt-4 text-gray-700">{generated}</p>
        </div>
    );
}
