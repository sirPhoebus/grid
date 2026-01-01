
import React, { useEffect, useState } from 'react';

export type ApiProvider = 'gemini' | 'kling';

export interface AppConfig {
  provider: ApiProvider;
  geminiKey: string;
  klingAccessKey: string;
  klingSecretKey: string;
  upscaler: 'gemini' | 'local_sd' | 'comfyui';
  localUpscaleFactor: number;
  localSdMethod?: 'extras' | 'img2img';
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSave: (config: AppConfig) => void;
  onClearStorage?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, config, onSave, onClearStorage }) => {
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);

  useEffect(() => {
    if (isOpen) {
      setLocalConfig(config);
    }
  }, [isOpen, config]);

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Provider Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-300">Video Generation Provider</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setLocalConfig(prev => ({ ...prev, provider: 'gemini' }))}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${localConfig.provider === 'gemini'
                  ? 'border-indigo-500 bg-indigo-500/10 text-white'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                  }`}
              >
                <div className="font-bold">Google Gemini</div>
                <div className="text-xs opacity-70 mt-1">Status: Active</div>
              </button>

              <button
                onClick={() => setLocalConfig(prev => ({ ...prev, provider: 'kling' }))}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${localConfig.provider === 'kling'
                  ? 'border-indigo-500 bg-indigo-500/10 text-white'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                  }`}
              >
                <div className="font-bold">Kling AI</div>
                <div className="text-xs opacity-70 mt-1">External API</div>
              </button>
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* Upscaler Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-300">Image Upscaling Method</label>
            <div className="flex gap-4">
              <button
                onClick={() => setLocalConfig(prev => ({ ...prev, upscaler: 'gemini' }))}
                className={`px-4 py-3 rounded-xl border flex-1 text-sm font-semibold transition-all ${localConfig.upscaler === 'gemini'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                  : 'border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
              >
                Gemini 3 Pro
              </button>
              <button
                onClick={() => setLocalConfig(prev => ({ ...prev, upscaler: 'local_sd' }))}
                className={`px-4 py-3 rounded-xl border flex-1 text-sm font-semibold transition-all ${localConfig.upscaler === 'local_sd'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                  : 'border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
              >
                Local Stable Diffusion
              </button>
              <button
                onClick={() => setLocalConfig(prev => ({ ...prev, upscaler: 'comfyui' }))}
                className={`px-4 py-3 rounded-xl border flex-1 text-sm font-semibold transition-all ${localConfig.upscaler === 'comfyui'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                  : 'border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
              >
                ComfyUI
              </button>
            </div>

            {localConfig.upscaler === 'local_sd' && (
              <div className="animate-in fade-in slide-in-from-top-2 pt-2 space-y-4">
                {/* Method Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Method</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLocalConfig(prev => ({ ...prev, localSdMethod: 'extras' }))}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all flex-1 ${(localConfig.localSdMethod || 'extras') === 'extras'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                        : 'border-slate-800 text-slate-500 hover:border-slate-700'
                        }`}
                    >
                      Upscaler (Extras)
                    </button>
                    <button
                      onClick={() => setLocalConfig(prev => ({ ...prev, localSdMethod: 'img2img' }))}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all flex-1 ${localConfig.localSdMethod === 'img2img'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                        : 'border-slate-800 text-slate-500 hover:border-slate-700'
                        }`}
                    >
                      Img2Img (Generative)
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-400 uppercase">Upscale Factor <span className="normal-case font-normal opacity-50 ml-1">(Where supported)</span></label>
                <span className="text-xs font-mono text-indigo-400">{localConfig.localUpscaleFactor || 2}x</span>
              </div>
              <input
                type="range"
                min="2"
                max="4"
                step="1"
                value={localConfig.localUpscaleFactor || 2}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, localUpscaleFactor: Number(e.target.value) }))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-slate-500 px-1 mt-1 font-mono">
                <span>2x</span>
                <span>3x</span>
                <span>4x</span>
              </div>
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* Dynamic Settings Fields */}
          <div className="space-y-4">
            {localConfig.provider === 'gemini' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                  <p className="text-sm text-indigo-300 mb-2">
                    If running in Google IDX/AI Studio, use the "Select API Key" button.
                  </p>
                  <p className="text-xs text-indigo-400/80">
                    For local use, enter your Gemini API Key below.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Gemini API Key</label>
                  <input
                    type="password"
                    value={localConfig.geminiKey || ''}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, geminiKey: e.target.value }))}
                    placeholder="Enter Gemini API Key (Optional for IDX)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-sm"
                  />
                </div>
              </div>
            )}

            {localConfig.provider === 'kling' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Access Key</label>
                  <input
                    type="password"
                    value={localConfig.klingAccessKey}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, klingAccessKey: e.target.value }))}
                    placeholder="Enter Kling Access Key"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Secret Key</label>
                  <input
                    type="password"
                    value={localConfig.klingSecretKey}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, klingSecretKey: e.target.value }))}
                    placeholder="Enter Kling Secret Key"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-sm"
                  />
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <p className="text-xs text-amber-500/80">
                    Keys are stored locally in your browser. Ensure this is a secure environment.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div>
            {onClearStorage && (
              <button
                onClick={onClearStorage}
                className="px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-xl text-xs font-bold border border-red-500/20 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear Cache & Storage
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
