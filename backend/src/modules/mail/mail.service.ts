import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly adminEmail: string;

  constructor() {
    const key = process.env.RESEND_API_KEY;
    this.resend = key ? new Resend(key) : null;
    this.from = process.env.RESEND_FROM_EMAIL ?? 'Cerebral <onboarding@resend.dev>';
    this.adminEmail = process.env.ADMIN_EMAIL ?? 'goldensmith24@gmail.com';
    if (!key) this.logger.warn('RESEND_API_KEY not set — email is disabled');
  }

  async sendWaitlistConfirmation(email: string): Promise<void> {
    if (!this.resend) return;
    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: "You're on the Cerebral waitlist 🎉",
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #1e293b;">
            <h1 style="font-size: 28px; font-weight: 800; margin-bottom: 8px;">You're on the list.</h1>
            <p style="font-size: 16px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
              Thanks for signing up for early access to <strong>Cerebral</strong> — your AI-powered financial awareness app built for Canadians.
            </p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
              We're putting the finishing touches on the experience. You'll be among the first to know when we launch.
            </p>
            <p style="font-size: 14px; color: #94a3b8;">— The Cerebral team</p>
          </div>
        `,
      });
    } catch (err: any) {
      this.logger.error(`Failed to send waitlist confirmation to ${email}: ${err.message}`);
    }
  }

  async sendWaitlistAdminNotification(email: string): Promise<void> {
    if (!this.resend) return;
    try {
      await this.resend.emails.send({
        from: this.from,
        to: this.adminEmail,
        subject: `New waitlist signup: ${email}`,
        html: `<p>New waitlist entry: <strong>${email}</strong></p>`,
      });
    } catch (err: any) {
      this.logger.error(`Failed to send admin notification: ${err.message}`);
    }
  }
}
