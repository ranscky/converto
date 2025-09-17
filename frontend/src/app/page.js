"use client";
import { useEffect, useState, useRef } from "react";

export default function Home() {
    const [ prompt, setPrompt ] = useState("");
    const [ generated, setGenerated ] = useState("");
    const [ fileMessage, setFileMessage ] = useState("");
    const [ transcript, setTranscript ] = useState("");
    const [ meetingID, setMeetingID ] = useState("");
    const [ transcripts, setTranscripts ] = useState([]);
    const [ summary, setSummary ] = useState("");
    const [ structuredNotes, setStructuredNotes ] = useState(null);
    // const [ isRecording, setIsRecording ] = useState(false);
    const [ selectedLanguages, setSelectedLanguages ] = useState(['es', 'fr', 'ru', 'zh']);
    const [ translations, setTranslations ] = useState({});
    // const mediaRecorderRef = useRef(null);

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
        formData.append("languages", selectedLanguages.join(','));
        const res = await fetch('http://localhost:3001/api/upload', {
            method: 'POST',
            body: formData,
        });
        const data = await res.json();
        setFileMessage(data.message || "File uploaded successfully");
        setTranscript(data.transcription || "");
        setSummary(data.summary || "");
        setStructuredNotes(data.structuredNotes || null);
        setMeetingID(data.meetingID || "");
        setTranslations(data.translations || {});
        // Refresh transcripts list
        fetch('http://localhost:3001/api/transcripts')
            .then(res => res.json())
            .then(data => setTranscripts(data.transcripts || []));
    };

    // Language selection handler
    const handleLanguageChange = (lang) => {
        setSelectedLanguages((prev =>
            prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
        ));
    }

    // PDF download handler
    const handlePDFDownload = async (id) => {
        if (!id) return;
        window.open(`http://localhost:3001/api/download/${id}`, `_blank`);
    }

    // Live recording handlers
    // const startRecording = async () => {
    //     try {
    //         const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    //         mediaRecorderRef.current = new MediaRecorder(stream);
    //         mediaRecorderRef.current.start();
    //         setIsRecording(true);
    //         mediaRecorderRef.current.ondataavailable = async (event) => {
    //             const formData = new FormData();
    //             formData.append("audio", event.data, "recording.webm");
    //             const res = await fetch('http://localhost:3001/api/upload', {
    //                 method: 'POST',
    //                 body: formData,
    //             });
    //             const data = await res.json();
    //             setFileMessage(data.message || "Recording uploaded successfully");
    //             setTranscript(data.transcription || "");
    //             setMeetingID(data.meetingID || "");
    //             // Refresh transcripts list
    //             fetch('http://localhost:3001/api/transcripts')
    //                 .then(res => res.json())
    //                 .then(data => setTranscripts(data.transcripts || []));
    //         }
    //     } catch (error) {
    //         setFileMessage ("Error accessing microphone: " + error.message);
    //     }
    // };

    // Stop recording handler
    // const stopRecording = () => {
    //     if (mediaRecorderRef.current) {
    //         mediaRecorderRef.current.stop();
    //         setIsRecording(false);
    //     };
    // }
    

    return (
        
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex flex-col items-center p-6">
            <h1 className="text-5xl font-extrabold text-blue-700 mb-6">Converto</h1>
            <p className="text-xl text-gray-600 mb-8">Transform your meetings with AI-powered transcription</p>
            <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg p-6"></div>
            <div className="mb-4">
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">Select Languages</h2>
                <div className="flex gap-4">
                    {['es', 'fr', 'ru', 'zh'].map(lang => (
                        <label key={lang} className="flex items-center space-x-2 text-gray-800">
                            <input
                                type="checkbox"
                                checked={selectedLanguages.includes(lang)}
                                onChange={() => handleLanguageChange(lang)}
                                className="h-5 w-5 text-blue-600"
                            />
                            {
                                lang === 'es' ? 'Spanish' :
                                lang === 'fr' ? 'French' :
                                lang === 'ru' ? 'Russian' :
                                lang === 'zh' ? 'Chinese' : lang}
                        </label>
                    ))}
                </div>
            </div>
            {/* File upload input */}
            <input 
                type="file"
                accept="audio/*, video/mp4"
                onChange={handleFileUpload}
                className="mt-4 p-2 border rounded text-gray-400"
            />
            {/* Recording controls */}
            {/* <button
                onClick={isRecording ? stopRecording : startRecording}
                className={
                    `mb-4 p-3 rounded-lg ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white`
                }
            >
                {isRecording ? 'Stop Recording' : 'Start Live Recording'}
            </button> */}

            <p className="text-green-600 mb-4">{fileMessage}</p>
            {transcript && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h2 className="text-2xl font-semibold text-gray-800">Transcript (ID: {meetingID})</h2>
                    <p className="mt-2 text-gray-700">{transcript}</p>
                    {summary && (
                        <div className="mt-4">
                            <h3 className="text-xl font-semibold text-gray-800">Summary</h3>
                            <p className="text-gray-700">{summary}</p>
                        </div>
                    )}
                    {structuredNotes && (
                        <div className="mt-4">
                            <h3 className="text-lg font-semibold text-gray-600">Structured Notes</h3>
                            {structuredNotes.decisions && (
                                <div>
                                    <h4 className="font-medium text-gray-600">Decisions:</h4>
                                    <ul className="list-disc pl-5">
                                        {structuredNotes.decisions.map((d, i) => (
                                            <li key={i} className="text-gray-700">{d}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {structuredNotes.tasks && (
                                <div>
                                    <h4 className="font-medium text-gray-600">Tasks:</h4>
                                    <ul className="list-disc pl-5">
                                        {structuredNotes.tasks.map((t, i) => (
                                            <li key={i} className="text-gray-700">{t}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {structuredNotes.deadlines && (
                            <div>
                                <h4 className="font-medium text-gray-600">Deadlines:</h4>
                                <ul className="list-disc pl-5">
                                    {structuredNotes.deadlines.map((d, i) => (
                                        <li key={i} className="text-gray-700">{d}</li>
                                    ))}
                                </ul>
                            </div>
                            )}
                        </div>
                    )}

                    {Object.keys(translations).length > 0 && (
                        <div className="mt-4">
                            <h3 className="text-xl font-semibold text-gray-800">Translations</h3>
                            {Object.entries(translations).filter(([lang]) => selectedLanguages.includes(lang)).map(([lang, text]) => (
                                <div key={lang} className="mt-2">
                                    <h4 className="text-lg font-medium text-gray-600">{
                                        lang === 'es' ? 'Spanish' :
                                        lang === 'fr' ? 'French' :
                                        lang === 'ru' ? 'Russian' :
                                        lang === 'zh' ? 'Chinese' : lang
                                    }</h4>
                                    <p className="text-gray-700">{text}</p>
                                </div>
                            ))}
                            <button onClick={() => handlePDFDownload(meetingID)} className="mt-4 bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700">
                                Download PDF
                            </button>
                        </div>
                    )}
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
                        {t.summary && (
                            <p className="mt-2 text-gray-400">Summary: {t.summary.substring(0, 100)}...</p>
                        )}
                        {t.structuredNotes && (
                            <div className="mt-2 text-gray-400">
                                <p className="font-medium">Structured Notes:</p>
                                {t.structuredNotes.decisions && (
                                    <p className="mt-2">Decisions: {t.structuredNotes.decisions.join(', ')}...</p>
                                )}
                                {t.structuredNotes.tasks && (
                                    <p className="mt-2">Tasks: {t.structuredNotes.tasks.join(', ')}...</p>
                                )}
                                {t.structuredNotes.deadlines && (
                                    <p className="mt-2">Deadlines: {t.structuredNotes.deadlines.join(', ')}...</p>
                                )}
                            </div>
                        )}
                        <button onClick={() => handlePDFDownload(t.meetingID)} className="mt-4 bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700">
                            Download PDF
                        </button>
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
                className="p-3 border border-gray-400 rounded-lg mb-4 text-gray-600"
            />
            <button onClick={handleGenerate} className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700">
                Generate Response
            </button>
            <p className="mt-4 text-gray-700">{generated}</p>
        </div>
    );
}
