import React, { useState, useRef } from 'react';

interface FrameExtractorProps {
    onSendToTurbo?: (data: { imageUrl: string, prompt: string }) => void;
    onSendToUpscale?: (imageUrl: string, prompt: string) => void;
}

export const FrameExtractor: React.FC<FrameExtractorProps> = ({ onSendToTurbo, onSendToUpscale }) => {
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [extractedFrame, setExtractedFrame] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setVideoUrl(url);
            setExtractedFrame(null);
        }
    };

    const extractLastFrame = () => {
        const video = videoRef.current;
        if (!video) return;

        setIsProcessing(true);
        video.currentTime = video.duration;

        video.onseeked = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/png');
                setExtractedFrame(dataUrl);
            }
            setIsProcessing(false);
        };
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent tracking-tight">
                    Last Frame Extractor
                </h1>
                <p className="text-slate-400 font-medium">Extract high-quality anchors for regeneration or enhancement</p>
            </div>

            {!videoUrl ? (
                <div className="max-w-xl mx-auto">
                    <label className="group relative block cursor-pointer">
                        <div className="bg-slate-900 border-2 border-dashed border-slate-700 group-hover:border-blue-500 rounded-3xl p-16 transition-all text-center space-y-4">
                            <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                                <svg className="w-10 h-10 text-slate-400 group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.586-4.586a2 2 0 012.828 0L24 10m-4-4v12a2 2 0 01-2 2H2a2 2 0 01-2-2V6a2 2 0 012-2h10.586a2 2 0 011.414.586L15 10z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Drop Video Here</h3>
                                <p className="text-slate-400 mt-1">Upload a video to extract its final frame</p>
                            </div>
                        </div>
                        <input type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
                    </label>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    {/* Video Player Section */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-4 p-4">
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            className="w-full rounded-2xl bg-black"
                            controls
                            onLoadedMetadata={() => extractLastFrame()}
                        />
                        <div className="flex justify-between items-center px-2">
                            <button
                                onClick={() => setVideoUrl(null)}
                                className="text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-widest"
                            >
                                Change Video
                            </button>
                            <button
                                onClick={extractLastFrame}
                                disabled={isProcessing}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                            >
                                {isProcessing ? 'Extracting...' : 'Re-extract Last Frame'}
                            </button>
                        </div>
                    </div>

                    {/* Preview Section */}
                    <div className="space-y-6">
                        <div className="relative aspect-video bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center group">
                            {extractedFrame ? (
                                <>
                                    <img src={extractedFrame} className="w-full h-full object-contain" alt="Extracted Frame" />
                                    <div className="absolute top-4 right-4 flex gap-3">
                                        {onSendToTurbo && (
                                            <button
                                                onClick={() => onSendToTurbo({ imageUrl: extractedFrame, prompt: '' })}
                                                className="flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-white font-bold text-xs shadow-xl transition-all active:scale-95"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                                Send to TurboWan
                                            </button>
                                        )}
                                        {onSendToUpscale && (
                                            <button
                                                onClick={() => onSendToUpscale(extractedFrame, '')}
                                                className="flex items-center gap-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-2xl text-white font-bold text-xs shadow-xl transition-all active:scale-95"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                                </svg>
                                                Send to Upscale
                                            </button>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center space-y-4">
                                    <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                                    <p className="text-slate-500 text-sm font-medium">Extracting final frame...</p>
                                </div>
                            )}
                        </div>

                        <canvas ref={canvasRef} className="hidden" />
                    </div>
                </div>
            )}
        </div>
    );
};
