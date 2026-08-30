import { profileRepository } from '../../services/repositories/profileRepository';
import { supabase } from '../../services/supabase';

// Mock supabase client
jest.mock('../../services/supabase', () => {
  const actual = jest.requireActual('../../services/supabase');
  return {
    ...actual,
    isSupabaseConfigured: true,
    supabase: {
      from: jest.fn(),
      auth: {
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
        signOut: jest.fn(),
        getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: jest.fn().mockReturnValue({
          data: {
            subscription: {
              unsubscribe: jest.fn(),
            },
          },
        }),
      },
    },
  };
});

describe('profileRepository & Auth Integrations', () => {
  let mockQueryChain: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();

    mockQueryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
      single: jest.fn(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
    };

    (supabase.from as jest.Mock).mockReturnValue(mockQueryChain);
  });

  describe('getProfile', () => {
    it('should query profile by ID correctly and map DB snake_case columns to camelCase', async () => {
      const mockDbProfile = {
        id: 'user-123',
        full_name: 'Jane Doe',
        phone: '1234567890',
        avatar_url: 'https://avatar.com/jane',
        created_at: '2026-08-30T00:00:00.000Z',
        updated_at: '2026-08-30T01:00:00.000Z',
      };

      mockQueryChain.maybeSingle.mockResolvedValue({
        data: mockDbProfile,
        error: null,
      });

      const profile = await profileRepository.getProfile('user-123');

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockQueryChain.select).toHaveBeenCalledWith('*');
      expect(mockQueryChain.eq).toHaveBeenCalledWith('id', 'user-123');
      expect(mockQueryChain.maybeSingle).toHaveBeenCalled();

      expect(profile).toEqual({
        id: 'user-123',
        fullName: 'Jane Doe',
        phone: '1234567890',
        avatarUrl: 'https://avatar.com/jane',
        createdAt: '2026-08-30T00:00:00.000Z',
        updatedAt: '2026-08-30T01:00:00.000Z',
      });
    });

    it('should return null if profile is not found', async () => {
      mockQueryChain.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const profile = await profileRepository.getProfile('non-existent');
      expect(profile).toBeNull();
    });

    it('should throw an AppError if supabase fails', async () => {
      mockQueryChain.maybeSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database failure' },
      });

      await expect(profileRepository.getProfile('error-user')).rejects.toThrow('Database failure');
    });
  });

  describe('updateProfile', () => {
    it('should perform update query and map the updated profile row', async () => {
      const mockUpdatedProfile = {
        id: 'user-123',
        full_name: 'Jane Smith',
        phone: '987654321',
        avatar_url: 'https://avatar.com/jane-new',
        created_at: '2026-08-30T00:00:00.000Z',
        updated_at: '2026-08-30T02:00:00.000Z',
      };

      mockQueryChain.single.mockResolvedValue({
        data: mockUpdatedProfile,
        error: null,
      });

      const profile = await profileRepository.updateProfile('user-123', {
        fullName: 'Jane Smith',
        phone: '987654321',
        avatarUrl: 'https://avatar.com/jane-new',
      });

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockQueryChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'Jane Smith',
          phone: '987654321',
          avatar_url: 'https://avatar.com/jane-new',
        })
      );
      expect(mockQueryChain.eq).toHaveBeenCalledWith('id', 'user-123');

      expect(profile).toEqual({
        id: 'user-123',
        fullName: 'Jane Smith',
        phone: '987654321',
        avatarUrl: 'https://avatar.com/jane-new',
        createdAt: '2026-08-30T00:00:00.000Z',
        updatedAt: '2026-08-30T02:00:00.000Z',
      });
    });

    it('should try inserting a new profile as fallback if update fails due to profile missing', async () => {
      // First update attempt fails with error code PGRST116 (0 rows / not found)
      mockQueryChain.single
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        })
        .mockResolvedValueOnce({
          data: {
            id: 'user-123',
            full_name: 'New User',
            phone: '5555555',
            avatar_url: null,
            created_at: '2026-08-30T00:00:00.000Z',
            updated_at: '2026-08-30T00:00:00.000Z',
          },
          error: null,
        });

      const profile = await profileRepository.updateProfile('user-123', {
        fullName: 'New User',
        phone: '5555555',
      });

      expect(mockQueryChain.update).toHaveBeenCalled();
      expect(mockQueryChain.insert).toHaveBeenCalledWith({
        id: 'user-123',
        full_name: 'New User',
        phone: '5555555',
        avatar_url: null,
      });

      expect(profile.fullName).toBe('New User');
    });

    it('should throw an AppError if both update and fallback insert fail', async () => {
      mockQueryChain.single
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Insert constraint error' },
        });

      await expect(
        profileRepository.updateProfile('user-123', {
          fullName: 'New User',
        })
      ).rejects.toThrow('Insert constraint error');
    });
  });
});
