import { telemetryConfig } from '../../../config/runtimeEnv';
import { getValue, setValue } from '../storage';
import { TelemetryClient } from './client';
import { ConsoleTransport, HttpTransport } from './transports';
import {
  createTelemetryEventId,
  type AiCallEvent,
  type ErrorEvent,
  type PipelineJobEvent,
  type ScreenViewEvent,
  type TelemetryEvent,
  type UserActionEvent,
} from './schema';

export type TelemetryPayload = Record<string, unknown>;

const TELEMETRY_ENABLED_STORAGE_KEY = 'telemetryEnabled';

const clampSampleRate = (value: number): number => {
  if (!Number.isFinite(value)) return 1;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

const toSafeString = (value: unknown, maxLength = 160, allowSpaces = true): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!allowSpaces && /\s/.test(trimmed)) return undefined;
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 3)}...` : trimmed;
};

const toSafeNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return value;
};

const buildContext = (raw: Record<string, unknown>): Record<string, unknown> | undefined => {
  const context: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    context[key] = value;
  }
  return Object.keys(context).length > 0 ? context : undefined;
};

const resolveInitialTelemetryEnabled = (): boolean => {
  const stored = getValue<boolean>(TELEMETRY_ENABLED_STORAGE_KEY, telemetryConfig.enabledByDefault);
  return typeof stored === 'boolean' ? stored : telemetryConfig.enabledByDefault;
};

const transports = [new ConsoleTransport()];
if (telemetryConfig.endpoint) {
  transports.push(new HttpTransport({ endpoint: telemetryConfig.endpoint }));
}

const initialTelemetryEnabled = resolveInitialTelemetryEnabled();
let telemetryEnabled = initialTelemetryEnabled;

const client = new TelemetryClient({
  enabled: telemetryEnabled,
  sampleRate: clampSampleRate(telemetryConfig.sampleRate ?? 1),
  transports,
});

export const setTelemetryEnabled = (enabled: boolean): void => {
  telemetryEnabled = Boolean(enabled);
  setValue<boolean>(TELEMETRY_ENABLED_STORAGE_KEY, telemetryEnabled);
  client.updateConfig({ enabled: telemetryEnabled });
};

export const isTelemetryEnabled = (): boolean => telemetryEnabled;

const buildBaseEvent = (type: TelemetryEvent['type'], context?: Record<string, unknown>) => ({
  id: createTelemetryEventId(),
  type,
  timestamp: Date.now(),
  context,
});

export const trackScreenView = (screenId: string): void => {
  const event: ScreenViewEvent = {
    ...buildBaseEvent('screen_view'),
    screenId,
  };
  client.track(event);
};

export const trackEvent = (eventName: string, payload: TelemetryPayload = {}): void => {
  if (eventName === 'screen_view' && typeof payload.screenId === 'string') {
    trackScreenView(payload.screenId);
    return;
  }

  if (eventName.startsWith('pipeline_job_')) {
    const status = eventName.replace('pipeline_job_', '') as PipelineJobEvent['status'];
    if (status === 'started' || status === 'succeeded' || status === 'failed') {
      const event: PipelineJobEvent = {
        ...buildBaseEvent('pipeline_job'),
        pipelineId: toSafeString(payload.pipelineId, 120, false) ?? 'unknown',
        jobId: toSafeString(payload.jobId, 160, false) ?? 'unknown',
        status,
        attempts: toSafeNumber(payload.attempts),
        errorMessage: toSafeString(payload.error, 200, true),
      };
      client.track(event);
      return;
    }
  }

  if (eventName.startsWith('ai_call_')) {
    const status = eventName.replace('ai_call_', '') as AiCallEvent['status'];
    if (status === 'started' || status === 'succeeded' || status === 'failed') {
      const event: AiCallEvent = {
        ...buildBaseEvent('ai_call'),
        taskType: toSafeString(payload.type, 120, false) ?? 'unknown',
        model: toSafeString(payload.model, 120, false) ?? 'default',
        inputLength: typeof payload.inputLength === 'number' ? Math.max(0, Math.floor(payload.inputLength)) : 0,
        status,
        tokensUsed:
          typeof payload.tokensUsed === 'number'
            ? payload.tokensUsed
            : payload.tokensUsed === null
            ? null
            : undefined,
        errorMessage: toSafeString(payload.error, 200, true),
      };
      client.track(event);
      return;
    }
  }

  if (eventName === 'api_error') {
    const context = buildContext({
      method: toSafeString(payload.method, 16, false),
      url: toSafeString(payload.url, 180, false),
      status: toSafeNumber(payload.status),
    });
    const event: ErrorEvent = {
      ...buildBaseEvent('error', context),
      message: toSafeString(payload.message, 200, true) ?? 'API error',
      code: 'api_error',
      severity: 'warning',
    };
    client.track(event);
    return;
  }

  if (eventName === 'error') {
    const severity = payload.severity as ErrorEvent['severity'];
    const event: ErrorEvent = {
      ...buildBaseEvent('error'),
      message: toSafeString(payload.message, 200, true) ?? 'Unknown error',
      code: toSafeString(payload.code, 120, false),
      severity: severity ?? 'error',
    };
    client.track(event);
    return;
  }

  if (eventName.startsWith('data_resource_')) {
    const context = buildContext({
      key: toSafeString(payload.key, 160, false),
      status: eventName.replace('data_resource_', ''),
      error: toSafeString(payload.error, 200, true),
    });
    const event: UserActionEvent = {
      ...buildBaseEvent('user_action', context),
      actionId: eventName,
      source: 'data_resource',
    };
    client.track(event);
    return;
  }

  if (eventName === 'notes_saved') {
    const context = buildContext({
      id: toSafeString(payload.id, 200, false),
      titleLength: toSafeNumber(payload.titleLength),
      contentLength: toSafeNumber(payload.contentLength),
      hasTitle: typeof payload.hasTitle === 'boolean' ? payload.hasTitle : undefined,
      hasContent: typeof payload.hasContent === 'boolean' ? payload.hasContent : undefined,
    });
    const event: UserActionEvent = {
      ...buildBaseEvent('user_action', context),
      actionId: 'notes_saved',
      source: 'notes',
    };
    client.track(event);
    return;
  }

  const context = buildContext(
    Object.entries(payload).reduce<Record<string, unknown>>((acc, [key, value]) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        acc[key] = value;
      } else if (typeof value === 'boolean') {
        acc[key] = value;
      } else if (typeof value === 'string' && !/\s/.test(value)) {
        acc[key] = toSafeString(value, 80, false);
      }
      return acc;
    }, {})
  );

  const event: UserActionEvent = {
    ...buildBaseEvent('user_action', context),
    actionId: eventName,
    source: toSafeString(payload.source, 120, false),
  };
  client.track(event);
};

