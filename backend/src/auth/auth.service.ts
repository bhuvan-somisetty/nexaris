import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async register(
    email: string,
    password: PasswordString, // standard custom type placeholder or standard string
    role: Role,
    firstName: string,
    lastName: string,
    storeName?: string,
    storeDescription?: string,
  ) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    return this.usersService.create(
      email,
      passwordHash,
      role,
      firstName,
      lastName,
      storeName,
      storeDescription,
    );
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        sellerProfile: user.sellerProfile,
      },
      ...tokens,
    };
  }

  async refreshTokens(token: string) {
    // 1. Verify token exists in database and is active
    const savedToken = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (
      !savedToken ||
      savedToken.isRevoked ||
      savedToken.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 2. Verify JWT signature
    try {
      this.jwtService.verify(token, {
        secret:
          process.env.JWT_REFRESH_SECRET ||
          'super-secret-refresh-key-change-in-production-456',
      });
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token signature');
    }

    // 3. Rotate tokens: revoke current refresh token, generate new set
    await this.prisma.refreshToken.update({
      where: { token },
      data: { isRevoked: true },
    });

    const user = savedToken.user;
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    const userProfile = await this.usersService.findById(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: userProfile?.profile,
        sellerProfile: userProfile?.sellerProfile,
      },
      ...tokens,
    };
  }

  async logout(token: string) {
    const savedToken = await this.prisma.refreshToken.findUnique({
      where: { token },
    });

    if (savedToken) {
      await this.prisma.refreshToken.update({
        where: { token },
        data: { isRevoked: true },
      });
    }

    return { success: true };
  }

  private async generateTokens(userId: string, email: string, role: Role) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret:
          process.env.JWT_SECRET ||
          'super-secret-jwt-key-change-in-production-123',
        expiresIn: (process.env.JWT_EXPIRES_IN as any) || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret:
          process.env.JWT_REFRESH_SECRET ||
          'super-secret-refresh-key-change-in-production-456',
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN as any) || '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async saveRefreshToken(userId: string, token: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  }
}

// To satisfy typescript types if they show up
type PasswordString = string;
