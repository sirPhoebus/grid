import React, { useState, useEffect } from 'react';
import { ComfyUiService, ZImageParams } from '../services/comfyUiService';
import { PromptLibrary, addPromptToLibrary } from './PromptLibrary';

interface ZImageProps {
    onSendToTurbo?: (data: { imageUrl: string, prompt: string }) => void;
    onSendToUpscale?: (imageUrl: string, prompt: string) => void;
}

export const ZImage: React.FC<ZImageProps> = ({ onSendToTurbo, onSendToUpscale }) => {
    const [params, setParams] = useState<ZImageParams>({
        width: 1024,
        height: 1536,
        steps: 9,
        prompt: "Latina female with thick wavy hair, harbor boats and pastel houses behind. Breezy seaside light, warm tones, cinematic close-up.",
        negative_prompt: "text, watermark, low quality",
        cfg: 1,
        sampler_name: 'res_multistep',
        scheduler: 'simple'
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [globalPrompts, setGlobalPrompts] = useState<string[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem('global_prompt_library');
        if (stored) {
            try {
                setGlobalPrompts(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse saved prompts", e);
            }
        }
    }, [isLibraryOpen]);

    const savePrompt = (text: string) => {
        if (!text) return;
        addPromptToLibrary(text);

        // Refresh local list
        const stored = localStorage.getItem('global_prompt_library');
        if (stored) setGlobalPrompts(JSON.parse(stored));
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        setResultImageUrl(null);

        try {
            const result = await ComfyUiService.runZImageWorkflow(params);
            setResultImageUrl(result.imageUrl);

            // Save to dedicated folder for gallery
            const timestamp = Date.now();
            await fetch('/save-slice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: result.imageUrl,
                    filename: `zimage_${timestamp}.png`,
                    folder: '.',
                    targetDir: 'z_image'
                })
            });
        } catch (err: any) {
            setError(err.message || 'Generation failed');
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden">
            <PromptLibrary
                isOpen={isLibraryOpen}
                onClose={() => setIsLibraryOpen(false)}
                onSelectPrompt={(p) => setParams(prev => ({ ...prev, prompt: p }))}
                storageKey="global_prompt_library"
            />

            <div className={`max-w-6xl mx-auto py-8 px-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 transition-all ${isLibraryOpen ? 'pl-80 blur-[2px]' : ''}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            Z-Image Generator
                        </h2>
                        <p className="text-slate-400 mt-1">Lumina2 Turbo Inference</p>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-start gap-3">
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* SETTINGS PANEL */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl backdrop-blur-xl shadow-xl space-y-6">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
                                Configuration
                            </h3>

                            {/* Prompt */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Prompt Instructions</label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setIsLibraryOpen(true)}
                                            className="p-1 px-2 bg-slate-800 hover:bg-cyan-500/20 hover:text-cyan-400 rounded-lg text-slate-400 transition-all flex items-center gap-2"
                                            title="Open Prompt Bank"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                            </svg>
                                            <span className="text-[9px] font-black uppercase tracking-widest">Library</span>
                                        </button>
                                        {params.prompt && !globalPrompts.includes(params.prompt) && (
                                            <button
                                                onClick={() => savePrompt(params.prompt)}
                                                className="p-1 px-2 bg-cyan-500/10 text-cyan-400 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
                                            >
                                                Save
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <textarea
                                    value={params.prompt}
                                    onChange={(e) => setParams({ ...params, prompt: e.target.value })}
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all resize-none h-64 leading-relaxed font-medium"
                                    placeholder="Describe the image artifact in detail..."
                                />
                            </div>

                            {/* Dimensions */}
                            <div className="grid grid-cols-2 gap-4 relative">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Width</label>
                                    <input
                                        type="number"
                                        value={params.width}
                                        onChange={(e) => setParams({ ...params, width: parseInt(e.target.value) || 1024 })}
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Height</label>
                                    <input
                                        type="number"
                                        value={params.height}
                                        onChange={(e) => setParams({ ...params, height: parseInt(e.target.value) || 1024 })}
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                    />
                                </div>
                                <button
                                    onClick={() => setParams(p => ({ ...p, width: p.height, height: p.width }))}
                                    className="absolute left-1/2 top-11 -translate-x-1/2 p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 shadow-xl transition-all active:scale-90 z-10"
                                    title="Swap Dimensions"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                </button>
                            </div>

                            {/* Steps & CFG */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Steps</label>
                                        <span className="text-[10px] font-bold text-cyan-400">{params.steps}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="30"
                                        value={params.steps}
                                        onChange={(e) => setParams({ ...params, steps: parseInt(e.target.value) })}
                                        className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CFG</label>
                                        <span className="text-[10px] font-bold text-purple-400">{params.cfg || 1}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="7"
                                        step="0.1"
                                        value={params.cfg || 1}
                                        onChange={(e) => setParams({ ...params, cfg: parseFloat(e.target.value) })}
                                        className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* Negative Prompt */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Negative Prompt</label>
                                <textarea
                                    value={params.negative_prompt || ''}
                                    onChange={(e) => setParams({ ...params, negative_prompt: e.target.value })}
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all resize-none h-20"
                                    placeholder="What to avoid..."
                                />
                            </div>

                            {/* Sampler & Scheduler */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Sampler</label>
                                    <select
                                        value={params.sampler_name}
                                        onChange={(e) => setParams({ ...params, sampler_name: e.target.value as any })}
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 appearance-none"
                                    >
                                        <option value="euler">Euler</option>
                                        <option value="res_multistep">Res Multistep</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Scheduler</label>
                                    <select
                                        value={params.scheduler}
                                        onChange={(e) => setParams({ ...params, scheduler: e.target.value as any })}
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 appearance-none"
                                    >
                                        <option value="beta">Beta</option>
                                        <option value="simple">Simple</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !params.prompt}
                                className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-[0.98]"
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        Create Artifact
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* VIEWPORT PANEL */}
                    <div className="lg:col-span-8 flex flex-col gap-4">
                        <div className="flex-1 bg-slate-900/30 border border-slate-800 rounded-3xl overflow-hidden relative group min-h-[512px] flex items-center justify-center p-4">
                            {resultImageUrl ? (
                                <img
                                    src={resultImageUrl}
                                    alt="Generated Result"
                                    className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-700"
                                />
                            ) : isGenerating ? (
                                <div className="flex flex-col items-center gap-6">
                                    <div className="relative">
                                        <div className="w-20 h-20 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-12 h-12 bg-cyan-500/10 rounded-full animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <span className="text-cyan-400 font-black uppercase tracking-[0.4em] text-[10px]">Processing Lumina2</span>
                                        <div className="mt-2 flex justify-center gap-1">
                                            <div className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center space-y-4 opacity-30 group-hover:opacity-50 transition-opacity">
                                    <svg className="w-24 h-24 text-slate-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-sm font-medium tracking-tight">Enter a prompt and click generate to begin</p>
                                </div>
                            )}

                            {resultImageUrl && (
                                <div className="absolute top-4 right-4 flex gap-3">
                                    {onSendToTurbo && (
                                        <button
                                            onClick={() => onSendToTurbo({ imageUrl: resultImageUrl, prompt: params.prompt })}
                                            className="flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-white font-bold text-xs backdrop-blur-md border border-white/10 transition-all shadow-xl active:scale-95 group/anim"
                                        >
                                            <svg className="w-4 h-4 group-hover:animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            Animate in TurboWan
                                        </button>
                                    )}
                                    {onSendToUpscale && (
                                        <button
                                            onClick={() => onSendToUpscale(resultImageUrl, params.prompt)}
                                            className="flex items-center gap-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-2xl text-white font-bold text-xs backdrop-blur-md border border-white/10 transition-all shadow-xl active:scale-95 group/upscale"
                                        >
                                            <svg className="w-4 h-4 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                            </svg>
                                            Send to Upscale
                                        </button>
                                    )}
                                    <a
                                        href={resultImageUrl}
                                        download="z-image.png"
                                        className="p-3 bg-black/60 hover:bg-slate-700 rounded-2xl text-white backdrop-blur-md border border-white/10 transition-all shadow-xl"
                                        title="Download Image"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
