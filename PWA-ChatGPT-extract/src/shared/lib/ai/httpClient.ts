import { aiApiBaseUrl } from '../../../config/runtimeEnv';
import { trackEvent } from '../telemetry';
import type { AiClient, AiRequest, AiResult } from './types';

const trackAiEvent = (eventName: string, payload: Record<string, unknown>): void => {
  // Let op: geen ruwe prompt-tekst loggen.
  trackEvent(eventName, payload);
};

const callRemoteApi = async (request: AiRequest): Promise<AiResult> => {
  if (!aiApiBaseUrl) {
    throw new Error('AI API base URL is not configured');
  }

  const url = `${aiApiBaseUrl.replace(/\/$/, '')}/v1/tasks`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: request.type,
      input: request.input,
      options: request.options,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API request failed with status ${response.status}`);
  }

  const data = (await response.json()) as { text: string; tokensUsed?: number; raw?: unknown };

  return {
    text: data.text,
    tokensUsed: data.tokensUsed,
    raw: data.raw,
  };
};

const trimInput = (value: string, limit = 200): string => {
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, limit)} ...`;
};

const runMock = async (request: AiRequest): Promise<AiResult> => {
  const inputText = typeof request.input === 'string' ? request.input : JSON.stringify(request.input);

  if (request.type === 'summarization') {
    const summary = trimInput(inputText, 120);
    return { text: `${summary} ... (zusammenfassung)` };
  }

  if (request.type === 'classification') {
    return { text: `[MOCK AI] Classified input (${trimInput(inputText, 80)}) as 'demo-label'` };
  }

  return { text: `[MOCK AI] ${trimInput(inputText, 120)}` };
};

export const createHttpAiClient = (): AiClient => {
  const run = async (request: AiRequest): Promise<AiResult> => {
    const inputText = typeof request.input === 'string' ? request.input : JSON.stringify(request.input);
    const inputLength = inputText.length;

    trackAiEvent('ai_call_started', {
      type: request.type,
      model: request.options?.model ?? 'default',
      inputLength,
    });

    try {
      const result = await (aiApiBaseUrl ? callRemoteApi(request) : runMock(request));

      trackAiEvent('ai_call_succeeded', {
        type: request.type,
        model: request.options?.model ?? 'default',
        inputLength,
        tokensUsed: result.tokensUsed ?? null,
      });

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      trackAiEvent('ai_call_failed', {
        type: request.type,
        model: request.options?.model ?? 'default',
        inputLength,
        error: message,
      });

      const result = await runMock(request);
      return result;
    }
  };

  return {
    completeText: (prompt, options) => run({ type: 'completion', input: prompt, options }),
    summarizeText: (input, options) => run({ type: 'summarization', input, options }),
    classify: (input, options) => run({ type: 'classification', input, options }),
    run,
  };
};

