"use client";
import { useEffect, useState } from "react";

export default function Home() {
    const [prompt, setPrompt] = useState("");
    const [generated, setGenerated] = useState("");
    const [fileMessage, setFileMessage] = useState("");

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
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
            <h1 className="text-4xl font-bold text-blue-600">Welcome to Converto</h1>
            <p className="mt-4 text-lg text-gray-700">Upload your meeting audio to get started!</p>
            <input 
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="mt-4 p-2 border rounded text-gray-400"
            />
            <p className="mt-4 text-gray-700">{fileMessage}</p>
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