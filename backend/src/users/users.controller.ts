import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, SellerStatus } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  async getAllUsers() {
    return this.usersService.findAll();
  }

  @Patch(':id/seller-status')
  @Roles(Role.ADMIN)
  async updateSellerStatus(
    @Param('id') id: string,
    @Body('status') status: SellerStatus,
    @Request() req: any,
  ) {
    const adminId = req.user.id;
    return this.usersService.updateSellerStatus(id, adminId, status);
  }
}
