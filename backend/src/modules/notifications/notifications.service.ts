import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  async send(expoPushToken: string | null | undefined, title: string, body: string): Promise<void> {
    if (!expoPushToken?.startsWith('ExponentPushToken')) return;
    try {
      await axios.post(
        EXPO_PUSH_URL,
        { to: expoPushToken, sound: 'default', title, body },
        { headers: { 'Content-Type': 'application/json' } },
      );
    } catch (err) {
      this.logger.warn(`Push failed for token ${expoPushToken}: ${err.message}`);
    }
  }

  async sendBatch(tokens: string[], title: string, body: string): Promise<void> {
    const valid = tokens.filter((t) => t?.startsWith('ExponentPushToken'));
    if (!valid.length) return;
    try {
      await axios.post(
        EXPO_PUSH_URL,
        valid.map((to) => ({ to, sound: 'default', title, body })),
        { headers: { 'Content-Type': 'application/json' } },
      );
    } catch (err) {
      this.logger.warn(`Batch push failed: ${err.message}`);
    }
  }
}
