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
    depth_strength?: number; // Strength of the depth control
}

export class ComfyUiService {
    private static readonly API_BASE_URL = '/comfy-api';
    private static clientId = crypto.randomUUID();

    static async upscaleFrame(base64Image: string, upscaleFactor?: number): Promise<string> {
        const filename = await this.uploadImage(base64Image);
        const prompt = this.getWorkflow(filename);
        const { prompt_id } = await this.queuePrompt(prompt);
        await this.waitForExecution(prompt_id);
        const history = await this.getHistory(prompt_id);
        const outputs = history[prompt_id].outputs;
        const saveImageNodeOutput = outputs['15'];
        if (!saveImageNodeOutput || !saveImageNodeOutput.images || saveImageNodeOutput.images.length === 0) {
            throw new Error("No output image found from ComfyUI");
        }
        const imageInfo = saveImageNodeOutput.images[0];
        return await this.getImage(imageInfo.filename, imageInfo.subfolder, imageInfo.type);
    }

    private static async uploadImage(imageInput: string, isQwen: boolean = false): Promise<string> {
        if (!imageInput) throw new Error("No image input provided for upload");
        let blob: Blob;
        if (imageInput.startsWith('blob:') || imageInput.startsWith('http') || imageInput.startsWith('/')) {
            const response = await fetch(imageInput);
            blob = await response.blob();
        } else {
            const cleanBase64 = imageInput.replace(/^data:image\/\w+;base64,/, '');
            try {
                const byteCharacters = atob(cleanBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                blob = new Blob([byteArray], { type: 'image/png' });
            } catch (e) {
                // If atob fails, it might be a malformed URL or base64
                // Try fetching it as a last resort if it's a string that might be a local path
                const response = await fetch(imageInput);
                blob = await response.blob();
            }
        }
        const formData = new FormData();
        const filename = `upload_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`;
        formData.append('image', blob, filename);
        formData.append('overwrite', 'true');
        const response = await fetch(`${this.API_BASE_URL}/upload/image`, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) throw new Error(`Failed to upload image: ${response.statusText}`);
        const data = await response.json();
        return data.name;
    }

    private static async queuePrompt(prompt: any, isQwen: boolean = false): Promise<{ prompt_id: string }> {
        const response = await fetch(`${this.API_BASE_URL}/prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, client_id: this.clientId })
        });
        if (!response.ok) throw new Error(`Failed to queue prompt: ${response.statusText}`);
        return await response.json();
    }

    private static async waitForExecution(prompt_id: string, isQwen: boolean = false): Promise<void> {
        return new Promise((resolve, reject) => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            const wsUrl = `${protocol}//${host}${this.API_BASE_URL}/ws?clientId=${this.clientId}`;
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
            socket.onerror = (error) => { console.error("WebSocket Error", error); };
            setTimeout(() => { if (socket.readyState !== WebSocket.CLOSED) socket.close(); }, 300000);
        });
    }

    private static async getHistory(prompt_id: string, isQwen: boolean = false): Promise<any> {
        const response = await fetch(`${this.API_BASE_URL}/history/${prompt_id}`);
        if (!response.ok) throw new Error("Failed to get history");
        return await response.json();
    }

    public static async runQwenEditWorkflow(images: string[], promptText: string): Promise<{ resultUrl: string, concatUrl: string }> {
        const filenames = await Promise.all(images.map(img => this.uploadImage(img, true)));
        const workflow = this.getQwenEditWorkflow(filenames, promptText);
        const { prompt_id } = await this.queuePrompt(workflow, true);
        await this.waitForExecution(prompt_id, true);
        const history = await this.getHistory(prompt_id, true);
        const outputs = history[prompt_id].outputs;
        const resultOutput = outputs['105'];
        const resultUrl = resultOutput?.images?.[0] ? await this.getImage(resultOutput.images[0].filename, resultOutput.images[0].subfolder, resultOutput.images[0].type, true) : "";
        const concatOutput = outputs['320'];
        const concatUrl = concatOutput?.images?.[0] ? await this.getImage(concatOutput.images[0].filename, concatOutput.images[0].subfolder, concatOutput.images[0].type, true) : "";
        return { resultUrl, concatUrl };
    }

    public static async runQwenDoubleEditWorkflow(images: string[], promptText: string): Promise<{ resultUrl: string, concatUrl: string }> {
        const filenames = await Promise.all(images.map(img => this.uploadImage(img, true)));
        const workflow = this.getQwenDoubleEditWorkflow(filenames, promptText);
        const { prompt_id } = await this.queuePrompt(workflow, true);
        await this.waitForExecution(prompt_id, true);
        const history = await this.getHistory(prompt_id, true);
        const outputs = history[prompt_id].outputs;
        const resultOutput = outputs['105'];
        const resultUrl = resultOutput?.images?.[0] ? await this.getImage(resultOutput.images[0].filename, resultOutput.images[0].subfolder, resultOutput.images[0].type, true) : "";
        const concatOutput = outputs['321'];
        const concatUrl = concatOutput?.images?.[0] ? await this.getImage(concatOutput.images[0].filename, concatOutput.images[0].subfolder, concatOutput.images[0].type, true) : "";
        return { resultUrl, concatUrl };
    }

    public static async runQwenSingleEditWorkflow(image: string, promptText: string): Promise<{ resultUrl: string }> {
        const filename = await this.uploadImage(image, true);
        const workflow = this.getQwenSingleEditWorkflow(filename, promptText);
        const { prompt_id } = await this.queuePrompt(workflow, true);
        await this.waitForExecution(prompt_id, true);
        const history = await this.getHistory(prompt_id, true);
        const outputs = history[prompt_id].outputs;
        const resultOutput = outputs['105'];
        const resultUrl = resultOutput?.images?.[0] ? await this.getImage(resultOutput.images[0].filename, resultOutput.images[0].subfolder, resultOutput.images[0].type, true) : "";
        return { resultUrl };
    }

