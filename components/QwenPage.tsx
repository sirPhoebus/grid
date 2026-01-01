import React, { useState, useRef } from 'react';
import { ComfyUiService } from '../services/comfyUiService';

const PhotoIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
    </svg>
);

const ArrowUpTrayIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const ArrowPathIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357-2H15" />
    </svg>
);

const CheckCircleIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const XMarkIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export const QwenPage: React.FC = () => {
    const [images, setImages] = useState<(string | null)[]>([null, null, null]);
    const [prompt, setPrompt] = useState('Remove the background and put it on a futuristic neon city street at night.');
    const [isGenerating, setIsGenerating] = useState(false);
    const [resultUrls, setResultUrls] = useState<{ resultUrl: string, concatUrl: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

    const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const newImages = [...images];
            newImages[index] = event.target?.result as string;
            setImages(newImages);
        };
        reader.readAsDataURL(file);
    };

    const handleGenerate = async () => {
        if (images.some(img => img === null)) {
            setError("Please upload all 3 images first.");
            return;
        }
        setIsGenerating(true);
        setError(null);
        try {
            const result = await ComfyUiService.runQwenEditWorkflow(images as string[], prompt);
            setResultUrls(result);
        } catch (err: any) {
            setError(err.message || 'Generation failed');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveToGallery = async (imageUrl: string, prefix: string) => {
        try {
            const filename = `${prefix}_${Date.now()}.png`;
            const response = await fetch('/save-slice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: imageUrl,
                    filename: filename,
                    targetDir: 'qwen_gallery'
                })
            });
            if (response.ok) {
                alert('Saved to gallery!');
            }
        } catch (err) {
            console.error('Failed to save to gallery', err);
        }
    };

    return (
        <div className="bg-slate-950 text-slate-100 rounded-3xl p-8 border border-slate-800 shadow-2xl">
            <div className="max-w-6xl mx-auto space-y-8">
                <header className="flex items-center justify-between border-b border-slate-800 pb-6">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Qwen Edit Pro</h1>
                        <p className="text-slate-400 mt-2 font-medium">Professional 3-Image Composition & Editing</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Inputs */}
                    <div className="lg:col-span-1 space-y-6">
                        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <PhotoIcon className="w-5 h-5 text-cyan-400" /> Source Images
                            </h2>
                            <div className="space-y-4">
                                {images.map((img, idx) => (
                                    <div key={idx} className="relative group overflow-hidden rounded-xl border-2 border-dashed border-slate-700 hover:border-cyan-500/50 transition-all duration-300 h-32 flex items-center justify-center bg-slate-950">
                                        {img ? (
                                            <>
                                                <img src={img} alt={`Input ${idx + 1}`} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                <button
                                                    onClick={() => { const ni = [...images]; ni[idx] = null; setImages(ni); }}
                                                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-red-500/80 transition-colors z-10"
                                                >
                                                    <XMarkIcon className="w-4 h-4" />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => fileInputRefs[idx].current?.click()}
                                                className="flex flex-col items-center gap-2 text-slate-500 hover:text-cyan-400 transition-colors"
                                            >
                                                <ArrowUpTrayIcon className="w-6 h-6" />
                                                <span className="text-xs font-semibold uppercase tracking-wider">Image {idx + 1}</span>
                                            </button>
                                        )}
                                        <input type="file" ref={fileInputRefs[idx]} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(idx, e)} />
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <SparklesIcon className="w-5 h-5 text-blue-400" /> Creative Prompt
                            </h2>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-cyan-500 outline-none h-32 resize-none transition-all placeholder:text-slate-700 font-medium"
                                placeholder="Describe the desired changes..."
                            />
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || images.some(img => !img)}
                                className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-lg transition-all duration-300 shadow-lg ${isGenerating || images.some(img => !img)
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                        : 'bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white hover:scale-[1.02] shadow-cyan-500/10 border border-cyan-500/30'
                                    }`}
                            >
                                {isGenerating ? (
                                    <>
                                        <ArrowPathIcon className="w-6 h-6 animate-spin" /> Batching...
                                    </>
                                ) : (
                                    <>
                                        <SparklesIcon className="w-6 h-6" /> Create Composition
                                    </>
                                )}
                            </button>
                        </section>
                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium animate-pulse">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Right: Output */}
                    <div className="lg:col-span-2 space-y-8">
                        {resultUrls ? (
                            <div className="grid grid-cols-1 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl relative group overflow-hidden">
                                    <h3 className="text-xl font-semibold flex items-center justify-between">
                                        <span className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
                                            Result Artifact
                                        </span>
                                        <button
                                            onClick={() => handleSaveToGallery(resultUrls.resultUrl, 'qwen_result')}
                                            className="px-4 py-2 bg-cyan-600/10 hover:bg-cyan-600 text-cyan-400 hover:text-white rounded-full text-sm font-bold transition-all border border-cyan-600/50 flex items-center gap-2 shadow-lg hover:shadow-cyan-600/20"
                                        >
                                            <CheckCircleIcon className="w-4 h-4" /> Save Result
                                        </button>
                                    </h3>
                                    <div className="aspect-video relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-inner group cursor-zoom-in">
                                        <img src={resultUrls.resultUrl} className="w-full h-full object-contain" alt="Final Result" />
                                    </div>
                                </div>

                                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl relative group overflow-hidden">
                                    <h3 className="text-xl font-semibold flex items-center justify-between">
                                        <span className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                            Comparison View
                                        </span>
                                        <button
                                            onClick={() => handleSaveToGallery(resultUrls.concatUrl, 'qwen_concat')}
                                            className="px-4 py-2 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-full text-sm font-bold transition-all border border-blue-600/50 flex items-center gap-2 shadow-lg hover:shadow-blue-600/20"
                                        >
                                            <CheckCircleIcon className="w-4 h-4" /> Save Comparison
                                        </button>
                                    </h3>
                                    <div className="aspect-auto relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-inner group">
                                        <img src={resultUrls.concatUrl} className="w-full h-full object-contain" alt="Concatenated Comparison" />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full min-h-[600px] flex flex-col items-center justify-center bg-slate-900/20 rounded-3xl border border-slate-800 border-dashed transition-colors hover:bg-slate-900/40">
                                <div className="p-8 bg-slate-900 rounded-full mb-6 border border-slate-800 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                                    <SparklesIcon className="w-16 h-16 text-slate-700 group-hover:text-cyan-500 transition-colors" />
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="text-slate-400 font-bold text-xl tracking-tight">AI Composition Engine Offline</p>
                                    <p className="text-slate-600 font-medium">Upload inputs and define a prompt to ignite the generation process.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
