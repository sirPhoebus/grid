
import React from 'react';

interface PromptPageProps {
    data: {
        imageUrl: string;
        prompt: string;
        metadata?: any;
    } | null;
    onBack: () => void;
    onSendToTurbo?: (data: { imageUrl: string, prompt: string }) => void;
    onSendToUpscale?: (imageUrl: string, prompt: string) => void;
    onSendToQwen?: (data: { imageUrl: string, prompt: string }) => void;
}

export const PromptPage: React.FC<PromptPageProps> = ({ data, onBack, onSendToTurbo, onSendToUpscale, onSendToQwen }) => {
    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
                <p>No image selected for metadata view.</p>
                <button onClick={onBack} className="mt-4 text-indigo-400 hover:underline">Go back to Gallery</button>
            </div>
        );
    }

    const { imageUrl, prompt, metadata } = data;

    // Logic to determine what to show as the "main" prompt
    const displayPrompt = (() => {
        if (!prompt) return "No prompt available";
        if (typeof prompt === 'string' && prompt.startsWith('{') && metadata?.extracted_prompt) return metadata.extracted_prompt;
        if (typeof prompt === 'string' && prompt.startsWith('{')) return "Complex Graph Data (See Parameters)";
        return prompt;
    })();

    const isComfyUI = metadata?.prompt || metadata?.workflow;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 text-slate-200">
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
                >
                    <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Gallery
                </button>
                <div className="text-right">
                    <h2 className="text-2xl font-bold text-white">Image Artifact Details</h2>
                    {isComfyUI && (
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/30 font-bold uppercase tracking-widest">
                            ComfyUI Metadata Detected
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Image Preview */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative group ring-1 ring-white/5">
                        <img
                            src={imageUrl}
                            alt="Artifact"
                            className="w-full h-auto object-contain max-h-[75vh] mx-auto transition-transform duration-700 hover:scale-[1.02]"
                        />
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {onSendToUpscale && (
                            <button
                                onClick={() => onSendToUpscale(imageUrl, displayPrompt)}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5" />
                                </svg>
                                Upscale
                            </button>
                        )}
                        {onSendToTurbo && (
                            <button
                                onClick={() => onSendToTurbo({ imageUrl, prompt: displayPrompt })}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-purple-600/20 active:scale-95 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Animate
                            </button>
                        )}
                        {onSendToQwen && (
                            <button
                                onClick={() => onSendToQwen({ imageUrl, prompt: displayPrompt })}
                                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-cyan-600/20 active:scale-95 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit with Qwen
                            </button>
                        )}
                    </div>
                </div>

                {/* Metadata Details */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 border-b-indigo-500/50 shadow-xl backdrop-blur-md relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[80px] rounded-full -mr-10 -mt-10" />

                        <section className="space-y-3 relative z-10">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                                Primary Prompt
                            </h3>
                            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 text-sm text-slate-300 leading-relaxed italic max-h-[300px] overflow-y-auto custom-scrollbar">
                                "{displayPrompt}"
                            </div>
                        </section>

                        {(metadata || isComfyUI) && (
                            <section className="space-y-4 pt-4 border-t border-slate-800 relative z-10">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                    Generation Parameters
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {metadata && Object.entries(metadata).map(([key, value]) => {
                                        if (key === 'prompt' || key === 'timestamp' || key === 'workflow' || key === 'extracted_prompt' || typeof value === 'object') return null;
                                        return (
                                            <div key={key} className="bg-slate-950/30 p-3 rounded-xl border border-slate-800/50 hover:border-slate-700 transition-colors">
                                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight mb-1">{key.replace('_', ' ')}</p>
                                                <p className="text-xs font-mono text-indigo-400 truncate" title={String(value)}>{String(value)}</p>
                                            </div>
                                        );
                                    })}
                                </div>

                                {(metadata?.prompt || metadata?.workflow) && (
                                    <div className="space-y-3 pt-2">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">ComfyUI Graphs</p>
                                        <div className="flex gap-2">
                                            {metadata.prompt && (
                                                <button
                                                    onClick={() => {
                                                        const blob = new Blob([typeof metadata.prompt === 'string' ? metadata.prompt : JSON.stringify(metadata.prompt, null, 2)], { type: 'application/json' });
                                                        const url = URL.createObjectURL(blob);
                                                        window.open(url, '_blank');
                                                    }}
                                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded-lg flex items-center gap-2 border border-slate-700 transition-all font-medium"
                                                >
                                                    View Prompt Graph
                                                </button>
                                            )}
                                            {metadata.workflow && (
                                                <button
                                                    onClick={() => {
                                                        const blob = new Blob([typeof metadata.workflow === 'string' ? metadata.workflow : JSON.stringify(metadata.workflow, null, 2)], { type: 'application/json' });
                                                        const url = URL.createObjectURL(blob);
                                                        window.open(url, '_blank');
                                                    }}
                                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded-lg flex items-center gap-2 border border-slate-700 transition-all font-medium"
                                                >
                                                    View Workflow JSON
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {metadata?.loras && Array.isArray(metadata.loras) && metadata.loras.length > 0 && (
                                    <div className="space-y-2 mt-4">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Active LoRAs</p>
                                        <div className="flex flex-wrap gap-2">
                                            {metadata.loras.map((lora: any, i: number) => (
                                                <div key={i} className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full text-[10px] text-purple-300 font-bold">
                                                    {lora.name} <span className="opacity-50 ml-1">@{lora.strength}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {metadata?.timestamp && (
                                    <div className="pt-4 text-center">
                                        <p className="text-[10px] text-slate-600 font-medium">Capture Timestamp: {new Date(metadata.timestamp).toLocaleString()}</p>
                                    </div>
                                )}
                            </section>
                        )}

                        {!metadata && !isComfyUI && (
                            <div className="pt-4 text-center">
                                <p className="text-xs text-slate-600 italic">No extended metadata available for this artifact.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