    public static async runVideoWorkflow(base64Image: string, promptText: string, aspectRatio: string = "16:9", workflowType: 'turbowan' | 'qwen' = 'turbowan'): Promise<{ videoUrl: string, lastFrameUrl: string, localVideoPath: string }> {
        const filename = await this.uploadImage(base64Image);
        const prompt = workflowType === 'turbowan'
            ? this.getTurboWanWorkflow(filename, promptText, aspectRatio)
            : this.getQwenVideoWorkflow(filename, promptText, aspectRatio);

        const { prompt_id } = await this.queuePrompt(prompt);
        await this.waitForExecution(prompt_id);
        const history = await this.getHistory(prompt_id);
        const outputs = history[prompt_id].outputs;

        const outputNodeId = workflowType === 'turbowan' ? '9' : '204';
        const videoCombineOutput = outputs[outputNodeId];

        if (!videoCombineOutput || (!videoCombineOutput.gifs && !videoCombineOutput.images) || (videoCombineOutput.gifs && videoCombineOutput.gifs.length === 0)) {
            throw new Error(`No output video found (Node ${outputNodeId})`);
        }

        const videoInfo = videoCombineOutput.gifs ? videoCombineOutput.gifs[0] : videoCombineOutput.images[0];
        const videoUrl = `${this.API_BASE_URL}/view?filename=${videoInfo.filename}&subfolder=${videoInfo.subfolder}&type=${videoInfo.type}`;

        const saveRes = await fetch('/save-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: videoUrl })
        });
        const { path: localVideoPath } = await saveRes.json();

        const previewNodeId = workflowType === 'turbowan' ? '8' : '193:162';
        const previewOutput = outputs[previewNodeId];
        if (!previewOutput || !previewOutput.images || previewOutput.images.length === 0) {
            throw new Error(`No preview images found (Node ${previewNodeId})`);
        }

        const lastImageInfo = previewOutput.images[previewOutput.images.length - 1];
        const lastFrameUrl = await this.getImage(lastImageInfo.filename, lastImageInfo.subfolder, lastImageInfo.type);

