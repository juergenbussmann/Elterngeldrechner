export type PipelineStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export interface PipelineJob<Output = unknown> {
  id: string;
  pipelineId: string;
  status: PipelineStatus;
  createdAt: number;
  updatedAt: number;
  attempts: number;
  maxAttempts: number;
  result?: Output;
  error?: string;
}

export interface PipelineStepContext {
  track: (eventName: string, payload?: Record<string, unknown>) => void;
}

export type PipelineStep<Input, Output> = (
  input: Input,
  ctx: PipelineStepContext
) => Promise<Output> | Output;

export interface PipelineDefinition<Input, Output> {
  id: string;
  /**
   * Human-readable beschrijving, handig voor logging/telemetry.
   */
  description?: string;
  /**
   * Eerste invoer voor de pipeline.
   */
  run: (input: Input, ctx: PipelineStepContext) => Promise<Output>;
}

