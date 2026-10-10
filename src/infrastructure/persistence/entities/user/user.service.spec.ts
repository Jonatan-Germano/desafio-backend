import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { UserService } from './user.service';
import { UserEntity } from './user.entity';
import { EntityManager } from '@mikro-orm/core';

describe('UserService', () => {
  let service: UserService;
  let em: any;
  let findOneResults: any[];
  let findResults: any[];

  function makeUser(overrides: Record<string, any> = {}) {
    return Object.assign(new UserEntity(), {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
      updatedAt: new Date('2026-01-01T10:00:00.000Z'),
      ...overrides,
    });
  }

  beforeEach(() => {
    findOneResults = [];
    findResults = [];

    em = {
      findOne: mock(async () => findOneResults.shift() ?? null),
      find: mock(async () => findResults),
      persist: mock(() => undefined),
      remove: mock(() => undefined),
      flush: mock(async () => undefined),
    };

    service = new UserService(em as EntityManager);
  });

  describe('create', () => {
    it('should create a user with normalized email', async () => {
      findOneResults = [null];

      const result = await service.create({
        email: '  USER@Example.COM  ',
        name: '  Alice  ',
      });

      expect(result.email).toBe('user@example.com');
      expect(result.name).toBe('Alice');
      expect(typeof result.id).toBe('string');
      expect(result.id.length).toBeGreaterThan(0);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);

      expect(em.findOne).toHaveBeenCalledWith(
        UserEntity,
        { email: 'user@example.com' },
      );

      expect(em.persist).toHaveBeenCalledTimes(1);
      expect(em.flush).toHaveBeenCalledTimes(1);
    });

    it('should create a user without a name', async () => {
      findOneResults = [null];

      const result = await service.create({
        email: 'user@example.com',
      });

      expect(result.name).toBeNull();
    });

    it('should reject an existing email', async () => {
      findOneResults = [makeUser()];

      await expect(
        service.create({
          email: 'USER@example.com',
          name: 'Alice',
        }),
      ).rejects.toThrow(
        new ConflictException('EMAIL_ALREADY_EXISTS'),
      );

      expect(em.persist).not.toHaveBeenCalled();
      expect(em.flush).not.toHaveBeenCalled();
    });

    it('should propagate a database error', async () => {
      findOneResults = [null];
      em.flush.mockRejectedValueOnce(new Error('DATABASE_ERROR'));

      await expect(
        service.create({ email: 'user@example.com' }),
      ).rejects.toThrow('DATABASE_ERROR');
    });
  });

  describe('findAll', () => {
    it('should return users ordered by creation date descending', async () => {
      findResults = [
        makeUser({ id: 'user-2', email: 'second@example.com' }),
        makeUser({ id: 'user-1', email: 'first@example.com' }),
      ];

      const result = await service.findAll();

      expect(em.find).toHaveBeenCalledWith(
        UserEntity,
        {},
        { orderBy: { createdAt: 'DESC' } },
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('user-2');
      expect(result[1].id).toBe('user-1');
    });

    it('should return an empty array when there are no users', async () => {
      findResults = [];

      expect(await service.findAll()).toEqual([]);
    });

    it('should convert missing names to null', async () => {
      findResults = [makeUser({ name: undefined })];

      const result = await service.findAll();

      expect(result[0].name).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should return a user by ID', async () => {
      findOneResults = [makeUser()];

      const result = await service.findOne('user-1');

      expect(result.id).toBe('user-1');
      expect(result.email).toBe('user@example.com');

      expect(em.findOne).toHaveBeenCalledWith(
        UserEntity,
        { id: 'user-1' },
      );
    });

    it('should throw when the user does not exist', async () => {
      findOneResults = [null];

      await expect(
        service.findOne('missing-user'),
      ).rejects.toThrow(
        new NotFoundException('USER_NOT_FOUND'),
      );
    });
  });

  describe('update', () => {
    it('should update and normalize the email', async () => {
      const user = makeUser();
      findOneResults = [user, null];

      const result = await service.update('user-1', {
        email: '  NEW@Example.COM ',
      });

      expect(result.email).toBe('new@example.com');
      expect(em.flush).toHaveBeenCalledTimes(1);
    });

    it('should update the name', async () => {
      const user = makeUser();
      findOneResults = [user];

      const result = await service.update('user-1', {
        name: '  New Name  ',
      });

      expect(result.name).toBe('New Name');
      expect(em.flush).toHaveBeenCalledTimes(1);
    });

    it('should allow retaining the current email', async () => {
      const user = makeUser();
      findOneResults = [user, user];

      const result = await service.update('user-1', {
        email: ' USER@EXAMPLE.COM ',
      });

      expect(result.email).toBe('user@example.com');
      expect(em.flush).toHaveBeenCalledTimes(1);
    });

    it('should reject an email belonging to another user', async () => {
      findOneResults = [
        makeUser({ id: 'user-1' }),
        makeUser({
          id: 'user-2',
          email: 'other@example.com',
        }),
      ];

      await expect(
        service.update('user-1', {
          email: 'other@example.com',
        }),
      ).rejects.toThrow(
        new ConflictException('EMAIL_ALREADY_EXISTS'),
      );

      expect(em.flush).not.toHaveBeenCalled();
    });

    it('should throw when the user does not exist', async () => {
      findOneResults = [null];

      await expect(
        service.update('missing-user', { name: 'New Name' }),
      ).rejects.toThrow(
        new NotFoundException('USER_NOT_FOUND'),
      );

      expect(em.flush).not.toHaveBeenCalled();
    });

    it('should update updatedAt', async () => {
      const previousDate = new Date('2020-01-01T00:00:00.000Z');
      const user = makeUser({ updatedAt: previousDate });
      findOneResults = [user];

      const result = await service.update('user-1', {
        name: 'Updated',
      });

      expect(result.updatedAt).not.toBe(previousDate);
      expect(result.updatedAt.getTime()).toBeGreaterThan(
        previousDate.getTime(),
      );
    });

    it('should allow an empty update', async () => {
      findOneResults = [makeUser()];

      const result = await service.update('user-1', {});

      expect(result.id).toBe('user-1');
      expect(em.flush).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('should remove an existing user', async () => {
      const user = makeUser();
      findOneResults = [user];

      const result = await service.remove('user-1');

      expect(result).toEqual({
        id: 'user-1',
        deleted: true,
      });

      expect(em.remove).toHaveBeenCalledWith(user);
      expect(em.flush).toHaveBeenCalledTimes(1);
    });

    it('should throw when the user does not exist', async () => {
      findOneResults = [null];

      await expect(
        service.remove('missing-user'),
      ).rejects.toThrow(
        new NotFoundException('USER_NOT_FOUND'),
      );

      expect(em.remove).not.toHaveBeenCalled();
    });

    it('should convert a PostgreSQL foreign key violation to ConflictException', async () => {
      findOneResults = [makeUser()];

      em.flush.mockRejectedValueOnce({
        code: '23503',
      });

      await expect(
        service.remove('user-1'),
      ).rejects.toThrow(
        new ConflictException('USER_HAS_DEPENDENCIES'),
      );
    });

    it('should detect a foreign key violation inside the cause', async () => {
      findOneResults = [makeUser()];

      em.flush.mockRejectedValueOnce({
        cause: { code: '23503' },
      });

      await expect(
        service.remove('user-1'),
      ).rejects.toThrow(
        new ConflictException('USER_HAS_DEPENDENCIES'),
      );
    });

    it('should propagate other database errors', async () => {
      findOneResults = [makeUser()];

      em.flush.mockRejectedValueOnce(
        new Error('DATABASE_ERROR'),
      );

      await expect(
        service.remove('user-1'),
      ).rejects.toThrow('DATABASE_ERROR');
    });
  });
});

function mock<T extends (...args: any[]) => any>(implementation: T) {
  return jest.fn(implementation);
}
