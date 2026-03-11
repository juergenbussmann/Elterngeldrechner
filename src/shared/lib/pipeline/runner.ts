import { trackEvent } from '../telemetry';
import type { PipelineDefinition, PipelineJob } from './types';

export interface RunPipelineOptions {
  maxAttempts?: number;
  retryDelayMs?: number;
}

const DEFAULT_MAX_ATTEMPTS = 1;

const createJob = <TOutput>(pipelineId: string, maxAttempts: number): PipelineJob<TOutput> => {
  const now = Date.now();
  return {
    id: `${pipelineId}:${now}`,
    pipelineId,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    attempts: 0,
    maxAttempts,
  };
};

const updateJob = <TOutput>(
  job: PipelineJob<TOutput>,
  patch: Partial<PipelineJob<TOutput>>
): PipelineJob<TOutput> => ({
  ...job,
  ...patch,
  updatedAt: Date.now(),
});

export const runPipeline = async <TInput, TOutput>(
  definition: PipelineDefinition<TInput, TOutput>,
  input: TInput,
  options: RunPipelineOptions = {}
): Promise<PipelineJob<TOutput>> => {
  const maxAttempts = options.maxAttempts && options.maxAttempts > 0 ? options.maxAttempts : DEFAULT_MAX_ATTEMPTS;
  let job = createJob<TOutput>(definition.id, maxAttempts);

  const track = (eventName: string, payload?: Record<string, unknown>): void => {
    trackEvent(eventName, {
      pipelineId: definition.id,
      jobId: job.id,
      ...payload,
    });
  };

  const ctx = { track };

  for (;;) {
    job = updateJob(job, { status: 'running', attempts: job.attempts + 1 });
    track('pipeline_job_started', { attempts: job.attempts });

    try {
      const result = await definition.run(input, ctx);
      job = updateJob(job, { status: 'succeeded', result });
      track('pipeline_job_succeeded', { attempts: job.attempts });
      return job;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      job = updateJob(job, { status: 'failed', error: errorMessage });
      track('pipeline_job_failed', { attempts: job.attempts, error: errorMessage });

      if (job.attempts >= job.maxAttempts) {
        return job;
      }

      const delay = options.retryDelayMs ?? 0;
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
};

