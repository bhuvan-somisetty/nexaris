import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SellerRatingsService } from './seller-ratings.service';
import { CreateSellerRatingDto } from './seller-ratings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('seller-ratings')
export class SellerRatingsController {
  constructor(private sellerRatingsService: SellerRatingsService) {}

  @Get('sellers/:sellerId')
  async getSellerRatings(
    @Param('sellerId') sellerId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.sellerRatingsService.getRatingsBySeller(sellerId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('eligibility/:sellerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  async checkEligibility(
    @Param('sellerId') sellerId: string,
    @Request() req: any,
  ) {
    const customerId = req.user.id;
    return this.sellerRatingsService.checkEligibility(sellerId, customerId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  async createSellerRating(
    @Body() dto: CreateSellerRatingDto,
    @Request() req: any,
  ) {
    const customerId = req.user.id;
    return this.sellerRatingsService.createSellerRating(customerId, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  async getMyRatings(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const sellerId = req.user.id;
    return this.sellerRatingsService.getRatingsBySeller(sellerId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
