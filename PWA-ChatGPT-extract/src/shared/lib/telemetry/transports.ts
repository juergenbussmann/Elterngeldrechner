import type { TelemetryEvent } from './schema';
import type { TelemetryTransport } from './client';

export class ConsoleTransport implements TelemetryTransport {
  // Gebruik bestaande log-format, maar nu met event-object.
  send(event: TelemetryEvent): void {
    // Houd de prefix consistent met bestaande logs zodat bestaande debugging gewoontes bruikbaar blijven.
    console.log('[telemetry:event]', event.type, event);
  }
}

export interface HttpTransportOptions {
  endpoint: string;
}

export class HttpTransport implements TelemetryTransport {
  private endpoint: string;

  constructor(options: HttpTransportOptions) {
    this.endpoint = options.endpoint;
  }

  send(event: TelemetryEvent): void | Promise<void> {
    // Fire-and-forget; errors worden niet doorgegeven.
    return fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => {
      // Stil falen: telemetry mag nooit functionele logica breken.
    });
  }
}

