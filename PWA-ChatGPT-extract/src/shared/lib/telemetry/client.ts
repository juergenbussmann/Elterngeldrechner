import type { TelemetryEvent } from './schema';

export interface TelemetryTransport {
  send(event: TelemetryEvent): void | Promise<void>;
}

export interface TelemetryClientConfig {
  enabled: boolean;
  /** 0–1: kans dat een event verstuurd wordt (1 = alles). */
  sampleRate: number;
  transports: TelemetryTransport[];
}

export class TelemetryClient {
  private config: TelemetryClientConfig;

  constructor(config: TelemetryClientConfig) {
    this.config = config;
  }

  public updateConfig(config: Partial<TelemetryClientConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public track(event: TelemetryEvent): void {
    const { enabled, sampleRate, transports } = this.config;
    if (!enabled) return;
    if (sampleRate <= 0) return;
    if (sampleRate < 1 && Math.random() > sampleRate) return;

    for (const transport of transports) {
      try {
        const result = transport.send(event);
        if (result && typeof (result as Promise<void>).then === 'function') {
          void (result as Promise<void>);
        }
      } catch {
        // Telemetry mag nooit de UI breken; fouten worden hier bewust genegeerd.
      }
    }
  }
}

