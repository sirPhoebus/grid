import React, { useState, useRef, useEffect } from 'react';
import { ComfyUiService } from '../services/comfyUiService';
import { PromptLibrary, addPromptToLibrary } from './PromptLibrary';

interface VideoSegment {
    videoUrl: string;
    initialFrameUrl: string;
    lastFrameUrl: string;
    localPath: string;
    prompt: string;
}

interface TurboWanProps {
    initialData?: { imageUrl: string, prompt: string } | null;
    onClearInitialData?: () => void;
    onPreviewMedia?: (url: string) => void;
}

export const TurboWan: React.FC<TurboWanProps> = ({ initialData, onClearInitialData, onPreviewMedia }) => {
    const [segments, setSegments] = useState<VideoSegment[]>([]);
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<string>("16:9");
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [stitchedVideoUrl, setStitchedVideoUrl] = useState<string | null>(null);
    const [isStitching, setIsStitching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedPrompts, setSavedPrompts] = useState<string[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingValue, setEditingValue] = useState('');
    const [iterationCount, setIterationCount] = useState(1);
    const [currentIteration, setCurrentIteration] = useState(0);
    const [globalPrompts, setGlobalPrompts] = useState<string[]>([]);

    const detectAspectRatio = (url: string) => {
        const img = new Image();
        img.onload = () => {
            const ratio = img.width / img.height;
            let detectedAr = "16:9";
            if (ratio > 1.4) detectedAr = "16:9";
            else if (ratio > 1.1) detectedAr = "4:3";
            else if (ratio > 0.9) detectedAr = "1:1";
            else if (ratio > 0.7) detectedAr = "3:4";
            else detectedAr = "9:16";
            setAspectRatio(detectedAr);
            console.log(`Detected AR for ${url.substring(0, 20)}...: ${detectedAr} (${ratio})`);
        };
        img.src = url;
    };

    useEffect(() => {
        if (initialData) {
            setCurrentImage(initialData.imageUrl);
            setPrompt(initialData.prompt);
            detectAspectRatio(initialData.imageUrl);
            onClearInitialData?.();
        }
    }, [initialData]);

    useEffect(() => {
        const stored = localStorage.getItem('global_prompt_library');
        if (stored) {
            try {
                setGlobalPrompts(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse saved prompts", e);
            }
        }
    }, [isSidebarOpen]);

    const savePrompt = (text: string) => {
        if (!text) return;
        addPromptToLibrary(text);

        // Refresh local list
        const stored = localStorage.getItem('global_prompt_library');
        if (stored) setGlobalPrompts(JSON.parse(stored));
    };


    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setCurrentImage(base64);
            setSegments([]);
            setStitchedVideoUrl(null);
            setError(null);
            detectAspectRatio(base64);
        };
        reader.readAsDataURL(file);
    };

    const handleGenerate = async () => {
        if (!currentImage || !prompt) return;

        setIsGenerating(true);
        setError(null);
        setCurrentIteration(0);

        try {
            let workingSegments: VideoSegment[] = [...segments];
            let workingAnchor = currentImage;
            const total = iterationCount;

            for (let i = 0; i < total; i++) {
                setCurrentIteration(i + 1);
                // @ts-ignore - runTurboWanWorkflow is static
                const result = await ComfyUiService.runTurboWanWorkflow(workingAnchor, prompt, aspectRatio);

                const newSegment: VideoSegment = {
                    videoUrl: result.videoUrl,
                    initialFrameUrl: workingAnchor,
                    lastFrameUrl: result.lastFrameUrl,
                    localPath: result.localVideoPath,
                    prompt: prompt
                };

                workingSegments.push(newSegment);
                setSegments([...workingSegments]);
                workingAnchor = result.lastFrameUrl;
                setCurrentImage(result.lastFrameUrl);
            }

            // If we did multiple iterations, auto-stitch at the end
            if (total > 1) {
                setIsStitching(true);
                try {
                    const videoPaths = workingSegments.map(s => s.localPath);
                    const stitchedUrl = await ComfyUiService.stitchVideos(videoPaths);
                    setStitchedVideoUrl(stitchedUrl);
                } catch (err: any) {
                    console.error("Auto-stitching failed", err);
                    setError("Sequence complete, but auto-stitching failed.");
                } finally {
                    setIsStitching(false);
                }
            }
        } catch (err: any) {
            setError(err.message || 'Generation failed');
        } finally {
            setIsGenerating(false);
            setCurrentIteration(0);
        }
    };

    const handleStitch = async () => {
        if (segments.length === 0) return;

        setIsStitching(true);
        setError(null);

        try {
            const videoPaths = segments.map(s => s.localPath);
            const stitchedUrl = await ComfyUiService.stitchVideos(videoPaths);
            setStitchedVideoUrl(stitchedUrl);
        } catch (err: any) {
            setError(err.message || 'Stitching failed');
        } finally {
            setIsStitching(false);
        }
    };

    const reset = () => {
        setSegments([]);
        setCurrentImage(null);
        setPrompt('');
        setStitchedVideoUrl(null);
        setError(null);
        setAspectRatio("16:9");
    };

    const getAspectClass = (ar: string) => {
        switch (ar) {
            case '16:9': return 'aspect-video';
            case '9:16': return 'aspect-[9/16]';
            case '1:1': return 'aspect-square';
            case '4:3': return 'aspect-[4/3]';
            case '3:4': return 'aspect-[3/4]';
            default: return 'aspect-video';
        }
    };

    // Calculate container dimensions to ensure max 480px in either direction
    const getContainerStyles = (ar: string) => {
        const base = { maxWidth: '480px', maxHeight: '480px', margin: '0 auto' };
        if (ar === '16:9' || ar === '4:3') {
            return { ...base, width: '100%', height: 'auto' };
        } else if (ar === '9:16' || ar === '3:4') {
            return { ...base, width: 'auto', height: '100%' };
        }
        return base;
    };

    return (
        <div className="relative min-h-[600px] overflow-hidden">
            <PromptLibrary
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                onSelectPrompt={(p) => setPrompt(p)}
                storageKey="global_prompt_library"
            />

            <div className={`transition-all duration-500 ${isSidebarOpen ? 'pl-80 blur-[2px]' : 'pl-0'}`}>
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                                TurboWan I2V
                            </h2>
                            <p className="text-slate-400 mt-1">Recursive video generation & stitching</p>
                        </div>
                        {segments.length > 0 && !stitchedVideoUrl && (
                            <button
                                onClick={handleStitch}
                                disabled={isStitching || isGenerating}
                                className="px-6 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center gap-2"
                            >
                                {isStitching ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H10a1 1 0 01-1-1v-4z" />
                                    </svg>
                                )}
                                Stop & Stitch All
                            </button>
                        )}
                        {stitchedVideoUrl && (
                            <button
                                onClick={reset}
                                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all"
                            >
                                New Project
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-start gap-3">
                            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {!currentImage && !stitchedVideoUrl && (
                        <div className="max-w-xl mx-auto">
                            <label className="group relative block cursor-pointer">
                                <div className="bg-slate-900/50 border-2 border-dashed border-slate-700 group-hover:border-indigo-500 rounded-3xl p-16 transition-all text-center space-y-4 backdrop-blur-sm">
                                    <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                                        <svg className="w-10 h-10 text-slate-400 group-hover:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">Start with a Photo</h3>
                                        <p className="text-slate-400 mt-2">Upload the initial frame for your video sequence</p>
                                    </div>
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                            </label>
                        </div>
                    )}

                    {currentImage && !stitchedVideoUrl && (
                        <div className="space-y-12">
                            {/* Horizontal Pipeline Carousel */}
                            {/* Iteration Progress (Automated Mode) */}
                            {isGenerating && iterationCount > 1 && (
                                <div className="max-w-xl mx-auto py-12 space-y-8 animate-in fade-in duration-700">
                                    <div className="text-center space-y-4">
                                        <div className="relative inline-flex items-center justify-center">
                                            <div className="w-24 h-24 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-xl font-black text-indigo-400">{currentIteration}/{iterationCount}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white uppercase tracking-widest">Automated Deep Gen</h3>
                                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Processing Segment {currentIteration}</p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 backdrop-blur-md">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Overall Progress</span>
                                            <span className="text-[10px] font-bold text-indigo-400">{Math.round((currentIteration / iterationCount) * 100)}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-500 ease-out"
                                                style={{ width: `${(currentIteration / iterationCount) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Standard Pipeline Carousel (Manual Mode or Single Gen) */}
                            {(!isGenerating || iterationCount === 1) && (
                                <div className="flex flex-col md:flex-row items-center justify-center gap-6 px-4">
                                    {/* LEFT: Previous Result (if any) */}
                                    <div className={`flex-1 w-full max-w-[480px] transition-all duration-700 ${segments.length === 0 ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between px-2">
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Step {segments.length} Result</span>
                                                <div className="px-2 py-0.5 bg-slate-800 rounded text-[9px] font-bold text-slate-400">VIDEO</div>
                                            </div>
                                            <div
                                                className={`bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative ${getAspectClass(aspectRatio)}`}
                                                style={getContainerStyles(aspectRatio)}
                                            >
                                                {segments.length > 0 && (
                                                    <video
                                                        src={segments[segments.length - 1].videoUrl}
                                                        className="w-full h-full object-cover opacity-60 grayscale-[0.2]"
                                                        autoPlay
                                                        loop
                                                        muted
                                                        playsInline
                                                    />
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/40 to-transparent" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* CENTER: Transition Arrow */}
                                    <div className={`flex flex-col items-center gap-2 transition-all duration-1000 delay-300 ${segments.length === 0 ? 'opacity-0' : 'opacity-100'}`}>
                                        <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 animate-pulse">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </div>
                                        <span className="text-[9px] font-black text-indigo-500/60 uppercase tracking-widest whitespace-nowrap">EXTRACTING LINK</span>
                                    </div>

                                    {/* RIGHT: Next Input (Anchor) */}
                                    <div className="flex-1 w-full max-w-[480px]">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between px-2">
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                                                    {segments.length === 0 ? 'Step 1 Input' : `Step ${segments.length + 1} Anchor`}
                                                </span>
                                                <div className="px-2 py-0.5 bg-indigo-500/20 rounded text-[9px] font-bold text-indigo-400 ring-1 ring-indigo-500/30">IMAGE</div>
                                            </div>
                                            <div
                                                className={`bg-slate-900 rounded-2xl overflow-hidden border-2 border-indigo-500/50 relative group shadow-[0_0_50px_-12px_rgba(99,102,241,0.5)] ring-4 ring-indigo-500/10 ${getAspectClass(aspectRatio)}`}
                                                style={getContainerStyles(aspectRatio)}
                                            >
                                                <img
                                                    key={currentImage}
                                                    src={currentImage}
                                                    className={`w-full h-full object-cover ${isGenerating ? 'opacity-30 blur-sm' : ''} transition-all duration-700`}
                                                    alt="Current Anchor"
                                                />

                                                {isGenerating && (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-indigo-950/20 backdrop-blur-[2px] animate-in fade-in duration-500">
                                                        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                                                        <span className="text-white font-black uppercase tracking-[0.3em] text-[10px] drop-shadow-md">Generating...</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Controls Section */}
                            <div className="max-w-2xl mx-auto space-y-6">
                                <div className="p-8 bg-slate-900/80 rounded-3xl border border-slate-800 space-y-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <svg className="w-24 h-24 text-indigo-500" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                                        </svg>
                                    </div>

                                    <div className="space-y-3 relative">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => setIsSidebarOpen(true)}
                                                    className="p-1.5 bg-slate-800 hover:bg-indigo-500/20 hover:text-indigo-400 rounded-lg text-slate-400 transition-all flex items-center gap-2 pr-3"
                                                    title="Open Prompt Bank"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                                    </svg>
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Library</span>
                                                </button>
                                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Prompt Instructions</label>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {/* Iterations Input */}
                                                <div className="flex items-center gap-2 px-3 py-1 bg-slate-950/50 border border-slate-800 rounded-lg group/iter hover:border-indigo-500/30 transition-all">
                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover/iter:text-indigo-400 transition-colors">Iterations</span>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="10"
                                                        value={iterationCount}
                                                        onChange={(e) => setIterationCount(Math.max(1, parseInt(e.target.value) || 1))}
                                                        className="w-10 bg-transparent text-center text-xs font-bold text-white focus:outline-none"
                                                    />
                                                </div>
                                                {prompt && !globalPrompts.includes(prompt) && (
                                                    <button
                                                        onClick={() => savePrompt(prompt)}
                                                        className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[9px] font-bold uppercase tracking-widest border border-indigo-500/20 hover:bg-indigo-500/20 transition-all flex items-center gap-1.5"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                                        </svg>
                                                        Save to Library
                                                    </button>
                                                )}
                                                {segments.length > 0 && (
                                                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded text-[9px] font-bold uppercase tracking-tighter border border-amber-500/20">
                                                        Iterative Mode
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <textarea
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            placeholder="Describe the action for this segment..."
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-6 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all resize-none h-40 font-medium leading-relaxed shadow-inner"
                                        />
                                    </div>

                                    <button
                                        onClick={handleGenerate}
                                        disabled={isGenerating || !prompt}
                                        className="w-full py-5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:scale-[1.01] active:scale-[0.99] disabled:from-slate-800 disabled:to-slate-800 disabled:opacity-50 text-white font-black uppercase tracking-[0.2em] text-sm rounded-2xl shadow-2xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-4 group"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                                {iterationCount > 1 ? (
                                                    <>{segments.length === 0 ? 'Batch Generate Sequence' : 'Batch Extend Sequence'}</>
                                                ) : (
                                                    <>{segments.length === 0 ? 'Begin Sequence' : 'Extend Sequence'}</>
                                                )}
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Storyline Strip */}
                                <div className="space-y-4 pt-8 border-t border-slate-800/50">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Full Storyline ({segments.length} segments)</h3>
                                        {segments.length > 0 && <div className="h-px flex-1 bg-slate-800 mx-4" />}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {segments.map((seg, i) => (
                                            <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500/30 transition-colors group">
                                                <div
                                                    className={`relative ${getAspectClass(aspectRatio)} cursor-zoom-in`}
                                                    onClick={() => onPreviewMedia?.(seg.videoUrl)}
                                                >
                                                    <video
                                                        src={seg.videoUrl}
                                                        className="w-full h-full object-cover"
                                                        autoPlay
                                                        loop
                                                        muted
                                                        playsInline
                                                    />
                                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-[10px] font-black text-white uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">Click to Preview</span>
                                                    </div>
                                                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 rounded text-[8px] font-black text-white uppercase tracking-tighter">Gen {i + 1}</div>
                                                </div>
                                                <div className="p-3">
                                                    <p className="text-[9px] text-slate-500 italic line-clamp-1 leading-snug">"{seg.prompt}"</p>
                                                </div>
                                            </div>
                                        ))}
                                        {segments.length === 0 && (
                                            <div className="col-span-full h-24 border border-dashed border-slate-800 rounded-xl flex items-center justify-center text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                                                Pipeline Empty
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {stitchedVideoUrl && (
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold">Sequence Complete!</h2>
                                <p className="text-slate-400">All {segments.length} segments have been stitched together.</p>
                            </div>

                            <div
                                className={`bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800 ring-1 ring-white/10 ${getAspectClass(aspectRatio)} mx-auto cursor-zoom-in group relative`}
                                style={getContainerStyles(aspectRatio)}
                                onClick={() => onPreviewMedia?.(stitchedVideoUrl)}
                            >
                                <video src={stitchedVideoUrl} className="w-full h-full object-cover" autoPlay loop muted={false} />
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-xs font-black text-white uppercase tracking-widest bg-black/40 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm">Expand Video</span>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <a
                                    href={stitchedVideoUrl}
                                    download="final_video.mp4"
                                    className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all text-center flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download Final Video
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};
