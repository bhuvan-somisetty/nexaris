import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { NotificationType } from '@prisma/client';

export interface SendNotificationPayload {
  userId: string;
  type: NotificationType;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationEventListener {
  private readonly logger = new Logger(NotificationEventListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent('notification.send')
  async handleSendNotification(payload: SendNotificationPayload) {
    const { userId, type, metadata } = payload;
    this.logger.log(
      `Received notification.send event for type ${type} targeting user ${userId}`,
    );
    try {
      await this.notificationsService.sendNotification(
        userId,
        type,
        metadata || {},
      );
    } catch (err: any) {
      this.logger.error(
        `Error processing notification.send event for user ${userId}: ${err.message}`,
      );
    }
  }
}
