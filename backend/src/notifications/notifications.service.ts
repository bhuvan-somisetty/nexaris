import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  Notification,
  NotificationPreference,
  NotificationTemplate,
} from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Interpolates template strings with metadata variables (e.g. {{orderId}} -> "12345")
  private interpolate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (variables[key] !== undefined) {
        return String(variables[key]);
      }
      return match;
    });
  }

  // Define default notification preferences
  private getDefaultPreference(type: NotificationType, channel: NotificationChannel): boolean {
    // Orders, Payments, Refunds are enabled by default
    const isCoreTransactional = (
      [
        NotificationType.ORDER_CREATED,
        NotificationType.ORDER_CONFIRMED,
        NotificationType.ORDER_SHIPPED,
        NotificationType.ORDER_DELIVERED,
        NotificationType.ORDER_CANCELLED,
        NotificationType.PAYMENT_SUCCESS,
        NotificationType.PAYMENT_FAILED,
        NotificationType.REFUND_CREATED,
      ] as NotificationType[]
    ).includes(type);

    // Promotions, Marketing, Recommendations are disabled by default
    const isPromotional = (
      [
        NotificationType.PROMOTION,
      ] as NotificationType[]
    ).includes(type);

    if (isCoreTransactional) {
      return true;
    }
    if (isPromotional) {
      return false;
    }

    // Default other alerts/systems/reviews notifications to enabled for IN_APP and EMAIL, disabled for SMS and PUSH
    if (channel === NotificationChannel.IN_APP || channel === NotificationChannel.EMAIL) {
      return true;
    }
    return false;
  }

  // Get paginated notification feed for a user
  async getNotifications(
    userId: string,
    filters: { isRead?: boolean; archived?: boolean } = {},
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const archived = filters.archived ?? false; // Default to false if not specified

    const where: any = {
      userId,
      archived,
      // Only display notifications that were delivered as IN_APP
      deliveryLogs: {
        some: {
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.DELIVERED,
        },
      },
    };

    if (filters.isRead !== undefined) {
      where.isRead = filters.isRead;
    }

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    const unreadCount = await this.prisma.notification.count({
      where: {
        userId,
        archived: false,
        isRead: false,
        deliveryLogs: {
          some: {
            channel: NotificationChannel.IN_APP,
            status: NotificationStatus.DELIVERED,
          },
        },
      },
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    };
  }

  // Mark a notification as read
  async markAsRead(userId: string, id: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
        deliveryLogs: {
          some: {
            channel: NotificationChannel.IN_APP,
            status: NotificationStatus.DELIVERED,
          },
        },
      },
      data: { isRead: true },
    });
  }

  // Archive or unarchive a notification
  async archiveNotification(userId: string, id: string, archived: boolean): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id, userId },
      data: { archived },
    });
  }

  // Retrieve user preferences and merge them with default values
  async getPreferences(userId: string) {
    const savedPrefs = await this.prisma.notificationPreference.findMany({
      where: { userId },
    });

    const savedMap = new Map<string, boolean>();
    for (const pref of savedPrefs) {
      savedMap.set(`${pref.type}:${pref.channel}`, pref.enabled);
    }

    const mergedPrefs = [];
    const types = Object.values(NotificationType);
    const channels = Object.values(NotificationChannel);

    for (const type of types) {
      for (const channel of channels) {
        const key = `${type}:${channel}`;
        const enabled = savedMap.has(key)
          ? (savedMap.get(key) as boolean)
          : this.getDefaultPreference(type, channel);

        mergedPrefs.push({
          type,
          channel,
          enabled,
        });
      }
    }

    return mergedPrefs;
  }

  // Update a single notification preference
  async updatePreference(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
    enabled: boolean,
  ): Promise<NotificationPreference> {
    return this.prisma.notificationPreference.upsert({
      where: {
        userId_type_channel: {
          userId,
          type,
          channel,
        },
      },
      update: { enabled },
      create: {
        userId,
        type,
        channel,
        enabled,
      },
    });
  }

  // Core execution flow for generating and transmitting notifications
  async sendNotification(
    userId: string,
    type: NotificationType,
    metadata: Record<string, any> = {},
  ): Promise<Notification | null> {
    this.logger.log(`Generating notification of type ${type} for user ${userId}`);

    // Retrieve user and their preferences
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) {
      this.logger.warn(`User ${userId} not found, skipping notification`);
      return null;
    }

    const fullName = user.profile
      ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
      : `${user.email.split('@')[0]}`;

    // Merge default context into metadata (like recipient name/email)
    const context = {
      ...metadata,
      name: fullName,
      email: user.email,
      userId: user.id,
    };

    // Find templates for this type
    const templates = await this.prisma.notificationTemplate.findMany({
      where: { type, enabled: true },
    });

    if (templates.length === 0) {
      this.logger.warn(`No enabled templates found for notification type ${type}`);
      return null;
    }

    // Get user preferences
    const prefs = await this.getPreferences(userId);
    const enabledChannels = templates.filter((template) => {
      const pref = prefs.find(
        (p) => p.type === type && p.channel === template.channel,
      );
      return pref ? pref.enabled : this.getDefaultPreference(type, template.channel);
    });

    if (enabledChannels.length === 0) {
      this.logger.log(`All notification channels are disabled for user ${userId} and type ${type}`);
      return null;
    }

    // Determine the title and body for the main Notification database record
    // We prioritize IN_APP template for the central record, then EMAIL, etc.
    const primaryTemplate =
      enabledChannels.find((c) => c.channel === NotificationChannel.IN_APP) ||
      enabledChannels.find((c) => c.channel === NotificationChannel.EMAIL) ||
      enabledChannels[0];

    const finalTitle = this.interpolate(primaryTemplate.titleTemplate, context);
    const finalMessage = this.interpolate(primaryTemplate.bodyTemplate, context);

    // Create the central Notification record
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title: finalTitle,
        message: finalMessage,
        metadata: context,
      },
    });

    // Send notifications across all enabled channels
    for (const template of enabledChannels) {
      const channelTitle = this.interpolate(template.titleTemplate, context);
      const channelBody = this.interpolate(template.bodyTemplate, context);

      try {
        let providerRef: string | null = null;
        let status: NotificationStatus = NotificationStatus.PENDING;

        if (template.channel === NotificationChannel.IN_APP) {
          // In-app is immediately delivered as the record is already saved
          status = NotificationStatus.DELIVERED;
          providerRef = 'IN_APP';
        } else if (template.channel === NotificationChannel.EMAIL) {
          // Send via Mock Email transmitter
          providerRef = await this.mockSendEmail(user.email, channelTitle, channelBody);
          status = NotificationStatus.DELIVERED;
        } else if (template.channel === NotificationChannel.SMS) {
          // Send via Mock SMS transmitter
          if (user.profile?.phone) {
            providerRef = await this.mockSendSms(user.profile.phone, channelBody);
            status = NotificationStatus.DELIVERED;
          } else {
            throw new Error('User has no phone number configured for SMS delivery');
          }
        } else if (template.channel === NotificationChannel.PUSH) {
          // Send via Mock Push transmitter
          providerRef = await this.mockSendPush(userId, channelTitle, channelBody);
          status = NotificationStatus.DELIVERED;
        }

        // Create log
        await this.prisma.notificationDeliveryLog.create({
          data: {
            notificationId: notification.id,
            channel: template.channel,
            status,
            providerRef,
          },
        });
      } catch (err: any) {
        this.logger.error(
          `Failed to deliver notification ${notification.id} via ${template.channel}: ${err.message}`,
        );
        // Create delivery log representing failure
        await this.prisma.notificationDeliveryLog.create({
          data: {
            notificationId: notification.id,
            channel: template.channel,
            status: NotificationStatus.FAILED,
            error: err.message || 'Unknown error occurred',
          },
        });
      }
    }

    return notification;
  }

  // Mock Transmitters
  private async mockSendEmail(email: string, title: string, body: string): Promise<string> {
    const providerRef = `mock-email-${Math.random().toString(36).substring(2, 9)}`;
    this.logger.log(
      `\n========================================\n` +
      `[MOCK EMAIL TRANSMITTER]\n` +
      `Recipient: ${email}\n` +
      `Subject: ${title}\n` +
      `Body: ${body}\n` +
      `Ref ID: ${providerRef}\n` +
      `========================================`,
    );
    // Simulate brief network delay
    await new Promise((resolve) => setTimeout(resolve, 50));
    return providerRef;
  }

  private async mockSendSms(phone: string, body: string): Promise<string> {
    const providerRef = `mock-sms-${Math.random().toString(36).substring(2, 9)}`;
    this.logger.log(
      `\n========================================\n` +
      `[MOCK SMS TRANSMITTER]\n` +
      `Phone: ${phone}\n` +
      `Message: ${body}\n` +
      `Ref ID: ${providerRef}\n` +
      `========================================`,
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    return providerRef;
  }

  private async mockSendPush(userId: string, title: string, body: string): Promise<string> {
    const providerRef = `mock-push-${Math.random().toString(36).substring(2, 9)}`;
    this.logger.log(
      `\n========================================\n` +
      `[MOCK PUSH TRANSMITTER]\n` +
      `User ID: ${userId}\n` +
      `Title: ${title}\n` +
      `Body: ${body}\n` +
      `Ref ID: ${providerRef}\n` +
      `========================================`,
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    return providerRef;
  }

  // --- Admin Template Editing Methods ---
  async getTemplates(): Promise<NotificationTemplate[]> {
    return this.prisma.notificationTemplate.findMany({
      orderBy: [{ type: 'asc' }, { channel: 'asc' }],
    });
  }

  async getTemplateById(id: string): Promise<NotificationTemplate | null> {
    return this.prisma.notificationTemplate.findUnique({
      where: { id },
    });
  }

  async updateTemplate(
    id: string,
    data: { titleTemplate?: string; bodyTemplate?: string; enabled?: boolean },
  ): Promise<NotificationTemplate> {
    return this.prisma.notificationTemplate.update({
      where: { id },
      data,
    });
  }
}
