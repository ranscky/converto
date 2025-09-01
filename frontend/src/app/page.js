"use client";
import { useEffect, useState } from "react";

export default function Home() {
    const [prompt, setPrompt] = useState("");
    const [generated, setGenerated] = useState("");
    const [fileMessage, setFileMessage] = useState("");
    const [ transcript, setTranscript ] = useState("");
    const [ meetingID, setMeetingID ] = useState("");
    const [ transcripts, setTranscripts ] = useState([]);

    useEffect(() => {
        fetch('http://localhost:3001/api/transcripts')
            .then(res => res.json())
            .then(data => setTranscripts(data.transcripts || []));
    }, []);
    
    const handleGenerate = async () => {
        const res = await fetch("http://localhost:3001/api/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        setGenerated(data.generated);
    }

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

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
            <h1 className="text-4xl font-bold text-blue-600">Welcome to Converto</h1>
            <p className="mt-4 text-lg text-gray-700">Upload your meeting audio to get started!</p>
            <input 
                type="file"
                accept="audio/*, video/mp4"
                onChange={handleFileUpload}
                className="mt-4 p-2 border rounded text-gray-400"
            />
            <p className="mt-4 text-gray-700">{fileMessage}</p>
            {transcript && (
                <div className="mt-4 p-4 bg-white rounded shadow w-full max-w-2xl">
                    <h2 className="text-xl font-semibold text-gray-400">Transcript (Meeting ID: {meetingID})</h2>
                    <p className="mt-2 text-gray-700">{transcript}</p>
                </div>
            )}
            <div className="mt-8 w-full max-w-2xl">
                <h2 className="text-2xl font-semibold text-gray-400">Previous Transcripts</h2>
                {transcripts && transcripts.map(t => (
                    <div key={t.meetingID} className="mt-4 p-4 bg-white rounded shadow">
                        <h3 className="text-lg font-medium text-gray-500">Meeting ID: {t.meetingID}</h3>
                        <p className="text-sm text-gray-400">File: {t.fileName}</p>
                        <p className="text-sm text-gray-400">Date: {new Date(t.timestamp).toLocaleString()}</p>
                        <p className="mt-2 text-gray-400">{t.transcription.substring(0, 100)}...</p>
                    </div>
                ))}
            </div>
            <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt here"
                className="mt-4 p-2 border rounded w-64 text-gray-700"
            />
            <button
                onClick={handleGenerate}
                className="mt-4 bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
            >
                Generate Response
            </button>
            <p className="mt-4 text-gray-700">{generated}</p>
        </div>
    );
}