/**
 * Server Configuration
 * Central location for all server paths and settings
 */

export const serverConfig = {
    // API Proxies
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
    },

    // Server Settings
    server: {
        port: 3000,
        host: '0.0.0.0',
    },

    // Directory Paths
    paths: {
        // ComfyUI paths
        loraDir: 'D:\\ComfyUI_windows_portable\\ComfyUI\\models\\loras',

        // Local media directory
        mediaDir: 'media',

        // Media subdirectories
        mediaTypes: ['sliced_img', 'upscale', 'individual_upscale', 'turbowan', 'stitched', 'z_image', 'inverse', 'qwen_gallery'],
    },

    // File Settings
    files: {
        // Allowed file extensions
        imageExtensions: ['.png', '.jpg', '.jpeg'],
        videoExtensions: ['.mp4', '.webm'],

        // MIME types
        mimeTypes: {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
        },

        // File patterns
        loraExtension: '.safetensors',
    },

    // FFmpeg Settings
    ffmpeg: {
        // Default quality settings
        defaultCRF: 19,
        defaultPixFmt: 'yuv420p',
    },
} as const;
