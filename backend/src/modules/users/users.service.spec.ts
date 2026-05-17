import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { auth } from '../../auth/auth';

// jest.mock is hoisted before variable declarations, so we put jest.fn()
// inside the factory and retrieve the reference afterwards via the mocked module.
jest.mock('../../auth/auth', () => ({
  auth: {
    $context: Promise.resolve({
      internalAdapter: { deleteUser: jest.fn().mockResolvedValue(undefined) },
    }),
  },
}));

// Resolved once all modules are loaded (beforeAll).
let mockDeleteUser: jest.Mock;

// ── shared mocks ──────────────────────────────────────────────────────────────

const mockUserRepo = {
  findOne: jest.fn(),
  create:  jest.fn(),
  save:    jest.fn(),
};

const mockPreferenceRepo = {
  findOne: jest.fn(),
  create:  jest.fn(),
  save:    jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn(),
  query:       jest.fn(),
};

function makeService() {
  return new UsersService(
    mockUserRepo       as any,
    mockPreferenceRepo as any,
    mockDataSource     as any,
  );
}

// ─────────────────────────────────────────────────────────────────────────────

describe('UsersService', () => {
  let service: UsersService;

  beforeAll(async () => {
    // Retrieve the jest.fn() that was created inside the jest.mock factory.
    const ctx = await (auth as any).$context;
    mockDeleteUser = ctx.internalAdapter.deleteUser;
  });

  beforeEach(() => {
    service = makeService();
    jest.clearAllMocks();
    mockDeleteUser.mockResolvedValue(undefined);
  });

  // ── upsert ─────────────────────────────────────────────────────────────────

  describe('upsert', () => {
    it('returns the existing user without creating anything when found', async () => {
      const existing = { id: 'user-1', betterAuthId: 'ba-1', email: 'a@b.com' };
      mockUserRepo.findOne.mockResolvedValue(existing);

      const result = await service.upsert('ba-1', { email: 'a@b.com' });

      expect(result).toEqual(existing);
      expect(mockUserRepo.create).not.toHaveBeenCalled();
      expect(mockPreferenceRepo.save).not.toHaveBeenCalled();
    });

    it('creates user and preference rows when the user is new', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      const newUser = { id: 'user-new', betterAuthId: 'ba-2' };
      mockUserRepo.create.mockReturnValue(newUser);
      mockUserRepo.save.mockResolvedValue(newUser);
      mockPreferenceRepo.create.mockReturnValue({ userId: 'user-new' });
      mockPreferenceRepo.save.mockResolvedValue({});

      const result = await service.upsert('ba-2', { email: 'new@test.com', displayName: 'Alice' });

      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ betterAuthId: 'ba-2', email: 'new@test.com' }),
      );
      expect(mockPreferenceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-new', goal: null, interests: [] }),
      );
      expect(mockPreferenceRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual(newUser);
    });
  });

  // ── findByBetterAuthId ─────────────────────────────────────────────────────

  describe('findByBetterAuthId', () => {
    it('returns the user with preference relation when found', async () => {
      const user = { id: 'user-1', betterAuthId: 'ba-1' };
      mockUserRepo.findOne.mockResolvedValue(user);

      const result = await service.findByBetterAuthId('ba-1');

      expect(result).toEqual(user);
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { betterAuthId: 'ba-1' },
        relations: ['preference'],
      });
    });

    it('throws NotFoundException when no user exists', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.findByBetterAuthId('ghost')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getPreferences ─────────────────────────────────────────────────────────

  describe('getPreferences', () => {
    it('returns preferences when found', async () => {
      const prefs = { id: 'pref-1', userId: 'user-1', goal: 'save_more' };
      mockPreferenceRepo.findOne.mockResolvedValue(prefs);

      const result = await service.getPreferences('user-1');

      expect(result).toEqual(prefs);
    });

    it('throws NotFoundException when preferences do not exist', async () => {
      mockPreferenceRepo.findOne.mockResolvedValue(null);

      await expect(service.getPreferences('user-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ── updatePreferences ──────────────────────────────────────────────────────

  describe('updatePreferences', () => {
    it('updates and saves existing preferences', async () => {
      const existing = { id: 'pref-1', userId: 'user-1', goal: null, interests: [] };
      mockPreferenceRepo.findOne.mockResolvedValue(existing);
      mockPreferenceRepo.save.mockResolvedValue({ ...existing, goal: 'retire_early' });

      const result = await service.updatePreferences('user-1', { goal: 'retire_early' } as any);

      expect(mockPreferenceRepo.create).not.toHaveBeenCalled();
      expect(mockPreferenceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ goal: 'retire_early' }),
      );
      expect(result.goal).toBe('retire_early');
    });

    it('creates a new preference row when none exists, then saves', async () => {
      mockPreferenceRepo.findOne.mockResolvedValue(null);
      const newPref = { userId: 'user-1', goal: null };
      mockPreferenceRepo.create.mockReturnValue(newPref);
      mockPreferenceRepo.save.mockResolvedValue({ ...newPref, goal: 'emergency_fund' });

      await service.updatePreferences('user-1', { goal: 'emergency_fund' } as any);

      expect(mockPreferenceRepo.create).toHaveBeenCalledWith({ userId: 'user-1', goal: null });
      expect(mockPreferenceRepo.save).toHaveBeenCalled();
    });
  });

  // ── updateProfile ──────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('updates user fields and saves the record', async () => {
      const user = { id: 'user-1', betterAuthId: 'ba-1', displayName: 'Old Name' };
      mockUserRepo.findOne.mockResolvedValue(user);
      mockUserRepo.save.mockResolvedValue({ ...user, displayName: 'New Name' });

      const result = await service.updateProfile('ba-1', { displayName: 'New Name' });

      expect(result.displayName).toBe('New Name');
      expect(mockUserRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: 'New Name' }),
      );
    });

    it('propagates NotFoundException when the user is not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateProfile('ghost', { displayName: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── savePushToken ──────────────────────────────────────────────────────────

  describe('savePushToken', () => {
    it('sets expoPushToken on the user and saves', async () => {
      const user: any = { id: 'user-1', betterAuthId: 'ba-1', expoPushToken: null };
      mockUserRepo.findOne.mockResolvedValue(user);
      mockUserRepo.save.mockResolvedValue(user);

      await service.savePushToken('ba-1', 'ExponentPushToken[abc]');

      expect(user.expoPushToken).toBe('ExponentPushToken[abc]');
      expect(mockUserRepo.save).toHaveBeenCalledWith(user);
    });
  });

  // ── deleteAccount ──────────────────────────────────────────────────────────

  describe('deleteAccount', () => {
    const user = { id: 'user-uuid', betterAuthId: 'ba-del', email: 'del@test.com' };

    beforeEach(() => {
      mockUserRepo.findOne.mockResolvedValue(user);
      mockDataSource.transaction.mockImplementation(
        async (fn: (em: any) => Promise<void>) => fn({ query: jest.fn().mockResolvedValue(undefined) }),
      );
      mockDataSource.query.mockResolvedValue(undefined);
    });

    it('runs a database transaction to wipe all application data', async () => {
      await service.deleteAccount('ba-del');
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('executes the correct DELETE queries inside the transaction in FK-safe order', async () => {
      const emQuery = jest.fn().mockResolvedValue(undefined);
      mockDataSource.transaction.mockImplementation(
        async (fn: (em: any) => Promise<void>) => fn({ query: emQuery }),
      );

      await service.deleteAccount('ba-del');

      const tables = emQuery.mock.calls.map((call: any[]) =>
        (call[0] as string).match(/FROM (\w+)/i)?.[1]?.toLowerCase() ??
        (call[0] as string).match(/DELETE FROM (\w+)/i)?.[1]?.toLowerCase(),
      );
      // transactions must be deleted before accounts
      expect(tables.indexOf('transactions')).toBeLessThan(tables.indexOf('accounts'));
      // users must be deleted last
      expect(tables.at(-1)).toBe('users');
    });

    it('calls auth.internalAdapter.deleteUser with the betterAuthId', async () => {
      await service.deleteAccount('ba-del');
      expect(mockDeleteUser).toHaveBeenCalledWith('ba-del');
    });

    it('rethrows when auth.deleteUser fails (app data already wiped)', async () => {
      mockDeleteUser.mockRejectedValue(new Error('Auth deletion failed'));

      await expect(service.deleteAccount('ba-del')).rejects.toThrow('Auth deletion failed');
    });

    it('cleans up verification rows by email after auth deletion', async () => {
      await service.deleteAccount('ba-del');

      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('verification'),
        ['del@test.com'],
      );
    });

    it('does not throw when verification cleanup fails', async () => {
      mockDataSource.query.mockRejectedValue(new Error('table missing'));

      await expect(service.deleteAccount('ba-del')).resolves.toBeUndefined();
    });

    it('skips verification cleanup when the user has no email', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...user, email: null });

      await service.deleteAccount('ba-del');

      expect(mockDataSource.query).not.toHaveBeenCalled();
    });
  });
});
