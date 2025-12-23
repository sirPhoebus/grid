
export class ComfyUiService {
    private static readonly API_BASE_URL = '/comfy-api';
    private static clientId = crypto.randomUUID();

    static async upscaleFrame(base64Image: string, upscaleFactor?: number): Promise<string> {
        // 1. Upload Image
        const filename = await this.uploadImage(base64Image);

        // 2. Queue Prompt
        const prompt = this.getWorkflow(filename);
        const { prompt_id } = await this.queuePrompt(prompt);

        // 3. Wait for execution
        await this.waitForExecution(prompt_id);

        // 4. Get Output
        const history = await this.getHistory(prompt_id);
        const outputs = history[prompt_id].outputs;

        // Find SaveImage node output (Node 15)
        const saveImageNodeOutput = outputs['15'];
        if (!saveImageNodeOutput || !saveImageNodeOutput.images || saveImageNodeOutput.images.length === 0) {
            throw new Error("No output image found from ComfyUI");
        }

        const imageInfo = saveImageNodeOutput.images[0];
        return await this.getImage(imageInfo.filename, imageInfo.subfolder, imageInfo.type);
    }

    private static async uploadImage(base64Image: string): Promise<string> {
        const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
        const byteCharacters = atob(cleanBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });

        const formData = new FormData();
        const filename = `upload_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`;
        formData.append('image', blob, filename);
        formData.append('overwrite', 'true');

        const response = await fetch(`${this.API_BASE_URL}/upload/image`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Failed to upload image to ComfyUI: ${response.statusText}`);
        }

        const data = await response.json();
        // ComfyUI returns {name: "filename.png", subfolder: "", type: "input"}
        return data.name;
    }

    private static async queuePrompt(prompt: any): Promise<{ prompt_id: string }> {
        const response = await fetch(`${this.API_BASE_URL}/prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                client_id: this.clientId
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to queue prompt: ${response.statusText}`);
        }

        return await response.json();
    }

    private static async waitForExecution(prompt_id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // Use the proxy path for WebSocket to avoid Origin mismatch issues.
            // Vite proxy is configured to handle WS on /comfy-api -> /
            // So we connect to ws://localhost:3000/comfy-api/ws

            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host; // e.g., localhost:3000
            const wsUrl = `${protocol}//${host}/comfy-api/ws?clientId=${this.clientId}`;
            const socket = new WebSocket(wsUrl);

            socket.onmessage = (event) => {
                if (typeof event.data === 'string') {
                    const message = JSON.parse(event.data);
                    if (message.type === 'executing') {
                        const data = message.data;
                        if (data.node === null && data.prompt_id === prompt_id) {
                            socket.close();
                            resolve();
                        }
                    }
                }
            };

            socket.onerror = (error) => {
                console.error("WebSocket Error", error);
                // Don't reject immediately, maybe it connects? or maybe fail.
                // socket.close();
                // reject(error);
            };

            // Timeout safety
            setTimeout(() => {
                if (socket.readyState !== WebSocket.CLOSED) {
                    socket.close();
                    // reject(new Error("Timeout waiting for ComfyUI execution")); // Optional
                }
            }, 300000); // 5 minutes timeout
        });
    }

    private static async getHistory(prompt_id: string): Promise<any> {
        const response = await fetch(`${this.API_BASE_URL}/history/${prompt_id}`);
        if (!response.ok) throw new Error("Failed to get history");
        return await response.json();
    }

    private static async getImage(filename: string, subfolder: string, type: string): Promise<string> {
        const params = new URLSearchParams({
            filename,
            subfolder,
            type
        });
        const response = await fetch(`${this.API_BASE_URL}/view?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to get output image");

        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    private static getWorkflow(inputFilename: string) {
        // Ported from comf_api.py
        return {
            "10": {
                "inputs": {
                    "seed": Math.floor(Math.random() * 1000000000), // Randomize seed
                    "resolution": 2048, // Reduced from 4096 to be safer? No, stick to prompt or user req. 
                    // comf_api.py had 4096.
                    "max_resolution": 4096,
                    "batch_size": 1,
                    "uniform_batch_size": false,
                    "color_correction": "lab",
                    "temporal_overlap": 0,
                    "prepend_frames": 0,
                    "input_noise_scale": 0,
                    "latent_noise_scale": 0,
                    "offload_device": "cpu",
                    "enable_debug": false,
                    "image": [
                        "17",
                        0
                    ],
                    "dit": [
                        "14",
                        0
                    ],
                    "vae": [
                        "13",
                        0
                    ]
                },
                "class_type": "SeedVR2VideoUpscaler",
                "_meta": {
                    "title": "SeedVR2 Video Upscaler (v2.5.22)"
                }
            },
            "13": {
                "inputs": {
                    "model": "ema_vae_fp16.safetensors",
                    "device": "cuda:0",
                    "encode_tiled": true,
                    "encode_tile_size": 1024,
                    "encode_tile_overlap": 128,
                    "decode_tiled": true,
                    "decode_tile_size": 1024,
                    "decode_tile_overlap": 128,
                    "tile_debug": "false",
                    "offload_device": "cpu",
                    "cache_model": false
                },
                "class_type": "SeedVR2LoadVAEModel",
                "_meta": {
                    "title": "SeedVR2 (Down)Load VAE Model"
                }
            },
            "14": {
                "inputs": {
                    "model": "seedvr2_ema_7b_sharp_fp16.safetensors",
                    "device": "cuda:0",
                    "blocks_to_swap": 36,
                    "swap_io_components": false,
                    "offload_device": "cpu",
                    "cache_model": false,
                    "attention_mode": "sdpa"
                },
                "class_type": "SeedVR2LoadDiTModel",
                "_meta": {
                    "title": "SeedVR2 (Down)Load DiT Model"
                }
            },
            "15": {
                "inputs": {
                    "filename_prefix": "ComfyUI",
                    "images": [
                        "10",
                        0
                    ]
                },
                "class_type": "SaveImage",
                "_meta": {
                    "title": "Save Image"
                }
            },
            "16": {
                "inputs": {
                    "image": inputFilename,
                    "upload": "image"
                },
                "class_type": "LoadImage",
                "_meta": {
                    "title": "Load Image"
                }
            },
            "17": {
                "inputs": {
                    "image": [
                        "16",
                        0
                    ],
                    "alpha": [
                        "16",
                        1
                    ]
                },
                "class_type": "JoinImageWithAlpha",
                "_meta": {
                    "title": "Join Image with Alpha"
                }
            }
        };
    }
}
