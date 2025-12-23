
export enum ProcessingStep {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  SLICING = 'SLICING',
  UPSCALING = 'UPSCALING',
  GENERATING_VIDEOS = 'GENERATING_VIDEOS',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface Frame {
  id: number;
  originalBase64: string;
  upscaledUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export interface VideoTransition {
  id: number;
  fromFrameId: number;
  toFrameId: number;
  videoUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export interface AppState {
  step: ProcessingStep;
  errorMessage?: string;
  frames: Frame[];
  transitions: VideoTransition[];
  projectFolder?: string;
}
