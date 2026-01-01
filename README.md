# Alcove Pro

**Professional AI Media Generation Suite** — Transform, upscale, animate, and create stunning visual content using cutting-edge AI technologies.

Powered by **Gemini**, **ComfyUI**, **Veo 3.1**, and **Kling AI**, Alcove Pro is a complete creative toolset for image generation, video animation, and media processing.

---

## ✨ Core Features

### 🎨 **Z-Image Generator**
- Generate high-quality AI images using ComfyUI workflows
- Support for multiple UNET models (Z-Image Turbo, Nova Reality v1.5 Turbo)
- Multi-LoRA chaining with individual strength controls
- Negative prompts and CFG adjustment
- Global prompt library for reusable templates
- Persistent settings across sessions

### 🎬 **TurboWan Video Animation**
- Animate static images into smooth video sequences
- Multi-provider support: **Veo 3.1** or **Kling AI**
- Iterative generation (create sequences of animations)
- Smart aspect ratio handling
- Frame-by-frame control

### 🔍 **Individual Upscaling**
- Upscale single images with multiple backends:
  - **Gemini 3 Pro** (quick and high quality)
  - **Local ComfyUI** (SeedVR2 Video Upscaler)
  - **Stable Diffusion** (A1111 WebUI via Extras or Img2Img)
- 2x, 3x, and 4x upscale factors

### 🎞️ **Video Processing**
- **Video Stitching**: Combine multiple videos into seamless sequences
- **Video Reverser**: Reverse video and audio streams
- **Frame Extraction**: Extract the last frame from videos for reuse

### 🪄 **Qwen Edit Pro**
- **Single Image Mode**: Professional AI image editing with a single reference image (1536px high-fidelity)
- **Triple Image Mode**: Complex image composition using three source images and a prompt
- **Side-by-Side Comparison**: Automatic generation of comparison views for triple composition
- **Unified Backend**: Integrated directly into your local ComfyUI instance via `/comfy-api`

### 🖼️ **Unified Gallery**
- Centralized media browser for all generated content
- Categories: Sliced Images, Upscaled, TurboWan, Stitched, Z-Images, Reversed Videos
- Fullscreen preview with keyboard shortcuts (ESC to close)
- Direct actions: "Send to Upscale" and "Send to TurboWan"
- Smart aspect ratio display

### 📝 **Global Prompt Library**
- Save and manage prompts across all tools
- Real-time sync between components
- One-click prompt loading

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+**
- **ComfyUI** (optional, for local upscaling and Z-Image generation)
- **FFmpeg** (required for video processing)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API Keys:**
   - Create a `.env.local` file (optional):
     ```env
     GEMINI_API_KEY=your_key_here
     ```
   - OR use the Settings UI (⚙️) to enter keys securely

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

---

## 🎮 Configuration Guide

### ComfyUI Setup (for Z-Image & Upscaling)

1. **Install ComfyUI** and ensure it's running on `http://127.0.0.1:8188`
2. **Download required models:**
   - Place UNET models in `ComfyUI/models/unet/`
   - Place LoRAs in `ComfyUI/models/loras/`
   - Place VAE in `ComfyUI/models/vae/`
   - Place CLIP models in `ComfyUI/models/clip/`

3. **In Alcove Pro Settings:**
   - Set **Image Upscaling Method** to "ComfyUI"
   - Configure LoRA directory path (default: `D:\comfui-Python3.12\ComfyUI\models\loras`)

### Local Stable Diffusion Setup

1. **Launch A1111 WebUI** with API enabled:
   ```bash
   webui.bat --api
   ```

2. **In Alcove Pro Settings:**
   - Select "Local Stable Diffusion"
   - Choose "Upscaler (Extras)" or "Img2Img"

### Video Generation Providers

- **Veo 3.1** (Google): Requires Gemini API key
- **Kling AI**: Requires Kling API credentials

Configure in Settings → Video Generation Method

---

## 🛠️ Features Breakdown

### Z-Image Generator
- **Model Selection**: Switch between different UNET models on-the-fly
- **LoRA Support**: Chain multiple LoRAs with individual strength sliders (0.0-2.0)
- **Advanced Controls**: Steps (1-30), CFG (1-7), Sampler, Scheduler
- **Smart Dimension Presets**: Quick swap between portrait/landscape
- **Persistent State**: All settings and last generated image saved automatically

### Gallery
- **ESC Key Support**: Press escape to close fullscreen view
- **Direct Actions**: Send any image to upscale or TurboWan from the gallery
- **Smart Loading**: Keeps modal open during transfer for reference

