
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GeminiService, SupportedAspectRatio } from './services/geminiService';
import { KlingService } from './services/klingService';
import { StableDiffusionService } from './services/stableDiffusionService';
import { ComfyUiService } from './services/comfyUiService';
import { SettingsModal, AppConfig, ApiProvider } from './components/SettingsModal';
import { ProcessingStep, Frame, VideoTransition, AppState } from './types';
import { Gallery } from './components/Gallery';
import { TurboWan } from './components/TurboWan';
import { VideoStitcher } from './components/VideoStitcher';
import { Image } from './components/ImagePage';
import { FrameExtractor } from './components/FrameExtractor';
import { VideoReverser } from './components/VideoReverser';
import { Help } from './components/Help';
import { QwenPage } from './components/QwenPage';


// Components
const Header: React.FC<{
  onOpenSettings: () => void;
  currentView: 'home' | 'gallery' | 'upscale' | 'turbo-wan' | 'stitcher' | 'image' | 'extractor' | 'reverse' | 'help' | 'qwen-edit';
  onNavigate: (view: 'home' | 'gallery' | 'upscale' | 'turbo-wan' | 'stitcher' | 'image' | 'extractor' | 'reverse' | 'help' | 'qwen-edit') => void;

}> = ({ onOpenSettings, currentView, onNavigate }) => (
  <header className="py-6 px-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
    <div className="max-w-6xl mx-auto flex items-center justify-between">
      <div
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => onNavigate('home')}
      >
        <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Alcove <span className="text-indigo-400">Pro</span></h1>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Version 1.0</p>
        </div>
      </div>

      <nav className="flex items-center bg-slate-800/50 rounded-full p-1 border border-slate-700/50 absolute left-1/2 -translate-x-1/2 top-24 md:top-auto md:relative md:left-auto md:translate-x-0">
        <button
          onClick={() => onNavigate('image')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${currentView === 'image'
            ? 'bg-cyan-600 text-white shadow-lg'
            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
        >
          Image
        </button>
        <button
          onClick={() => onNavigate('qwen-edit')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${currentView === 'qwen-edit'
            ? 'bg-cyan-600 text-white shadow-lg'
            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
        >
          Qwen Pro
        </button>

        <button
          onClick={() => onNavigate('upscale')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${currentView === 'upscale'
            ? 'bg-indigo-600 text-white shadow-lg'
            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
        >
          Upscale
        </button>
        <button
          onClick={() => onNavigate('turbo-wan')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${currentView === 'turbo-wan'
            ? 'bg-indigo-600 text-white shadow-lg'
            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
        >
          Video
        </button>
        <button
          onClick={() => onNavigate('home')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${currentView === 'home'
            ? 'bg-indigo-600 text-white shadow-lg'
            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
        >
          Grid
        </button>
        <button
          onClick={() => onNavigate('stitcher')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${currentView === 'stitcher'
            ? 'bg-indigo-600 text-white shadow-lg'
            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
        >
          Stitch
        </button>
        <button
          onClick={() => onNavigate('extractor')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${currentView === 'extractor'
            ? 'bg-indigo-600 text-white shadow-lg'
            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
        >
          Extractor
        </button>
        <button
          onClick={() => onNavigate('reverse')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${currentView === 'reverse'
            ? 'bg-indigo-600 text-white shadow-lg'
            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
        >
          Reverse
        </button>
        <button
          onClick={() => onNavigate('gallery')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${currentView === 'gallery'
            ? 'bg-indigo-600 text-white shadow-lg'
            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
        >
          Gallery
        </button>
      </nav>

      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate('help')}
          className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"
          title="Help"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-semibold">Help</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"
          title="Settings"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </div>
  </header>
);

interface OverlayMedia {
  url: string;
  type: 'image' | 'video';
}

const MediaOverlay: React.FC<{ media: OverlayMedia; onClose: () => void }> = ({ media, onClose }) => {
  const isVideo = media.type === 'video';
  const url = media.url;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
      onClick={onClose}
    >
      <div className="relative max-w-full max-h-full" onClick={e => e.stopPropagation()}>
        {isVideo ? (
          <video
            src={url}
            className="max-w-full max-h-[90vh] rounded-xl shadow-2xl border border-slate-800"
            controls
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <img
            src={url}
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border border-slate-800"
            alt="Preview"
          />
        )}
        <button
          className="absolute -top-12 right-0 text-slate-400 hover:text-white flex items-center gap-2 transition-colors font-medium cursor-pointer"
          onClick={onClose}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Close Preview
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'home' | 'gallery' | 'upscale' | 'turbo-wan' | 'stitcher' | 'z-image' | 'extractor' | 'reverse' | 'help' | 'qwen-edit'>('z-image');
  const [turboHandover, setTurboHandover] = useState<{ imageUrl: string, prompt: string } | null>(null);
  const [qwenHandover, setQwenHandover] = useState<{ imageUrl: string, prompt: string } | null>(null);
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [individualState, setIndividualState] = useState<{
    file: File | null;
    originalPreview: string | null;
    upscaledPreview: string | null;
    isProcessing: boolean;
    error: string | null;
    prompt: string;
  }>({
    file: null,
    originalPreview: null,
    upscaledPreview: null,
    isProcessing: false,
    error: null,
    prompt: ""
  });
  const [overlayMedia, setOverlayMedia] = useState<OverlayMedia | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [config, setConfig] = useState<AppConfig>({
    provider: 'gemini',
    geminiKey: '',
    klingAccessKey: '',
    klingSecretKey: '',
    upscaler: 'gemini',
    localUpscaleFactor: 2,
    localSdMethod: 'extras'
  });
  const [detectedAspectRatio, setDetectedAspectRatio] = useState<SupportedAspectRatio>("1:1");
  const [state, setState] = useState<AppState>({
    step: ProcessingStep.IDLE,
    frames: [],
    transitions: []
  });

  const stateRef = useRef(state);
  const abortUpscaling = useRef(false);
  const controllers = useRef<Map<number, AbortController>>(new Map());

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    // Load config from local storage
    const savedConfig = localStorage.getItem('alcove_config');
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error("Failed to parse saved config", e);
      }
    }

    const checkKey = async () => {
      // @ts-ignore
      if (typeof window.aistudio !== 'undefined' && window.aistudio.hasSelectedApiKey) {
        // @ts-ignore
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        // Fallback for local development or when not in AI Studio
        // If we have a configured provider other than Gemini, or if env var exists
        if (config.provider === 'kling') {
          setHasKey(true);
        } else {
          // For Gemini, in local dev, we might assume true if they can't select it via the specific UI
          setHasKey(true);
        }
      }
    };
    checkKey();
  }, [config.provider]);

  const handleSaveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    try {
      localStorage.setItem('alcove_config', JSON.stringify(newConfig));
    } catch (e) {
      console.warn("Failed to save config to localStorage", e);
    }
  };

  const clearAppStorage = () => {
    if (confirm("This will clear all saved settings and generated previews. Continue?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleSelectKey = async () => {
    // @ts-ignore
    if (typeof window.aistudio !== 'undefined' && window.aistudio.openSelectKey) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setHasKey(true);
    } else {
      alert("API Key selection is only available in IDX/AI Studio environment. For local use, please configure keys in Settings or .env");
      setIsSettingsOpen(true);
    }
  };

  const sliceImage = async (file: File) => {
    setState(prev => ({ ...prev, step: ProcessingStep.SLICING, errorMessage: undefined }));
    abortUpscaling.current = false;

    const img = new Image();
    const reader = new FileReader();

    return new Promise<void>((resolve, reject) => {
      reader.onload = (e) => {
        img.src = e.target?.result as string;
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('Canvas context error');

          const cellW = Math.floor(img.width / 3);
          const cellH = Math.floor(img.height / 3);
          const gutter = 4; // Configurable gutter from slice.py

          const ratio = cellW / cellH;
          let ar: SupportedAspectRatio = "1:1";
          if (ratio > 1.4) ar = "16:9";
          else if (ratio > 1.2) ar = "4:3";
          else if (ratio < 0.6) ar = "9:16";
          else if (ratio < 0.8) ar = "3:4";
          setDetectedAspectRatio(ar);

          const newFrames: Frame[] = [];
          const savePromises: Promise<any>[] = [];

          // Removed API verification as requested ("instead of going to an API")

          // Generate unique folder name once
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const safeName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_\-]/g, '_');
          const folderName = `${safeName}_${timestamp}`;

          for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
              // Logic ported from slice.py
              let left = col * cellW + gutter;
              let upper = row * cellH + gutter;
              let right = (col + 1) * cellW - gutter;
              let lower = (row + 1) * cellH - gutter;

              // Edge adjustments
              if (col === 0) left = 0;
              if (col === 2) right = img.width;
              if (row === 0) upper = 0;
              if (row === 2) lower = img.height;

              const sourceW = right - left;
              const sourceH = lower - upper;

              canvas.width = sourceW;
              canvas.height = sourceH;

              ctx.drawImage(img, left, upper, sourceW, sourceH, 0, 0, sourceW, sourceH);

              const dataUrl = canvas.toDataURL('image/png');

              newFrames.push({
                id: newFrames.length + 1,
                originalBase64: dataUrl,
                status: 'pending'
              });

              // Save to local disk via Vite middleware
              savePromises.push(
                fetch('/save-slice', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    image: dataUrl,
                    filename: `tile_${row}_${col}.png`,
                    folder: folderName
                  })
                }).catch(e => {
                  console.error("Failed to save slice", e);
                  setState(prev => ({ ...prev, errorMessage: "Failed to save sliced images locally. Ensure dev server was restarted." }));
                })
              );
            }
          }


          // Wait for all saves to complete (best effort, don't block UI strictly if one fails)
          await Promise.all(savePromises);

          setState(prev => ({ ...prev, frames: newFrames, projectFolder: folderName }));
          resolve();
        };
      };
      reader.readAsDataURL(file);
    });
  };

  const processUpscaling = async () => {
    setState(prev => ({ ...prev, step: ProcessingStep.UPSCALING, errorMessage: undefined }));

    const currentFrames = stateRef.current.frames;

    for (let i = 0; i < currentFrames.length; i++) {
      if (abortUpscaling.current) return;
      if (currentFrames[i].status === 'completed') continue;

      try {
        setState(prev => ({
          ...prev,
          frames: prev.frames.map((f, idx) => idx === i ? { ...f, status: 'processing' } : f)
        }));

        let upscaled: string;
        if (config.upscaler === 'local_sd') {
          upscaled = await StableDiffusionService.upscaleFrame(
            currentFrames[i].originalBase64.split(',')[1],
            config.localUpscaleFactor || 2,
            config.localSdMethod || 'extras'
          );
        } else if (config.upscaler === 'comfyui') {
          upscaled = await ComfyUiService.upscaleFrame(
            currentFrames[i].originalBase64.split(',')[1]
          );
        } else {
          upscaled = await GeminiService.upscaleFrame(
            currentFrames[i].originalBase64.split(',')[1],
            detectedAspectRatio,
            config.geminiKey
          );
        }

        // Save upscaled image
        try {
          const folderName = stateRef.current.projectFolder || 'default';
          // Determine row and col from index i
          const row = Math.floor(i / 3);
          const col = i % 3;
          await fetch('/save-slice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: upscaled,
              filename: `tile_${row}_${col}.png`,
              folder: folderName,
              targetDir: 'upscale'
            })
          });
        } catch (e) {
          console.error("Failed to save upscaled image", e);
        }

        if (abortUpscaling.current) return;

        setState(prev => ({
          ...prev,
          frames: prev.frames.map((f, idx) => idx === i ? { ...f, status: 'completed', upscaledUrl: upscaled } : f)
        }));
      } catch (error: any) {
        if (abortUpscaling.current) return;
        let msg = error.message;
        try {
          const parsed = JSON.parse(msg);
          if (parsed.error?.message) msg = parsed.error.message;
        } catch (e) { }

        setState(prev => ({
          ...prev,
          frames: prev.frames.map((f, idx) => idx === i ? { ...f, status: 'error' } : f),
          errorMessage: `Upscaling failed at frame ${i + 1}: ${msg}`
        }));
        return;
      }
    }
  };

  const handleSkipUpscaling = () => {
    abortUpscaling.current = true;

    const frames = stateRef.current.frames;
    const newTransitions: VideoTransition[] = [];
    for (let i = 0; i < frames.length - 1; i++) {
      newTransitions.push({
        id: i + 1,
        fromFrameId: frames[i].id,
        toFrameId: frames[i + 1].id,
        status: 'pending'
      });
    }

    setState(prev => ({
      ...prev,
      step: ProcessingStep.GENERATING_VIDEOS,
      frames: prev.frames.map(f => ({
        ...f,
        status: 'completed',
        upscaledUrl: f.upscaledUrl || f.originalBase64
      })),
      transitions: newTransitions,
      errorMessage: undefined
    }));

    // Trigger video generation directly to avoid race conditions
    setTimeout(() => {
      newTransitions.forEach((_, i) => runTransitionGeneration(i));
    }, 100);
  };

  const handleCancelUpscaling = () => {
    abortUpscaling.current = true;
    setState(prev => ({
      ...prev,
      step: ProcessingStep.SLICING, // Reset to "Ready to Upscale"
      errorMessage: undefined,
      // Optional: keep already upscaled frames? 
      // User might want to re-run or just see what's done. 
      // If we go back to SLICING (and frames length is 9), UI shows "Start Upscaling".
      // Let's keep the successfully upscaled ones so they don't lose work, 
      // but they will re-process if they click start again (unless we optimize processUpscaling to skip completion, which it does: if (status === 'completed') continue)
    }));
  };

  const processVideos = async () => {
    // Only proceed if transitions haven't been initialized or all are pending
    const currentTransitions = stateRef.current.transitions;
    if (stateRef.current.step === ProcessingStep.GENERATING_VIDEOS && currentTransitions.some(t => t.status !== 'pending')) return;

    setState(prev => ({ ...prev, step: ProcessingStep.GENERATING_VIDEOS, errorMessage: undefined }));

    const frames = stateRef.current.frames;
    let transitionsToProcess = currentTransitions;

    if (transitionsToProcess.length === 0) {
      const newTransitions: VideoTransition[] = [];
      for (let i = 0; i < frames.length - 1; i++) {
        newTransitions.push({
          id: i + 1,
          fromFrameId: frames[i].id,
          toFrameId: frames[i + 1].id,
          status: 'pending'
        });
      }
      transitionsToProcess = newTransitions;
      setState(prev => ({ ...prev, transitions: newTransitions }));
    }

    transitionsToProcess.forEach((t, i) => {
      if (t.status === 'pending' || t.status === 'error') {
        runTransitionGeneration(i);
      }
    });
  };

  const runTransitionGeneration = async (idx: number) => {
    const frames = stateRef.current.frames;
    const currentTransitions = stateRef.current.transitions;
    const transition = currentTransitions[idx];
    if (!transition) return;

    const transitionId = transition.id;

    // Check if already processing to avoid duplicate runs
    if (transition.status === 'processing' || transition.status === 'completed') return;

    const controller = new AbortController();
    controllers.current.set(transitionId, controller);

    try {
      setState(prev => ({
        ...prev,
        transitions: prev.transitions.map((item, i) => i === idx ? { ...item, status: 'processing' } : item)
      }));

      const startImg = frames[idx].upscaledUrl || frames[idx].originalBase64;
      const endImg = frames[idx + 1].upscaledUrl || frames[idx + 1].originalBase64;

      let videoUrl: string;

      if (config.provider === 'kling') {
        if (!config.klingAccessKey || !config.klingSecretKey) {
          throw new Error("Kling API missing credentials. Please configure in Settings.");
        }
        videoUrl = await KlingService.generateVideoTransition(
          { accessKey: config.klingAccessKey, secretKey: config.klingSecretKey },
          startImg,
          endImg, // Kling might ignore this currently
          undefined, // Callback
          controller.signal
        );
      } else {
        videoUrl = await GeminiService.generateVideoTransition(
          startImg,
          endImg,
          detectedAspectRatio,
          config.geminiKey,
          controller.signal
        );
      }

      setState(prev => ({
        ...prev,
        transitions: prev.transitions.map((item, i) => i === idx ? { ...item, status: 'completed', videoUrl } : item)
      }));
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message === 'Aborted') {
        setState(prev => ({
          ...prev,
          transitions: prev.transitions.map((item, i) => i === idx ? { ...item, status: 'pending' } : item)
        }));
        return;
      }

      let msg = error.message;
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error?.message) msg = parsed.error.message;
      } catch (e) { }

      setState(prev => ({
        ...prev,
        transitions: prev.transitions.map((item, i) => i === idx ? { ...item, status: 'error' } : item),
        errorMessage: `Transition ${idx + 1} failed: ${msg}`
      }));
    } finally {
      controllers.current.delete(transitionId);
      checkAllTransitionsCompleted();
    }
  };

  const checkAllTransitionsCompleted = () => {
    setState(prev => {
      const allDone = prev.transitions.length > 0 && prev.transitions.every(t => t.status === 'completed');
      if (allDone && prev.step !== ProcessingStep.COMPLETED) {
        return { ...prev, step: ProcessingStep.COMPLETED };
      }
      return prev;
    });
  };

  const handleCancelTransition = (id: number) => {
    const controller = controllers.current.get(id);
    if (controller) {
      controller.abort();
      controllers.current.delete(id);
    }
  };

  const handleRetryTransition = async (id: number) => {
    const idx = state.transitions.findIndex(t => t.id === id);
    if (idx === -1) return;

    setState(prev => ({ ...prev, errorMessage: undefined }));
    await runTransitionGeneration(idx);
  };

  const handleRetry = () => {
    if (state.step === ProcessingStep.UPSCALING) {
      processUpscaling();
    } else {
      processVideos();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await sliceImage(file);
  };

  const handleIndividualFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setIndividualState({
        file,
        originalPreview: e.target?.result as string,
        upscaledPreview: null,
        isProcessing: false,
        error: null
      });
    };
    reader.readAsDataURL(file);
  };

  const processIndividualUpscale = async () => {
    if (!individualState.originalPreview) return;
    setIndividualState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      const imageInput = individualState.originalPreview;
      let upscaled: string;
      const factor = config.localUpscaleFactor || 2;

      // Detect Aspect Ratio for Gemini
      let ar: SupportedAspectRatio = "1:1";
      if (config.provider === 'gemini' && config.upscaler === 'gemini') {
        const img = new Image();
        img.src = imageInput;
        await new Promise((resolve) => { img.onload = resolve; });
        const ratio = img.width / img.height;
        if (ratio > 1.4) ar = "16:9";
        else if (ratio > 1.2) ar = "4:3";
        else if (ratio < 0.6) ar = "9:16";
        else if (ratio < 0.8) ar = "3:4";
      }

      if (config.upscaler === 'local_sd') {
        upscaled = await StableDiffusionService.upscaleFrame(imageInput, factor, config.localSdMethod || 'extras');
      } else if (config.upscaler === 'comfyui') {
        upscaled = await ComfyUiService.upscaleFrame(imageInput, factor);
      } else {
        // Gemini
        upscaled = await GeminiService.upscaleFrame(imageInput, ar, config.geminiKey, factor);
      }

      // Save
      const filename = `upscale_${Date.now()}.png`;
      // Use folder: '.' to save directly in the targetDir if supported, or creates a folder named '.'
      // Based on middleware regex, '.' is allowed.
      await fetch('/save-slice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: upscaled,
          filename: filename,
          folder: '.',
          targetDir: 'individual_upscale'
        })
      });

      setIndividualState(prev => ({ ...prev, isProcessing: false, upscaledPreview: upscaled }));

    } catch (e: any) {
      console.error(e);
      let msg = e.message;
      try { msg = JSON.parse(e.message).error.message } catch { }
      setIndividualState(prev => ({ ...prev, isProcessing: false, error: msg }));
    }
  };

  // Auto-start videos after all upscaling completes - REMOVED per user request
  // useEffect(() => {
  //   if (state.step === ProcessingStep.UPSCALING && !abortUpscaling.current && state.frames.length === 9 && state.frames.every(f => f.status === 'completed')) {
  //     processVideos();
  //   }
  // }, [state.step, state.frames]);

  // Modified to allow bypassing key check if using Kling
  if (!hasKey && config.provider === 'gemini') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">API Access Required</h2>
            <p className="text-slate-400 text-sm">To use Veo 3.1 and Gemini Pro, you must select an API key from a paid Google Cloud project.</p>
          </div>
          <button
            onClick={handleSelectKey}
            className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-indigo-600/30"
          >
            Select API Key
          </button>

          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-sm text-slate-500 hover:text-indigo-400 transition-colors"
            >
              Or configure another provider (e.g. Kling AI)
            </button>
          </div>
        </div>
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          config={config}
          onSave={handleSaveConfig}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        currentView={currentView}
        onNavigate={setCurrentView}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSave={handleSaveConfig}
        onClearStorage={clearAppStorage}
      />
      {overlayMedia && <MediaOverlay media={overlayMedia} onClose={() => setOverlayMedia(null)} />}

      <main className="max-w-6xl mx-auto mt-12 px-6">
        {currentView === 'upscale' ? (
          <div className="max-w-4xl mx-auto">
            {!individualState.originalPreview ? (
              <div className="max-w-xl mx-auto">
                <label className="group relative block cursor-pointer">
                  <div className="bg-slate-900 border-2 border-dashed border-slate-700 group-hover:border-indigo-500 rounded-3xl p-12 transition-all text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <svg className="w-8 h-8 text-slate-400 group-hover:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Upload Image to Upscale</h3>
                      <p className="text-slate-400 text-sm mt-1">Enhance image quality by {config.localUpscaleFactor || 2}x</p>
                    </div>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleIndividualFile} />
                </label>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Image Enhancement</h2>
                  <div className="flex gap-4">
                    {individualState.isProcessing ? (
                      <div className="flex items-center gap-2 text-indigo-400">
                        <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </div>
                    ) : !individualState.upscaledPreview ? (
                      <button
                        onClick={processIndividualUpscale}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
                      >
                        Upscale {config.localUpscaleFactor || 2}x
                      </button>
                    ) : (
                      <button
                        onClick={() => setIndividualState({ file: null, originalPreview: null, upscaledPreview: null, isProcessing: false, error: null })}
                        className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all"
                      >
                        Upload New
                      </button>
                    )}
                  </div>
                </div>

                {individualState.error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
                    {individualState.error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Original</h3>
                    <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
                      {(individualState.originalPreview?.endsWith('.mp4') || individualState.originalPreview?.endsWith('.webm')) ? (
                        <video src={individualState.originalPreview} className="w-full h-auto" autoPlay loop muted controls />
                      ) : (
                        <img src={individualState.originalPreview!} className="w-full h-auto" alt="Original" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">Upscaled</h3>
                    {individualState.upscaledPreview ? (
                      <div className="space-y-4">
                        <div
                          className="bg-slate-900 rounded-2xl overflow-hidden border border-indigo-500/30 relative group"
                        >
                          {(individualState.upscaledPreview.endsWith('.mp4') || individualState.upscaledPreview.endsWith('.webm')) ? (
                            <video src={individualState.upscaledPreview} className="w-full h-auto" autoPlay loop muted controls />
                          ) : (
                            <img src={individualState.upscaledPreview} className="w-full h-auto" alt="Upscaled" />
                          )}
                          <div
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-zoom-in"
                            onClick={() => setOverlayMedia({ url: individualState.upscaledPreview!, type: 'image' })}
                          >
                            <span className="text-white font-medium">Click to Preview</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setTurboHandover({
                              imageUrl: individualState.upscaledPreview!,
                              prompt: individualState.prompt
                            });
                            setCurrentView('turbo-wan');
                          }}
                          className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group"
                        >
                          <svg className="w-5 h-5 group-hover:animate-bounce-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Animate in TurboWan
                        </button>
                      </div>
                    ) : (
                      <div className="aspect-square bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-800 flex items-center justify-center">
                        <span className="text-slate-600">
                          {individualState.isProcessing ? 'Enhancing details...' : 'Ready to upscale'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : currentView === 'turbo-wan' ? (
          <TurboWan
            initialData={turboHandover}
            onClearInitialData={() => setTurboHandover(null)}
            onPreviewMedia={(url) => setOverlayMedia({ url, type: 'video' })}
          />
        ) : currentView === 'stitcher' ? (
          <VideoStitcher onNavigateToGallery={() => setCurrentView('gallery')} />
        ) : currentView === 'reverse' ? (
          <VideoReverser />
        ) : currentView === 'image' ? (
          <Image
            onSendToTurbo={(data) => {
              setTurboHandover(data);
              setCurrentView('turbo-wan');
            }}
            onSendToQwen={(data) => {
              setQwenHandover(data);
              setCurrentView('qwen-edit');
            }}
            onSendToUpscale={(imageUrl, prompt) => {
              setIndividualState({
                file: null,
                originalPreview: imageUrl,
                upscaledPreview: null,
                isProcessing: false,
                error: null,
                prompt: prompt || ""
              });
              setCurrentView('upscale');
            }}
            onPreviewImage={(url) => setOverlayMedia({ url, type: 'image' })}
          />
        ) : currentView === 'extractor' ? (
          <FrameExtractor
            onSendToTurbo={(data) => {
              setTurboHandover(data);
              setCurrentView('turbo-wan');
            }}
            onSendToUpscale={(imageUrl, prompt) => {
              setIndividualState({
                file: null,
                originalPreview: imageUrl,
                upscaledPreview: null,
                isProcessing: false,
                error: null,
                prompt: prompt || ""
              });
              setCurrentView('upscale');
            }}
          />
        ) : currentView === 'help' ? (
          <Help />
        ) : currentView === 'qwen-edit' ? (
          <QwenPage
            initialData={qwenHandover}
            onClearInitialData={() => setQwenHandover(null)}
            onPreviewImage={(url) => setOverlayMedia({ url, type: 'image' })}
            onSendToTurbo={(data) => {
              setTurboHandover(data);
              setCurrentView('turbo-wan');
            }}
            onSendToUpscale={(imageUrl, prompt) => {
              setIndividualState({
                file: null,
                originalPreview: imageUrl,
                upscaledPreview: null,
                isProcessing: false,
                error: null,
                prompt: prompt || ""
              });
              setCurrentView('upscale');
            }}
          />
        ) : currentView === 'gallery' ? (

          <Gallery
            onSendToTurbo={(data) => {
              setTurboHandover(data);
              setCurrentView('turbo-wan');
            }}
            onSendToUpscale={(imageUrl, prompt) => {
              setIndividualState({
                file: null,
                originalPreview: imageUrl,
                upscaledPreview: null,
                isProcessing: false,
                error: null,
                prompt: prompt || ""
              });
              setCurrentView('upscale');
            }}
            onSendToQwen={(data) => {
              setQwenHandover(data);
              setCurrentView('qwen-edit');
            }}
          />
        ) : (
          <>
            {state.step === ProcessingStep.IDLE && (
              <div className="max-w-xl mx-auto">
                <label className="group relative block cursor-pointer">
                  <div className="bg-slate-900 border-2 border-dashed border-slate-700 group-hover:border-indigo-500 rounded-3xl p-12 transition-all text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <svg className="w-8 h-8 text-slate-400 group-hover:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Upload 3x3 Grid Image</h3>
                      <p className="text-slate-400 text-sm mt-1">Slices 9 frames, upscales, and animates sequence</p>
                    </div>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>
              </div>
            )}

            {state.step !== ProcessingStep.IDLE && (
              <div className="space-y-12">
                {/* Status Section */}
                <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex flex-col gap-1">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${state.errorMessage ? 'bg-red-500' : 'bg-indigo-500 animate-pulse'}`}></span>
                        Processing Pipeline
                      </h2>
                      <p className="text-xs text-slate-500">Target format: {detectedAspectRatio}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="cursor-pointer text-xs font-bold px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full border border-slate-700 transition-all shadow-lg flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        New Grid
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                      </label>

                      {state.step === ProcessingStep.SLICING && state.frames.length === 9 && (
                        <button
                          onClick={processUpscaling}
                          className="text-xs font-bold px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full border border-indigo-500/50 transition-all shadow-lg animate-bounce-subtle"
                        >
                          Start Upscaling →
                        </button>
                      )}
                      {state.step === ProcessingStep.UPSCALING && !abortUpscaling.current && (
                        <button
                          onClick={handleSkipUpscaling}
                          className="text-xs font-bold px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-full border border-slate-700 transition-all shadow-lg"
                        >
                          Skip Enhancement → Start Video Generation
                        </button>
                      )}
                      {state.step === ProcessingStep.UPSCALING && !abortUpscaling.current && (
                        <button
                          onClick={handleCancelUpscaling}
                          className="text-xs font-bold px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-full border border-red-500/30 transition-all shadow-lg"
                        >
                          Cancel
                        </button>
                      )}
                      <span className="text-xs font-mono px-3 py-1 bg-slate-800 rounded-full text-slate-400 uppercase tracking-widest">
                        {state.step === ProcessingStep.SLICING && state.frames.length === 9 ? 'READY TO UPSCALE' : state.step.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {state.errorMessage && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between gap-4 text-red-400 text-sm">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{state.errorMessage}</span>
                      </div>
                      <button
                        onClick={handleRetry}
                        className="flex-shrink-0 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold rounded-xl transition-all border border-red-500/30"
                      >
                        Retry Failed
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatusCard
                      title="Frame Slicing"
                      description="Extracting 9 segments"
                      status={state.step === ProcessingStep.SLICING ? 'active' : (state.frames.length === 9 ? 'complete' : 'pending')}
                      progress={state.frames.length ? 100 : 0}
                    />
                    <StatusCard
                      title="Enhancement"
                      description="HD Detail Recovery"
                      status={state.step === ProcessingStep.UPSCALING ? 'active' : (state.frames.length > 0 && state.frames.every(f => f.status === 'completed') ? 'complete' : 'pending')}
                      progress={state.frames.length ? (state.frames.filter(f => f.status === 'completed').length / 9) * 100 : 0}
                    />
                    <StatusCard
                      title="Video Synthesis"
                      description={config.provider === 'kling' ? "Kling AI Generation" : "Veo 3.1 Transitions"}
                      status={state.step === ProcessingStep.GENERATING_VIDEOS ? 'active' : (state.step === ProcessingStep.COMPLETED ? 'complete' : 'pending')}
                      progress={state.transitions.length ? (state.transitions.filter(t => t.status === 'completed').length / (state.frames.length - 1)) * 100 : 0}
                    />
                  </div>
                </section>

                {/* Frames Gallery */}
                {state.frames.length > 0 && (
                  <section>
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                      Extracted Frames
                      <span className="text-xs font-normal text-slate-500">(Click to view)</span>
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-9 gap-2">
                      {state.frames.map((frame) => {
                        const isClickable = frame.status === 'completed' || state.step === ProcessingStep.COMPLETED;
                        return (
                          <div
                            key={frame.id}
                            onClick={() => isClickable && setOverlayMedia({ url: frame.upscaledUrl || frame.originalBase64, type: 'image' })}
                            className={`aspect-square bg-slate-800 rounded-lg overflow-hidden border transition-all ${frame.status === 'error' ? 'border-red-500/50 shadow-lg shadow-red-500/10' : 'border-slate-700'} relative group ${isClickable ? 'cursor-zoom-in hover:border-indigo-500 hover:scale-105 z-10' : ''}`}
                          >
                            <img
                              src={frame.upscaledUrl || frame.originalBase64}
                              className={`w-full h-full object-cover transition-opacity ${frame.status === 'processing' ? 'opacity-30' : 'opacity-100'}`}
                              alt={`Frame ${frame.id}`}
                            />
                            {frame.status === 'processing' && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            )}
                            {frame.status === 'completed' && (
                              <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="bg-emerald-500 rounded-full p-0.5 shadow-lg">
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </div>
                            )}
                            <div className="absolute bottom-1 right-1 bg-black/60 px-1.5 rounded text-[10px] font-mono">
                              #{frame.id}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Generated Videos */}
                {state.transitions.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <h3 className="text-lg font-bold">Generated Transitions</h3>
                        {state.step === ProcessingStep.UPSCALING && state.frames.every(f => f.status === 'completed') && (
                          <button
                            onClick={processVideos}
                            className="text-xs font-bold px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full border border-indigo-500/50 transition-all shadow-lg animate-bounce-subtle flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Start Video Generation
                          </button>
                        )}
                      </div>
                      {state.step === ProcessingStep.COMPLETED && (
                        <button
                          onClick={() => window.location.reload()}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
                        >
                          Process New Grid
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {state.transitions.map((t) => (
                        <div key={t.id} className={`bg-slate-900 border ${t.status === 'error' ? 'border-red-500/30' : 'border-slate-800'} rounded-2xl overflow-hidden group`}>
                          <div className="aspect-square bg-slate-950 flex items-center justify-center relative">
                            {t.videoUrl ? (
                              <video
                                src={t.videoUrl}
                                className="w-full h-full object-cover"
                                controls
                                loop
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-3">
                                {t.status === 'processing' ? (
                                  <div className="flex flex-col items-center gap-4 px-6 text-center">
                                    <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                                    <span className="text-xs text-slate-500 animate-pulse block">Rendering {config.provider === 'kling' ? 'Kling AI' : 'Veo 3.1'}...</span>
                                  </div>
                                ) : t.status === 'error' ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <svg className="w-8 h-8 text-red-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <button
                                      onClick={() => handleRetryTransition(t.id)}
                                      className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[10px] font-bold rounded-lg border border-red-500/30 transition-all"
                                    >
                                      Retry Video
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
                                      <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </div>
                                    <span className="text-[10px] text-slate-600 uppercase font-bold tracking-wider">Waiting...</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="p-4 flex flex-col gap-3 bg-slate-900/80">
                            <div className="flex items-center justify-between w-full">
                              <div className={`text-xs font-semibold ${t.status === 'error' ? 'text-red-400' : 'text-slate-400'}`}>
                                Transition {t.fromFrameId} → {t.toFrameId}
                              </div>
                              <div className="flex items-center gap-2">
                                {t.status === 'error' && (
                                  <button
                                    onClick={() => handleRetryTransition(t.id)}
                                    className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all"
                                    title="Retry this video"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357-2H15" />
                                    </svg>
                                  </button>
                                )}
                                {t.videoUrl && (
                                  <a
                                    href={t.videoUrl}
                                    download={`transition_${t.fromFrameId}_${t.toFrameId}.mp4`}
                                    className="p-2 bg-indigo-600/10 text-indigo-400 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0L8 8m4-4v12" />
                                    </svg>
                                  </a>
                                )}
                              </div>
                            </div>

                            {t.status === 'processing' && (
                              <button
                                onClick={() => handleCancelTransition(t.id)}
                                className="w-full py-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-[11px] font-bold rounded-xl border border-slate-700 hover:border-red-500/30 transition-all flex items-center justify-center gap-2"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Cancel Generation
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </>
        )}
      </main>
      {overlayMedia && <MediaOverlay media={overlayMedia} onClose={() => setOverlayMedia(null)} />}
    </div>
  );
};

// Placeholder for StatusCard to fix missing component error locally if it was defined elsewhere or I missed it in view
// Actually, StatusCard is used in the main view. I assumed it was imported or defined in the file. 
// Looking at previous view_file, line 703 uses StatusCard. But I didn't see definition.
// Ah, I only viewed lines 1-800. StatusCard might be defined below 800.
// I will not add it here to avoid duplication error.


interface StatusCardProps {
  title: string;
  description: string;
  status: 'pending' | 'active' | 'complete';
  progress: number;
}

const StatusCard: React.FC<StatusCardProps> = ({ title, description, status, progress }) => {
  const statusColors = {
    pending: 'bg-slate-800 border-slate-700 text-slate-500',
    active: 'bg-indigo-500/5 border-indigo-500/30 text-indigo-400 shadow-lg shadow-indigo-500/5',
    complete: 'bg-emerald-500/5 border-emerald-500/30 text-emerald-400'
  };

  return (
    <div className={`p-5 rounded-2xl border transition-all ${statusColors[status]}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-bold text-sm text-slate-200">{title}</h4>
        {status === 'complete' && (
          <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-4">{description}</p>
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${status === 'complete' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};

export default App;
