import React, { useState, useEffect } from 'react';
import { ComfyUiService, ZImageParams } from '../services/comfyUiService';
import { PromptLibrary, addPromptToLibrary } from './PromptLibrary';

interface ImageProps {
    onSendToTurbo?: (data: { imageUrl: string, prompt: string }) => void;
    onSendToUpscale?: (imageUrl: string, prompt: string) => void;
    onSendToQwen?: (data: { imageUrl: string, prompt: string, targetMode?: 'single' | 'double' | 'triple' }) => void;
    onPreviewImage?: (url: string) => void;
}

export const Image: React.FC<ImageProps> = ({ onSendToTurbo, onSendToUpscale, onSendToQwen, onPreviewImage }) => {
    const [params, setParams] = useState<ZImageParams>(() => {
        const saved = localStorage.getItem('zimage_params');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse saved params", e);
            }
        }
        return {
            width: 1024,
            height: 1536,
            steps: 9,
            prompt: "18 yo girl with long black hair, big lips, eyes glowing naked, big breasts, long nipples",
            negative_prompt: "text, watermark, low quality, Asian, Chinese, Korean, Japanese",
            cfg: 1,
            unet_model: "zImage_turbo.safetensors",
            sampler_name: 'res_multistep',
            scheduler: 'simple',
            depth_strength: 1.0,
            engine: 'z-image'
        };
    });

    // One-time cleanup of legacy large data
    useEffect(() => {
        try {
            const saved = localStorage.getItem('zimage_params');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.depth_image) {
                    delete parsed.depth_image;
                    localStorage.setItem('zimage_params', JSON.stringify(parsed));
                }
            }
        } catch (e) {
            console.warn("Storage cleanup failed", e);
        }
    }, []);

    // Persist params on change (excluding large image data)
    useEffect(() => {
        try {
            const paramsToSave = { ...params };
            delete paramsToSave.depth_image;
            localStorage.setItem('zimage_params', JSON.stringify(paramsToSave));
        } catch (e) {
            // Silently ignore storage errors to keep UI functional
        }
    }, [params]);

    const [isGenerating, setIsGenerating] = useState(false);
    const [resultImageUrl, setResultImageUrl] = useState<string | null>(() => {
        return localStorage.getItem('zimage_result');
    });

    useEffect(() => {
        if (resultImageUrl) {
            try {
                localStorage.setItem('zimage_result', resultImageUrl);
            } catch (e) {
                // Ignore result saving failures
            }
        }
    }, [resultImageUrl]);

    console.log(`[STORAGE] Params size: ${JSON.stringify(params).length} chars`);

    const [error, setError] = useState<string | null>(null);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [globalPrompts, setGlobalPrompts] = useState<string[]>([]);
    const [isLoraModalOpen, setIsLoraModalOpen] = useState(false);
    const [availableLoras, setAvailableLoras] = useState<string[]>([]);
    const [loraSearch, setLoraSearch] = useState('');
    const [depthImageUrl, setDepthImageUrl] = useState<string | null>(null);

    const [comfyLoras, setComfyLoras] = useState<string[]>([]);

    const fetchLoras = () => {
        fetch('/list-loras')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setAvailableLoras(data);
            })
            .catch(err => console.error("Failed to load LoRAs", err));

        // Get the definitive list from ComfyUI itself
        fetch('/comfy-api/object_info/LoraLoaderModelOnly')
            .then(res => res.json())
            .then(data => {
                const list = data?.LoraLoaderModelOnly?.input?.required?.lora_name?.[0];
                if (list && Array.isArray(list)) {
                    setComfyLoras(list);
                    console.log("[DEBUG] ComfyUI Internals:", list);
                }
            })
            .catch(() => { });
    };

    useEffect(() => {
        fetchLoras();
    }, []);

    useEffect(() => {
        if (isLoraModalOpen) {
            fetchLoras();
        }
    }, [isLoraModalOpen]);

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

    const handleDepthImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setDepthImageUrl(base64);
            setParams(prev => ({ ...prev, depth_image: base64 }));
        };
        reader.readAsDataURL(file);
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);

        try {
            const result = await ComfyUiService.runZImageWorkflow(params);
            setResultImageUrl(result.imageUrl);

            // Auto-save to gallery
            try {
                const timestamp = Date.now();
                await fetch('/save-slice', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: result.imageUrl,
                        filename: `zimage_${timestamp}.png`,
                        folder: '.',
                        targetDir: 'z_image',
                        metadata: {
                            prompt: params.prompt,
                            negative_prompt: params.negative_prompt,
                            width: params.width,
                            height: params.height,
                            steps: params.steps,
                            cfg: params.cfg,
                            engine: params.engine || 'z-image',
                            sampler_name: params.sampler_name,
                            scheduler: params.scheduler,
                            loras: params.loras,
                            timestamp
                        }
                    })
                });
            } catch (saveErr) {
                console.error("Failed to auto-save Z-Image", saveErr);
            }
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

            {/* LoRA Selection Modal */}
            {isLoraModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => {
                    setIsLoraModalOpen(false);
                    setLoraSearch('');
                }}>
                    <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <h3 className="text-lg font-bold text-white">Select LoRA</h3>
                                {comfyLoras.length > 0 && (
                                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                                        Synced with ComfyUI: {comfyLoras.length} items
                                    </span>
                                )}
                            </div>
                            <button onClick={() => {
                                setIsLoraModalOpen(false);
                                setLoraSearch('');
                            }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search LoRAs..."
                                value={loraSearch}
                                onChange={(e) => setLoraSearch(e.target.value)}
                                autoFocus
                                className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-3 pl-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                            />
                            <svg className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {availableLoras.filter(l => l.toLowerCase().includes(loraSearch.toLowerCase())).length === 0 ? (
                                <div className="text-center py-8 text-slate-500">No matching LoRAs found</div>
                            ) : (
                                availableLoras
                                    .filter(l => l.toLowerCase().includes(loraSearch.toLowerCase()))
                                    .map((lora) => (
                                        <button
                                            key={lora}
                                            onClick={() => {
                                                // SMART MATCH: Try to find this exact lora in ComfyUI's internal list
                                                let targetName = lora;

                                                // 1. Try normalizes slashes
                                                const normalized = lora.replace(/\\/g, '/');
                                                const backslashed = lora.replace(/\//g, '\\');

                                                const match = comfyLoras.find(c =>
                                                    c === normalized ||
                                                    c === backslashed ||
                                                    c === lora ||
                                                    c.replace(/\\/g, '/') === normalized ||
                                                    c.replace('.safetensors', '') === normalized.replace('.safetensors', '')
                                                );

                                                if (match) {
                                                    console.log(`[LORAS] Smart matched "${lora}" to internal name: "${match}"`);
                                                    targetName = match;
                                                }

                                                const currentIdx = (params.loras || []).findIndex(l => l.name === targetName);
                                                if (currentIdx === -1) {
                                                    setParams(p => ({ ...p, loras: [...(p.loras || []), { name: targetName, strength: 1.0 }] }));
                                                }
                                                setIsLoraModalOpen(false);
                                                setLoraSearch('');
                                            }}
                                            className="w-full text-left p-3 rounded-xl bg-slate-800/50 hover:bg-purple-600/20 hover:border-purple-500/30 border border-transparent transition-all group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-slate-300 group-hover:text-purple-300 transition-colors truncate">
                                                    {lora}
                                                </span>
                                                {(params.loras || []).some(l => l.name === lora) && (
                                                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded uppercase font-bold">Applied</span>
                                                )}
                                            </div>
                                        </button>
                                    ))
                            )}
                        </div>
                        {comfyLoras.length > 0 && (
                            <div className="pt-2 border-t border-slate-800">
                                <details className="group">
                                    <summary className="text-[10px] font-bold text-slate-600 cursor-pointer hover:text-slate-400 transition-colors uppercase tracking-widest list-none flex items-center gap-2">
                                        <svg className="w-3 h-3 group-open:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                        </svg>
                                        Inspect ComfyUI Internal List
                                    </summary>
                                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[9px] font-mono text-slate-500 bg-black/30 p-3 rounded-xl max-h-32 overflow-y-auto custom-scrollbar">
                                        {comfyLoras.sort().map((c, i) => (
                                            <div key={i} className="truncate" title={c}>{c}</div>
                                        ))}
                                    </div>
                                </details>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className={`max-w-6xl mx-auto py-8 px-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 transition-all ${isLibraryOpen ? 'pl-80 blur-[2px]' : ''}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            Image Generator
                        </h2>
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={() => setParams(prev => ({ ...prev, engine: 'z-image' }))}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${params.engine === 'z-image' || !params.engine ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}
                            >
                                Z-Image
                            </button>
                            <button
                                onClick={() => setParams(prev => ({ ...prev, engine: 'qwen', steps: 6 }))}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${params.engine === 'qwen' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}
                            >
                                Qwen-Image
                            </button>
                        </div>
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
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating || !params.prompt}
                                    className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-[0.98] mt-2"
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
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setParams(p => ({ ...p, steps: Math.max(1, p.steps - 1) }))}
                                                className="w-4 h-4 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                                                </svg>
                                            </button>
                                            <span className="text-[10px] font-bold text-cyan-400 w-4 text-center">{params.steps}</span>
                                            <button
                                                onClick={() => setParams(p => ({ ...p, steps: Math.min(30, p.steps + 1) }))}
                                                className="w-4 h-4 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                                </svg>
                                            </button>
                                        </div>
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
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setParams(p => ({ ...p, cfg: Math.max(1, parseFloat(((p.cfg || 1) - 0.1).toFixed(1))) }))}
                                                className="w-4 h-4 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                                                </svg>
                                            </button>
                                            <span className="text-[10px] font-bold text-purple-400 w-6 text-center">{params.cfg || 1}</span>
                                            <button
                                                onClick={() => setParams(p => ({ ...p, cfg: Math.min(7, parseFloat(((p.cfg || 1) + 0.1).toFixed(1))) }))}
                                                className="w-4 h-4 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                                </svg>
                                            </button>
                                        </div>
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

                            {/* LoRA Section */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">LoRAs</label>
                                    <button
                                        onClick={() => setIsLoraModalOpen(true)}
                                        className="p-1 px-2 bg-slate-800 hover:bg-purple-500/20 hover:text-purple-400 rounded-lg text-slate-400 transition-all flex items-center gap-2"
                                        title="Add LoRA"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        <span className="text-[9px] font-black uppercase tracking-widest">Add</span>
                                    </button>
                                </div>
                                {params.loras && params.loras.length > 0 ? (
                                    <div className="space-y-2">
                                        {params.loras.map((lora, idx) => (
                                            <div key={idx} className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-300 truncate max-w-[180px]" title={lora.name}>
                                                        {lora.name}
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            const newLoras = [...(params.loras || [])];
                                                            newLoras.splice(idx, 1);
                                                            setParams({ ...params, loras: newLoras });
                                                        }}
                                                        className="text-slate-500 hover:text-red-400 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[9px] uppercase font-bold text-slate-500 w-8">Str</span>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="2"
                                                        step="0.05"
                                                        value={lora.strength}
                                                        onChange={(e) => {
                                                            const newLoras = [...(params.loras || [])];
                                                            newLoras[idx] = { ...lora, strength: parseFloat(e.target.value) };
                                                            setParams({ ...params, loras: newLoras });
                                                        }}
                                                        className="flex-1 accent-purple-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                                    />
                                                    <span className="text-[9px] font-mono font-bold text-purple-400 w-8 text-right">{lora.strength.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center p-4 border border-dashed border-slate-800 rounded-xl text-slate-600 text-xs">
                                        No LoRAs applied
                                    </div>
                                )}
                            </div>

                            {/* Depth Image Upload */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Depth Image (Optional)</label>
                                    {(depthImageUrl || params.depth_image) && (
                                        <button
                                            onClick={() => {
                                                setDepthImageUrl(null);
                                                setParams(prev => {
                                                    const next = { ...prev };
                                                    delete next.depth_image;
                                                    return next;
                                                });
                                            }}
                                            className="p-1 px-2 bg-red-500/10 text-red-400 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-red-500/20 hover:bg-red-500/20 transition-all"
                                        >
                                            Clear All Depth Data
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    {(depthImageUrl || params.depth_image) ? (
                                        <div className="space-y-4">
                                            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                                                {depthImageUrl ? (
                                                    <img src={depthImageUrl} alt="Depth" className="w-16 h-16 object-cover rounded-lg" />
                                                ) : (
                                                    <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center">
                                                        <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <p className="text-xs text-green-400 font-bold">ControlNet Active</p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">Using depth-based guidance workflow</p>
                                                </div>
                                            </div>

                                            {/* Depth Strength Slider */}
                                            <div className="space-y-2 p-3 bg-slate-950/30 border border-slate-800/50 rounded-xl">
                                                <div className="flex justify-between items-center px-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Depth Strength</label>
                                                    <span className="text-[10px] font-bold text-cyan-400 font-mono">{(params.depth_strength ?? 1.0).toFixed(2)}</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0.05"
                                                    max="1.5"
                                                    step="0.05"
                                                    value={params.depth_strength ?? 1.0}
                                                    onChange={(e) => setParams({ ...params, depth_strength: parseFloat(e.target.value) })}
                                                    className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                                />
                                                <div className="flex justify-between px-1 text-[8px] text-slate-600 font-bold uppercase tracking-tighter">
                                                    <span>Subtle</span>
                                                    <span>Standard</span>
                                                    <span>Force</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <label className="block cursor-pointer">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleDepthImageUpload}
                                                className="hidden"
                                            />
                                            <div className="w-full bg-slate-950/50 border border-dashed border-slate-800 rounded-xl p-4 text-center hover:border-cyan-500/30 hover:bg-slate-900/50 transition-all">
                                                <svg className="w-8 h-8 text-slate-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                </svg>
                                                <p className="text-xs text-slate-500">Upload depth reference image</p>
                                                <p className="text-[9px] text-slate-600 mt-1">Leave empty for standard workflow</p>
                                            </div>
                                        </label>
                                    )}
                                </div>
                            </div>


                            {params.engine !== 'qwen' && (
                                <div className="space-y-4">
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

                                    {/* Model Selection */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">UNET Model</label>
                                        <select
                                            value={params.unet_model || "zImage_turbo.safetensors"}
                                            onChange={(e) => setParams({ ...params, unet_model: e.target.value })}
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 appearance-none"
                                        >
                                            <option value="zImage_turbo.safetensors">Z-Image Turbo</option>
                                            <option value="novaRealityZI_v15Turbo.safetensors">Nova Reality v1.5 Turbo</option>
                                        </select>
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
                                </div>
                            )}

                        </div>
                    </div>

                    {/* VIEWPORT PANEL */}
                    <div className="lg:col-span-8 flex flex-col gap-4">
                        <div
                            className={`flex-1 bg-slate-900/30 border border-slate-800 rounded-3xl overflow-hidden relative group min-h-[512px] flex items-center justify-center p-4 transition-all ${resultImageUrl ? 'cursor-zoom-in hover:border-cyan-500/30' : ''}`}
                            onClick={() => resultImageUrl && onPreviewImage?.(resultImageUrl)}
                        >
                            {resultImageUrl ? (
                                <>
                                    <img
                                        src={resultImageUrl}
                                        alt="Generated Result"
                                        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-700"
                                    />
                                    <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                        <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white text-xs font-bold uppercase tracking-widest translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                                            Click to Preview
                                        </div>
                                    </div>
                                    {isGenerating && (
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-cyan-600/90 backdrop-blur-sm rounded-xl text-white text-xs font-bold uppercase tracking-wider shadow-xl">
                                            Generating...
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center space-y-4 opacity-30 group-hover:opacity-50 transition-opacity">
                                    <svg className="w-24 h-24 text-slate-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-sm font-medium tracking-tight">Enter a prompt and click generate to begin</p>
                                </div>
                            )}

                            {resultImageUrl && (
                                <div className="absolute top-4 right-4 animate-in fade-in duration-500">
                                    <div className="flex bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                                        {/* Status indicator or something subtle can go here if needed, 
                                            but we are moving the main buttons below */}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons Below Image */}
                        {resultImageUrl && (
                            <div className="flex flex-wrap items-center justify-center gap-4 animate-in slide-in-from-bottom-2 duration-500">
                                <button
                                    onClick={() => {
                                        setDepthImageUrl(resultImageUrl);
                                        setParams(prev => ({ ...prev, depth_image: resultImageUrl }));
                                    }}
                                    className="flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 group/ref border border-white/10"
                                >
                                    <svg className="w-5 h-5 group-hover:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357-2H15" />
                                    </svg>
                                    Use as Reference
                                </button>
                                {onSendToQwen && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onSendToQwen({ imageUrl: resultImageUrl, prompt: params.prompt })}
                                            className="flex items-center gap-3 px-8 py-4 bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-700/20 transition-all active:scale-95 group/qwen border border-white/10"
                                            title="Edit with Qwen (Single)"
                                        >
                                            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            Edit with Qwen
                                        </button>
                                        <button
                                            onClick={() => onSendToQwen({ imageUrl: resultImageUrl, prompt: params.prompt, targetMode: 'double' })}
                                            className="flex items-center gap-3 px-6 py-4 bg-indigo-700 hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-700/20 transition-all active:scale-95 group/qwen-double border border-white/10"
                                            title="Send to Double Sub Page"
                                        >
                                            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                            </svg>
                                            Qwen Double
                                        </button>
                                    </div>
                                )}
                                {onSendToTurbo && (
                                    <button
                                        onClick={() => onSendToTurbo({ imageUrl: resultImageUrl, prompt: params.prompt })}
                                        className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-500/20 transition-all active:scale-95 group/anim border border-white/10"
                                    >
                                        <svg className="w-5 h-5 group-hover:animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        Animate in TurboWan
                                    </button>
                                )}
                                {onSendToUpscale && (
                                    <button
                                        onClick={() => onSendToUpscale(resultImageUrl, params.prompt)}
                                        className="flex items-center gap-3 px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-cyan-500/20 transition-all active:scale-95 group/upscale border border-white/10"
                                    >
                                        <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                        </svg>
                                        Send to Upscale
                                    </button>
                                )}
                                <a
                                    href={resultImageUrl}
                                    download="z-image.png"
                                    className="flex items-center gap-3 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all active:scale-95 border border-white/10"
                                    title="Download Image"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
