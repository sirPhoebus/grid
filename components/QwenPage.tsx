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

interface QwenPageProps {
    onPreviewImage?: (url: string) => void;
    onSendToTurbo?: (data: { imageUrl: string, prompt: string }) => void;
    onSendToUpscale?: (imageUrl: string, prompt: string) => void;
}

export const QwenPage: React.FC<QwenPageProps> = ({ onPreviewImage, onSendToTurbo, onSendToUpscale }) => {
    const [mode, setMode] = useState<'single' | 'double' | 'triple'>('single');
    const [images, setImages] = useState<(string | null)[]>([null, null, null]);
    const [doubleImages, setDoubleImages] = useState<(string | null)[]>([null, null]);
    const [singleImage, setSingleImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('replace silhouette in image2 with the girl from image1');
    const [isGenerating, setIsGenerating] = useState(false);
    const [resultUrls, setResultUrls] = useState<{ resultUrl: string, concatUrl?: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
    const doubleFileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
    const singleFileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            if (mode === 'triple') {
                const newImages = [...images];
                newImages[index] = event.target?.result as string;
                setImages(newImages);
            } else if (mode === 'double') {
                const newImages = [...doubleImages];
                newImages[index] = event.target?.result as string;
                setDoubleImages(newImages);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSingleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            setSingleImage(event.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleGenerate = async () => {
        if (mode === 'triple' && images.some(img => img === null)) {
            setError("Please upload all 3 images first.");
            return;
        }
        if (mode === 'double' && doubleImages.some(img => img === null)) {
            setError("Please upload both images first.");
            return;
        }
        if (mode === 'single' && !singleImage) {
            setError("Please upload a source image first.");
            return;
        }

        setIsGenerating(true);
        setError(null);
        try {
            if (mode === 'triple') {
                const result = await ComfyUiService.runQwenEditWorkflow(images as string[], prompt);
                setResultUrls(result);
                // Auto-save results to root Miscellaneous folder
                handleSaveToGallery(result.resultUrl, 'qwen_result', false);
                if (result.concatUrl) handleSaveToGallery(result.concatUrl, 'qwen_concat', false);
            } else if (mode === 'double') {
                const result = await ComfyUiService.runQwenDoubleEditWorkflow(doubleImages as string[], prompt);
                setResultUrls(result);
                // Auto-save results to root Miscellaneous folder
                handleSaveToGallery(result.resultUrl, 'qwen_result', false);
                if (result.concatUrl) handleSaveToGallery(result.concatUrl, 'qwen_concat', false);
            } else {
                const result = await ComfyUiService.runQwenSingleEditWorkflow(singleImage as string, prompt);
                setResultUrls(result);
                // Auto-save result to root Miscellaneous folder
                handleSaveToGallery(result.resultUrl, 'qwen_single', false);
            }
        } catch (err: any) {
            setError(err.message || 'Generation failed');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveToGallery = async (imageUrl: string, prefix: string, showAlert = true) => {
        try {
            const blobResponse = await fetch(imageUrl);
            const blob = await blobResponse.blob();

            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64data = reader.result as string;
                const filename = `${prefix}_${Date.now()}.png`;
                const response = await fetch('/save-slice', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: base64data,
                        filename: filename,
                        folder: 'Miscellaneous',
                        targetDir: 'qwen_gallery'
                    })
                });
                if (response.ok && showAlert) {
                    alert('Saved to gallery!');
                }
            };
        } catch (err) {
            console.error('Failed to save to gallery', err);
            if (showAlert) alert('Error processing image for gallery.');
        }
    };

    return (
        <div className="bg-slate-950 text-slate-100 rounded-3xl p-8 border border-slate-800 shadow-2xl">
            <div className="max-w-6xl mx-auto space-y-8">
                <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6 gap-6">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Qwen Edit Pro</h1>
                        <p className="text-slate-400 mt-2 font-medium">Professional Image Composition & Editing</p>
                    </div>

                    <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 self-start">
                        <button
                            onClick={() => { setMode('single'); setResultUrls(null); }}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'single' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Single
                        </button>
                        <button
                            onClick={() => { setMode('double'); setResultUrls(null); }}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'double' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Double
                        </button>
                        <button
                            onClick={() => { setMode('triple'); setResultUrls(null); }}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'triple' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Triple
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Inputs */}
                    <div className="lg:col-span-1 space-y-6">
                        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <PhotoIcon className="w-5 h-5 text-cyan-400" /> Source {mode === 'single' ? 'Image' : 'Images'}
                            </h2>
                            <div className="space-y-4">
                                {mode === 'triple' ? (
                                    images.map((img, idx) => (
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
                                    ))
                                ) : mode === 'double' ? (
                                    doubleImages.map((img, idx) => (
                                        <div key={idx} className="relative group overflow-hidden rounded-xl border-2 border-dashed border-slate-700 hover:border-indigo-500/50 transition-all duration-300 h-40 flex items-center justify-center bg-slate-950">
                                            {img ? (
                                                <>
                                                    <img src={img} alt={`Double Input ${idx + 1}`} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                    <button
                                                        onClick={() => { const ni = [...doubleImages]; ni[idx] = null; setDoubleImages(ni); }}
                                                        className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-red-500/80 transition-colors z-10"
                                                    >
                                                        <XMarkIcon className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => doubleFileInputRefs[idx].current?.click()}
                                                    className="flex flex-col items-center gap-2 text-slate-500 hover:text-indigo-400 transition-colors"
                                                >
                                                    <ArrowUpTrayIcon className="w-8 h-8" />
                                                    <span className="text-xs font-semibold uppercase tracking-wider">Reference {idx + 1}</span>
                                                </button>
                                            )}
                                            <input type="file" ref={doubleFileInputRefs[idx]} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(idx, e)} />
                                        </div>
                                    ))
                                ) : (
                                    <div className="relative group overflow-hidden rounded-xl border-2 border-dashed border-slate-700 hover:border-cyan-500/50 transition-all duration-300 h-64 flex items-center justify-center bg-slate-950">
                                        {singleImage ? (
                                            <>
                                                <img src={singleImage} alt="Single Input" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                <button
                                                    onClick={() => setSingleImage(null)}
                                                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-red-500/80 transition-colors z-10"
                                                >
                                                    <XMarkIcon className="w-4 h-4" />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => singleFileInputRef.current?.click()}
                                                className="flex flex-col items-center gap-2 text-slate-500 hover:text-cyan-400 transition-colors"
                                            >
                                                <ArrowUpTrayIcon className="w-10 h-10 mb-2" />
                                                <span className="text-sm font-semibold uppercase tracking-wider">Upload Reference Image</span>
                                            </button>
                                        )}
                                        <input type="file" ref={singleFileInputRef} className="hidden" accept="image/*" onChange={handleSingleImageUpload} />
                                    </div>
                                )}
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
                                disabled={isGenerating || (mode === 'triple' ? images.some(img => !img) : mode === 'double' ? doubleImages.some(img => !img) : !singleImage)}
                                className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-lg transition-all duration-300 shadow-lg ${isGenerating || (mode === 'triple' ? images.some(img => !img) : mode === 'double' ? doubleImages.some(img => !img) : !singleImage)
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
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => onSendToUpscale?.(resultUrls.resultUrl, prompt)}
                                                className="px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-full text-xs font-bold transition-all border border-indigo-600/50 flex items-center gap-2 shadow-lg"
                                            >
                                                Upscale
                                            </button>
                                            <button
                                                onClick={() => onSendToTurbo?.({ imageUrl: resultUrls.resultUrl, prompt })}
                                                className="px-4 py-2 bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white rounded-full text-xs font-bold transition-all border border-purple-600/50 flex items-center gap-2 shadow-lg"
                                            >
                                                Video
                                            </button>
                                        </div>
                                    </h3>
                                    <div
                                        className="aspect-video relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-inner group cursor-zoom-in"
                                        onClick={() => onPreviewImage?.(resultUrls.resultUrl)}
                                    >
                                        <img src={resultUrls.resultUrl} className="w-full h-full object-contain" alt="Final Result" />
                                        <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                            <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                                                Click to Preview
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {resultUrls.concatUrl && (
                                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl relative group overflow-hidden">
                                        <h3 className="text-xl font-semibold flex items-center justify-between">
                                            <span className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                                Comparison View
                                            </span>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => onSendToUpscale?.(resultUrls.concatUrl!, prompt)}
                                                    className="px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-full text-xs font-bold transition-all border border-indigo-600/50 flex items-center gap-2 shadow-lg"
                                                >
                                                    Upscale
                                                </button>
                                                <button
                                                    onClick={() => onSendToTurbo?.({ imageUrl: resultUrls.concatUrl!, prompt })}
                                                    className="px-4 py-2 bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white rounded-full text-xs font-bold transition-all border border-purple-600/50 flex items-center gap-2 shadow-lg"
                                                >
                                                    TurboWan
                                                </button>
                                            </div>
                                        </h3>
                                        <div
                                            className="aspect-auto relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-inner group cursor-zoom-in"
                                            onClick={() => onPreviewImage?.(resultUrls.concatUrl!)}
                                        >
                                            <img src={resultUrls.concatUrl} className="w-full h-full object-contain" alt="Concatenated Comparison" />
                                            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                                                    Click to Preview
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
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
