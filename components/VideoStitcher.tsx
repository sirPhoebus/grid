import React, { useState, useEffect } from 'react';
import { ComfyUiService } from '../services/comfyUiService';

interface MediaFolder {
    name: string;
    files: { url: string; duration?: string; time?: string }[];
}

interface MediaData {
    turbowan: MediaFolder[];
}

export const VideoStitcher: React.FC<{ onNavigateToGallery: () => void }> = ({ onNavigateToGallery }) => {
    const [folders, setFolders] = useState<MediaFolder[]>([]);
    const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
    const [isStitching, setIsStitching] = useState(false);
    const [resultVideo, setResultVideo] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/list-media')
            .then(res => res.json())
            .then(data => {
                setFolders(data.turbowan || []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load videos", err);
                setError("Failed to load video library");
                setLoading(false);
            });
    }, []);

    const toggleVideoSelection = (url: string) => {
        setSelectedVideos(prev =>
            prev.includes(url)
                ? prev.filter(v => v !== url)
                : [...prev, url]
        );
    };

    const handleStitch = async () => {
        if (selectedVideos.length < 2) {
            alert("Please select at least two videos to stitch.");
            return;
        }

        setIsStitching(true);
        setError(null);
        setResultVideo(null);

        try {
            // Remove /media/ prefix for the backend service if needed
            // The backend expects paths relative to media/
            const videoPaths = selectedVideos.map(url => url.replace('/media/', ''));
            const resultUrl = await ComfyUiService.stitchVideos(videoPaths);
            setResultVideo(resultUrl);
        } catch (err: any) {
            console.error("Stitching failed", err);
            setError(err.message || "Failed to stitch videos. Make sure ffmpeg is installed on the server.");
        } finally {
            setIsStitching(false);
        }
    };

    const moveVideo = (index: number, direction: 'up' | 'down') => {
        const newSelected = [...selectedVideos];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newSelected.length) return;

        [newSelected[index], newSelected[targetIndex]] = [newSelected[targetIndex], newSelected[index]];
        setSelectedVideos(newSelected);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Video <span className="text-indigo-400">Stitcher</span></h2>
                    <p className="text-slate-400 mt-1">Combine multiple segments into a cinematic experience.</p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={handleStitch}
                        disabled={selectedVideos.length < 2 || isStitching}
                        className={`px-8 py-3 rounded-2xl font-bold transition-all shadow-xl flex items-center gap-3 ${selectedVideos.length < 2 || isStitching
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:scale-105 active:scale-95 shadow-indigo-500/20'
                            }`}
                    >
                        {isStitching ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Stitching...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Stitch {selectedVideos.length} Videos
                            </>
                        )}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-center gap-3">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                </div>
            )}

            {resultVideo && (
                <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-8 space-y-6 shadow-2xl animate-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold">Stitching Complete!</h3>
                        </div>
                        <button
                            onClick={onNavigateToGallery}
                            className="text-indigo-400 hover:text-indigo-300 font-semibold px-4 py-2 hover:bg-white/5 rounded-lg transition-all"
                        >
                            View in Gallery →
                        </button>
                    </div>
                    <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
                        <video src={resultVideo} controls className="w-full h-full" autoPlay loop muted />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Selection Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-md h-fit">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                            </svg>
                            Stitching Order
                        </h3>
                        {selectedVideos.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl">
                                <p className="text-slate-500 text-sm">Select videos from the library to start stitching.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {selectedVideos.map((url, idx) => (
                                    <div key={url} className="group flex items-center gap-3 bg-slate-800/80 p-3 rounded-2xl border border-slate-700/50 hover:border-indigo-500/30 transition-all">
                                        <div className="w-16 h-10 bg-black rounded-lg overflow-hidden flex-shrink-0">
                                            <video src={url} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0 pr-2">
                                            <p className="text-xs text-slate-400 font-mono truncate">{url.split('/').pop()}</p>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => moveVideo(idx, 'up')}
                                                className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => moveVideo(idx, 'down')}
                                                className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => toggleVideoSelection(url)}
                                                className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <div className="pt-4 text-center">
                                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Selected {selectedVideos.length} segments</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Video Library */}
                <div className="lg:col-span-2 space-y-6">
                    {folders.length === 0 ? (
                        <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-slate-800 border-dashed">
                            <p className="text-slate-500 text-lg">No Wan segments found yet.</p>
                            <p className="text-indigo-400 text-sm font-medium mt-2">Generate some videos in TurboWan first!</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {folders.map(folder => (
                                <div key={folder.name} className="space-y-4">
                                    <div className="flex items-center gap-2 px-2">
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                        <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">{folder.name.split('_').slice(0, -1).join(' ') || folder.name}</h4>
                                        <div className="h-px flex-1 bg-slate-800 ml-2"></div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {folder.files.filter(f => f.url.endsWith('.mp4') || f.url.endsWith('.webm')).map(file => (
                                            <div
                                                key={file.url}
                                                onClick={() => toggleVideoSelection(file.url)}
                                                className={`group relative aspect-video rounded-2xl overflow-hidden cursor-pointer border-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${selectedVideos.includes(file.url)
                                                    ? 'border-indigo-500 ring-4 ring-indigo-500/20 shadow-2xl'
                                                    : 'border-slate-800 hover:border-slate-600'
                                                    }`}
                                            >
                                                <video
                                                    src={file.url}
                                                    className="w-full h-full object-cover"
                                                    onMouseEnter={e => e.currentTarget.play()}
                                                    onMouseLeave={e => {
                                                        e.currentTarget.pause();
                                                        e.currentTarget.currentTime = 0;
                                                    }}
                                                    muted
                                                    loop
                                                />
                                                <div className={`absolute inset-0 bg-indigo-600/20 transition-opacity ${selectedVideos.includes(file.url) ? 'opacity-100' : 'opacity-0'}`} />

                                                {/* Selection Badge */}
                                                <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${selectedVideos.includes(file.url)
                                                    ? 'bg-indigo-500 border-indigo-400 text-white scale-110'
                                                    : 'bg-black/40 border-white/20 text-transparent'
                                                    }`}>
                                                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>

                                                {/* Selection Index */}
                                                {selectedVideos.includes(file.url) && (
                                                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-indigo-500 rounded-lg text-[10px] font-black text-white shadow-lg">
                                                        #{selectedVideos.indexOf(file.url) + 1}
                                                    </div>
                                                )}

                                                {file.time && (
                                                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 rounded text-[10px] font-bold text-white shadow-lg backdrop-blur-sm border border-white/10 group-hover:hidden">
                                                        {new Date(file.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                                                    </div>
                                                )}

                                                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                                    <p className="text-[10px] font-mono text-slate-300 truncate">{file.url.split('/').pop()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
