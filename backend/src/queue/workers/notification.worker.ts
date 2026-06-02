import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
} from '@prisma/client';

@Processor('notification')
export class NotificationWorker extends WorkerHost {
  private readonly logger = new Logger(NotificationWorker.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing notification job: ${job.name} (ID: ${job.id})`);

    try {
      if (job.name === 'sendNotification') {
        await this.handleSendNotification(job);
      } else {
        this.logger.warn(`Unknown job name: ${job.name}`);
      }
    } catch (error: any) {
      this.logger.error(
        `Notification job ${job.name} failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async handleSendNotification(
    job: Job<{
      userId: string;
      type: NotificationType;
      title: string;
      message: string;
      metadata?: any;
    }>,
  ): Promise<void> {
    const { userId, type, title, message, metadata } = job.data;
    this.logger.log(`Dispatching notification to User ${userId}: ${title}`);

    // Create Notification and Delivery Logs in the database
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        metadata: metadata || null,
      },
    });

    // In a real-world scenario, this would interface with SendGrid, Twilio, or FCM.
    // We simulate creating a successful delivery log for the IN_APP channel.
    await this.prisma.notificationDeliveryLog.create({
      data: {
        notificationId: notification.id,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        providerRef: `mock_fcm_ref_${Date.now()}`,
      },
    });

    this.logger.log(
      `Asynchronous notification delivery completed for user: ${userId}`,
    );
  }
}
