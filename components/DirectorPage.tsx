
import React, { useState, useRef, useEffect } from 'react';
import { ComfyUiService } from '../services/comfyUiService';

interface CameraMove {
    id: string;
    title: string;
    description: string;
    prompt: string;
}

interface MoveCategory {
    id: string;
    title: string;
    moves: CameraMove[];
}

const DEFAULT_CATEGORIES: MoveCategory[] = [
    {
        id: 'cat-1',
        title: 'Dolly Moves',
        moves: [
            { id: 'm1', title: 'Slow Dolly In', description: 'Smooth physical camera movement push', prompt: 'Slow dolly in towards the subject, smooth physical camera movement on rails. Cinematic, high detail, realistic lighting, 4K.' },
            { id: 'm2', title: 'Slow Dolly Out', description: 'Smooth physical camera movement pull', prompt: 'Slow dolly out from the subject, revealing more of the landscape, smooth physical camera movement on rails. Cinematic, high detail, realistic lighting, 4K.' },
            { id: 'm3', title: 'Fast Dolly In (Crash)', description: 'Intense and dramatic physical camera push', prompt: 'Fast crash dolly in towards the subject, intense and dramatic physical camera push. Cinematic, high detail, realistic lighting, 4K.' },
            { id: 'm4', title: 'Dolly Zoom (Vertigo)', description: 'Camera dolly back while zooming in', prompt: 'Classic Vertigo effect: camera dolly back while zooming in on the distant subject, creating distorted perspective. Smooth cinematic movement, high detail, realistic lighting, 4K.' },
        ]
    },
    {
        id: 'cat-2',
        title: 'Infinite Scale',
        moves: [
            { id: 'm5', title: 'Extreme Macro Zoom', description: 'Face to Micro world', prompt: 'Smooth extreme macro zoom into the microscopic world, revealing tiny particles and reflections. Infinite scale continuity, high detail, realistic lighting, 4K.' },
            { id: 'm6', title: 'Cosmic Hyper-Zoom', description: 'Space to Street/Subject', prompt: 'Smooth hyper-zoom down through clouds, over landmarks, directly to the subject. Infinite scale continuity, epic cinematic movement, high detail, realistic lighting, 4K.' },
        ]
    },
    {
        id: 'cat-3',
        title: 'Character-Mounted',
        moves: [
            { id: 'm7', title: 'Over-the-Shoulder', description: 'OTS framing', prompt: 'Over-the-shoulder shot looking past the shoulder toward the subject. Smooth, stable framing, cinematic, high detail, realistic lighting, 4K.' },
            { id: 'm8', title: 'Fisheye Distortion', description: 'Extreme wide-angle', prompt: 'Viewed through a fisheye or peephole lens effect, extreme wide-angle distortion with curved horizon and bulging edges. Cinematic, high detail, realistic lighting, 4K.' },
        ]
    },
    {
        id: 'cat-4',
        title: 'Environmental Interaction',
        moves: [
            { id: 'm9', title: 'Reveal From Behind', description: 'Natural wipe reveal', prompt: 'Camera slowly moves sideways to reveal the subject behind an obstacle in the foreground. Natural wipe reveal, smooth cinematic movement, high detail, 4K.' },
            { id: 'm10', title: 'Fly-Through', description: 'Pushing through window/gap', prompt: 'Smooth fly-through shot pushing forward through a window or gap into the landscape. Cinematic, high detail, realistic lighting, 4K.' },
        ]
    },
    {
        id: 'cat-5',
        title: 'Focus & Lens',
        moves: [
            { id: 'm11', title: 'Reveal From Blur', description: 'Focus Pull from bokeh', prompt: 'Start completely out of focus. Smooth focus pull gradually revealing sharp details of the subject. Cinematic rack focus, high detail, realistic lighting, 4K.' },
            { id: 'm12', title: 'Rack Focus', description: 'Foreground to Background shift', prompt: 'Smooth rack focus shifting from foreground details to revealing the crisp subject and background behind. Cinematic, high detail, realistic lighting, 4K.' },
        ]
    },
    {
        id: 'cat-6',
        title: 'Rotational Moves',
        moves: [
            { id: 'm13', title: 'Tilt Up', description: 'Vertical rotation up', prompt: 'Smooth tilt up from the bottom to reveal the subject. Cinematic movement, high detail, realistic lighting, 4K.' },
            { id: 'm14', title: 'Tilt Down', description: 'Vertical rotation down', prompt: 'Smooth tilt down from the top to reveal the subject. Cinematic movement, high detail, realistic lighting, 4K.' },
        ]
    },
    {
        id: 'cat-7',
        title: 'Lateral Moves',
        moves: [
            { id: 'm15', title: 'Truck Left', description: 'Lateral slide left', prompt: 'Smooth truck left lateral slide on slider, revealing more of the landscape to the right. Cinematic movement, high detail, realistic lighting, 4K.' },
            { id: 'm16', title: 'Truck Right', description: 'Lateral slide right', prompt: 'Smooth truck right lateral slide on slider, revealing more of the landscape to the left. Cinematic movement, high detail, realistic lighting, 4K.' },
        ]
    },
    {
        id: 'cat-8',
        title: 'Orbital Moves',
        moves: [
            { id: 'm17', title: 'Orbit 180', description: 'Half circle orbit', prompt: 'Smooth 180-degree orbit clockwise around the subject, revealing changing perspective. Cinematic movement, high detail, realistic lighting, 4K.' },
            { id: 'm18', title: 'Fast 360 Orbit', description: 'Full dynamic circle', prompt: 'Fast full 360-degree orbit around the subject, dynamic and energetic. Cinematic movement, high detail, realistic lighting, 4K.' },
            { id: 'm19', title: 'Slow Cinematic Arc', description: 'Elegant 90-degree curve', prompt: 'Slow cinematic 90-degree arc orbit to the left, elegant and sweeping. High detail, realistic lighting, 4K.' },
        ]
    },
    {
        id: 'cat-9',
        title: 'Vertical Camera',
        moves: [
            { id: 'm20', title: 'Pedestal Down', description: 'Lowering camera height', prompt: 'Smooth pedestal down lowering the camera toward ground level, revealing more foreground details. Cinematic movement, high detail, realistic lighting, 4K.' },
            { id: 'm21', title: 'Pedestal Up', description: 'Raising camera height', prompt: 'Smooth pedestal up raising the camera higher, revealing wider landscape. Cinematic movement, high detail, realistic lighting, 4K.' },
            { id: 'm22', title: 'Crane Up Reveal', description: 'Rising high angle reveal', prompt: 'Smooth crane up rising high to reveal vast valley and surrounding mountains in epic high-angle view. Cinematic movement, high detail, realistic lighting, 4K.' },
            { id: 'm23', title: 'Crane Down Landing', description: 'Descending to subject level', prompt: 'Smooth crane down descending toward the subject, landing at ground level. Cinematic movement, high detail, realistic lighting, 4K.' },
        ]
    },
    {
        id: 'cat-10',
        title: 'Optical Lens Effects',
        moves: [
            { id: 'm24', title: 'Smooth Zoom In', description: 'Optical zoom in, static camera', prompt: 'Smooth optical zoom in toward the distant subject, no physical camera movement. Cinematic, high detail, realistic lighting, 4K.' },
            { id: 'm25', title: 'Smooth Zoom Out', description: 'Optical zoom out, static camera', prompt: 'Smooth optical zoom out revealing full landscape, no physical camera movement. Cinematic, high detail, realistic lighting, 4K.' },
            { id: 'm26', title: 'Snap Zoom (Crash)', description: 'Fast dramatic zoom', prompt: 'Sudden fast snap zoom (crash zoom) in to extreme close-up on the subject. Dramatic, high detail, realistic lighting, 4K.' },
        ]
    },
    {
        id: 'cat-11',
        title: 'Drone & Aerial',
        moves: [
            { id: 'm27', title: 'Drone Flyover', description: 'Smooth aerial path', prompt: 'Epic drone shot flying forward over the subject, smooth aerial movement, high detail, realistic lighting, 4K.' },
            { id: 'm28', title: 'Epic Drone Reveal', description: 'Revealing vast scale', prompt: 'Drone smooth epic reveal flying up and over an obstacle to unveil a vast landscape. Cinematic aerial, high detail, realistic lighting, 4K.' },
            { id: 'm29', title: 'Large Drone Orbit', description: '360 valley orbit', prompt: 'Large-scale drone orbit circling 360 degrees around the entire valley, showing full panoramic scale. Smooth aerial movement, high detail, realistic lighting, 4K.' },
            { id: 'm30', title: 'Top-Down (God Eye)', description: 'Direct satellite-style view', prompt: 'Direct top-down God eye view straight above the subject. Static or slow drift, high detail, realistic lighting, 4K.' },
            { id: 'm31', title: 'FPV Drone Dive', description: 'High speed vertical plunge', prompt: 'Fast FPV drone dive starting high above, plunging straight down toward the subject at thrilling speed. Dynamic first-person view, high detail, realistic lighting, 4K.' },
        ]
    },
    {
        id: 'cat-12',
        title: 'Dynamic Moves',
        moves: [
            { id: 'm32', title: 'Handheld Style', description: 'Slight natural shake', prompt: 'Handheld documentary-style shot with slight natural camera shake. Realistic movement, high detail, 4K.' },
            { id: 'm33', title: 'Whip Pan', description: 'Fast lateral blur transition', prompt: 'Extremely fast whip pan right to suddenly reveal the subject. Dynamic stylized movement, high detail, 4K.' },
            { id: 'm34', title: 'Dutch Angle', description: '35 degree camera roll', prompt: 'Filmed with strong Dutch angle camera roll (tilted 35 degrees), creating unease and drama. Cinematic, high detail, realistic lighting, 4K.' },
        ]
    },
    {
        id: 'cat-13',
        title: 'Subject Tracking',
        moves: [
            { id: 'm35', title: 'Leading Shot', description: 'Backward tracking', prompt: 'Camera tracks backward in front of the subject leading the way, maintaining eye contact framing. Smooth tracking, high detail, realistic lighting, 4K.' },
            { id: 'm36', title: 'Following Shot', description: 'Forward tracking', prompt: 'Camera smoothly follows behind the subject tracking forward. Cinematic, high detail, realistic lighting, 4K.' },
            { id: 'm37', title: 'Side Tracking', description: 'Parallel tracking', prompt: 'Camera tracks parallel sideways alongside the subject at matching speed. Smooth lateral tracking, high detail, realistic lighting, 4K.' },
            { id: 'm38', title: 'POV Walk', description: 'Immersive first-person', prompt: 'First-person POV walk, natural subtle head bob and breathing motion. Immersive handheld style, high detail, realistic lighting, 4K.' },
        ]
    }
];

