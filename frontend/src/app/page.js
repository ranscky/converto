"use client";
import { useEffect, useState } from "react";

export default function Home() {
    const [message, setMessage] = useState("");

    useEffect(() => {
        fetch("http://localhost:3001/api/test")
        .then(res => res.json())
        .then(data => setMessage(data.message))
    }, []);

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
            <h1 className="text-4xl font-bold text-blue-600">Welcome to Converto</h1>
            <p className="mt-4 text-lg text-gray-700">Upload your meeting audio to get started!</p>
            <input type="file" accept="audio/*" className="mt-4 p-2 border rounded text-gray-400" />
            <p className="mt-4 text-gray-400">{message}</p>
        </div>
    );
}