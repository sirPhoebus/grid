
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GeminiService, SupportedAspectRatio } from './services/geminiService';
import { KlingService } from './services/klingService';
import { SettingsModal, AppConfig, ApiProvider } from './components/SettingsModal';
import { ProcessingStep, Frame, VideoTransition, AppState } from './types';

// Components
const Header: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => (
  <header className="py-8 px-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
    <div className="max-w-6xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">GridToVideo <span className="text-indigo-400">Pro</span></h1>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Powered by Gemini & Veo 3.1 & Kling AI</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <a
          href="https://ai.google.dev/gemini-api/docs/billing"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:block text-xs text-slate-500 hover:text-indigo-400 transition-colors"
        >
          Billing Documentation
        </a>
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

const ImageOverlay: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => (
  <div
    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
    onClick={onClose}
  >
    <div className="relative max-w-full max-h-full">
      <img
        src={url}
        className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border border-slate-800"
        alt="Preview"
      />
      <button
        className="absolute -top-12 right-0 text-slate-400 hover:text-white flex items-center gap-2 transition-colors font-medium"
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

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [config, setConfig] = useState<AppConfig>({
    provider: 'gemini',
    geminiKey: '',
    klingAccessKey: '',
    klingSecretKey: ''
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
    const savedConfig = localStorage.getItem('gridtovideo_config');
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
    localStorage.setItem('gridtovideo_config', JSON.stringify(newConfig));
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

          const cellW = img.width / 3;
          const cellH = img.height / 3;

          const ratio = cellW / cellH;
          let ar: SupportedAspectRatio = "1:1";
          if (ratio > 1.4) ar = "16:9";
          else if (ratio > 1.2) ar = "4:3";
          else if (ratio < 0.6) ar = "9:16";
          else if (ratio < 0.8) ar = "3:4";
          setDetectedAspectRatio(ar);

          const newFrames: Frame[] = [];
          const base64Full = img.src.split(',')[1];
          try {
            await GeminiService.verifyGridWithNano(base64Full, config.geminiKey);
          } catch (e) {
            console.error("Nano verification failed", e);
          }

          for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
              canvas.width = cellW;
              canvas.height = cellH;
              ctx.drawImage(img, col * cellW, row * cellH, cellW, cellH, 0, 0, cellW, cellH);
              newFrames.push({
                id: newFrames.length + 1,
                originalBase64: canvas.toDataURL('image/png'),
                status: 'pending'
              });
            }
          }
          setState(prev => ({ ...prev, frames: newFrames }));
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

        const upscaled = await GeminiService.upscaleFrame(currentFrames[i].originalBase64.split(',')[1], detectedAspectRatio, config.geminiKey);

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

  // Auto-start upscaling after slicing
  useEffect(() => {
    if (state.step === ProcessingStep.SLICING && state.frames.length === 9) {
      processUpscaling();
    }
  }, [state.step, state.frames.length]);

  // Auto-start videos after all upscaling completes
  useEffect(() => {
    if (state.step === ProcessingStep.UPSCALING && !abortUpscaling.current && state.frames.length === 9 && state.frames.every(f => f.status === 'completed')) {
      processVideos();
    }
  }, [state.step, state.frames]);

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
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSave={handleSaveConfig}
      />
      {overlayUrl && <ImageOverlay url={overlayUrl} onClose={() => setOverlayUrl(null)} />}

      <main className="max-w-6xl mx-auto mt-12 px-6">
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
                  {state.step === ProcessingStep.UPSCALING && !abortUpscaling.current && (
                    <button
                      onClick={handleSkipUpscaling}
                      className="text-xs font-bold px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-full border border-slate-700 transition-all shadow-lg"
                    >
                      Skip Enhancement → Start Video Generation
                    </button>
                  )}
                  <span className="text-xs font-mono px-3 py-1 bg-slate-800 rounded-full text-slate-400 uppercase tracking-widest">
                    {state.step.replace('_', ' ')}
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
                        onClick={() => isClickable && setOverlayUrl(frame.upscaledUrl || frame.originalBase64)}
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
                  <h3 className="text-lg font-bold">Generated Transitions</h3>
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
      </main>
    </div>
  );
};

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
