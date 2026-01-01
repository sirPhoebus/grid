
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

export type SupportedAspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

export class GeminiService {
  private static async getAI(apiKey?: string) {
    // Re-instantiate to ensure latest API key from global dialog or settings
    const key = apiKey || process.env.API_KEY;
    if (!key) throw new Error("Gemini API Key not found. Please select a key or configure it in Settings.");
    return new GoogleGenAI({ apiKey: key });
  }

  private static async toBase64(imageInput: string): Promise<string> {
    if (!imageInput) return "";
    if (imageInput.startsWith('blob:') || imageInput.startsWith('/') || imageInput.startsWith('http')) {
      const response = await fetch(imageInput);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]);
        };
        reader.readAsDataURL(blob);
      });
    }
    return imageInput.split(',')[1] || imageInput;
  }

  static async verifyGridWithNano(imageInput: string, apiKey?: string): Promise<boolean> {
    const ai = await this.getAI(apiKey);
    const base64Data = await this.toBase64(imageInput);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: 'image/png' } },
          { text: "Is this image a 3x3 grid of sub-images? Answer with only 'true' or 'false'." }
        ]
      }
    });
    return response.text.toLowerCase().includes('true');
  }

  static async upscaleFrame(imageInput: string, aspectRatio: SupportedAspectRatio = "1:1", apiKey?: string, upscaleFactor: number = 2): Promise<string> {
    const ai = await this.getAI(apiKey);
    const base64Data = await this.toBase64(imageInput);
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: 'image/png' } },
          { text: `Upscale this individual frame to HD quality (resize by ${upscaleFactor}x). Enhance details, remove noise, and preserve the artistic style perfectly. Output aspect ratio should be ${aspectRatio}.` }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: "1K" // "HD max" equivalent in the API
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No upscaled image returned from Gemini Pro");
  }

  static async generateVideoTransition(
    startFrameBase64: string,
    endFrameBase64: string,
    aspectRatio: SupportedAspectRatio = "1:1",
    apiKey?: string,
    signal?: AbortSignal
  ): Promise<string> {
    const ai = await this.getAI(apiKey);

    // Convert data URLs to raw base64 if needed
    const startData = await this.toBase64(startFrameBase64);
    const endData = await this.toBase64(endFrameBase64);

    if (signal?.aborted) throw new Error("Aborted");

    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: 'A smooth cinematic transition from the first image to the second image, maintaining style and context.',
      image: {
        imageBytes: startData,
        mimeType: 'image/png',
      },
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: aspectRatio === '16:9' || aspectRatio === '9:16' ? aspectRatio : '16:9', // Veo only supports 16:9 or 9:16
        lastFrame: {
          imageBytes: endData,
          mimeType: 'image/png',
        },
      }
    });

    while (!operation.done) {
      if (signal?.aborted) throw new Error("Aborted");
      await new Promise(resolve => setTimeout(resolve, 10000));
      if (signal?.aborted) throw new Error("Aborted");
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed: No download link");

    if (signal?.aborted) throw new Error("Aborted");
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`, { signal });
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }
}
