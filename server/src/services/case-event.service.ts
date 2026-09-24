import { randomUUID } from 'crypto';
import { query } from '../config/database.js';
import { env } from '../config/env.js';
import { eventBus, type CaseEventPayload } from './event-bus.service.js';
import { emailService } from './email.service.js';

/**
 * Centralized Case Event Service for Curify AI
 *
 * Orchestrates: DB persistence → real-time SSE publish → async email notification.
 * Email failures are caught and logged — they never block the caller.
 */

export interface CreateCaseEventDTO {
  caseId: string;         // loan_cases.id (UUID)
  userId?: string;        // actor user ID
  eventType: string;      // e.g. CASE_APPROVED
  oldStatus?: string;
  newStatus?: string;
  message: string;        // patient-facing message
  metadata?: Record<string, any>;
}

/** Map event types to patient-friendly descriptions */
const EVENT_MESSAGES: Record<string, string> = {
  CASE_SUBMITTED: 'Your financing case was submitted successfully and is now in the review queue.',
  CASE_UNDER_REVIEW: 'Your case is being reviewed by the financing team.',
  CASE_NEEDS_VERIFICATION: 'Additional verification is needed for your financing case. Please check your portal for details.',
  CASE_APPROVED: 'Your financing case has been approved.',
  CASE_REJECTED: 'Your financing case was not approved at this time.',
};

/** Map existing status values → event types */
export function statusToEventType(newStatus: string): string {
  switch (newStatus) {
    case 'Pending Review': return 'CASE_SUBMITTED';
    case 'Approved': return 'CASE_APPROVED';
    case 'Rejected': return 'CASE_REJECTED';
    case 'Needs Review': return 'CASE_NEEDS_VERIFICATION';
    default: return 'CASE_STATUS_CHANGE';
  }
}

/** Get a default patient-facing message for an event type */
export function getDefaultMessage(eventType: string): string {
  return EVENT_MESSAGES[eventType] || 'Your case status has been updated.';
}

export class CaseEventService {
  /**
   * Create a case event, publish via SSE, and trigger email notification.
   * Database insert succeeds independently of email delivery.
   */
  static async createEvent(dto: CreateCaseEventDTO): Promise<CaseEventPayload> {
    const eventId = randomUUID();
    const now = new Date().toISOString();

    // 1. Persist to database
    await query(
      `INSERT INTO case_events (id, case_id, user_id, event_type, old_status, new_status, message, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9);`,
      [
        eventId,
        dto.caseId,
        dto.userId || null,
        dto.eventType,
        dto.oldStatus || null,
        dto.newStatus || null,
        dto.message,
        JSON.stringify(dto.metadata || {}),
        now,
      ]
    );

    // 2. Build payload for SSE
    const eventPayload: CaseEventPayload = {
      id: eventId,
      caseId: dto.caseId,
      eventType: dto.eventType,
      oldStatus: dto.oldStatus,
      newStatus: dto.newStatus,
      message: dto.message,
      createdAt: now,
    };

    // 3. Publish to in-process event bus (delivers to connected SSE clients)
    eventBus.publish(dto.caseId, eventPayload);

    // 4. Trigger email notification asynchronously if enabled (fire-and-forget)
    if (env.EMAIL_NOTIFICATIONS_ENABLED) {
      this.triggerEmailAsync(dto).catch((err) => {
        console.error('[CaseEventService] Email trigger failed (non-blocking):', err);
      });
    }

    return eventPayload;
  }

  /**
   * Fetch all events for a case (for persistent timeline display).
   * Falls back to audit_logs if no case_events exist (e.g. for seeded/legacy cases).
   */
  static async getEventsByCaseId(caseId: string): Promise<CaseEventPayload[]> {
    const res = await query(
      `SELECT id, case_id, event_type, old_status, new_status, message, created_at
       FROM case_events
       WHERE case_id = $1
       ORDER BY created_at DESC`,
      [caseId]
    );

    if (res.rowCount && res.rowCount > 0) {
      return res.rows.map((row: any) => ({
        id: row.id,
        caseId: row.case_id,
        eventType: row.event_type,
        oldStatus: row.old_status,
        newStatus: row.new_status,
        message: row.message,
        createdAt: row.created_at,
      }));
    }

    // Fallback: if no dedicated case_events exist, read from audit_logs
    const auditRes = await query(
      `SELECT id, case_id, action, old_status, new_status, description, created_at
       FROM audit_logs
       WHERE case_id = $1
       ORDER BY created_at DESC`,
      [caseId]
    );

    if (auditRes.rowCount && auditRes.rowCount > 0) {
      return auditRes.rows.map((row: any) => {
        let eventType = 'CASE_STATUS_CHANGE';
        if (row.action === 'SUBMISSION') eventType = 'CASE_SUBMITTED';
        else if (row.new_status === 'Approved') eventType = 'CASE_APPROVED';
        else if (row.new_status === 'Rejected') eventType = 'CASE_REJECTED';
        else if (row.new_status === 'Needs Review') eventType = 'CASE_NEEDS_VERIFICATION';
        else if (row.action === 'NOTE_ADDED' || row.action === 'NOTE') eventType = 'CASE_NOTE_ADDED';
        else if (row.new_status === 'Underwriting In Progress') eventType = 'CASE_UNDER_REVIEW';

        return {
          id: row.id,
          caseId: row.case_id,
          eventType,
          oldStatus: row.old_status || undefined,
          newStatus: row.new_status || undefined,
          message: row.description || getDefaultMessage(eventType),
          createdAt: row.created_at,
        };
      });
    }

    return [];
  }

  /**
   * Asynchronously send email notification for a case event.
   * Looks up the patient email from the loan case → users table.
   */
  private static async triggerEmailAsync(dto: CreateCaseEventDTO): Promise<void> {
    // Only send emails for significant status changes
    const emailableEvents = ['CASE_SUBMITTED', 'CASE_UNDER_REVIEW', 'CASE_NEEDS_VERIFICATION', 'CASE_APPROVED', 'CASE_REJECTED'];
    if (!emailableEvents.includes(dto.eventType)) return;

    try {
      // Look up patient email and name from the case (support UUID or case_number)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dto.caseId);
      const caseRes = isUuid
        ? await query(
            `SELECT lc.case_number, u.email, u.first_name, u.last_name
             FROM loan_cases lc
             JOIN users u ON u.id = lc.patient_id
             WHERE lc.id = $1`,
            [dto.caseId]
          )
        : await query(
            `SELECT lc.case_number, u.email, u.first_name, u.last_name
             FROM loan_cases lc
             JOIN users u ON u.id = lc.patient_id
             WHERE lc.case_number = $1`,
            [dto.caseId]
          );

      if (caseRes.rowCount === 0) {
        console.warn(`[CaseEventService] Cannot send email: case ${dto.caseId} not found`);
        return;
      }

      const { email, first_name, last_name, case_number } = caseRes.rows[0];
      if (!email) {
        console.warn(`[CaseEventService] Cannot send email: no email for patient in case ${dto.caseId}`);
        return;
      }

      await emailService.sendCaseStatusEmail({
        recipientEmail: email,
        recipientName: `${first_name} ${last_name}`.trim(),
        caseId: case_number,
        status: dto.newStatus || dto.eventType,
        message: dto.message,
      });
    } catch (err) {
      // Log but never throw — email failure must not affect case processing
      console.error(`[CaseEventService] Email notification failed for case ${dto.caseId}:`, err);
    }
  }
}
