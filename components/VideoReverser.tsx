import React, { useState, useRef } from 'react';

export const VideoReverser: React.FC = () => {
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [videoPath, setVideoPath] = useState<string | null>(null); // Relative path for backend
    const [reversedVideoUrl, setReversedVideoUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setVideoUrl(url);
            setSelectedFile(file);
            setReversedVideoUrl(null);
            setError(null);
        }
    };

    // SIMPLER STRATEGY:
    // Just implement the UI. I will fix the upload logic in a second pass if complex.
    // For now, I'll assume we can upload via the method I described (save-slice override).

    // ... rewriting component to be clean ...

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-black bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent tracking-tight">
                    Video Reverser
                </h1>
                <p className="text-slate-400 font-medium">Time-travel for your videos</p>
            </div>

            {!videoUrl ? (
                <div className="max-w-xl mx-auto">
                    <label className="group relative block cursor-pointer">
                        <div className="bg-slate-900 border-2 border-dashed border-slate-700 group-hover:border-pink-500 rounded-3xl p-16 transition-all text-center space-y-4">
                            <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                                <svg className="w-10 h-10 text-slate-400 group-hover:text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Drop Video Here</h3>
                                <p className="text-slate-400 mt-1">Upload a video to reverse it</p>
                            </div>
                        </div>
                        <input type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
                    </label>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider text-center">Original</h3>
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-2">
                            <video src={videoUrl} controls className="w-full rounded-2xl bg-black" />
                        </div>
                        <button
                            onClick={() => setVideoUrl(null)}
                            className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold text-xs uppercase tracking-widest transition-all"
                        >
                            Change Video
                        </button>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider text-center">Inverted</h3>
                        {reversedVideoUrl ? (
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-2 relative group">
                                <video src={reversedVideoUrl} controls autoPlay loop className="w-full rounded-2xl bg-black" />
                                <div className="absolute top-4 right-4">
                                    <a
                                        href={reversedVideoUrl}
                                        download
                                        className="p-2 bg-black/50 hover:bg-pink-600 rounded-lg text-white backdrop-blur transition-colors inline-block"
                                        title="Download"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="aspect-video bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center p-8 text-center space-y-4">
                                {isProcessing ? (
                                    <>
                                        <div className="w-12 h-12 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
                                        <p className="text-slate-400 font-medium animate-pulse">Reversing time...</p>
                                    </>
                                ) : (error ? (
                                    <div className="text-red-400 font-medium px-4">
                                        {error}
                                        <button onClick={() => setError(null)} className="block mx-auto mt-2 text-xs text-slate-500 hover:text-white underline">Dismiss</button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => processReversal()}
                                        className="px-8 py-4 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold rounded-2xl shadow-xl shadow-pink-500/20 transition-all hover:scale-105 active:scale-95"
                                    >
                                        Reverse Video
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    async function processReversal() {
        if (!selectedFile) return;
        setIsProcessing(true);
        setError(null);

        try {
            // 1. Upload file using save-slice hack (saves as base64)
            const reader = new FileReader();
            reader.readAsDataURL(selectedFile);

            reader.onload = async () => {
                try {
                    const base64 = reader.result as string;
                    // Save to 'temp' folder in 'turbowan' (or reuse existing structure)
                    // We'll treat it as an 'image' for the middleware but it saves the content verbatim
                    const timestamp = Date.now();
                    const filename = `upload_${timestamp}.mp4`;

                    const uploadRes = await fetch('/save-slice', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            image: base64,
                            filename: filename,
                            folder: 'temp',
                            targetDir: 'turbowan'
                        })
                    });

                    if (!uploadRes.ok) throw new Error("Upload failed");

                    // 2. Call reverse endpoint
                    // Path constructed based on save-slice logic: media/turbowan/temp/filename
                    const videoPath = `turbowan/temp/${filename}`;

                    const reverseRes = await fetch('/reverse-video', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ videoPath })
                    });

                    if (!reverseRes.ok) throw new Error("Reversal failed during processing");

                    const data = await reverseRes.json();
                    setReversedVideoUrl(data.url);
                } catch (e: any) {
                    setError(e.message || "Processing failed");
                    setIsProcessing(false);
                }
            };

            // Handle reader errors
            reader.onerror = () => {
                setError("Failed to read file");
                setIsProcessing(false);
            };

        } catch (err: any) {
            setError(err.message || "Reversal failed");
            setIsProcessing(false);
        }
    }

    // Effect to stop loading when URL is set (since reader callback is detached)
    React.useEffect(() => {
        if (reversedVideoUrl) setIsProcessing(false);
    }, [reversedVideoUrl]);
};
