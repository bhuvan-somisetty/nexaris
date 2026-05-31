import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, SellerStatus } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        sellerProfile: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        sellerProfile: true,
      },
    });
  }

  async create(
    email: string,
    passwordHash: string,
    role: Role,
    firstName: string,
    lastName: string,
    storeName?: string,
    storeDescription?: string,
  ) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if store name is already taken (if user is registering as a seller)
    if (role === Role.SELLER && storeName) {
      const existingStore = await this.prisma.sellerProfile.findUnique({
        where: { storeName },
      });
      if (existingStore) {
        throw new ConflictException('Store name is already taken');
      }
    }

    // Execute in a transaction to guarantee data integrity
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role,
        },
      });

      await tx.profile.create({
        data: {
          userId: user.id,
          firstName,
          lastName,
        },
      });

      if (role === Role.SELLER && storeName) {
        await tx.sellerProfile.create({
          data: {
            userId: user.id,
            storeName,
            storeDescription,
            status: SellerStatus.PENDING,
          },
        });
      }

      // Log the user registration
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'REGISTER',
          entity: 'USER',
          entityId: user.id,
          newValue: { email, role, firstName, lastName, storeName },
        },
      });

      return tx.user.findUnique({
        where: { id: user.id },
        include: {
          profile: true,
          sellerProfile: true,
        },
      });
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      include: {
        profile: true,
        sellerProfile: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateSellerStatus(userId: string, adminId: string, status: SellerStatus) {
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!sellerProfile) {
      throw new NotFoundException('Seller profile not found for this user');
    }

    const updatedProfile = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.sellerProfile.update({
        where: { userId },
        data: { status },
      });

      // Log the audit event
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: `SELLER_${status}`,
          entity: 'SELLER_PROFILE',
          entityId: sellerProfile.id,
          oldValue: { status: sellerProfile.status },
          newValue: { status },
        },
      });

      return updated;
    });

    return updatedProfile;
  }
}
