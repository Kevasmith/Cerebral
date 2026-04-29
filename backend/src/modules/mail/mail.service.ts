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
    this.from = process.env.RESEND_FROM_EMAIL ?? 'Cerebral <hello@contact.cerebralwealth.app>';
    this.adminEmail = process.env.ADMIN_EMAIL ?? 'goldensmith24@gmail.com';
    if (!key) this.logger.warn('RESEND_API_KEY not set — email is disabled');
  }

  async sendWaitlistConfirmation(email: string): Promise<void> {
    if (!this.resend) return;
    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: "You're officially on the Cerebral waitlist.",
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #1e293b;">
            <h1 style="font-size: 26px; font-weight: 800; margin-bottom: 16px;">You're officially on the <strong>Cerebral Waitlist</strong>!</h1>
            <p style="font-size: 16px; color: #1e293b; font-weight: 800; line-height: 1.6; margin-bottom: 8px;">
            <p style="font-size: 16px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
              Thanks for signing up and joining our community!
            </p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6; margin-bottom: 12px;">
              As an early waitlist member, you'll be first in line for:
            </p>
            <ul style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0 0 24px 0; padding-left: 20px;">
              <li>Private beta access</li>
              <li>Early feature drops</li>
              <li>Behind-the-scenes updates</li>
              <li>Priority invites when we launch</li>
              <li>The chance to help shape Cerebral from day one</li>
            </ul>
            <p style="font-size: 16px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
              We'll send you an email as soon as we launch.
            </p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6; margin-bottom: 8px;">
              Thanks again for being a part of financial intelligence.
            </p>
            <p style="font-size: 16px; color: #1e293b; margin-bottom: 24px;">— The Cerebral Team</p>
            <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">
              P.S. If you know someone who always says "I need to get better with money," send them our way.
            </p>
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
