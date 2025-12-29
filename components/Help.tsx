import React from 'react';

export const Help: React.FC = () => {
    return (
        <div className="max-w-6xl mx-auto py-8 px-6 space-y-12">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 -mx-6 -mt-8 px-6 py-12 mb-12">
                <h1 className="text-4xl font-black text-white mb-3">Alcove Pro Help</h1>
                <p className="text-indigo-100 text-lg">Your complete guide to creating stunning AI-generated media</p>
            </div>

            {/* Quick Start */}
            <section className="space-y-6">
                <h2 className="text-3xl font-bold text-white border-b border-slate-700 pb-3">🚀 Quick Start</h2>

                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-xl font-bold text-cyan-400">1. Configure Settings</h3>
                    <p className="text-slate-300">Click the settings gear icon in the top right to configure your API keys and preferences.</p>
                    <img src="/help/settings.png" alt="Settings Panel" className="rounded-xl border border-slate-700 shadow-2xl" />
                </div>
            </section>

            {/* Z-Image Generator */}
            <section className="space-y-6">
                <h2 className="text-3xl font-bold text-white border-b border-slate-700 pb-3">🎨 Z-Image Generator</h2>

                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-xl font-bold text-purple-400">Creating AI Images</h3>
                    <p className="text-slate-300">Generate high-quality images using ComfyUI workflows with full control over models, LoRAs, and parameters.</p>
                    <img src="/help/z-image.png" alt="Z-Image Interface" className="rounded-xl border border-slate-700 shadow-2xl" />

                    <div className="bg-slate-950/50 p-4 rounded-xl space-y-3">
                        <h4 className="font-bold text-white">Key Features:</h4>
                        <ul className="space-y-2 text-slate-300 list-disc list-inside">
                            <li><strong>Model Selection:</strong> Choose between Z-Image Turbo and Nova Reality v1.5</li>
                            <li><strong>LoRA Support:</strong> Chain multiple LoRAs with individual strength controls (0.0-2.0)</li>
                            <li><strong>Advanced Controls:</strong> Adjust steps, CFG, sampler, scheduler, and negative prompts</li>
                            <li><strong>Dimension Presets:</strong> Quick swap between portrait/landscape with one click</li>
                            <li><strong>Prompt Library:</strong> Save and reuse your favorite prompts</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Gallery */}
            <section className="space-y-6">
                <h2 className="text-3xl font-bold text-white border-b border-slate-700 pb-3">🖼️ Gallery</h2>

                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-xl font-bold text-cyan-400">Browsing Your Media</h3>
                    <p className="text-slate-300">The Gallery organizes all your generated content by type: Sliced Images, Upscaled, TurboWan animations, Stitched videos, Z-Images, and Reversed videos.</p>
                    <img src="/help/gallery.png" alt="Gallery Overview" className="rounded-xl border border-slate-700 shadow-2xl" />

                    <div className="bg-slate-950/50 p-4 rounded-xl space-y-3">
                        <h4 className="font-bold text-white">Gallery Features:</h4>
                        <ul className="space-y-2 text-slate-300 list-disc list-inside">
                            <li><strong>Fullscreen Preview:</strong> Click any media to view in fullscreen</li>
                            <li><strong>ESC to Close:</strong> Press Escape key to exit fullscreen view</li>
                            <li><strong>Direct Actions:</strong> Send images to Upscale or TurboWan directly from fullscreen</li>
                            <li><strong>Smart Display:</strong> Maintains aspect ratios for all media types</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Grid Slicing */}
            <section className="space-y-6">
                <h2 className="text-3xl font-bold text-white border-b border-slate-700 pb-3">🔲 Grid Slicing</h2>

                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-xl font-bold text-green-400">Auto-Slice 3x3 Grids</h3>
                    <p className="text-slate-300">Automatically detect and slice 3x3 grid layouts into individual frames for processing.</p>
                    <img src="/help/grid.png" alt="Grid Slicing" className="rounded-xl border border-slate-700 shadow-2xl" />
                </div>
            </section>

            {/* Video Processing */}
            <section className="space-y-6">
                <h2 className="text-3xl font-bold text-white border-b border-slate-700 pb-3">🎬 Video Processing</h2>

                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-xl font-bold text-indigo-400">TurboWan Animation</h3>
                    <p className="text-slate-300">Animate static images into smooth video sequences using Veo 3.1 or Kling AI.</p>
                    <img src="/help/TurboWan.png" alt="TurboWan Interface" className="rounded-xl border border-slate-700 shadow-2xl" />

                    <div className="bg-slate-950/50 p-4 rounded-xl space-y-3">
                        <h4 className="font-bold text-white">Workflow:</h4>
                        <ol className="space-y-2 text-slate-300 list-decimal list-inside">
                            <li>Upload an image or receive one from Z-Image/Upscale</li>
                            <li>Enter a motion prompt describing the desired animation</li>
                            <li>Choose video provider (Veo or Kling) and aspect ratio</li>
                            <li>Enable iterations for multi-step sequences (optional)</li>
                            <li>Click "Create Magic" to generate</li>
                        </ol>
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-xl font-bold text-indigo-400">Iterative Generation</h3>
                    <p className="text-slate-300">Create animation sequences by enabling iterations and auto-stitching.</p>
                    <img src="/help/Turbowan-2.png" alt="TurboWan Iterations" className="rounded-xl border border-slate-700 shadow-2xl" />
                </div>
            </section>

            {/* Frame Extraction */}
            <section className="space-y-6">
                <h2 className="text-3xl font-bold text-white border-b border-slate-700 pb-3">📸 Frame Extraction</h2>

                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-xl font-bold text-yellow-400">Extract Last Frame</h3>
                    <p className="text-slate-300">Extract the final frame from any video to use as a starting point for new animations or upscaling.</p>
                    <img src="/help/extractor.png" alt="Frame Extractor" className="rounded-xl border border-slate-700 shadow-2xl" />
                </div>
            </section>

            {/* Upscaling */}
            <section className="space-y-6">
                <h2 className="text-3xl font-bold text-white border-b border-slate-700 pb-3">🔍 Image Upscaling</h2>

                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-xl font-bold text-green-400">Upscale Individual Images</h3>
                    <p className="text-slate-300">Enhance image quality using Gemini, ComfyUI, or Local Stable Diffusion with 2x, 3x, or 4x scaling.</p>
                    <img src="/help/upscale.png" alt="Upscale Interface" className="rounded-xl border border-slate-700 shadow-2xl" />

                    <div className="bg-slate-950/50 p-4 rounded-xl space-y-3">
                        <h4 className="font-bold text-white">Upscaling Methods:</h4>
                        <ul className="space-y-2 text-slate-300 list-disc list-inside">
                            <li><strong>Gemini:</strong> Fast, cloud-based upscaling (requires API key)</li>
                            <li><strong>ComfyUI:</strong> High-quality local upscaling with SeedVR2 (port 8188)</li>
                            <li><strong>Stable Diffusion:</strong> A1111 WebUI integration (Extras or Img2Img)</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Tips & Shortcuts */}
            <section className="space-y-6">
                <h2 className="text-3xl font-bold text-white border-b border-slate-700 pb-3">💡 Tips & Keyboard Shortcuts</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border border-cyan-800/50 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-cyan-300 mb-3">⌨️ Keyboard Shortcuts</h3>
                        <ul className="space-y-2 text-slate-300">
                            <li><kbd className="px-2 py-1 bg-slate-800 rounded text-xs">ESC</kbd> - Close fullscreen gallery view</li>
                        </ul>
                    </div>

                    <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-800/50 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-purple-300 mb-3">⚡ Pro Tips</h3>
                        <ul className="space-y-2 text-slate-300 text-sm">
                            <li>• Settings persist across sessions automatically</li>
                            <li>• Last Z-Image result stays until you navigate away</li>
                            <li>• LoRA order matters - they're applied sequentially</li>
                            <li>• Use Prompt Library to save your best prompts</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Troubleshooting */}
            <section className="space-y-6">
                <h2 className="text-3xl font-bold text-white border-b border-slate-700 pb-3">🔧 Troubleshooting</h2>

                <div className="bg-red-900/20 border border-red-800/50 rounded-2xl p-6 space-y-4">
                    <h3 className="text-xl font-bold text-red-400">Common Issues</h3>

                    <div className="space-y-4">
                        <div>
                            <h4 className="font-bold text-white mb-2">Permission Denied (Windows)</h4>
                            <p className="text-slate-300 text-sm">Video file is locked by a player or browser. Close all media players and browser tabs displaying the file.</p>
                        </div>

                        <div>
                            <h4 className="font-bold text-white mb-2">ComfyUI Connection Failed</h4>
                            <p className="text-slate-300 text-sm">Ensure ComfyUI is running on http://127.0.0.1:8188 and models are in the correct directories.</p>
                        </div>

                        <div>
                            <h4 className="font-bold text-white mb-2">Gallery Not Loading</h4>
                            <p className="text-slate-300 text-sm">Refresh the page or check browser console (F12) for detailed errors.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <div className="text-center py-8 text-slate-500 text-sm border-t border-slate-800">
                <p>For more detailed documentation, check the README.md file in the project root.</p>
                <p className="mt-2">Alcove Pro v1.4 • Built with React & Vite</p>
            </div>
        </div>
    );
};
