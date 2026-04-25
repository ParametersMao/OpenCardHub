import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(input: CreateUserDto) {
    const user = await this.prisma.user.create({
      data: {
        username: input.username,
        passwordHash: this.hashPassword(input.password),
        role: input.role ?? (input.levelCode === 'V0' ? 'buyer' : 'agent'),
        levelCode: input.levelCode,
        mobile: input.mobile,
        email: input.email,
      },
    });

    return this.mapUser(user);
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: {
        id: 'desc',
      },
    });

    return users.map((user) => this.mapUser(user));
  }

  async updateUser(id: string, input: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: {
        id: BigInt(id),
      },
      data: {
        username: input.username,
        passwordHash: input.password
          ? this.hashPassword(input.password)
          : undefined,
        role: input.role,
        levelCode: input.levelCode,
        status: input.status,
        mobile: input.mobile,
        email: input.email,
      },
    });

    return this.mapUser(user);
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: {
        username,
      },
    });
  }

  verifyPassword(user: User, password: string) {
    return user.passwordHash === this.hashPassword(password);
  }

  private hashPassword(password: string) {
    return createHash('sha256').update(password).digest('hex');
  }

  private mapUser(user: User) {
    return {
      id: user.id.toString(),
      username: user.username,
      mobile: user.mobile,
      email: user.email,
      role: user.role,
      levelCode: user.levelCode,
      status: user.status,
      balance: user.balance.toNumber(),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
