
import React, { useEffect, useState } from 'react';

interface MediaFolder {
    name: string;
    files: string[];
}

interface MediaData {
    sliced_img: MediaFolder[];
    upscale: MediaFolder[];
    individual_upscale: MediaFolder[];
}

export const Gallery: React.FC = () => {
    const [data, setData] = useState<MediaData>({ sliced_img: [], upscale: [], individual_upscale: [] });
    const [activeTab, setActiveTab] = useState<'sliced_img' | 'upscale' | 'individual_upscale'>('upscale');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/list-media')
            .then(res => res.json())
            .then(data => {
                // Ensure all keys exist
                setData({
                    sliced_img: data.sliced_img || [],
                    upscale: data.upscale || [],
                    individual_upscale: data.individual_upscale || []
                });
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load gallery", err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const activeData = data[activeTab];

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

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
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
                </div>
            </div>

            {activeData.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-slate-800 border-dashed">
                    <p className="text-slate-500">No media found in this category.</p>
                </div>
            ) : (
                <div className="space-y-12">
                    {activeData.map((folder) => (
                        <div key={folder.name} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm relative group/card">
                            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-800/50">
                                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-200 truncate" title={folder.name}>
                                        {folder.name === 'Miscellaneous' ? 'Recent Uploads' : (folder.name.split('_').slice(0, -1).join(' ') || folder.name)}
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

                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2">
                                {folder.files.map((file, idx) => (
                                    <div key={idx} className="aspect-square bg-slate-800 rounded-lg overflow-hidden border border-slate-700 relative group">
                                        {file.endsWith('.mp4') || file.endsWith('.webm') ? (
                                            <video src={file} className="w-full h-full object-cover" controls />
                                        ) : (
                                            <img src={file} className="w-full h-full object-cover transition-transform group-hover:scale-110" loading="lazy" />
                                        )}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
                                        <a href={file} target="_blank" rel="noopener noreferrer" className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 bg-black/60 p-1 rounded text-white hover:bg-indigo-600 transition-all">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
