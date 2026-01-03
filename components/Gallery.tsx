
import React, { useEffect, useState } from 'react';

interface MediaFolder {
    name: string;
    files: { url: string; duration?: string; time?: string; prompt?: string; metadata?: any }[];
}

interface MediaData {
    sliced_img: MediaFolder[];
    upscale: MediaFolder[];
    individual_upscale: MediaFolder[];
    turbowan: MediaFolder[];
    stitched: MediaFolder[];
    z_image: MediaFolder[];
    inverse: MediaFolder[];
    qwen_gallery: MediaFolder[];
}

interface GalleryProps {
    onSendToTurbo?: (data: { imageUrl: string, prompt: string }) => void;
    onSendToUpscale?: (imageUrl: string, prompt: string) => void;
    onSendToQwen?: (data: { imageUrl: string, prompt: string, targetMode?: 'single' | 'double' | 'triple' }) => void;
    onSendToPrompt?: (data: { imageUrl: string, prompt: string, metadata?: any }) => void;
}

export const Gallery: React.FC<GalleryProps> = ({ onSendToTurbo, onSendToUpscale, onSendToQwen, onSendToPrompt }) => {
    const [data, setData] = useState<MediaData>({
        sliced_img: [], upscale: [], individual_upscale: [], turbowan: [], stitched: [], z_image: [], inverse: [], qwen_gallery: []
    });
    const [activeTab, setActiveTab] = useState<'sliced_img' | 'upscale' | 'individual_upscale' | 'turbowan' | 'stitched' | 'z_image' | 'inverse' | 'qwen_gallery'>('z_image');
    const [loading, setLoading] = useState(true);
    const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
    const [isMediaVideo, setIsMediaVideo] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<Map<string, string>>(new Map()); // Map<fileUrl, folderName>
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    useEffect(() => {
        fetch('/list-media')
            .then(res => res.json())
            .then(data => {
                // Ensure all keys exist
                setData({
                    sliced_img: data.sliced_img || [],
                    upscale: data.upscale || [],
                    individual_upscale: data.individual_upscale || [],
                    turbowan: data.turbowan || [],
                    stitched: data.stitched || [],
                    z_image: data.z_image || [],
                    inverse: data.inverse || [],
                    qwen_gallery: data.qwen_gallery || []
                });
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load gallery", err);
                setLoading(false);
            });
    }, []);

    const activeData = data[activeTab];

    const navigateToImage = (direction: 'next' | 'prev') => {
        // Get all files from current view
        const allFiles: { url: string; isVideo: boolean }[] = [];
        activeData.forEach(folder => {
            folder.files.forEach(file => {
                const isVideo = file.url.endsWith('.mp4') || file.url.endsWith('.webm');
                allFiles.push({ url: file.url, isVideo });
            });
        });

        const currentIndex = allFiles.findIndex(f => f.url === selectedMedia);
        if (currentIndex === -1) return;

        let newIndex;
        if (direction === 'prev') {
            newIndex = currentIndex > 0 ? currentIndex - 1 : allFiles.length - 1;
        } else {
            newIndex = currentIndex < allFiles.length - 1 ? currentIndex + 1 : 0;
        }

        const newFile = allFiles[newIndex];
        setSelectedMedia(newFile.url);
        setIsMediaVideo(newFile.isVideo);
    };

    // ESC and Arrow key handlers for navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && selectedMedia) {
                setSelectedMedia(null);
            }

            // Arrow key navigation in preview mode
            if (selectedMedia && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                e.preventDefault();
                navigateToImage(e.key === 'ArrowLeft' ? 'prev' : 'next');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedMedia, activeData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const handleDelete = async (folderName: string) => {
        if (!confirm(`Are you sure you want to delete "${folderName}"? This cannot be undone.`)) return;

        try {
            const response = await fetch('/delete-media', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: activeTab, name: folderName })
            });

            if (response.ok) {
                // Refresh
                setLoading(true);
                const res = await fetch('/list-media');
                const newData = await res.json();
                setData(newData);
                setLoading(false);
            } else {
                alert("Failed to delete item");
            }
        } catch (e) {
            console.error("Delete failed", e);
            alert("Delete failed");
        }
    };

    const handleDeleteFile = async (folderName: string, fileName: string) => {
        if (!confirm(`Are you sure you want to delete this specific item?`)) return;

        try {
            const response = await fetch('/delete-media', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: activeTab,
                    name: folderName,
                    file: fileName.split('/').pop() // Ensure we only send the filename
                })
            });

            if (response.ok) {
                // Refresh
                setLoading(true);
                const res = await fetch('/list-media');
                const newData = await res.json();
                setData(newData);
                setLoading(false);
            } else {
                alert("Failed to delete item");
            }
        } catch (e) {
            console.error("Delete failed", e);
            alert("Delete failed");
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedFiles.size === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedFiles.size} selected item(s)?`)) return;

        try {
            // Delete all selected files
            const deletePromises = Array.from(selectedFiles.entries()).map(([fileUrl, folderName]) => {
                const fileName = fileUrl.split('/').pop()!;

                return fetch('/delete-media', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: activeTab,
                        name: folderName,
                        file: fileName
                    })
                });
            });

            await Promise.all(deletePromises);

            // Refresh and clear selection
            setLoading(true);
            const res = await fetch('/list-media');
            const newData = await res.json();
            setData(newData);
            setSelectedFiles(new Map());
            setIsSelectionMode(false);
            setLoading(false);
        } catch (e) {
            console.error("Batch delete failed", e);
            alert("Failed to delete selected items");
        }
    };

    const toggleFileSelection = (fileUrl: string, folderName: string) => {
        const newSelection = new Map(selectedFiles);
        if (newSelection.has(fileUrl)) {
            newSelection.delete(fileUrl);
        } else {
            newSelection.set(fileUrl, folderName);
        }
        setSelectedFiles(newSelection);
    };

    const selectAll = () => {
        const allFiles = new Map<string, string>();
        activeData.forEach(folder => {
            folder.files.forEach(file => allFiles.set(file.url, folder.name));
        });
        setSelectedFiles(allFiles);
    };

    const clearSelection = () => {
        setSelectedFiles(new Map());
        setIsSelectionMode(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Selection Mode Controls */}
            {isSelectionMode && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-slate-300">
                            <span className="font-bold text-cyan-400">{selectedFiles.size}</span> item(s) selected
                        </div>
                        <button
                            onClick={selectAll}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-all"
                        >
                            Select All
                        </button>
                        <button
                            onClick={clearSelection}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-all"
                        >
                            Clear Selection
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleDeleteSelected}
                            disabled={selectedFiles.size === 0}
                            className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete Selected
                        </button>
                        <button
                            onClick={() => setIsSelectionMode(false)}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="flex justify-center mb-8">
                <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl inline-flex flex-wrap gap-1 justify-center">
                    <button
                        onClick={() => setActiveTab('sliced_img')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'sliced_img'
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        Sliced Grids
                    </button>
                    <button
                        onClick={() => setActiveTab('upscale')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'upscale'
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        Video Assets
                    </button>
                    <button
                        onClick={() => setActiveTab('individual_upscale')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'individual_upscale'
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        Individual Upscales
                    </button>
                    <button
                        onClick={() => setActiveTab('turbowan')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'turbowan'
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        Video Segments
                    </button>
                    <button
                        onClick={() => setActiveTab('stitched')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'stitched'
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        Stitched Results
                    </button>
                    <button
                        onClick={() => setActiveTab('z_image')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'z_image'
                            ? 'bg-cyan-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        Z-Image
                    </button>
                    <button
                        onClick={() => setActiveTab('inverse')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'inverse'
                            ? 'bg-fuchsia-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        Inverse
                    </button>
                    <button
                        onClick={() => setActiveTab('qwen_gallery')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'qwen_gallery'
                            ? 'bg-emerald-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        Qwen Pro
                    </button>
                </div>
            </div>

            {/* Enable/Disable Selection Mode Button */}
            {activeData.length > 0 && !isSelectionMode && (
                <div className="flex justify-end">
                    <button
                        onClick={() => setIsSelectionMode(true)}
                        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        Multi-Select
                    </button>
                </div>
            )}

            {activeData.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-slate-800 border-dashed">
                    <p className="text-slate-500">No media found in this category.</p>
                </div>
            ) : (
                <div className="space-y-12">
                    {activeData.map((folder, folderIdx) => (
                        <div key={`${folder.name}-${folderIdx}`} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm relative group/card">
                            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-800/50">
                                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-200 truncate" title={folder.name}>
                                        {folder.name === 'Miscellaneous' ? 'Recent' : (folder.name.split('_').slice(0, -1).join(' ') || folder.name)}
                                    </h3>
                                    {folder.name !== 'Miscellaneous' && <p className="text-xs text-slate-500 font-mono">{folder.name.split('_').pop()}</p>}
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-400">
                                        {folder.files.length} items
                                    </div>
                                    {folder.name !== 'Miscellaneous' && (
                                        <button
                                            onClick={() => handleDelete(folder.name)}
                                            className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-all"
                                            title="Delete Series"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {folder.files.map((fileObj, idx) => {
                                    const file = fileObj.url;
                                    const isVideo = file.endsWith('.mp4') || file.endsWith('.webm');
                                    const isSelected = selectedFiles.has(file);
                                    return (
                                        <div
                                            key={idx}
                                            className={`bg-slate-800 rounded-2xl overflow-hidden border relative group cursor-pointer transition-all shadow-lg ${isSelected
                                                ? 'border-cyan-500 ring-2 ring-cyan-500/50'
                                                : 'border-slate-700 hover:ring-2 hover:ring-indigo-500/50'
                                                }`}
                                            onClick={() => {
                                                if (isSelectionMode) {
                                                    toggleFileSelection(file, folder.name);
                                                } else {
                                                    setSelectedMedia(file);
                                                    setIsMediaVideo(isVideo);
                                                }
                                            }}
                                        >
                                            <div className="relative">
                                                {/* Selection Checkbox */}
                                                {isSelectionMode && (
                                                    <div className="absolute top-2 left-2 z-10">
                                                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${isSelected
                                                            ? 'bg-cyan-500 border-cyan-500'
                                                            : 'bg-black/60 border-white/40 backdrop-blur-sm'
                                                            }`}>
                                                            {isSelected && (
                                                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {isVideo ? (
                                                    <video
                                                        src={file}
                                                        className="w-full aspect-video object-cover"
                                                        autoPlay
                                                        loop
                                                        muted
                                                        playsInline
                                                    />
                                                ) : (
                                                    <div className={`w-full ${activeTab === 'z_image' ? 'aspect-[2/3]' : 'aspect-video'} bg-slate-900 flex items-center justify-center overflow-hidden`}>
                                                        <img
                                                            src={file}
                                                            className={`w-full h-full ${activeTab === 'z_image' ? 'object-cover' : 'object-contain'} transition-transform group-hover:scale-105`}
                                                            loading="lazy"
                                                        />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />

                                                {isVideo && fileObj.duration && (
                                                    <div className={`absolute top-2 right-2 px-2 py-0.5 bg-black/60 rounded text-[10px] font-bold text-white shadow-lg backdrop-blur-sm border border-white/10 ${isSelectionMode ? 'opacity-50' : ''}`}>
                                                        {fileObj.duration}
                                                    </div>
                                                )}

                                                {!isSelectionMode && (
                                                    <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteFile(folder.name, file);
                                                            }}
                                                            className="bg-black/60 p-2 rounded-lg text-white hover:bg-red-600 transition-all backdrop-blur-md border border-white/10"
                                                            title="Delete Item"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                        <a
                                                            href={file}
                                                            download
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="bg-black/60 p-2 rounded-lg text-white hover:bg-indigo-600 transition-all backdrop-blur-md border border-white/10"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                            </svg>
                                                        </a>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onSendToUpscale?.(file, "From Gallery");
                                                            }}
                                                            className="bg-indigo-600/20 p-2 rounded-lg text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all backdrop-blur-md border border-indigo-500/30"
                                                            title="Upscale"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                                            </svg>
                                                        </button>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onSendToTurbo?.({ imageUrl: file, prompt: "From Gallery" });
                                                            }}
                                                            className="bg-purple-600/20 p-2 rounded-lg text-purple-400 hover:bg-purple-600 hover:text-white transition-all backdrop-blur-md border border-purple-500/30"
                                                            title="Video"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                            </svg>
                                                        </button>

                                                        {!isVideo && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onSendToQwen?.({ imageUrl: file, prompt: fileObj.prompt || "From Gallery" });
                                                                }}
                                                                className="bg-cyan-600/20 p-2 rounded-lg text-cyan-400 hover:bg-cyan-600 hover:text-white transition-all backdrop-blur-md border border-cyan-500/30"
                                                                title="Edit with Qwen"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                </svg>
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onSendToPrompt?.({ imageUrl: file, prompt: fileObj.prompt || "No prompt available", metadata: fileObj.metadata });
                                                            }}
                                                            className="bg-amber-600/20 p-2 rounded-lg text-amber-400 hover:bg-amber-600 hover:text-white transition-all backdrop-blur-md border border-amber-500/30"
                                                            title="View Prompt"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Preview */}
            {selectedMedia && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300"
                    onClick={() => setSelectedMedia(null)}
                >
                    <button
                        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all border border-white/10"
                        onClick={() => setSelectedMedia(null)}
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div
                        className="max-w-7xl max-h-[90vh] w-full flex flex-col md:flex-row items-center justify-center gap-6 animate-in zoom-in-95 duration-300 relative group"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Navigation Arrows */}
                        <button
                            onClick={() => navigateToImage('prev')}
                            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all border border-white/10 opacity-0 group-hover:opacity-100 hidden md:block"
                            title="Previous (Left Arrow)"
                        >
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <button
                            onClick={() => navigateToImage('next')}
                            className="absolute right-4 md:right-[220px] top-1/2 -translate-y-1/2 z-10 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all border border-white/10 opacity-0 group-hover:opacity-100 hidden md:block"
                            title="Next (Right Arrow)"
                        >
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>

                        {isMediaVideo ? (
                            <video
                                src={selectedMedia}
                                className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl border border-white/10"
                                controls
                                autoPlay
                                loop
                            />
                        ) : (
                            <img
                                src={selectedMedia}
                                className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl border border-white/10 object-contain"
                                alt="Full Preview"
                            />
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-row md:flex-col gap-4 min-w-[200px]" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => {
                                    onSendToUpscale?.(selectedMedia!, "From Gallery");
                                    setSelectedMedia(null);
                                }}
                                className="flex items-center gap-3 px-6 py-4 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl font-bold text-sm backdrop-blur-md border border-indigo-600/50 transition-all shadow-xl active:scale-95 w-full justify-center group"
                            >
                                <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                </svg>
                                Upscale
                            </button>

                            <button
                                onClick={() => {
                                    onSendToTurbo?.({ imageUrl: selectedMedia!, prompt: "From Gallery" });
                                    setSelectedMedia(null);
                                }}
                                className="flex items-center gap-3 px-6 py-4 bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white rounded-xl font-bold text-sm backdrop-blur-md border border-purple-600/50 transition-all shadow-xl active:scale-95 w-full justify-center group"
                            >
                                <svg className="w-5 h-5 group-hover:animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Generate Video
                            </button>

                            {!isMediaVideo && (
                                <button
                                    onClick={() => {
                                        onSendToQwen?.({ imageUrl: selectedMedia!, prompt: "From Gallery" });
                                        setSelectedMedia(null);
                                    }}
                                    className="flex items-center gap-3 px-6 py-4 bg-cyan-600/10 hover:bg-cyan-600 text-cyan-400 hover:text-white rounded-xl font-bold text-sm backdrop-blur-md border border-cyan-600/50 transition-all shadow-xl active:scale-95 w-full justify-center group"
                                >
                                    <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                    Edit with Qwen
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    // Need to find the file object to get metadata
                                    let foundFile = null;
                                    for (const folder of activeData) {
                                        const f = folder.files.find(f => f.url === selectedMedia);
                                        if (f) {
                                            foundFile = f;
                                            break;
                                        }
                                    }
                                    onSendToPrompt?.({
                                        imageUrl: selectedMedia!,
                                        prompt: foundFile?.prompt || "No prompt available",
                                        metadata: foundFile?.metadata
                                    });
                                    setSelectedMedia(null);
                                }}
                                className="flex items-center gap-3 px-6 py-4 bg-amber-600/10 hover:bg-amber-600 text-amber-400 hover:text-white rounded-xl font-bold text-sm backdrop-blur-md border border-amber-600/50 transition-all shadow-xl active:scale-95 w-full justify-center group"
                            >
                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                View Metadata
                            </button>

                            <button
                                onClick={async () => {
                                    // Need to find the folder name for this file
                                    let folderName = "";
                                    for (const folder of activeData) {
                                        if (folder.files.find(f => f.url === selectedMedia)) {
                                            folderName = folder.name;
                                            break;
                                        }
                                    }
                                    if (folderName) {
                                        const fileName = selectedMedia!.split('/').pop()!;
                                        await handleDeleteFile(folderName, fileName);
                                        setSelectedMedia(null);
                                    }
                                }}
                                className="flex items-center gap-3 px-6 py-4 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white rounded-xl font-bold text-sm backdrop-blur-md border border-red-600/50 transition-all shadow-xl active:scale-95 w-full justify-center group mt-4 border-t border-red-500/20 pt-6"
                            >
                                <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" />
                                </svg>
                                Delete Item
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
