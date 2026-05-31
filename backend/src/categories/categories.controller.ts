import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  async getCategories() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  async getCategory(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async createCategory(
    @Body('name') name: string,
    @Body('description') description?: string,
    @Body('parentId') parentId?: string,
  ) {
    return this.categoriesService.create(name, description, parentId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateCategory(
    @Param('id') id: string,
    @Body('name') name?: string,
    @Body('description') description?: string,
    @Body('parentId') parentId?: string,
  ) {
    return this.categoriesService.update(id, name, description, parentId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async deleteCategory(@Param('id') id: string) {
    return this.categoriesService.delete(id);
  }
}