### Video Processing
- **FFmpeg Integration**: Professional-grade video manipulation
- **Automated Workflows**: Auto-stitch after iterative TurboWan generations
- **Reverse Videos**: Reverse both video and audio streams

### Qwen Edit Pro
- **Mode Switching**: Toggle between "Single Image" and "Triple Image" modes
- **High Fidelity**: Single-image mode utilizes a 1536px longest-edge scaling for maximum quality
- **Refined Composition**: Triple-image mode handles complex background removals and reconstructions
- **Artifact Management**: Save results directly to a dedicated `qwen_gallery`

---

## 📁 Project Structure

```
grid/
├── components/
│   ├── ZImage.tsx          # AI image generation
│   ├── TurboWan.tsx        # Video animation
│   ├── VideoStitcher.tsx   # Video stitching
│   ├── VideoReverser.tsx   # Video reversal
│   ├── FrameExtractor.tsx  # Frame extraction
│   ├── Gallery.tsx         # Media browser
│   ├── Help.tsx            # Integrated manual and guides
│   ├── QwenPage.tsx        # Qwen Pro image editing
│   └── PromptLibrary.tsx   # Prompt management
├── services/
│   └── comfyUiService.ts   # Unified ComfyUI & Qwen workflow manager
├── media/                  # Generated content storage
│   ├── sliced_img/
│   ├── upscale/
│   ├── individual_upscale/
│   ├── turbowan/
│   ├── stitched/
│   ├── z_image/
│   ├── inverse/
│   └── qwen_gallery/
└── vite.config.ts          # Backend middleware
```

---

## 🔧 Backend Endpoints

The Vite dev server includes custom middleware for file operations:

- `GET /list-media` - List all media files by category
- `POST /delete-media` - Delete media files
- `POST /save-slice` - Save base64 encoded media
- `POST /save-video` - Save video from URL
- `POST /extract-last-frame` - Extract last frame using FFmpeg
- `POST /stitch-videos` - Combine videos using FFmpeg
- `POST /reverse-video` - Reverse video and audio
- `GET /list-loras` - List available LoRA files

---

## 💡 Tips & Tricks

1. **Persistent Workflow**: Z-Image settings persist across sessions - your last prompt, LoRAs, and generated image stay until you navigate away
2. **Keyboard Shortcuts**: Press ESC to quickly close fullscreen gallery views
3. **LoRA Chaining**: Order matters! LoRAs are applied sequentially in the order you add them
4. **Iterative Generation**: Use TurboWan's iteration feature to create animation sequences automatically
5. **Frame Recycling**: Extract the last frame from any video and send it back to TurboWan for continuation
6. **Qwen Comparison**: Use "Triple Image" mode in Qwen Pro to see exactly how your AI edits compare to the originals in a side-by-side view

---

## 🐛 Troubleshooting

### "Permission Denied" on Windows
- **Cause**: Video file is locked by a player or browser
- **Solution**: Close all media players and browser tabs displaying the file

### Gallery Crash
- **Cause**: File locking or rapid state updates
- **Solution**: Refresh the page or restart the dev server

### ComfyUI Connection Failed
- **Check**: ComfyUI is running on `http://127.0.0.1:8188`
- **Verify**: Models are placed in correct directories

---

## 📜 Version History

### v1.5 (Latest)
- **Qwen Edit Pro**: New professional image editing suite with Single and Triple image modes
- **Unified Backend**: All ComfyUI and Qwen workflows now routed through a single `/comfy-api` proxy
- **Premium UI**: Responsive sub-navigation and zero-dependency inline SVGs for Qwen Pro
- **Media Expansion**: Support for `qwen_gallery` in the system configuration

### v1.4
- **Z-Image Persistence**: Settings and results saved across sessions
- **Model Selection**: Switch between multiple UNET models
- **LoRA Chaining**: Support for multiple LoRAs with strength controls
- **Gallery Enhancements**: Direct action buttons, ESC key support
- **Bug Fixes**: React Hooks violations, file locking issues

### v1.3
- **Video Reverser**: Reverse videos with audio
- **Z-Image Enhancements**: Negative prompts, CFG slider, +/- step controls
- **Gallery Actions**: Send to Upscale/TurboWan from fullscreen

### v1.0
- Initial release with Z-Image, TurboWan, Gallery, and video processing

---

**Built with React, Vite, TypeScript, and TailwindCSS**

*For issues or feature requests, check the browser console (F12) for detailed error messages.*