export const DirectorPage: React.FC<{
    onPreview?: (url: string) => void,
    onVideoGenerated?: (url: string) => void
}> = ({ onPreview, onVideoGenerated }) => {
    const [categories, setCategories] = useState<MoveCategory[]>(() => {
        const saved = localStorage.getItem('director_library');
        return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    });

    const [selectedMove, setSelectedMove] = useState<CameraMove | null>(null);
    const [footage, setFootage] = useState<string | null>(null);
    const [promptPrefix, setPromptPrefix] = useState('a cinematic scene of ');
    const [isGenerating, setIsGenerating] = useState(false);
    const [resultVideo, setResultVideo] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [isEditingMove, setIsEditingMove] = useState<string | null>(null);
    const [isAddingMove, setIsAddingMove] = useState<string | null>(null); // Category ID

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        localStorage.setItem('director_library', JSON.stringify(categories));
    }, [categories]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFootage(URL.createObjectURL(file));
    };

    const handleGenerate = async () => {
        if (!footage || !selectedMove) return;

        setIsGenerating(true);
        setError(null);
        setResultVideo(null);

        try {
            const finalPrompt = `${promptPrefix}${selectedMove.prompt}`;
            // Fixed call using unique localClientId as implemented in previos step
            const result = await ComfyUiService.runVideoWorkflow(footage, finalPrompt, "16:9");
            setResultVideo(result.videoUrl);
            onVideoGenerated?.(result.videoUrl);
        } catch (err: any) {
            setError(err.message || 'Generation failed');
            console.error(err);
        } finally {
            setIsGenerating(false);
            await ComfyUiService.freeMemory();
        }
    };

    // Library CRUD
    const addCategory = () => {
        const title = prompt('Category Title?', 'New Category');
        if (!title) return;
        setCategories(prev => [...prev, { id: `cat-${Date.now()}`, title, moves: [] }]);
    };

    const deleteCategory = (id: string) => {
        if (!confirm('Delete this category and all its prompts?')) return;
        setCategories(prev => prev.filter(c => c.id !== id));
    };

    const addMove = (catId: string) => {
        const title = prompt('Move Title?');
        const desc = prompt('Description?');
        const pr = prompt('Prompt?');
        if (!title || !pr) return;
        setCategories(prev => prev.map(c => c.id === catId ? {
            ...c,
            moves: [...c.moves, { id: `m-${Date.now()}`, title, description: desc || '', prompt: pr }]
        } : c));
    };

    const deleteMove = (catId: string, moveId: string) => {
        setCategories(prev => prev.map(c => c.id === catId ? {
            ...c,
            moves: c.moves.filter(m => m.id !== moveId)
        } : c));
        if (selectedMove?.id === moveId) setSelectedMove(null);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-8 pt-12">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-10">
                    <div className="space-y-2">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-tr from-rose-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-xl shadow-rose-500/20">
                                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Director Mode</h1>
                        </div>
                        <p className="text-slate-400 font-medium text-lg ml-1">Curate camera movements for cinematic AI compositions</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={addCategory}
                            className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
                        >
                            + New Category
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left Panel: Library */}
                    <aside className="lg:col-span-4 space-y-6">
                        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                <h2 className="text-xl font-bold flex items-center gap-3">
                                    <svg className="w-5 h-5 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                                    </svg>
                                    Move Library
                                </h2>
                                <span className="text-[10px] font-black bg-white/10 px-2 py-0.5 rounded-full text-slate-400 uppercase tracking-widest">
                                    {categories.reduce((acc, c) => acc + c.moves.length, 0)} Prompts
                                </span>
                            </div>

                            <div className="max-h-[70vh] overflow-y-auto p-4 custom-scrollbar space-y-4">
                                {categories.map(cat => (
                                    <div key={cat.id} className="space-y-2 group/cat">
                                        <div className="flex items-center justify-between px-2">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">{cat.title}</h3>
                                            <div className="flex gap-2 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                                                <button onClick={() => addMove(cat.id)} className="text-[10px] text-emerald-400 font-bold hover:underline">+ Add</button>
                                                <button onClick={() => deleteCategory(cat.id)} className="text-[10px] text-rose-400 font-bold hover:underline">Del</button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                            {cat.moves.map(move => (
                                                <button
                                                    key={move.id}
                                                    onClick={() => setSelectedMove(move)}
                                                    className={`group text-left p-4 rounded-2xl border transition-all relative overflow-hidden ${selectedMove?.id === move.id
                                                            ? 'bg-rose-500/10 border-rose-500/50 shadow-lg shadow-rose-500/5'
                                                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start relative z-10">
                                                        <div>
                                                            <div className={`text-sm font-bold ${selectedMove?.id === move.id ? 'text-rose-400' : 'text-slate-100'}`}>{move.title}</div>
                                                            <div className="text-[10px] text-slate-500 font-medium mt-0.5">{move.description}</div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); deleteMove(cat.id, move.id); }}
                                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/20 rounded-md transition-all"
                                                        >
                                                            <svg className="w-3 h-3 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                        </button>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>

                    {/* Right Panel: Workspace */}
                    <main className="lg:col-span-8 space-y-8">
                        {/* Stage Area */}
                        <div className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-4 shadow-3xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-b from-rose-500/5 to-transparent pointer-events-none"></div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Footage Input */}
                                <div className="aspect-video bg-slate-950 rounded-[1.5rem] border border-white/5 overflow-hidden relative group/footage">
                                    {footage ? (
                                        <>
                                            <img src={footage} className="w-full h-full object-cover transition-transform duration-700 group-hover/footage:scale-105" alt="Footage" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/footage:opacity-100 transition-opacity flex items-center justify-center">
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="px-6 py-2 bg-white text-slate-950 rounded-full font-bold text-xs shadow-xl active:scale-95 transition-all"
                                                >Change Media</button>
                                            </div>
                                        </>
                                    ) : (
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all group/upload"
                                        >
                                            <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-4 group-hover/upload:scale-110 transition-transform">
                                                <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                            </div>
                                            <div className="text-center">
                                                <p className="font-bold text-slate-400">Add Footage</p>
                                                <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-1">Image or Video Base</p>
                                            </div>
                                        </div>
                                    )}
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
                                    <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-black uppercase text-white/50 border border-white/10">Input Source</div>
                                </div>

                                {/* Result Preview */}
                                <div className="aspect-video bg-slate-950 rounded-[1.5rem] border border-white/5 overflow-hidden relative">
                                    {isGenerating ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                                            <div className="w-12 h-12 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin"></div>
                                            <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-500 animate-pulse">Rendering Take...</p>
                                        </div>
                                    ) : resultVideo ? (
                                        <video src={resultVideo} controls autoPlay loop className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <div className="text-center opacity-20">
                                                <svg className="w-16 h-16 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Action</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="absolute top-4 left-4 px-3 py-1 bg-rose-500 rounded-full text-[10px] font-black uppercase text-white shadow-lg shadow-rose-500/20">Director's Cut</div>
                                </div>
                            </div>

                            {error && (
                                <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-bold flex items-center gap-3">
                                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {error}
                                </div>
                            )}
                        </div>

                        {/* Controls Bar */}
                        <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 space-y-6 shadow-2xl">
                            <div className="space-y-4">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-500 block">Sequence Context (Subject/Scene)</label>
                                <textarea
                                    value={promptPrefix}
                                    onChange={(e) => setPromptPrefix(e.target.value)}
                                    placeholder="e.g., a serene mountain lake at sunrise..."
                                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-6 text-lg font-medium focus:ring-2 focus:ring-rose-500 outline-none h-24 resize-none transition-all placeholder:text-slate-800"
                                />
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 items-stretch">
                                <div className="flex-1 bg-white/5 p-6 rounded-2xl border border-white/5">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 block mb-3">Selected Camera Movement</label>
                                    {selectedMove ? (
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-xl font-bold text-rose-400">{selectedMove.title}</h3>
                                                <p className="text-sm text-slate-400 mt-1 line-clamp-1 italic">{selectedMove.prompt}</p>
                                            </div>
                                            <button onClick={() => setSelectedMove(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                        </div>
                                    ) : (
                                        <div className="h-10 flex items-center text-slate-600 text-sm italic">Select a move from the library on the left...</div>
                                    )}
                                </div>

                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating || !footage || !selectedMove}
                                    className={`px-12 rounded-2xl flex flex-col items-center justify-center gap-1 font-black shadow-2xl transition-all active:scale-95 ${isGenerating || !footage || !selectedMove
                                            ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-white/5'
                                            : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                                        }`}
                                >
                                    <span className="text-lg uppercase tracking-tighter">Action!</span>
                                    <span className="text-[9px] uppercase tracking-widest opacity-60">Generate Scene</span>
                                </button>
                            </div>
                        </div>
                    </main>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
            `}} />
        </div>
    );
};
