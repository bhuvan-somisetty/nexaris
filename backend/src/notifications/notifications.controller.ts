import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, NotificationType, NotificationChannel } from '@prisma/client';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles(Role.CUSTOMER, Role.SELLER, Role.ADMIN)
  async getNotifications(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isRead') isReadStr?: string,
    @Query('archived') archivedStr?: string,
  ) {
    const userId = req.user.id;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    let isRead: boolean | undefined;
    if (isReadStr === 'true') isRead = true;
    if (isReadStr === 'false') isRead = false;

    let archived: boolean | undefined;
    if (archivedStr === 'true') archived = true;
    if (archivedStr === 'false') archived = false;

    return this.notificationsService.getNotifications(
      userId,
      { isRead, archived },
      pageNum,
      limitNum,
    );
  }

  @Post('read-all')
  @Roles(Role.CUSTOMER, Role.SELLER, Role.ADMIN)
  async markAllAsRead(@Request() req: any) {
    const userId = req.user.id;
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  @Roles(Role.CUSTOMER, Role.SELLER, Role.ADMIN)
  async markAsRead(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.notificationsService.markAsRead(userId, id);
  }

  @Patch(':id/archive')
  @Roles(Role.CUSTOMER, Role.SELLER, Role.ADMIN)
  async archiveNotification(
    @Request() req: any,
    @Param('id') id: string,
    @Body('archived') archived: boolean,
  ) {
    if (typeof archived !== 'boolean') {
      throw new BadRequestException('archived must be a boolean value');
    }
    const userId = req.user.id;
    return this.notificationsService.archiveNotification(userId, id, archived);
  }

  @Get('preferences')
  @Roles(Role.CUSTOMER, Role.SELLER, Role.ADMIN)
  async getPreferences(@Request() req: any) {
    const userId = req.user.id;
    return this.notificationsService.getPreferences(userId);
  }

  @Patch('preferences')
  @Roles(Role.CUSTOMER, Role.SELLER, Role.ADMIN)
  async updatePreference(
    @Request() req: any,
    @Body('type') type: NotificationType,
    @Body('channel') channel: NotificationChannel,
    @Body('enabled') enabled: boolean,
  ) {
    if (!type || !channel || typeof enabled !== 'boolean') {
      throw new BadRequestException('type, channel, and enabled (boolean) are required');
    }
    const userId = req.user.id;
    return this.notificationsService.updatePreference(userId, type, channel, enabled);
  }

  // --- Admin Template Management ---
  @Get('admin/templates')
  @Roles(Role.ADMIN)
  async getTemplates() {
    return this.notificationsService.getTemplates();
  }

  @Get('admin/templates/:id')
  @Roles(Role.ADMIN)
  async getTemplateById(@Param('id') id: string) {
    return this.notificationsService.getTemplateById(id);
  }

  @Patch('admin/templates/:id')
  @Roles(Role.ADMIN)
  async updateTemplate(
    @Param('id') id: string,
    @Body()
    body: {
      titleTemplate?: string;
      bodyTemplate?: string;
      enabled?: boolean;
    },
  ) {
    return this.notificationsService.updateTemplate(id, body);
  }
}
