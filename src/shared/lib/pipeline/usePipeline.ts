import { useCallback, useState } from 'react';

import type { PipelineDefinition, PipelineJob } from './types';
import { runPipeline } from './runner';

export interface UsePipelineState<TOutput> {
  lastJob?: PipelineJob<TOutput>;
  isRunning: boolean;
  error?: string;
}

export interface UsePipelineResult<TInput, TOutput> extends UsePipelineState<TOutput> {
  run: (input: TInput) => Promise<PipelineJob<TOutput>>;
}

export const usePipeline = <TInput, TOutput>(
  definition: PipelineDefinition<TInput, TOutput>
): UsePipelineResult<TInput, TOutput> => {
  const [state, setState] = useState<UsePipelineState<TOutput>>({
    lastJob: undefined,
    isRunning: false,
    error: undefined,
  });

  const run = useCallback(
    async (input: TInput) => {
      setState((prev) => ({ ...prev, isRunning: true, error: undefined }));

      try {
        const job = await runPipeline<TInput, TOutput>(definition, input);
        setState({ lastJob: job, isRunning: false, error: undefined });
        return job;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setState({ lastJob: undefined, isRunning: false, error: message });
        throw err;
      }
    },
    [definition]
  );

  return {
    ...state,
    run,
  };
};

