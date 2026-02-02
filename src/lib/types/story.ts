export interface ResourceFigure {
  id: string;
  name: string;
  emoji: string;
  description?: string;
  isCustom?: boolean;
  category: 'real' | 'fictional' | 'custom' | 'place';
  pronouns: string;
}

export interface AudioState {
  audioUrl: string | null;
  voiceId: string;
  storyText: string;
  duration: number;
  isGenerated: boolean;
  filename?: string;
}

export interface AppState {
  currentStep: number;
  resourceFigure: ResourceFigure | null;
  questionAnswers: any[];
  generatedStory: string;
  selectedVoice: string;
  audioState: AudioState | null;
  currentQuestionIndex: number;
}
