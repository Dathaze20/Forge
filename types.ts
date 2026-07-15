export enum Sentiment {
  FOR = 'FOR',
  AGAINST = 'AGAINST'
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface GenerationResult {
  content: string;
  thought?: string;
  sources: GroundingSource[];
  youtubeMetadata?: {
    title: string;
    description: string;
    tags: string;
  };
  mediumMetadata?: {
    tags: string[];
  };
}

export type GenerationUpdate = (data: Partial<GenerationResult> & { isComplete?: boolean }) => void;

export enum AppState {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}
