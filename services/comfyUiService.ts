export interface ZImageParams {
    width: number;
    height: number;
    steps: number;
    prompt: string;
    negative_prompt?: string;
    cfg?: number;
    loras?: { name: string; strength: number }[];
    unet_model?: string;
    sampler_name: 'euler' | 'res_multistep';
    scheduler: 'beta' | 'simple';
    depth_image?: string; // Optional depth image (base64 or blob URL)
}

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

    private static async uploadImage(imageInput: string): Promise<string> {
        if (!imageInput) {
            throw new Error("No image input provided for upload");
        }
        let blob: Blob;

        if (imageInput.startsWith('blob:')) {
            const response = await fetch(imageInput);
            blob = await response.blob();
        } else {
            const cleanBase64 = imageInput.replace(/^data:image\/\w+;base64,/, '');
            const byteCharacters = atob(cleanBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            blob = new Blob([byteArray], { type: 'image/png' });
        }

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

    public static async runTurboWanWorkflow(base64Image: string, promptText: string, aspectRatio: string = "16:9"): Promise<{ videoUrl: string, lastFrameUrl: string, localVideoPath: string }> {
        // 1. Upload Image
        const filename = await this.uploadImage(base64Image);

        // 2. Queue Prompt
        console.log("--- WAN API Prompt ---");
        console.log(promptText);
        console.log("----------------------");
        const prompt = this.getTurboWanWorkflow(filename, promptText, aspectRatio);
        const { prompt_id } = await this.queuePrompt(prompt);

        // 3. Wait for execution
        await this.waitForExecution(prompt_id);

        // 4. Get Output
        const history = await this.getHistory(prompt_id);
        const outputs = history[prompt_id].outputs;

        // Node 9 is VHS_VideoCombine in the provided JSON
        const videoCombineOutput = outputs['9'];
        if (!videoCombineOutput || !videoCombineOutput.gifs || videoCombineOutput.gifs.length === 0) {
            throw new Error("No output video found from ComfyUI (Node 9)");
        }

        const videoInfo = videoCombineOutput.gifs[0];
        const videoUrl = `${this.API_BASE_URL}/view?filename=${videoInfo.filename}&subfolder=${videoInfo.subfolder}&type=${videoInfo.type}`;

        // 5. Save video and get last frame from ComfyUI
        const saveRes = await fetch('/save-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: videoUrl })
        });
        const { path: localVideoPath } = await saveRes.json();

        // 6. Get Last Frame from PreviewImage (Node 8)
        const previewOutput = outputs['8'];
        if (!previewOutput || !previewOutput.images || previewOutput.images.length === 0) {
            throw new Error("No preview images found from ComfyUI (Node 8)");
        }

        const lastImageInfo = previewOutput.images[previewOutput.images.length - 1];
        const lastFrameUrl = await this.getImage(lastImageInfo.filename, lastImageInfo.subfolder, lastImageInfo.type);

        return { videoUrl, lastFrameUrl, localVideoPath };
    }

    static async stitchVideos(videoPaths: string[]): Promise<string> {
        const response = await fetch('/stitch-videos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videos: videoPaths })
        });
        const { url } = await response.json();
        return url;
    }

    private static getTurboWanWorkflow(inputFilename: string, promptText: string, aspectRatio: string) {
        let width = 480;
        let height = 480;
        let arFloat = 1.777; // Default 16:9

        // Map aspect ratio to dimensions (Wan handles specific resolutions best)
        // Default to a base of 480 for the shorter side usually, or specific Wan-friendly values
        if (aspectRatio === "16:9") {
            width = 848;
            height = 480;
            arFloat = 1.777;
        } else if (aspectRatio === "9:16") {
            width = 480;
            height = 848;
            arFloat = 0.5625;
        } else if (aspectRatio === "4:3") {
            width = 640;
            height = 480;
            arFloat = 1.333;
        } else if (aspectRatio === "3:4") {
            width = 480;
            height = 640;
            arFloat = 0.75;
        }

        return {
            "1": {
                "inputs": {
                    "model_name": "TurboWan2.2-I2V-A14B-high-720P-quant.pth",
                    "attention_type": "sla",
                    "sla_topk": 0.1,
                    "offload_mode": "comfy_native"
                },
                "class_type": "TurboWanModelLoader",
                "_meta": {
                    "title": "Load High Noise Model"
                }
            },
            "2": {
                "inputs": {
                    "model_name": "TurboWan2.2-I2V-A14B-low-720P-quant.pth",
                    "attention_type": "sla",
                    "sla_topk": 0.1,
                    "offload_mode": "comfy_native"
                },
                "class_type": "TurboWanModelLoader",
                "_meta": {
                    "title": "Load Low Noise Model"
                }
            },
            "3": {
                "inputs": {
                    "clip_name": "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
                    "type": "wan",
                    "device": "default"
                },
                "class_type": "CLIPLoader",
                "_meta": {
                    "title": "Load CLIP (umT5 Text Encoder)"
                }
            },
            "4": {
                "inputs": {
                    "text": promptText,
                    "clip": [
                        "3",
                        0
                    ]
                },
                "class_type": "CLIPTextEncode",
                "_meta": {
                    "title": "Positive Prompt"
                }
            },
            "5": {
                "inputs": {
                    "vae_name": "Wan2.1_VAE.pth"
                },
                "class_type": "TurboWanVAELoader",
                "_meta": {
                    "title": "Load Wan VAE"
                }
            },
            "6": {
                "inputs": {
                    "image": inputFilename
                },
                "class_type": "LoadImage",
                "_meta": {
                    "title": "Load Start Image"
                }
            },
            "7": {
                "inputs": {
                    "num_frames": 137,
                    "num_steps": 4,
                    "resolution": "480",
                    "aspect_ratio": aspectRatio,
                    "boundary": 0.9,
                    "sigma_max": 200,
                    "seed": Math.floor(Math.random() * 1000000),
                    "use_ode": false,
                    "low_vram": false,
                    "width": width,
                    "height": height,
                    "high_noise_model": [
                        "1",
                        0
                    ],
                    "low_noise_model": [
                        "2",
                        0
                    ],
                    "conditioning": [
                        "4",
                        0
                    ],
                    "vae": [
                        "5",
                        0
                    ],
                    "image": [
                        "6",
                        0
                    ]
                },
                "class_type": "TurboDiffusionI2VSampler",
                "_meta": {
                    "title": "TurboDiffusion I2V Sampler"
                }
            },
            "8": {
                "inputs": {
                    "images": [
                        "7",
                        0
                    ]
                },
                "class_type": "PreviewImage",
                "_meta": {
                    "title": "Preview Frames"
                }
            },
            "9": {
                "inputs": {
                    "frame_rate": 25,
                    "loop_count": 0,
                    "filename_prefix": "AnimateDiff",
                    "format": "video/h264-mp4",
                    "pix_fmt": "yuv420p",
                    "crf": 19,
                    "save_metadata": true,
                    "trim_to_audio": false,
                    "pingpong": false,
                    "save_output": true,
                    "images": [
                        "7",
                        0
                    ]
                },
                "class_type": "VHS_VideoCombine",
                "_meta": {
                    "title": "Video Combine 🎥🅥🅗🅢"
                }
            }
        };
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
        return URL.createObjectURL(blob);
    }

    static getZImageDepthWorkflow(params: ZImageParams, depthImageFilename: string) {
        // New depth-based workflow with controlnet
        let currentModelInput = ["70:46", 0]; // Start with UNET output
        const nodes: any = {
            "9": {
                "inputs": {
                    "filename_prefix": "z-image-turbo",
                    "images": ["70:84", 0]
                },
                "class_type": "SaveImage",
                "_meta": { "title": "Save Image" }
            },
            "56": {
                "inputs": {
                    "images": ["72", 0]
                },
                "class_type": "PreviewImage",
                "_meta": { "title": "Preview Image" }
            },
            "58": {
                "inputs": {
                    "image": depthImageFilename
                },
                "class_type": "LoadImage",
                "_meta": { "title": "Load Image" }
            },
            "62": {
                "inputs": {
                    "upscale_method": "lanczos",
                    "largest_size": 1024,
                    "image": ["58", 0]
                },
                "class_type": "ImageScaleToMaxDimension",
                "_meta": { "title": "ImageScaleToMaxDimension" }
            },
            "72": {
                "inputs": {
                    "ckpt_name": "depth_anything_v2_vitl.pth",
                    "resolution": 1024,
                    "image": ["62", 0]
                },
                "class_type": "DepthAnythingV2Preprocessor",
                "_meta": { "title": "Depth Anything V2 - Relative" }
            },
            "70:39": {
                "inputs": {
                    "clip_name": "qwen_3_4b.safetensors",
                    "type": "lumina2",
                    "device": "default"
                },
                "class_type": "CLIPLoader",
                "_meta": { "title": "Load CLIP" }
            },
            "70:40": {
                "inputs": {
                    "vae_name": "ae.safetensors"
                },
                "class_type": "VAELoader",
                "_meta": { "title": "Load VAE" }
            },
            "70:41": {
                "inputs": {
                    "width": ["70:69", 0],
                    "height": ["70:69", 1],
                    "batch_size": 1
                },
                "class_type": "EmptySD3LatentImage",
                "_meta": { "title": "EmptySD3LatentImage" }
            },
            "70:42": {
                "inputs": {
                    "conditioning": ["70:45", 0]
                },
                "class_type": "ConditioningZeroOut",
                "_meta": { "title": "ConditioningZeroOut" }
            },
            "70:45": {
                "inputs": {
                    "text": params.prompt,
                    "clip": ["70:39", 0]
                },
                "class_type": "CLIPTextEncode",
                "_meta": { "title": "CLIP Text Encode (Prompt)" }
            },
            "70:46": {
                "inputs": {
                    "unet_name": params.unet_model || "zImage_turbo.safetensors",
                    "weight_dtype": "default"
                },
                "class_type": "UNETLoader",
                "_meta": { "title": "Load Diffusion Model" }
            },
            "70:47": {
                "inputs": {
                    "shift": 3,
                    "model": ["70:60", 0]
                },
                "class_type": "ModelSamplingAuraFlow",
                "_meta": { "title": "ModelSamplingAuraFlow" }
            },
            "70:60": {
                "inputs": {
                    "strength": 1,
                    "model": null, // Will be connected with LoRAs
                    "model_patch": ["70:64", 0],
                    "vae": ["70:40", 0],
                    "image": ["72", 0]
                },
                "class_type": "QwenImageDiffsynthControlnet",
                "_meta": { "title": "QwenImageDiffsynthControlnet" }
            },
            "70:64": {
                "inputs": {
                    "name": "Z-Image-Turbo-Fun-Controlnet-Union.safetensors"
                },
                "class_type": "ModelPatchLoader",
                "_meta": { "title": "ModelPatchLoader" }
            },
            "70:69": {
                "inputs": {
                    "image": ["72", 0]
                },
                "class_type": "GetImageSize",
                "_meta": { "title": "Get Image Size" }
            },
            "70:83": {
                "inputs": {
                    "width": params.width,
                    "height": params.height,
                    "batch_size": 1
                },
                "class_type": "EmptySD3LatentImage",
                "_meta": { "title": "EmptySD3LatentImage" }
            },
            "70:84": {
                "inputs": {
                    "samples": ["70:86", 0],
                    "vae": ["70:40", 0]
                },
                "class_type": "VAEDecode",
                "_meta": { "title": "VAE Decode" }
            },
            "70:85": {
                "inputs": {
                    "shift": 3,
                    "model": null // Will be connected with LoRAs
                },
                "class_type": "ModelSamplingAuraFlow",
                "_meta": { "title": "ModelSamplingAuraFlow" }
            },
            "70:44": {
                "inputs": {
                    "seed": Math.floor(Math.random() * 1000000000000000),
                    "steps": params.steps,
                    "cfg": params.cfg || 1,
                    "sampler_name": params.sampler_name,
                    "scheduler": params.scheduler,
                    "denoise": 1,
                    "model": ["70:47", 0],
                    "positive": ["70:45", 0],
                    "negative": ["70:42", 0],
                    "latent_image": ["70:83", 0]
                },
                "class_type": "KSampler",
                "_meta": { "title": "KSampler" }
            },
            "70:86": {
                "inputs": {
                    "seed": Math.floor(Math.random() * 1000000000000000),
                    "steps": params.steps,
                    "cfg": params.cfg || 1,
                    "sampler_name": params.sampler_name,
                    "scheduler": params.scheduler,
                    "denoise": 0.35,
                    "model": ["70:85", 0],
                    "positive": ["70:45", 0],
                    "negative": ["70:42", 0],
                    "latent_image": ["70:44", 0]
                },
                "class_type": "KSampler",
                "_meta": { "title": "KSampler" }
            }
        };

        // Chain LoRAs if present - connect to both model inputs
        let nextNodeId = 100;
        if (params.loras && params.loras.length > 0) {
            params.loras.forEach(lora => {
                if (!lora.name) return;
                const nodeId = nextNodeId.toString();
                nodes[nodeId] = {
                    "inputs": {
                        "lora_name": lora.name,
                        "strength_model": lora.strength,
                        "model": currentModelInput
                    },
                    "class_type": "LoraLoaderModelOnly",
                    "_meta": { "title": `LoRA: ${lora.name}` }
                };
                currentModelInput = [nodeId, 0];
                nextNodeId++;
            });
        }

        // Connect Final Model Output to both controlnet and upscale sampling
        nodes["70:60"].inputs.model = currentModelInput;
        nodes["70:85"].inputs.model = currentModelInput;

        return nodes;
    }

    static getZImageWorkflow(params: ZImageParams) {
        // Base workflow connections
        let currentModelInput = ["46", 0]; // Start with UNET output
        const nodes: any = {
            "9": {
                "inputs": {
                    "filename_prefix": "z-image",
                    "images": ["43", 0]
                },
                "class_type": "SaveImage",
                "_meta": { "title": "Save Image" }
            },
            "39": {
                "inputs": {
                    "clip_name": "qwen_3_4b.safetensors",
                    "type": "lumina2",
                    "device": "default"
                },
                "class_type": "CLIPLoader",
                "_meta": { "title": "Load CLIP" }
            },
            "40": {
                "inputs": {
                    "vae_name": "ae.safetensors"
                },
                "class_type": "VAELoader",
                "_meta": { "title": "Load VAE" }
            },
            "41": {
                "inputs": {
                    "width": params.width,
                    "height": params.height,
                    "batch_size": 1
                },
                "class_type": "EmptySD3LatentImage",
                "_meta": { "title": "EmptySD3LatentImage" }
            },
            "42": {
                "inputs": {
                    "text": params.negative_prompt || "",
                    "clip": ["39", 0]
                },
                "class_type": "CLIPTextEncode",
                "_meta": { "title": "Negative Prompt" }
            },
            "43": {
                "inputs": {
                    "samples": ["44", 0],
                    "vae": ["40", 0]
                },
                "class_type": "VAEDecode",
                "_meta": { "title": "VAE Decode" }
            },
            "44": {
                "inputs": {
                    "seed": Math.floor(Math.random() * 1000000000000000),
                    "steps": params.steps,
                    "cfg": params.cfg || 1,
                    "sampler_name": params.sampler_name,
                    "scheduler": params.scheduler,
                    "denoise": 1,
                    "model": ["47", 0],
                    "positive": ["45", 0],
                    "negative": ["42", 0],
                    "latent_image": ["41", 0]
                },
                "class_type": "KSampler",
                "_meta": { "title": "KSampler" }
            },
            "45": {
                "inputs": {
                    "text": params.prompt,
                    "clip": ["39", 0]
                },
                "class_type": "CLIPTextEncode",
                "_meta": { "title": "CLIP Text Encode (Prompt)" }
            },
            "46": {
                "inputs": {
                    "unet_name": params.unet_model || "zImage_turbo.safetensors",
                    "weight_dtype": "default"
                },
                "class_type": "UNETLoader",
                "_meta": { "title": "Load Diffusion Model" }
            },
            "47": {
                "inputs": {
                    "shift": 3,
                    "model": null // Will be connected later
                },
                "class_type": "ModelSamplingAuraFlow",
                "_meta": { "title": "ModelSamplingAuraFlow" }
            }
        };

        // Chain LoRAs if present
        let nextNodeId = 100;
        if (params.loras && params.loras.length > 0) {
            params.loras.forEach(lora => {
                if (!lora.name) return;
                const nodeId = nextNodeId.toString();
                nodes[nodeId] = {
                    "inputs": {
                        "lora_name": lora.name,
                        "strength_model": lora.strength,
                        "model": currentModelInput
                    },
                    "class_type": "LoraLoaderModelOnly",
                    "_meta": { "title": `LoRA: ${lora.name}` }
                };
                currentModelInput = [nodeId, 0];
                nextNodeId++;
            });
        }

        // Connect Final Model Output to AuraFlow
        nodes["47"].inputs.model = currentModelInput;

        return nodes;
    }

    static async runZImageWorkflow(params: ZImageParams): Promise<{ imageUrl: string }> {
        let workflow: any;
        let depthImageFilename: string | null = null;

        // If depth image is provided, upload it and use depth workflow
        if (params.depth_image) {
            depthImageFilename = await this.uploadImage(params.depth_image);
            workflow = this.getZImageDepthWorkflow(params, depthImageFilename);
        } else {
            // Use standard workflow
            workflow = this.getZImageWorkflow(params);
        }

        const clientId = 'zimage-' + Math.random().toString(36).substring(7);

        return new Promise((resolve, reject) => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            const wsUrl = `${protocol}//${host}/comfy-api/ws?clientId=${clientId}`;
            const ws = new WebSocket(wsUrl);

            ws.onopen = async () => {
                try {
                    const response = await fetch(`${this.API_BASE_URL}/prompt`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: workflow, client_id: clientId })
                    });

                    if (!response.ok) {
                        const err = await response.json();
                        reject(new Error(err.error?.message || 'Workflow failed validation'));
                    }
                } catch (err) {
                    reject(err);
                }
            };

            ws.onmessage = async (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log("WS Message:", message.type, message);

                    if (message.type === 'executed' && message.data.node === '9') {
                        const output = message.data.output;
                        if (output && output.images) {
                            const image = output.images[0];
                            const imageUrl = await this.getImage(image.filename, image.subfolder, image.type);
                            ws.close();
                            resolve({ imageUrl });
                        }
                    }
                } catch (err) {
                    console.error("Failed to parse WS message", err);
                }
            };

            ws.onerror = (err) => {
                reject(err);
                ws.close();
            };
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
