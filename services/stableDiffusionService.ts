
export class StableDiffusionService {
    // Use local proxy path to avoid CORS/Mixed Content issues
    // Proxy should be configured to forward /sd-api -> http://127.0.0.1:7860
    private static readonly API_BASE_URL = '/sd-api';

    static async upscaleFrame(
        base64Image: string,
        resizeFactor: number,
        method: 'extras' | 'img2img' = 'extras'
    ): Promise<string> {
        const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

        if (method === 'img2img') {
            // For Img2Img, we need target dimensions
            // Load image to get current dims
            const dims = await this.getImageDimensions(`data:image/png;base64,${cleanBase64}`);
            // Ensure dimensions are multiples of 64 for maximum compatibility (avoids odd latent dims)
            const width = Math.round((dims.width * resizeFactor) / 64) * 64;
            const height = Math.round((dims.height * resizeFactor) / 64) * 64;

            const payload = {
                init_images: [cleanBase64],
                prompt: "4K, lots of details, hires, HDR, sharp",
                negative_prompt: "blur, low quality, artifacts, distortion",
                // Using calculated target dimensions as requested to respect proportions
                width: width,
                height: height,
                denoising_strength: 0.15,
                steps: 35,
                cfg_scale: 1.0,
                sampler_name: "k_euler",
                //script_name: "none",
                // Args: [_, tile_overlap, upscaler_name, scale_factor]
                //script_args: [null, 32, "4x_foolhardy_Remacri", resizeFactor]
            };
            try {
                const response = await fetch(`${this.API_BASE_URL}/sdapi/v1/img2img`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error(`SD Img2Img Error: ${response.status}`);
                const data = await response.json();
                if (data.images && data.images[0]) {
                    return `data:image/png;base64,${data.images[0]}`;
                }
                throw new Error("No image returned from Img2Img");
            } catch (e: any) {
                console.error("Img2Img Failed", e);
                throw new Error(`Img2Img Failed: ${e.message}`);
            }
        }

        // Default: Extras (Upscaler)
        const payload = {
            resize_mode: 0, // 0: Just resize by scale factor
            show_extras_results: true,
            gfpgan_visibility: 0,
            codeformer_visibility: 0,
            codeformer_weight: 0,
            upscaling_resize: resizeFactor,
            upscaler_1: "R-ESRGAN 4x+", // Standard high-quality upscaler usually present
            upscale_first: false,
            image: cleanBase64
        };

        try {
            const response = await fetch(`${this.API_BASE_URL}/sdapi/v1/extra-single-image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`SD API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (data.image) {
                return `data:image/png;base64,${data.image}`;
            } else {
                throw new Error("No image returned from Stable Diffusion");
            }
        } catch (e: any) {
            console.error("Local Upscale Failed", e);
            throw new Error(`Local Upscale Failed: ${e.message}. Ensure A1111 WebUI is running with --api flag at port 7860`);
        }
    }

    private static getImageDimensions(src: string): Promise<{ width: number, height: number }> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.width, height: img.height });
            img.onerror = reject;
            img.src = src;
        });
    }
}
