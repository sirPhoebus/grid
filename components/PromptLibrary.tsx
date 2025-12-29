import React, { useState, useEffect } from 'react';

interface PromptLibraryProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectPrompt: (prompt: string) => void;
    storageKey?: string;
}

export const addPromptToLibrary = (prompt: string, storageKey: string = 'global_prompt_library') => {
    if (!prompt) return;
    const stored = localStorage.getItem(storageKey);
    let prompts: string[] = [];
    if (stored) {
        try {
            prompts = JSON.parse(stored);
        } catch (e) {
            console.error("Failed to parse saved prompts", e);
        }
    }

    if (prompts.includes(prompt)) return;

    const newPrompts = [prompt, ...prompts];
    localStorage.setItem(storageKey, JSON.stringify(newPrompts));
};

export const PromptLibrary: React.FC<PromptLibraryProps> = ({
    isOpen,
    onClose,
    onSelectPrompt,
    storageKey = 'global_prompt_library'
}) => {
    const [savedPrompts, setSavedPrompts] = useState<string[]>([]);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingValue, setEditingValue] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try {
                setSavedPrompts(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse saved prompts", e);
            }
        }
    }, [storageKey, isOpen]);

    const savePrompts = (newPrompts: string[]) => {
        setSavedPrompts(newPrompts);
        localStorage.setItem(storageKey, JSON.stringify(newPrompts));
    };

    const deletePrompt = (text: string) => {
        const newPrompts = savedPrompts.filter(p => p !== text);
        savePrompts(newPrompts);
        if (editingIndex !== null) setEditingIndex(null);
    };

    const startEditing = (index: number, text: string) => {
        setEditingIndex(index);
        setEditingValue(text);
    };

    const saveEdit = (index: number) => {
        if (!editingValue.trim()) return;
        const newPrompts = [...savedPrompts];
        newPrompts[index] = editingValue.trim();
        savePrompts(newPrompts);
        setEditingIndex(null);
    };

    return (
        <>
            {/* Sidebar Overlay */}
            <div
                className={`fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Left Sidebar - Prompt Bank */}
            <aside
                className={`fixed top-0 left-0 z-[70] h-full w-85 bg-slate-900 border-r border-slate-800 shadow-2xl transition-transform duration-500 ease-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-white">Prompt Bank</h3>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Quick Actions</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {savedPrompts.length === 0 ? (
                        <div className="h-40 flex flex-col items-center justify-center text-slate-600 italic text-sm text-center px-4">
                            <svg className="w-10 h-10 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                            Your saved prompts will appear here
                        </div>
                    ) : (
                        savedPrompts.map((p, idx) => (
                            <div
                                key={idx}
                                className={`group bg-slate-800/50 hover:bg-indigo-500/10 border ${editingIndex === idx ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-slate-700/50 hover:border-indigo-500/30'} rounded-xl p-4 transition-all relative`}
                            >
                                {editingIndex === idx ? (
                                    <div className="space-y-3">
                                        <textarea
                                            value={editingValue}
                                            onChange={(e) => setEditingValue(e.target.value)}
                                            className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[100px] resize-none"
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setEditingIndex(null)}
                                                className="px-3 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-400 uppercase tracking-widest"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => saveEdit(idx)}
                                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-[10px] font-black text-white uppercase tracking-widest transition-colors"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div
                                            className="cursor-pointer"
                                            onClick={() => {
                                                onSelectPrompt(p);
                                                onClose();
                                            }}
                                        >
                                            <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 mb-2">{p}</p>
                                        </div>
                                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    startEditing(idx, p);
                                                }}
                                                className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-400 transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deletePrompt(p);
                                                }}
                                                className="text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </aside>
        </>
    );
};
