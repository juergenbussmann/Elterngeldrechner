export type AiTaskType = 'completion' | 'summarization' | 'classification';

export interface AiRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, unknown>;
}

export interface AiRequest {
  type: AiTaskType;
  input: string | Record<string, unknown>;
  options?: AiRequestOptions;
}

export interface AiResult {
  /** De hoofdoutput van de AI-call (meestal tekst). */
  text: string;
  /** Optioneel: indicatie van tokens of lengte. */
  tokensUsed?: number;
  /** Provider-specifieke metadata (niet verder getypeerd in skeleton). */
  raw?: unknown;
}

export interface AiClient {
  completeText(prompt: string, options?: AiRequestOptions): Promise<AiResult>;
  summarizeText(input: string, options?: AiRequestOptions): Promise<AiResult>;
  classify(input: string | Record<string, unknown>, options?: AiRequestOptions): Promise<AiResult>;
  run(request: AiRequest): Promise<AiResult>;
}

