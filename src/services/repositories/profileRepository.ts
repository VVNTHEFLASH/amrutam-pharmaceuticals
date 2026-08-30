import { Profile } from '@/types/domain';
import { AppError } from '@/types/errors';
import { supabase, isSupabaseConfigured } from '../supabase';
import { apiClient } from '../api/apiClient';
import { apiCache } from '../api/apiCache';

function mapDbProfile(row: any): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const profileRepository = {
  async getProfile(userId: string): Promise<Profile | null> {
    if (!isSupabaseConfigured) {
      throw new AppError('UNKNOWN_FAILURE', 'Supabase is not configured');
    }

    const cacheKey = `profile?id=${userId}`;
    try {
      return await apiClient.execute(cacheKey, async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          throw new AppError('UNKNOWN_FAILURE', error.message);
        }
        if (!data) return null;

        return mapDbProfile(data);
      });
    } catch (error: any) {
      if (error instanceof AppError && error.message.includes('Empty response')) {
        return null;
      }
      throw error;
    }
  },

  async updateProfile(
    userId: string,
    updates: Partial<Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Profile> {
    if (!isSupabaseConfigured) {
      throw new AppError('UNKNOWN_FAILURE', 'Supabase is not configured');
    }

    const cacheKey = `profile?id=${userId}`;
    const dbUpdates: any = {};
    if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
    dbUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', userId)
      .select()
      .single();

    let resultProfile: Profile;

    if (error) {
      // If profile doesn't exist, try inserting it (fallback flow)
      if (error.code === 'PGRST116' || error.message.includes('0 rows')) {
        const newDbProfile = {
          id: userId,
          full_name: updates.fullName || null,
          phone: updates.phone || null,
          avatar_url: updates.avatarUrl || null,
        };
        const { data: insData, error: insError } = await supabase
          .from('profiles')
          .insert(newDbProfile)
          .select()
          .single();
        if (insError) {
          throw new AppError('UNKNOWN_FAILURE', insError.message);
        }
        resultProfile = mapDbProfile(insData);
      } else {
        throw new AppError('UNKNOWN_FAILURE', error.message);
      }
    } else {
      resultProfile = mapDbProfile(data);
    }

    // Update in cache to sync reads
    await apiCache.set(cacheKey, resultProfile);
    return resultProfile;
  },
};

