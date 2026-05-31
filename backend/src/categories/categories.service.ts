import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    // Return hierarchical categories: fetch root categories and include children relations
    return this.prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: true, // Supporting nested subcategories
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async create(name: string, description?: string, parentId?: string) {
    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const existingCategory = await this.prisma.category.findUnique({
      where: { slug },
    });
    if (existingCategory) {
      throw new ConflictException('Category with a similar name already exists');
    }

    if (parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    return this.prisma.category.create({
      data: {
        name,
        slug,
        description,
        parentId,
      },
    });
  }

  async update(id: string, name?: string, description?: string, parentId?: string) {
    const category = await this.findOne(id);

    const data: any = {};
    if (name) {
      data.name = name;
      data.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      
      const existingCategory = await this.prisma.category.findFirst({
        where: { slug: data.slug, NOT: { id } },
      });
      if (existingCategory) {
        throw new ConflictException('Category with a similar name already exists');
      }
    }

    if (description !== undefined) {
      data.description = description;
    }

    if (parentId !== undefined) {
      if (parentId === id) {
        throw new ConflictException('Category cannot be its own parent');
      }
      if (parentId) {
        const parent = await this.prisma.category.findUnique({
          where: { id: parentId },
        });
        if (!parent) {
          throw new NotFoundException('Parent category not found');
        }
      }
      data.parentId = parentId;
    }

    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    await this.prisma.category.delete({
      where: { id },
    });
    return { success: true };
  }
}
