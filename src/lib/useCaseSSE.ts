import { useEffect, useRef, useCallback, useState } from 'react';
import type { CaseEvent } from '../types';
import { API_BASE } from './api';

/**
 * Custom React hook for Server-Sent Events (SSE) on a specific case.
 *
 * - Connects to GET /api/cases/:caseId/events/stream with auth token
 * - Auto-reconnects on disconnect with exponential backoff
 * - Returns latest event + connection status
 * - Cleans up on unmount
 *
 * SSE is an enhancement — the page still works without it via normal API fetching.
 */

interface UseCaseSSEOptions {
  /** The loan_cases UUID to subscribe to */
  caseId: string | undefined;
  /** Called when a new case event arrives via SSE */
  onEvent?: (event: CaseEvent) => void;
  /** Whether SSE should be active */
  enabled?: boolean;
}

interface UseCaseSSEReturn {
  /** Whether SSE connection is active */
  connected: boolean;
  /** The most recent event received */
  lastEvent: CaseEvent | null;
}

export function useCaseSSE({ caseId, onEvent, enabled = true }: UseCaseSSEOptions): UseCaseSSEReturn {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<CaseEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEventRef = useRef(onEvent);

  // Keep onEvent ref current without re-creating effect
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const connect = useCallback(() => {
    if (!caseId || !enabled) return;

    // EventSource sends cookies automatically. If a token or demo role is stored,
    // also attach as query parameters for reliable auth across all environments.
    const token = localStorage.getItem('curify_token');
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    try {
      const storedUser = sessionStorage.getItem('curify_demo_user') || localStorage.getItem('curify_user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u?.role === 'lender') params.set('demo_role', 'lender');
      }
    } catch {}

    const qs = params.toString();
    const url = `${API_BASE}/cases/${caseId}/events/stream${qs ? `?${qs}` : ''}`;

    try {
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnected(true);
        retryCountRef.current = 0; // Reset backoff on successful connection
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Skip connection confirmation messages
          if (data.type === 'connected') {
            setConnected(true);
            return;
          }

          // This is a case event
          const caseEvent: CaseEvent = {
            id: data.id,
            caseId: data.caseId,
            eventType: data.eventType,
            oldStatus: data.oldStatus,
            newStatus: data.newStatus,
            message: data.message,
            createdAt: data.createdAt,
          };

          setLastEvent(caseEvent);
          onEventRef.current?.(caseEvent);
        } catch {
          // Ignore unparseable messages (heartbeats, etc.)
        }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        eventSourceRef.current = null;

        // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
        retryCountRef.current++;

        retryTimerRef.current = setTimeout(() => {
          connect();
        }, delay);
      };
    } catch {
      // EventSource creation failed — silently degrade
      setConnected(false);
    }
  }, [caseId, enabled]);

  useEffect(() => {
    connect();

    return () => {
      // Cleanup on unmount
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      setConnected(false);
    };
  }, [connect]);

  return { connected, lastEvent };
}
