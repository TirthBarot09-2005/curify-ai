import { EventEmitter } from 'events';

/**
 * Lightweight in-process event bus for real-time SSE delivery.
 * Uses Node.js EventEmitter — no external dependencies (Redis, Kafka, etc.).
 * Suitable for the current single-server Curify architecture.
 */

export interface CaseEventPayload {
  id: string;
  caseId: string;
  eventType: string;
  oldStatus?: string;
  newStatus?: string;
  message: string;
  createdAt: string;
}

class CaseEventBus {
  private emitter = new EventEmitter();

  constructor() {
    // Allow many SSE listeners (one per connected patient browser tab)
    this.emitter.setMaxListeners(100);
  }

  /**
   * Publish a case event to all subscribers for a specific case
   */
  publish(caseId: string, event: CaseEventPayload): void {
    this.emitter.emit(`case:${caseId}`, event);
  }

  /**
   * Subscribe to events for a specific case.
   * Returns an unsubscribe function for clean disconnect handling.
   */
  subscribe(caseId: string, callback: (event: CaseEventPayload) => void): () => void {
    const channel = `case:${caseId}`;
    this.emitter.on(channel, callback);

    return () => {
      this.emitter.off(channel, callback);
    };
  }

  /**
   * Get the number of active listeners for a case (useful for monitoring)
   */
  getListenerCount(caseId: string): number {
    return this.emitter.listenerCount(`case:${caseId}`);
  }
}

// Singleton instance
export const eventBus = new CaseEventBus();
