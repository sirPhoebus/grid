
import { SignJWT } from 'jose';

export interface KlingConfig {
    accessKey: string;
    secretKey: string;
}

export class KlingService {
    // Use local proxy path to avoid CORS issues
    // Vite proxy in vite.config.ts forwards /kling-api -> https://api.klingai.com/v1
    private static readonly API_BASE_URL = '/kling-api';
    // Note: The python script used 'https://api-singapore.klingai.com/v1' as default, we might need to make this configurable or stick to one.
    // Using standard global endpoint for now, can be updated if needed.

    private static async generateToken(config: KlingConfig): Promise<string> {
        const alg = 'HS256';
        const secret = new TextEncoder().encode(config.secretKey);
        const jwt = await new SignJWT({})
            .setProtectedHeader({ alg, typ: 'JWT' })
            .setIssuer(config.accessKey)
            .setIssuedAt()
            .setExpirationTime('1h')
            .setNotBefore('0s') // active immediately
            .sign(secret);
        return jwt;
    }

    private static async getHeaders(config: KlingConfig): Promise<HeadersInit> {
        const token = await this.generateToken(config);
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    static async createVideoTask(
        config: KlingConfig,
        prompt: string,
        base64Image: string,
        mode: 'std' | 'pro' = 'std',
        duration: '5' | '10' = '5'
    ): Promise<string> {
        // Kling API expects bare base64 string, so strip prefix if present
        const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

        const payload = {
            model_name: "kling-v1", // Defaulting to v1 as per standard usage, python ref had 'kling-v1-6'
            mode: mode,
            duration: duration,
            image: cleanBase64,
            prompt: prompt,
            cfg_scale: 0.5
        };

        const response = await fetch(`${this.API_BASE_URL}/videos/image2video`, {
            method: 'POST',
            headers: await this.getHeaders(config),
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP ${response.status}: ${errorText}`;
            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.message) errorMessage = errorJson.message;
            } catch (e) { }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        if (data.code !== 0 && data.code !== 200) { // Some APIs return 0 for success, others 200
            // Kling usually returns checkable codes. If 'data.data.task_id' exists, we are good.
            if (!data.data?.task_id) {
                throw new Error(data.message || 'Unknown API Error');
            }
        }

        return data.data.task_id;
    }

    static async checkTaskStatus(config: KlingConfig, taskId: string): Promise<any> {
        const response = await fetch(`${this.API_BASE_URL}/videos/image2video/${taskId}`, {
            method: 'GET',
            headers: await this.getHeaders(config)
        });

        if (!response.ok) {
            throw new Error(`Failed to check status: ${response.statusText}`);
        }

        return await response.json();
    }

    static async generateVideoTransition(
        config: KlingConfig,
        startFrameBase64: string,
        // End frame is ignored for now as Kling v1 i2v doesn't natively support "transition between two images" in the same way Veo does
        // We will use the start frame and a prompt to simulate motion.
        _endFrameBase64: string,
        taskIdCallback?: (id: string) => void,
        signal?: AbortSignal
    ): Promise<string> {

        // 1. Submit Task
        const taskId = await this.createVideoTask(
            config,
            "A cinematic transition, high quality, smooth motion",
            startFrameBase64,
            "std",
            "5"
        );

        if (taskIdCallback) taskIdCallback(taskId);

        // 2. Poll for Status
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes (every 5s)

        while (attempts < maxAttempts) {
            if (signal?.aborted) throw new Error("Aborted");

            await new Promise(resolve => setTimeout(resolve, 5000));

            if (signal?.aborted) throw new Error("Aborted");

            try {
                const statusData = await this.checkTaskStatus(config, taskId);
                const taskData = statusData.data;

                if (taskData.task_status === 'succeed') {
                    const videoUrl = taskData.task_result?.videos?.[0]?.url;
                    if (!videoUrl) throw new Error("Task succeeded but no video URL found");

                    // Fetch the video blob to return a local object URL (consistent with GeminiService)
                    // Note: Kling URLs might expire or have CORS issues, so fetching via proxy or direct might be needed.
                    // Trying direct fetch first.
                    const vidResponse = await fetch(videoUrl);
                    const blob = await vidResponse.blob();
                    return URL.createObjectURL(blob);
                } else if (taskData.task_status === 'failed') {
                    throw new Error(`Kling generation failed: ${taskData.task_status_msg || 'Unknown error'}`);
                }
                // If processing/submitted, continue loop
            } catch (e: any) {
                console.warn("Error checking Kling status:", e);
                // Don't error out immediately on network blips
            }

            attempts++;
        }

        throw new Error("Kling generation timed out");
    }
}
