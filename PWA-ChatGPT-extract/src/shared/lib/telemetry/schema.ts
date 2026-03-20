export type TelemetryEventType = 'screen_view' | 'user_action' | 'pipeline_job' | 'ai_call' | 'error';

export interface TelemetryEventBase {
  /** Unieke event-id voor correlatie. */
  id: string;
  /** Hoog-niveau type (categorie) van het event. */
  type: TelemetryEventType;
  /** Unix timestamp (ms). */
  timestamp: number;
  /** Optionele algemene context, zoals app-versie, environment, user-flags. */
  context?: Record<string, unknown>;
}

export interface ScreenViewEvent extends TelemetryEventBase {
  type: 'screen_view';
  screenId: string;
}

export interface UserActionEvent extends TelemetryEventBase {
  type: 'user_action';
  actionId: string;
  source?: string;
}

export interface PipelineJobEvent extends TelemetryEventBase {
  type: 'pipeline_job';
  pipelineId: string;
  jobId: string;
  status: 'started' | 'succeeded' | 'failed';
  attempts?: number;
  errorMessage?: string;
}

export interface AiCallEvent extends TelemetryEventBase {
  type: 'ai_call';
  taskType: string;
  model: string;
  inputLength: number;
  status: 'started' | 'succeeded' | 'failed';
  tokensUsed?: number | null;
  errorMessage?: string;
}

export interface ErrorEvent extends TelemetryEventBase {
  type: 'error';
  message: string;
  /** Optioneel technische details, maar geen ruwe user content. */
  code?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

export type TelemetryEvent =
  | ScreenViewEvent
  | UserActionEvent
  | PipelineJobEvent
  | AiCallEvent
  | ErrorEvent;

export const createTelemetryEventId = (): string => {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

