import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Get('sign')
  @Roles(Role.CUSTOMER, Role.SELLER, Role.ADMIN)
  getSign(@Query('folder') folder = 'nexaris/products') {
    return this.uploadService.getUploadSignature(folder);
  }
}
