import { env } from '../config/env.js';

/**
 * Email Service Abstraction for Curify AI
 *
 * Provider interface allows swapping email providers without changing business logic.
 * Default: ConsoleEmailProvider (logs to console — safe for development).
 */

export interface CaseStatusEmailData {
  recipientEmail: string;
  recipientName: string;
  caseId: string;
  status: string;
  message: string;
}

export interface EmailProvider {
  sendCaseStatusEmail(data: CaseStatusEmailData): Promise<boolean>;
}

/**
 * Console provider — logs email content to server console.
 * Used in development when no email provider is configured.
 */
class ConsoleEmailProvider implements EmailProvider {
  async sendCaseStatusEmail(data: CaseStatusEmailData): Promise<boolean> {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║           📧 CURIFY EMAIL NOTIFICATION (DEV)            ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  To:      ${data.recipientEmail}`);
    console.log(`║  Name:    ${data.recipientName}`);
    console.log(`║  Case:    ${data.caseId}`);
    console.log(`║  Status:  ${data.status}`);
    console.log(`║  Message: ${data.message}`);
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    return true;
  }
}

/**
 * Resend email provider placeholder.
 * Replace with actual Resend SDK integration for production.
 */
class ResendEmailProvider implements EmailProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendCaseStatusEmail(data: CaseStatusEmailData): Promise<boolean> {
    const htmlBody = buildEmailHtml(data);

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [data.recipientEmail],
          subject: `Curify — Case ${data.caseId} Update: ${data.status}`,
          html: htmlBody,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error('[EmailService] Resend API error:', response.status, errBody);
        return false;
      }

      console.log(`[EmailService] Email sent successfully via Resend to ${data.recipientEmail} for case ${data.caseId}`);
      return true;
    } catch (err) {
      console.error('[EmailService] Failed to send email via Resend:', err);
      return false;
    }
  }
}

/**
 * Build a branded HTML email for case status notifications.
 * Privacy-conscious: No medical details, diagnosis, or lender notes.
 */
function buildEmailHtml(data: CaseStatusEmailData): string {
  const statusColors: Record<string, string> = {
    'Approved': '#059669',
    'Rejected': '#DC2626',
    'Needs Review': '#D97706',
    'Pending Review': '#0284C7',
  };
  const statusColor = statusColors[data.status] || '#0284C7';
  const portalUrl = env.CLIENT_URL || 'http://localhost:5173';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:#0f172a;padding:28px 32px;">
      <h1 style="margin:0;color:#2dd4bf;font-size:20px;font-weight:700;letter-spacing:-0.5px;">Curify AI</h1>
      <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Healthcare Financing Platform</p>
    </div>

    <!-- Content -->
    <div style="padding:32px;">
      <p style="margin:0 0 4px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Case Update</p>
      <h2 style="margin:0 0 20px;color:#0f172a;font-size:22px;font-weight:700;">Your Financing Case Status</h2>

      <!-- Status Badge -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="margin-bottom:12px;">
          <span style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Case ID</span>
          <p style="margin:2px 0 0;font-size:14px;font-weight:700;color:#0f172a;font-family:monospace;">${data.caseId}</p>
        </div>
        <div style="margin-bottom:12px;">
          <span style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Current Status</span>
          <p style="margin:4px 0 0;">
            <span style="display:inline-block;background:${statusColor};color:#ffffff;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;">${data.status}</span>
          </p>
        </div>
        <div>
          <span style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Details</span>
          <p style="margin:4px 0 0;font-size:13px;color:#334155;line-height:1.5;">${data.message}</p>
        </div>
      </div>

      <!-- CTA -->
      <a href="${portalUrl}/patient/case" style="display:block;text-align:center;background:#0f172a;color:#2dd4bf;font-size:13px;font-weight:700;text-decoration:none;padding:14px 24px;border-radius:10px;">
        View Full Details in Patient Portal →
      </a>

      <p style="margin:20px 0 0;font-size:11px;color:#94a3b8;line-height:1.5;text-align:center;">
        Sign in to your Curify Patient Portal for complete case details.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;">
      <p style="margin:0;font-size:10px;color:#94a3b8;line-height:1.5;text-align:center;">
        This is an automated notification from Curify AI. Do not reply to this email.<br>
        For questions, access your Patient Portal or contact your healthcare provider.
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Factory: create email provider based on configuration
 */
function createEmailProvider(): EmailProvider {
  const provider = env.EMAIL_PROVIDER;
  const apiKey = env.EMAIL_PROVIDER_API_KEY;

  if (provider === 'resend' && apiKey) {
    console.log('[EmailService] Using Resend email provider');
    return new ResendEmailProvider(apiKey);
  }

  // Default to console logging
  return new ConsoleEmailProvider();
}

/**
 * Singleton email service instance
 */
class EmailService {
  private provider: EmailProvider;

  constructor() {
    this.provider = createEmailProvider();
  }

  /**
   * Send a case status notification email.
   * Returns true if sent successfully, false otherwise.
   * NEVER throws — failures are logged and swallowed.
   */
  async sendCaseStatusEmail(data: CaseStatusEmailData): Promise<boolean> {
    if (!env.EMAIL_NOTIFICATIONS_ENABLED) {
      console.log(`[EmailService] Email notifications disabled. Skipping email for case ${data.caseId}`);
      return false;
    }

    try {
      return await this.provider.sendCaseStatusEmail(data);
    } catch (err) {
      console.error('[EmailService] Unexpected error sending email:', err);
      return false;
    }
  }
}

export const emailService = new EmailService();
