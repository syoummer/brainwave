// Request models
export interface ReadabilityRequest {
  text: string;
}

export interface AskAIRequest {
  text: string;
}

export interface CorrectnessRequest {
  text: string;
}

// Response models
export interface ReadabilityResponse {
  enhanced_text: string;
}

export interface AskAIResponse {
  answer: string;
}

export interface CorrectnessResponse {
  analysis: string;
}