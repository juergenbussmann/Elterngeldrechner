import type { AiRequest, AiResult } from './types';
import { createHttpAiClient } from './httpClient';
import type { PipelineDefinition } from '../pipeline';

const client = createHttpAiClient();

export const runAiTask = (request: AiRequest): Promise<AiResult> => {
  return client.run(request);
};

export interface AiJobInput {
  request: AiRequest;
}

export interface AiJobOutput {
  result: AiResult;
}

export const createAiJobPipeline = (
  id = 'ai:generic-job',
): PipelineDefinition<AiJobInput, AiJobOutput> => ({
  id,
  description: 'Run a single AI task via AiClient within the pipeline layer.',
  run: async (input, ctx) => {
    ctx.track('ai_job_start', { type: input.request.type });
    const result = await client.run(input.request);
    ctx.track('ai_job_success', { type: input.request.type });
    return { result };
  },
});

