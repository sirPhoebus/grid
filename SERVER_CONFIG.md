# Server Configuration Guide

## Overview
All server paths and configuration values have been centralized in `server.config.ts` for easier maintenance and deployment flexibility.

## Configuration File: `server.config.ts`

### Main Configuration Sections

#### 1. **API Proxies** (`proxies`)
- **Kling AI**: Target and security settings for Kling API
- **Stable Diffusion**: Local Stable Diffusion API endpoint
- **ComfyUI**: Local ComfyUI API endpoint

```typescript
proxies: {
  kling: {
    target: 'https://api.klingai.com/v1',
    secure: false,
  },
  stableDiffusion: {
    target: 'http://127.0.0.1:7860',
  },
  comfyUI: {
    target: 'http://127.0.0.1:8188',
  },
}
```

#### 2. **Server Settings** (`server`)
- **Port**: Development server port (default: 3000)
- **Host**: Server host binding (default: 0.0.0.0)

```typescript
server: {
  port: 3000,
  host: '0.0.0.0',
}
```

#### 3. **Directory Paths** (`paths`)
- **loraDir**: Path to ComfyUI LoRA models directory
- **mediaDir**: Local media storage directory
- **mediaTypes**: Array of valid media subdirectory names

```typescript
paths: {
  loraDir: 'D:\\comfui-Python3.12\\ComfyUI\\models\\loras',
  mediaDir: 'media',
  mediaTypes: ['sliced_img', 'upscale', 'individual_upscale', 'turbowan', 'stitched', 'z_image', 'inverse'],
}
```

#### 4. **File Settings** (`files`)
- **Extensions**: Allowed image and video file extensions
- **MIME Types**: File extension to MIME type mappings
- **LoRA Extension**: File extension for LoRA models

```typescript
files: {
  imageExtensions: ['.png', '.jpg', '.jpeg'],
  videoExtensions: ['.mp4', '.webm'],
  mimeTypes: {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
  },
  loraExtension: '.safetensors',
}
```

#### 5. **FFmpeg Settings** (`ffmpeg`)
- **CRF**: Default quality setting for video encoding
- **Pixel Format**: Default pixel format for video

## How to Update Configuration

### Changing ComfyUI or Stable Diffusion Ports

Edit `server.config.ts`:
```typescript
proxies: {
  comfyUI: {
    target: 'http://127.0.0.1:YOUR_NEW_PORT',
  },
}
```

### Changing LoRA Directory Path

Edit the `loraDir` in `server.config.ts`:
```typescript
paths: {
  loraDir: 'YOUR_PATH_TO_COMFYUI\\models\\loras',
  // ...
}
```

### Adding New Media Types

Add to the `mediaTypes` array:
```typescript
paths: {
  // ...
  mediaTypes: ['sliced_img', 'upscale', 'your_new_type', ...],
}
```

### Changing Development Server Port

Edit the server configuration:
```typescript
server: {
  port: YOUR_PORT,
  host: '0.0.0.0',
}
```

## Benefits

✅ **Single Source of Truth**: All configuration in one file  
✅ **Easy Deployment**: Change paths for different environments  
✅ **Type Safety**: TypeScript ensures configuration correctness  
✅ **Maintainability**: No more hunting through code for hardcoded values  

## Migration Notes

All previously hardcoded values have been extracted:
- API proxy targets and settings
- Port and host configurations  
- File paths (media, LoRA directories)
- File extensions and MIME types
- Media type definitions

No functionality has changed—only the organization of configuration values.
