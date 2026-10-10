import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { EntityManager } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import { UserEntity } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly em: EntityManager,
  ) {}

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.em.findOne(
      UserEntity,
      { email },
    );

    if (existing) {
      throw new ConflictException('EMAIL_ALREADY_EXISTS');
    }

    const user = new UserEntity();

    user.id = randomUUID();
    user.email = email;
    user.name = dto.name?.trim();
    user.createdAt = new Date();
    user.updatedAt = new Date();

    this.em.persist(user);
    await this.em.flush();

    return this.toResponse(user);
  }

  async findAll() {
    const users = await this.em.find(
      UserEntity,
      {},
      { orderBy: { createdAt: 'DESC' } },
    );

    return users.map((user) => this.toResponse(user));
  }

  async findOne(id: string) {
    const user = await this.em.findOne(
      UserEntity,
      { id },
    );

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    return this.toResponse(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.em.findOne(
      UserEntity,
      { id },
    );

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();

      const existing = await this.em.findOne(
        UserEntity,
        { email },
      );

      if (existing && existing.id !== user.id) {
        throw new ConflictException('EMAIL_ALREADY_EXISTS');
      }

      user.email = email;
    }

    if (dto.name !== undefined) {
      user.name = dto.name.trim();
    }

    user.updatedAt = new Date();

    await this.em.flush();

    return this.toResponse(user);
  }

  async remove(id: string) {
    const user = await this.em.findOne(
      UserEntity,
      { id },
    );

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    try {
      this.em.remove(user);
      await this.em.flush();
    } catch (error) {
      if (
        this.isForeignKeyViolation(error)
      ) {
        throw new ConflictException(
          'USER_HAS_DEPENDENCIES',
        );
      }

      throw error;
    }

    return { id, deleted: true };
  }

  private toResponse(user: UserEntity) {
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private isForeignKeyViolation(
    error: unknown,
  ): boolean {
    let current: unknown = error;

    while (current && typeof current === 'object') {
      const candidate = current as {
        code?: string;
        cause?: unknown;
      };

      if (candidate.code === '23503') {
        return true;
      }

      current = candidate.cause;
    }

    return false;
  }
}