        return { videoUrl, lastFrameUrl, localVideoPath };
    }

    static async stitchVideos(videoPaths: string[]): Promise<string> {
        const response = await fetch('/stitch-videos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videos: videoPaths }) });
        const { url } = await response.json();
        return url;
    }

    private static getQwenEditWorkflow(filenames: string[], promptText: string) {
        return {
            "74": { "inputs": { "image": filenames[0] }, "class_type": "LoadImage", "_meta": { "title": "Load Image" } },
            "104": { "inputs": { "Number": 1920 }, "class_type": "Int", "_meta": { "title": "image_1" } },
            "105": { "inputs": { "filename_prefix": "QwenResult", "images": ["271", 0] }, "class_type": "SaveImage", "_meta": { "title": "Save Image" } },
            "166": { "inputs": { "unet_name": "qwen_image_edit_2511_fp8mixed.safetensors", "weight_dtype": "default" }, "class_type": "UNETLoader", "_meta": { "title": "Load Diffusion Model" } },
            "169": { "inputs": { "aspect_ratio": "original", "proportional_width": 1, "proportional_height": 1, "fit": "crop", "method": "lanczos", "round_to_multiple": "16", "scale_to_side": "longest", "scale_to_length": ["104", 0], "background_color": "#000000", "image": ["74", 0] }, "class_type": "LayerUtility: ImageScaleByAspectRatio V2", "_meta": { "title": "LayerUtility: ImageScaleByAspectRatio V2" } },
            "170": { "inputs": { "clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors", "type": "qwen_image", "device": "default" }, "class_type": "CLIPLoader", "_meta": { "title": "Load CLIP" } },
            "175": { "inputs": { "vae_name": "qwen_image_vae.safetensors" }, "class_type": "VAELoader", "_meta": { "title": "Load VAE" } },
            "177": { "inputs": { "conditioning": ["268", 0] }, "class_type": "ConditioningZeroOut", "_meta": { "title": "ConditioningZeroOut" } },
            "178": { "inputs": { "seed": Math.floor(Math.random() * 1000000000000000), "steps": 12, "cfg": 1, "sampler_name": "euler", "scheduler": "simple", "denoise": 1, "model": ["180", 0], "positive": ["268", 0], "negative": ["177", 0], "latent_image": ["268", 1] }, "class_type": "KSampler", "_meta": { "title": "KSampler" } },
            "179": { "inputs": { "samples": ["178", 0], "vae": ["175", 0] }, "class_type": "VAEDecode", "_meta": { "title": "VAE Decode" } },
            "180": { "inputs": { "lora_name": "Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors", "strength_model": 1, "model": ["315", 0] }, "class_type": "LoraLoaderModelOnly", "_meta": { "title": "LoraLoaderModelOnly" } },
            "211": { "inputs": { "image_a": ["74", 0], "image_b": ["271", 0] }, "class_type": "Image Comparer (rgthree)", "_meta": { "title": "Image Comparer (rgthree)" } },
            "266": { "inputs": { "prompt": promptText }, "class_type": "CR Prompt Text", "_meta": { "title": "⚙️ CR Prompt Text" } },
            "268": { "inputs": { "prompt": ["266", 0], "return_full_refs_cond": true, "instruction": "Describe properties...", "clip": ["170", 0], "vae": ["175", 0], "configs": ["306", 0] }, "class_type": "TextEncodeQwenImageEditPlusCustom_lrzjason", "_meta": { "title": "TextEncodeQwenImageEditPlusCustom lrzjason" } },
            "269": { "inputs": { "to_ref": true, "ref_main_image": true, "ref_longest_edge": ["104", 0], "ref_crop": "pad", "ref_upscale": "lanczos", "to_vl": true, "vl_resize": true, "vl_target_size": 384, "vl_crop": "center", "vl_upscale": "bicubic", "image": ["169", 0] }, "class_type": "QwenEditConfigPreparer", "_meta": { "title": "Qwen Edit Config Preparer" } },
            "271": { "inputs": { "image": ["179", 0], "pad_info": ["272", 0] }, "class_type": "CropWithPadInfo", "_meta": { "title": "Crop With Pad Info" } },
            "272": { "inputs": { "custom_output": ["268", 2] }, "class_type": "QwenEditOutputExtractor", "_meta": { "title": "Qwen Edit Output Extractor" } },
            "277": { "inputs": { "image": filenames[1] }, "class_type": "LoadImage", "_meta": { "title": "Load Image" } },
            "289": { "inputs": { "direction": "right", "match_image_size": true, "image1": ["290", 0], "image2": ["271", 0] }, "class_type": "ImageConcanate", "_meta": { "title": "Image Concatenate" } },
            "290": { "inputs": { "inputcount": 3, "direction": "down", "match_image_size": true, "image_1": ["74", 0], "image_2": ["277", 0], "image_3": ["313", 0] }, "class_type": "ImageConcatMulti", "_meta": { "title": "Image Concat Multi" } },
            "299": { "inputs": { "Number": 1920 }, "class_type": "Int", "_meta": { "title": "image_2" } },
            "300": { "inputs": { "Number": 1920 }, "class_type": "Int", "_meta": { "title": "image_3" } },
            "303": { "inputs": { "to_ref": true, "ref_main_image": true, "ref_longest_edge": ["299", 0], "ref_crop": "pad", "ref_upscale": "lanczos", "to_vl": true, "vl_resize": true, "vl_target_size": 384, "vl_crop": "center", "vl_upscale": "bicubic", "image": ["310", 0], "configs": ["269", 0] }, "class_type": "QwenEditConfigPreparer", "_meta": { "title": "Qwen Edit Config Preparer" } },
            "306": { "inputs": { "to_ref": true, "ref_main_image": true, "ref_longest_edge": ["300", 0], "ref_crop": "pad", "ref_upscale": "lanczos", "to_vl": true, "vl_resize": true, "vl_target_size": 384, "vl_crop": "center", "vl_upscale": "bicubic", "image": ["311", 0], "configs": ["303", 0] }, "class_type": "QwenEditConfigPreparer", "_meta": { "title": "Qwen Edit Config Preparer" } },
            "310": { "inputs": { "aspect_ratio": "original", "proportional_width": 1, "proportional_height": 1, "fit": "crop", "method": "lanczos", "round_to_multiple": "16", "scale_to_side": "longest", "scale_to_length": ["299", 0], "background_color": "#000000", "image": ["277", 0] }, "class_type": "LayerUtility: ImageScaleByAspectRatio V2", "_meta": { "title": "ImageScaleByAspectRatio" } },
            "311": { "inputs": { "aspect_ratio": "original", "proportional_width": 1, "proportional_height": 1, "fit": "crop", "method": "lanczos", "round_to_multiple": "16", "scale_to_side": "longest", "scale_to_length": ["300", 0], "background_color": "#000000", "image": ["313", 0] }, "class_type": "LayerUtility: ImageScaleByAspectRatio V2", "_meta": { "title": "ImageScaleByAspectRatio" } },
            "313": { "inputs": { "image": filenames[2] }, "class_type": "LoadImage", "_meta": { "title": "Load Image" } },
            "315": { "inputs": { "lora_name": "Rebalance_v1_lora_r16.safetensors", "strength_model": 0.6, "model": ["166", 0] }, "class_type": "LoraLoaderModelOnly", "_meta": { "title": "LoraLoader" } },
            "320": { "inputs": { "filename_prefix": "QwenConcat", "images": ["289", 0] }, "class_type": "SaveImage", "_meta": { "title": "Save Concat" } }
        };
    }

    private static getQwenDoubleEditWorkflow(filenames: string[], promptText: string) {
        return {
            "74": { "inputs": { "image": filenames[0] }, "class_type": "LoadImage", "_meta": { "title": "Load Image" } },
            "104": { "inputs": { "Number": 1920 }, "class_type": "Int", "_meta": { "title": "image_1" } },
            "105": { "inputs": { "filename_prefix": "QwenResult", "images": ["271", 0] }, "class_type": "SaveImage", "_meta": { "title": "Save Image" } },
            "166": { "inputs": { "unet_name": "qwen_image_edit_2511_fp8mixed.safetensors", "weight_dtype": "default" }, "class_type": "UNETLoader", "_meta": { "title": "Load Diffusion Model" } },
            "169": { "inputs": { "aspect_ratio": "original", "proportional_width": 1, "proportional_height": 1, "fit": "crop", "method": "lanczos", "round_to_multiple": "16", "scale_to_side": "longest", "scale_to_length": ["104", 0], "background_color": "#000000", "image": ["74", 0] }, "class_type": "LayerUtility: ImageScaleByAspectRatio V2", "_meta": { "title": "LayerUtility: ImageScaleByAspectRatio V2" } },
            "170": { "inputs": { "clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors", "type": "qwen_image", "device": "default" }, "class_type": "CLIPLoader", "_meta": { "title": "Load CLIP" } },
            "175": { "inputs": { "vae_name": "qwen_image_vae.safetensors" }, "class_type": "VAELoader", "_meta": { "title": "Load VAE" } },
            "177": { "inputs": { "conditioning": ["268", 0] }, "class_type": "ConditioningZeroOut", "_meta": { "title": "ConditioningZeroOut" } },
            "178": { "inputs": { "seed": Math.floor(Math.random() * 1000000000000000), "steps": 8, "cfg": 1, "sampler_name": "euler", "scheduler": "simple", "denoise": 1, "model": ["180", 0], "positive": ["268", 0], "negative": ["177", 0], "latent_image": ["268", 1] }, "class_type": "KSampler", "_meta": { "title": "KSampler" } },
            "179": { "inputs": { "samples": ["178", 0], "vae": ["175", 0] }, "class_type": "VAEDecode", "_meta": { "title": "VAE Decode" } },
            "180": { "inputs": { "lora_name": "Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors", "strength_model": 1, "model": ["315", 0] }, "class_type": "LoraLoaderModelOnly", "_meta": { "title": "LoraLoaderModelOnly" } },
            "211": { "inputs": { "image_a": ["74", 0], "image_b": ["271", 0] }, "class_type": "Image Comparer (rgthree)", "_meta": { "title": "Image Comparer (rgthree)" } },
            "266": { "inputs": { "prompt": promptText }, "class_type": "CR Prompt Text", "_meta": { "title": "⚙️ CR Prompt Text" } },
            "268": { "inputs": { "prompt": ["266", 0], "return_full_refs_cond": true, "instruction": "Describe the key features of the input image (color, shape, size, texture, objects, background), then explain how the user's text instruction should alter or modify the image. Generate a new image that meets the user's requirements while maintaining consistency with the original input where appropriate.", "clip": ["170", 0], "vae": ["175", 0], "configs": ["303", 0] }, "class_type": "TextEncodeQwenImageEditPlusCustom_lrzjason", "_meta": { "title": "TextEncodeQwenImageEditPlusCustom lrzjason" } },
            "269": { "inputs": { "to_ref": true, "ref_main_image": true, "ref_longest_edge": ["104", 0], "ref_crop": "pad", "ref_upscale": "lanczos", "to_vl": true, "vl_resize": true, "vl_target_size": 384, "vl_crop": "center", "vl_upscale": "bicubic", "image": ["169", 0] }, "class_type": "QwenEditConfigPreparer", "_meta": { "title": "Qwen Edit Config Preparer" } },
            "271": { "inputs": { "image": ["179", 0], "pad_info": ["272", 0] }, "class_type": "CropWithPadInfo", "_meta": { "title": "Crop With Pad Info" } },
            "272": { "inputs": { "custom_output": ["268", 2] }, "class_type": "QwenEditOutputExtractor", "_meta": { "title": "Qwen Edit Output Extractor" } },
            "277": { "inputs": { "image": filenames[1] }, "class_type": "LoadImage", "_meta": { "title": "Load Image" } },
            "289": { "inputs": { "direction": "right", "match_image_size": true, "image1": ["290", 0], "image2": ["271", 0] }, "class_type": "ImageConcanate", "_meta": { "title": "Image Concatenate" } },
            "290": { "inputs": { "inputcount": 2, "direction": "down", "match_image_size": true, "image_1": ["74", 0], "image_2": ["277", 0] }, "class_type": "ImageConcatMulti", "_meta": { "title": "Image Concat Multi" } },
            "299": { "inputs": { "Number": 1536 }, "class_type": "Int", "_meta": { "title": "image_2" } },
            "303": { "inputs": { "to_ref": true, "ref_main_image": true, "ref_longest_edge": ["299", 0], "ref_crop": "pad", "ref_upscale": "lanczos", "to_vl": true, "vl_resize": true, "vl_target_size": 384, "vl_crop": "center", "vl_upscale": "bicubic", "image": ["310", 0], "configs": ["269", 0] }, "class_type": "QwenEditConfigPreparer", "_meta": { "title": "Qwen Edit Config Preparer" } },
            "310": { "inputs": { "aspect_ratio": "original", "proportional_width": 1, "proportional_height": 1, "fit": "crop", "method": "lanczos", "round_to_multiple": "16", "scale_to_side": "longest", "scale_to_length": ["299", 0], "background_color": "#000000", "image": ["277", 0] }, "class_type": "LayerUtility: ImageScaleByAspectRatio V2", "_meta": { "title": "LayerUtility: ImageScaleByAspectRatio V2" } },
            "315": { "inputs": { "lora_name": "Rebalance_v1_lora_r16.safetensors", "strength_model": 0.6, "model": ["166", 0] }, "class_type": "LoraLoaderModelOnly", "_meta": { "title": "LoraLoaderModelOnly" } },
            "321": { "inputs": { "filename_prefix": "QwenDoubleConcat", "images": ["289", 0] }, "class_type": "SaveImage", "_meta": { "title": "Save Image" } }
        };
    }

    private static getQwenSingleEditWorkflow(filename: string, promptText: string) {
        return {
            "74": { "inputs": { "image": filename }, "class_type": "LoadImage", "_meta": { "title": "Load Image" } },
            "104": { "inputs": { "Number": 1536 }, "class_type": "Int", "_meta": { "title": "Int" } },
            "105": { "inputs": { "filename_prefix": "QwenSingleResult", "images": ["271", 0] }, "class_type": "SaveImage", "_meta": { "title": "Save Image" } },
            "166": { "inputs": { "unet_name": "qwen_image_edit_2511_fp8mixed.safetensors", "weight_dtype": "default" }, "class_type": "UNETLoader", "_meta": { "title": "Load Diffusion Model" } },
            "169": { "inputs": { "aspect_ratio": "original", "proportional_width": 1, "proportional_height": 1, "fit": "crop", "method": "lanczos", "round_to_multiple": "16", "scale_to_side": "longest", "scale_to_length": ["104", 0], "background_color": "#000000", "image": ["74", 0] }, "class_type": "LayerUtility: ImageScaleByAspectRatio V2", "_meta": { "title": "LayerUtility: ImageScaleByAspectRatio V2" } },
            "170": { "inputs": { "clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors", "type": "qwen_image", "device": "default" }, "class_type": "CLIPLoader", "_meta": { "title": "Load CLIP" } },
            "175": { "inputs": { "vae_name": "qwen_image_vae.safetensors" }, "class_type": "VAELoader", "_meta": { "title": "Load VAE" } },
            "177": { "inputs": { "conditioning": ["268", 0] }, "class_type": "ConditioningZeroOut", "_meta": { "title": "ConditioningZeroOut" } },
            "178": { "inputs": { "seed": Math.floor(Math.random() * 1000000000), "steps": 8, "cfg": 1, "sampler_name": "euler", "scheduler": "simple", "denoise": 1, "model": ["180", 0], "positive": ["268", 0], "negative": ["177", 0], "latent_image": ["268", 1] }, "class_type": "KSampler", "_meta": { "title": "KSampler" } },
            "179": { "inputs": { "samples": ["178", 0], "vae": ["175", 0] }, "class_type": "VAEDecode", "_meta": { "title": "VAE Decode" } },
            "180": { "inputs": { "lora_name": "Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors", "strength_model": 1, "model": ["275", 0] }, "class_type": "LoraLoaderModelOnly", "_meta": { "title": "LoraLoaderModelOnly" } },
            "211": { "inputs": { "image_a": ["74", 0], "image_b": ["271", 0] }, "class_type": "Image Comparer (rgthree)", "_meta": { "title": "Image Comparer (rgthree)" } },
            "266": { "inputs": { "prompt": promptText }, "class_type": "CR Prompt Text", "_meta": { "title": "⚙️ CR Prompt Text" } },
            "268": { "inputs": { "prompt": ["266", 0], "return_full_refs_cond": true, "instruction": "Describe the key features of the input image (color, shape, size, texture, objects, background), then explain how the user's text instruction should alter or modify the image. Generate a new image that meets the user's requirements while maintaining consistency with the original input where appropriate.", "clip": ["170", 0], "vae": ["175", 0], "configs": ["269", 0] }, "class_type": "TextEncodeQwenImageEditPlusCustom_lrzjason", "_meta": { "title": "TextEncodeQwenImageEditPlusCustom lrzjason" } },
            "269": { "inputs": { "to_ref": true, "ref_main_image": true, "ref_longest_edge": ["104", 0], "ref_crop": "pad", "ref_upscale": "lanczos", "to_vl": true, "vl_resize": true, "vl_target_size": 384, "vl_crop": "center", "vl_upscale": "bicubic", "image": ["169", 0] }, "class_type": "QwenEditConfigPreparer", "_meta": { "title": "Qwen Edit Config Preparer" } },
            "271": { "inputs": { "image": ["179", 0], "pad_info": ["272", 0] }, "class_type": "CropWithPadInfo", "_meta": { "title": "Crop With Pad Info" } },
            "272": { "inputs": { "custom_output": ["268", 2] }, "class_type": "QwenEditOutputExtractor", "_meta": { "title": "Qwen Edit Output Extractor" } },
            "275": { "inputs": { "lora_name": "Rebalance_v1_lora_r16.safetensors", "strength_model": 0.6, "model": ["166", 0] }, "class_type": "LoraLoaderModelOnly", "_meta": { "title": "LoraLoaderModelOnly" } }
        };
    }

    private static getQwenVideoWorkflow(inputFilename: string, promptText: string, aspectRatio: string) {
        let width = 480; let height = 480;
        if (aspectRatio === "16:9") { width = 848; height = 480; }
        else if (aspectRatio === "9:16") { width = 480; height = 848; }
        else if (aspectRatio === "4:3") { width = 640; height = 480; }
        else if (aspectRatio === "3:4") { width = 480; height = 640; }

        return {
            "84": { "inputs": { "clip_name": "umt5_xxl_fp8_e4m3fn_scaled.safetensors", "type": "wan", "device": "default" }, "class_type": "CLIPLoader" },
            "90": { "inputs": { "vae_name": "Wan2_1_VAE_bf16.safetensors" }, "class_type": "VAELoader" },
            "97": { "inputs": { "image": inputFilename }, "class_type": "LoadImage" },
            "101": { "inputs": { "lora_name": "wan2.2_i2v_A14b_high_noise_lora_rank64_lightx2v_4step_1022.safetensors", "strength_model": 1.0, "model": ["116", 0] }, "class_type": "LoraLoaderModelOnly" },
            "102": { "inputs": { "lora_name": "wan2.2_i2v_A14b_low_noise_lora_rank64_lightx2v_4step_1022.safetensors", "strength_model": 1.0, "model": ["117", 0] }, "class_type": "LoraLoaderModelOnly" },
            "104": { "inputs": { "shift": 5.0, "model": ["141", 0] }, "class_type": "ModelSamplingSD3" },
            "116": { "inputs": { "model_name": "Wan2_2-I2V-A14B-HIGH_fp8_e4m3fn_scaled_KJ.safetensors", "enable_fp16_accumulation": true, "sage_attention": "disabled", "weight_dtype": "default", "patch_cublaslinear": false, "compute_dtype": "default" }, "class_type": "DiffusionModelLoaderKJ" },
            "117": { "inputs": { "model_name": "Wan2_2-I2V-A14B-LOW_fp8_e4m3fn_scaled_KJ.safetensors", "enable_fp16_accumulation": true, "sage_attention": "disabled", "weight_dtype": "default", "patch_cublaslinear": false, "compute_dtype": "default" }, "class_type": "DiffusionModelLoaderKJ" },
            "122": { "inputs": { "scheduler": "simple", "steps": 6, "denoise": 1, "model": ["104", 0] }, "class_type": "BasicScheduler" },
            "127": { "inputs": { "sampler_name": "euler" }, "class_type": "KSamplerSelect" },
            "128": { "inputs": { "step": 3, "sigmas": ["122", 0] }, "class_type": "SplitSigmas" },
            "135": { "inputs": { "pixels": ["136", 0], "vae": ["90", 0] }, "class_type": "VAEEncode" },
            "136": { "inputs": { "width": width, "height": height, "upscale_method": "lanczos", "keep_proportion": "crop", "divisible_by": 8, "crop_position": "top", "pad_color": "#000000", "device": "cpu", "image": ["97", 0] }, "class_type": "ImageResizeKJv2" },
            "141": { "inputs": { "lora_name": "SVI_v2_PRO_Wan2.2-I2V-A14B_HIGH_lora_rank_128_fp16.safetensors", "strength_model": 1, "model": ["101", 0] }, "class_type": "LoraLoaderModelOnly" },
            "142": { "inputs": { "lora_name": "SVI_v2_PRO_Wan2.2-I2V-A14B_LOW_lora_rank_128_fp16.safetensors", "strength_model": 1, "model": ["102", 0] }, "class_type": "LoraLoaderModelOnly" },
            "189": { "inputs": { "noise_seed": Math.floor(Math.random() * 1000000) }, "class_type": "RandomNoise" },
            "204": { "inputs": { "frame_rate": 25, "loop_count": 0, "filename_prefix": "Wan22_SVI_Pro", "format": "video/h265-mp4", "pix_fmt": "yuv420p10le", "crf": 22, "save_output": true, "pingpong": false, "images": ["193:162", 0] }, "class_type": "VHS_VideoCombine" },
            "193:159": { "inputs": { "cfg": 1, "model": ["142", 0], "positive": ["193:160", 0], "negative": ["193:160", 1], "start_percent": 0.0, "end_percent": 1.0 }, "class_type": "ScheduledCFGGuidance" },
            "193:152": { "inputs": { "text": promptText, "clip": ["84", 0] }, "class_type": "CLIPTextEncode" },
            "193:183": { "inputs": {}, "class_type": "DisableNoise" },
            "193:158": { "inputs": { "cfg": 1, "model": ["141", 0], "positive": ["193:160", 0], "negative": ["193:160", 1], "start_percent": 0.0, "end_percent": 1.0 }, "class_type": "ScheduledCFGGuidance" },
            "193:185": { "inputs": { "noise": ["189", 0], "guider": ["193:158", 0], "sampler": ["127", 0], "sigmas": ["128", 0], "latent_image": ["193:160", 2] }, "class_type": "SamplerCustomAdvanced" },
            "193:160": { "inputs": { "length": 81, "positive": ["193:152", 0], "negative": ["193:182", 0], "anchor_samples": ["135", 0], "motion_latent_count": 1 }, "class_type": "WanImageToVideoSVIPro" },
            "193:184": { "inputs": { "noise": ["193:183", 0], "guider": ["193:159", 0], "sampler": ["127", 0], "sigmas": ["128", 1], "latent_image": ["193:185", 0] }, "class_type": "SamplerCustomAdvanced" },
            "193:162": { "inputs": { "samples": ["193:184", 0], "vae": ["90", 0] }, "class_type": "VAEDecode" },
            "193:182": { "inputs": { "text": "", "clip": ["84", 0] }, "class_type": "CLIPTextEncode" }
        };
    }

    private static getTurboWanWorkflow(inputFilename: string, promptText: string, aspectRatio: string) {
        let width = 480; let height = 480;
        if (aspectRatio === "16:9") { width = 848; height = 480; }
        else if (aspectRatio === "9:16") { width = 480; height = 848; }
        else if (aspectRatio === "4:3") { width = 640; height = 480; }
        else if (aspectRatio === "3:4") { width = 480; height = 640; }
        return {
            "1": { "inputs": { "model_name": "TurboWan2.2-I2V-A14B-high-720P-quant.pth", "attention_type": "sla", "sla_topk": 0.1, "offload_mode": "comfy_native" }, "class_type": "TurboWanModelLoader", "_meta": { "title": "Load Model" } },
            "2": { "inputs": { "model_name": "TurboWan2.2-I2V-A14B-low-720P-quant.pth", "attention_type": "sla", "sla_topk": 0.1, "offload_mode": "comfy_native" }, "class_type": "TurboWanModelLoader", "_meta": { "title": "Load Model" } },
            "3": { "inputs": { "clip_name": "umt5_xxl_fp8_e4m3fn_scaled.safetensors", "type": "wan", "device": "default" }, "class_type": "CLIPLoader", "_meta": { "title": "Load CLIP" } },
            "4": { "inputs": { "text": promptText, "clip": ["3", 0] }, "class_type": "CLIPTextEncode", "_meta": { "title": "Positive Prompt" } },
            "5": { "inputs": { "vae_name": "Wan2.1_VAE.pth" }, "class_type": "TurboWanVAELoader", "_meta": { "title": "Load VAE" } },
            "6": { "inputs": { "image": inputFilename }, "class_type": "LoadImage", "_meta": { "title": "Load Image" } },
            "7": { "inputs": { "num_frames": 137, "num_steps": 4, "resolution": "480", "aspect_ratio": aspectRatio, "boundary": 0.9, "sigma_max": 200, "seed": Math.floor(Math.random() * 1000000), "use_ode": false, "low_vram": false, "width": width, "height": height, "high_noise_model": ["1", 0], "low_noise_model": ["2", 0], "conditioning": ["4", 0], "vae": ["5", 0], "image": ["6", 0] }, "class_type": "TurboDiffusionI2VSampler", "_meta": { "title": "Sampler" } },
            "8": { "inputs": { "images": ["7", 0] }, "class_type": "PreviewImage", "_meta": { "title": "Preview" } },
            "9": { "inputs": { "frame_rate": 25, "loop_count": 0, "filename_prefix": "AnimateDiff", "format": "video/h264-mp4", "pix_fmt": "yuv420p", "crf": 19, "images": ["7", 0] }, "class_type": "VHS_VideoCombine", "_meta": { "title": "Video Combine" } }
        };
    }

    private static async getImage(filename: string, subfolder: string, type: string, isQwen: boolean = false): Promise<string> {
        const params = new URLSearchParams({ filename, subfolder, type });
        const response = await fetch(`${this.API_BASE_URL}/view?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to get image");
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    }

    static getZImageDepthWorkflow(params: ZImageParams, depthImageFilename: string) {
        let currentModelInput: any = ["70:46", 0];
        const nodes: any = {
            "9": { "inputs": { "filename_prefix": "z-image-turbo", "images": ["70:84", 0] }, "class_type": "SaveImage", "_meta": { "title": "Save" } },
            "56": { "inputs": { "images": ["72", 0] }, "class_type": "PreviewImage", "_meta": { "title": "Preview" } },
            "58": { "inputs": { "image": depthImageFilename }, "class_type": "LoadImage", "_meta": { "title": "Load" } },
            "62": { "inputs": { "upscale_method": "lanczos", "largest_size": 1024, "image": ["58", 0] }, "class_type": "ImageScaleToMaxDimension", "_meta": { "title": "Scale" } },
            "72": { "inputs": { "ckpt_name": "depth_anything_v2_vitl.pth", "resolution": 1024, "image": ["62", 0] }, "class_type": "DepthAnythingV2Preprocessor", "_meta": { "title": "Depth" } },
            "70:39": { "inputs": { "clip_name": "qwen_3_4b.safetensors", "type": "lumina2", "device": "default" }, "class_type": "CLIPLoader", "_meta": { "title": "CLIP" } },
            "70:40": { "inputs": { "vae_name": "ae.safetensors" }, "class_type": "VAELoader", "_meta": { "title": "VAE" } },
            "70:41": { "inputs": { "width": ["70:69", 0], "height": ["70:69", 1], "batch_size": 1 }, "class_type": "EmptySD3LatentImage", "_meta": { "title": "Latent" } },
            "70:42": { "inputs": { "conditioning": ["70:45", 0] }, "class_type": "ConditioningZeroOut", "_meta": { "title": "ZeroOut" } },
            "70:45": { "inputs": { "text": params.prompt, "clip": ["70:39", 0] }, "class_type": "CLIPTextEncode", "_meta": { "title": "Encode" } },
            "70:46": { "inputs": { "unet_name": params.unet_model || "zImage_turbo.safetensors", "weight_dtype": "default" }, "class_type": "UNETLoader", "_meta": { "title": "UNET" } },
            "70:47": { "inputs": { "shift": 3, "model": ["70:60", 0] }, "class_type": "ModelSamplingAuraFlow", "_meta": { "title": "Sampling" } },
            "70:60": { "inputs": { "strength": params.depth_strength ?? 1, "model": null, "model_patch": ["70:64", 0], "vae": ["70:40", 0], "image": ["72", 0] }, "class_type": "QwenImageDiffsynthControlnet", "_meta": { "title": "Controlnet" } },
            "70:64": { "inputs": { "name": "Z-Image-Turbo-Fun-Controlnet-Union.safetensors" }, "class_type": "ModelPatchLoader", "_meta": { "title": "Patch" } },
            "70:69": { "inputs": { "image": ["72", 0] }, "class_type": "GetImageSize", "_meta": { "title": "Size" } },
            "70:83": { "inputs": { "width": params.width, "height": params.height, "batch_size": 1 }, "class_type": "EmptySD3LatentImage", "_meta": { "title": "Latent" } },
            "70:84": { "inputs": { "samples": ["70:86", 0], "vae": ["70:40", 0] }, "class_type": "VAEDecode", "_meta": { "title": "Decode" } },
            "70:85": { "inputs": { "shift": 3, "model": null }, "class_type": "ModelSamplingAuraFlow", "_meta": { "title": "Sampling" } },
            "70:44": { "inputs": { "seed": Math.floor(Math.random() * 1000000000000000), "steps": params.steps, "cfg": params.cfg || 1, "sampler_name": params.sampler_name, "scheduler": params.scheduler, "denoise": 1, "model": ["70:47", 0], "positive": ["70:45", 0], "negative": ["70:42", 0], "latent_image": ["70:83", 0] }, "class_type": "KSampler", "_meta": { "title": "Sampler" } },
            "70:86": { "inputs": { "seed": Math.floor(Math.random() * 1000000000000000), "steps": params.steps, "cfg": params.cfg || 1, "sampler_name": params.sampler_name, "scheduler": params.scheduler, "denoise": 0.35, "model": ["70:85", 0], "positive": ["70:45", 0], "negative": ["70:42", 0], "latent_image": ["70:44", 0] }, "class_type": "KSampler", "_meta": { "title": "Sampler" } }
        };
        let nextNodeId = 100;
        if (params.loras) {
            params.loras.forEach(lora => {
                const id = nextNodeId.toString();
                nodes[id] = { "inputs": { "lora_name": lora.name, "strength_model": lora.strength, "model": currentModelInput }, "class_type": "LoraLoaderModelOnly", "_meta": { "title": "LoRA" } };
                currentModelInput = [id, 0];
                nextNodeId++;
            });
        }
        nodes["70:60"].inputs.model = currentModelInput;
        nodes["70:85"].inputs.model = currentModelInput;
        return nodes;
    }

    static getZImageWorkflow(params: ZImageParams) {
        let currentModelInput: any = ["46", 0];
        const nodes: any = {
            "9": { "inputs": { "filename_prefix": "z-image", "images": ["43", 0] }, "class_type": "SaveImage", "_meta": { "title": "Save" } },
            "39": { "inputs": { "clip_name": "qwen_3_4b.safetensors", "type": "lumina2", "device": "default" }, "class_type": "CLIPLoader", "_meta": { "title": "CLIP" } },
            "40": { "inputs": { "vae_name": "ae.safetensors" }, "class_type": "VAELoader", "_meta": { "title": "VAE" } },
            "41": { "inputs": { "width": params.width, "height": params.height, "batch_size": 1 }, "class_type": "EmptySD3LatentImage", "_meta": { "title": "Latent" } },
            "42": { "inputs": { "text": params.negative_prompt || "", "clip": ["39", 0] }, "class_type": "CLIPTextEncode", "_meta": { "title": "Negative" } },
            "43": { "inputs": { "samples": ["44", 0], "vae": ["40", 0] }, "class_type": "VAEDecode", "_meta": { "title": "Decode" } },
            "44": { "inputs": { "seed": Math.floor(Math.random() * 1000000000000000), "steps": params.steps, "cfg": params.cfg || 1, "sampler_name": params.sampler_name, "scheduler": params.scheduler, "denoise": 1, "model": ["47", 0], "positive": ["45", 0], "negative": ["42", 0], "latent_image": ["41", 0] }, "class_type": "KSampler", "_meta": { "title": "Sampler" } },
            "45": { "inputs": { "text": params.prompt, "clip": ["39", 0] }, "class_type": "CLIPTextEncode", "_meta": { "title": "Encode" } },
            "46": { "inputs": { "unet_name": params.unet_model || "zImage_turbo.safetensors", "weight_dtype": "default" }, "class_type": "UNETLoader", "_meta": { "title": "UNET" } },
            "47": { "inputs": { "shift": 3, "model": null }, "class_type": "ModelSamplingAuraFlow", "_meta": { "title": "Sampling" } }
        };
        let nextNodeId = 100;
        if (params.loras) {
            params.loras.forEach(lora => {
                const id = nextNodeId.toString();
                nodes[id] = { "inputs": { "lora_name": lora.name, "strength_model": lora.strength, "model": currentModelInput }, "class_type": "LoraLoaderModelOnly", "_meta": { "title": "LoRA" } };
                currentModelInput = [id, 0];
                nextNodeId++;
            });
        }
        nodes["47"].inputs.model = currentModelInput;
        return nodes;
    }

    static async runZImageWorkflow(params: ZImageParams): Promise<{ imageUrl: string }> {
        let workflow: any;
        if (params.depth_image) {
            const depthImageFilename = await this.uploadImage(params.depth_image);
            workflow = this.getZImageDepthWorkflow(params, depthImageFilename);
        } else {
            workflow = this.getZImageWorkflow(params);
        }
        const clientId = 'zimage-' + Math.random().toString(36).substring(7);
        return new Promise((resolve, reject) => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            const wsUrl = `${protocol}//${host}${this.API_BASE_URL}/ws?clientId=${clientId}`;
            const ws = new WebSocket(wsUrl);
            ws.onopen = async () => {
                try {
                    await fetch(`${this.API_BASE_URL}/prompt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: workflow, client_id: clientId }) });
                } catch (err) { reject(err); }
            };
            ws.onmessage = async (event) => {
                const message = JSON.parse(event.data);
                if (message.type === 'executed' && message.data.node === '9') {
                    const output = message.data.output;
                    if (output && output.images) {
                        const image = output.images[0];
                        const imageUrl = await this.getImage(image.filename, image.subfolder, image.type);
                        ws.close();
                        resolve({ imageUrl });
                    }
                }
            };
            ws.onerror = (err) => { reject(err); ws.close(); };
        });
    }

    private static getWorkflow(inputFilename: string) {
        return {
            "10": {
                "inputs": {
                    "seed": Math.floor(Math.random() * 1000000),
                    "resolution": 4096,
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
                    "image": ["17", 0],
                    "dit": ["14", 0],
                    "vae": ["13", 0]
                },
                "class_type": "SeedVR2VideoUpscaler",
                "_meta": { "title": "SeedVR2 Video Upscaler" }
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
                "class_type": "SeedVR2LoadVAEModel"
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
                "class_type": "SeedVR2LoadDiTModel"
            },
            "15": {
                "inputs": {
                    "filename_prefix": "upscale",
                    "images": ["10", 0]
                },
                "class_type": "SaveImage"
            },
            "16": {
                "inputs": {
                    "image": inputFilename
                },
                "class_type": "LoadImage"
            },
            "17": {
                "inputs": {
                    "image": ["16", 0],
                    "alpha": ["16", 1]
                },
                "class_type": "JoinImageWithAlpha"
            }
        };
    }
}
