
import React, { useState, useRef, useEffect } from 'react';
import { ComfyUiService } from '../services/comfyUiService';
import { PromptLibrary, addPromptToLibrary } from './PromptLibrary';

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

const XMarkIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const DocumentDuplicateIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
    </svg>
);

interface BatchItem {
    id: string;
    sourceImage: string;
    resultImage?: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    error?: string;
    filename?: string;
}

interface BatchPageProps {
    onPreviewImage?: (url: string) => void;
    onSendToTurbo?: (data: { imageUrl: string, prompt: string }) => void;
    onSendToUpscale?: (imageUrl: string, prompt: string) => void;
}

export const BatchPage: React.FC<BatchPageProps> = ({ onPreviewImage, onSendToTurbo, onSendToUpscale }) => {
    const [prompt, setPrompt] = useState('make the image cinematic with high contrast');
    const [items, setItems] = useState<BatchItem[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const itemsRef = useRef<BatchItem[]>(items);

    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newItems: BatchItem[] = [];
        Array.from(files).forEach((file: File, index) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const sourceImage = event.target?.result as string;
                setItems(prev => [...prev, {
                    id: `${Date.now()}-${index}`,
                    sourceImage,
                    status: 'pending',
                    filename: file.name
                }]);
            };
            reader.readAsDataURL(file);
        });
    };

    const clearBatch = () => {
        if (isGenerating) return;
        setItems([]);
        setCurrentIndex(-1);
    };

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const savePrompt = (text: string) => {
        if (!text) return;
        addPromptToLibrary(text);
    };

    const handleSaveToGallery = async (imageUrl: string, prefix: string) => {
        try {
            const filename = `${prefix}_${Date.now()}.png`;
            await fetch('/save-slice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: imageUrl,
                    filename: filename,
                    folder: '.',
                    targetDir: 'qwen_gallery'
                })
            });
        } catch (err) {
            console.error('Failed to save to gallery', err);
        }
    };

    const runBatch = async () => {
        if (items.length === 0 || isGenerating) return;

        setIsGenerating(true);

        while (true) {
            const currentItems = itemsRef.current;
            const nextItem = currentItems.find(it => it.status === 'pending' || it.status === 'error');

            if (!nextItem) break;

            const itemId = nextItem.id;
            setCurrentIndex(itemsRef.current.findIndex(it => it.id === itemId));

            setItems(prev => prev.map(it => it.id === itemId ? { ...it, status: 'processing' } : it));

            try {
                const result = await ComfyUiService.runQwenSingleEditWorkflow(nextItem.sourceImage, prompt);

                // If item was removed during processing, just skip
                const itemStillExists = itemsRef.current.find(it => it.id === itemId);
                if (itemStillExists) {
                    setItems(prev => prev.map(it => it.id === itemId ? { ...it, status: 'completed', resultImage: result.resultUrl } : it));
                    await handleSaveToGallery(result.resultUrl, 'batch_qwen');
                }
            } catch (err: any) {
                const itemStillExists = itemsRef.current.find(it => it.id === itemId);
                if (itemStillExists) {
                    setItems(prev => prev.map(it => it.id === itemId ? { ...it, status: 'error', error: err.message || 'Failed' } : it));
                }
            }
        }

        setIsGenerating(false);
        setCurrentIndex(-1);
    };

    const completedCount = items.filter(i => i.status === 'completed').length;
    const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

    return (
        <div className="bg-slate-950 text-slate-100 rounded-3xl p-8 border border-slate-800 shadow-2xl animate-in fade-in duration-500">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6 gap-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <DocumentDuplicateIcon className="w-6 h-6 text-emerald-400" />
                            </div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">Qwen Batch Pro</h1>
                        </div>
                        <p className="text-slate-400 mt-2 font-medium">Bulk Image Processing Pipeline</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {items.length > 0 && (
                            <button
                                onClick={clearBatch}
                                disabled={isGenerating}
                                className="px-6 py-2 bg-slate-900 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-xl text-sm font-bold transition-all border border-slate-800 hover:border-red-500/30 disabled:opacity-50"
                            >
                                Clear Batch
                            </button>
                        )}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isGenerating}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowUpTrayIcon className="w-4 h-4" />
                            Add Images
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            multiple
                            onChange={handleFileUpload}
                        />
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar: Controls */}
                    <div className="lg:col-span-1 space-y-6">
                        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl sticky top-24">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <SparklesIcon className="w-5 h-5 text-blue-400" /> Batch Prompt
                                </h2>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsLibraryOpen(true)}
                                        className="p-1 px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-slate-700 transition-all"
                                    > Lib </button>
                                </div>
                            </div>

                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm focus:ring-2 focus:ring-emerald-500 outline-none h-40 resize-none transition-all placeholder:text-slate-700 font-medium leading-relaxed"
                                placeholder="Describe the transformation for the whole batch..."
                                disabled={isGenerating}
                            />

                            <div className="space-y-3 pt-2">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                                    <span>Progress</span>
                                    <span>{completedCount} / {items.length}</span>
                                </div>
                                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 shadow-inner">
                                    <div
                                        className={`h-full transition-all duration-500 rounded-full ${isGenerating ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 animate-pulse' : 'bg-emerald-600'}`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={runBatch}
                                disabled={isGenerating || items.length === 0}
                                className={`w-full py-5 rounded-xl flex items-center justify-center gap-3 font-bold text-lg transition-all duration-300 shadow-xl ${isGenerating || items.length === 0
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                    : 'bg-gradient-to-r from-emerald-600 to-cyan-700 hover:from-emerald-500 hover:to-cyan-600 text-white hover:scale-[1.02] shadow-emerald-500/10 border border-emerald-500/30'
                                    }`}
                            >
                                {isGenerating ? (
                                    <>
                                        <ArrowPathIcon className="w-6 h-6 animate-spin" />
                                        Processing Batch...
                                    </>
                                ) : (
                                    <>
                                        <SparklesIcon className="w-6 h-6" />
                                        Launch Batch
                                    </>
                                )}
                            </button>
                        </section>
                    </div>

                    {/* Main Content: Batch List */}
                    <div className="lg:col-span-3 space-y-6">
                        {items.length === 0 ? (
                            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-slate-900/20 rounded-3xl border border-slate-800 border-dashed transition-colors hover:bg-slate-900/40 group">
                                <div
                                    className="p-10 bg-slate-900 rounded-full mb-6 border border-slate-800 shadow-2xl group-hover:scale-110 transition-transform duration-500 cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <DocumentDuplicateIcon className="w-20 h-20 text-slate-800 group-hover:text-emerald-500 transition-colors" />
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="text-slate-400 font-bold text-2xl tracking-tight">Your Batch is Empty</p>
                                    <p className="text-slate-600 font-medium px-4">Drag and drop or click "Add Images" to build your processing queue.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                                {items.map((item, idx) => (
                                    <div
                                        key={item.id}
                                        className={`bg-slate-900 border rounded-2xl p-4 space-y-4 shadow-lg transition-all duration-500 ${idx === currentIndex ? 'ring-2 ring-cyan-500 border-cyan-500 scale-[1.02] bg-slate-900/80 shadow-cyan-500/10' :
                                            item.status === 'completed' ? 'border-emerald-500/30' : 'border-slate-800'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.status === 'processing' ? 'bg-cyan-500/20 text-cyan-400 animate-pulse' :
                                                    item.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        item.status === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-500'
                                                    }`}>
                                                    {item.status === 'processing' ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> :
                                                        item.status === 'completed' ? <CheckCircleIcon className="w-4 h-4" /> :
                                                            idx + 1}
                                                </div>
                                                <span className="text-xs font-mono text-slate-400 truncate" title={item.filename}>
                                                    {item.filename || `Item ${idx + 1}`}
                                                </span>
                                            </div>
                                            <button onClick={() => removeItem(item.id)} className="text-slate-600 hover:text-red-400 p-1 hover:bg-red-500/10 rounded-lg transition-all group-hover:visible" title="Remove from batch">
                                                <XMarkIcon className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 aspect-[2/1]">
                                            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 group/img">
                                                <img src={item.sourceImage} className="w-full h-full object-cover" alt="Source" />
                                                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-black uppercase text-white border border-white/10">Input</div>
                                            </div>
                                            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center group/img">
                                                {item.resultImage ? (
                                                    <>
                                                        <img src={item.resultImage} className="w-full h-full object-cover animate-in fade-in duration-700" alt="Result" />
                                                        <div className="absolute top-2 left-2 bg-emerald-500 px-2 py-0.5 rounded text-[8px] font-black uppercase text-white shadow-lg shadow-emerald-500/20">Result</div>
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                                                            <button
                                                                onClick={() => onPreviewImage?.(item.resultImage!)}
                                                                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white border border-white/20 transition-all"
                                                                title="Preview"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => onSendToUpscale?.(item.resultImage!, prompt)}
                                                                className="p-1.5 bg-indigo-500/20 hover:bg-indigo-500 rounded-lg text-indigo-400 hover:text-white border border-indigo-500/30 transition-all"
                                                                title="Upscale"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : item.status === 'processing' ? (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <ArrowPathIcon className="w-8 h-8 text-cyan-500 animate-spin" />
                                                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Rendering...</span>
                                                    </div>
                                                ) : item.status === 'error' ? (
                                                    <div className="text-center p-2">
                                                        <p className="text-red-400 text-[10px] font-bold uppercase mb-1">Error</p>
                                                        <p className="text-slate-600 text-[8px] line-clamp-2">{item.error}</p>
                                                    </div>
                                                ) : (
                                                    <div className="text-slate-800 font-bold text-[10px] uppercase tracking-tighter italic">Queue Pending</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <PromptLibrary
                isOpen={isLibraryOpen}
                onClose={() => setIsLibraryOpen(false)}
                onSelectPrompt={(p) => {
                    setPrompt(p);
                    setIsLibraryOpen(false);
                }}
            />
        </div>
    );
};

const CheckCircleIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
