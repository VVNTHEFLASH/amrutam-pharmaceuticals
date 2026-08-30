import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { profileRepository } from '@/services/repositories/profileRepository';
import { Profile } from '@/types/domain';
import { AppError } from '@/types/errors';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (fullName: string, email: string, phone: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  const userRef = useRef<User | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const fetchAndSetProfile = async (userId: string) => {
    try {
      const userProfile = await profileRepository.getProfile(userId);
      setProfile(userProfile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let isMounted = true;

    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }: { data: { session: Session | null } }) => {
      if (!isMounted) return;
      if (initialSession) {
        setSession(initialSession);
        setUser(initialSession.user);
        userRef.current = initialSession.user;
        fetchAndSetProfile(initialSession.user.id).then(async () => {
          try {
            const { reconciliationService } = require('@/services/reconciliationService');
            await reconciliationService.reconcileUserData(initialSession.user.id);
            const { userSyncService } = require('@/services/userSyncService');
            await userSyncService.syncAll();
          } catch (resErr) {
            console.error('Error reconciling user data:', resErr);
          }
        }).finally(() => {
          if (isMounted) setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    }).catch((err: any) => {
      console.error('Error getting session:', err);
      if (isMounted) setIsLoading(false);
    });

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, newSession: Session | null) => {
      if (!isMounted) return;

      const previousUserId = userRef.current?.id;
      const newUserId = newSession?.user?.id;

      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        userRef.current = newSession.user;
      } else {
        userRef.current = null;
      }

      if (newSession?.user) {
        setIsLoading(true);

        if (previousUserId && previousUserId !== newUserId) {
          console.log(`[AuthContext] User changed from ${previousUserId} to ${newUserId}. Clearing store on session switch.`);
          try {
            const useClientStore = require('@/store/clientStore').useClientStore;
            useClientStore.setState({
              cart: [],
              wishlist: [],
              bookingQueue: [],
              wishlistQueue: [],
              cartQueue: [],
            });
            const { apiCache } = require('@/services/api/apiCache');
            await apiCache.clearAll();
          } catch (storeErr) {
            console.error('Error resetting store on user change:', storeErr);
          }
        }

        await fetchAndSetProfile(newSession.user.id);
        
        try {
          const { reconciliationService } = require('@/services/reconciliationService');
          await reconciliationService.reconcileUserData(newSession.user.id);
          const { userSyncService } = require('@/services/userSyncService');
          await userSyncService.syncAll();
        } catch (resErr) {
          console.error('Error reconciling user data:', resErr);
        }

        if (isMounted) setIsLoading(false);
      } else {
        setProfile(null);
        try {
          const useClientStore = require('@/store/clientStore').useClientStore;
          useClientStore.setState({
            cart: [],
            wishlist: [],
            bookingQueue: [],
            wishlistQueue: [],
            cartQueue: [],
          });
        } catch (storeErr) {
          console.error('Error clearing store on logout:', storeErr);
        }
        try {
          const { apiCache } = require('@/services/api/apiCache');
          apiCache.clearAll().catch((err: any) => console.error('Error clearing cache:', err));
        } catch (cacheErr) {
          console.error('Error importing apiCache on logout:', cacheErr);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new AppError('UNKNOWN_FAILURE', 'Supabase is not configured');
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw new AppError('UNKNOWN_FAILURE', error.message);
    }
  };

  const signUp = async (fullName: string, email: string, phone: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new AppError('UNKNOWN_FAILURE', 'Supabase is not configured');
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          fullName,
          full_name: fullName,
          phone,
        },
      },
    });
    if (error) {
      throw new AppError('UNKNOWN_FAILURE', error.message);
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      throw new AppError('UNKNOWN_FAILURE', 'Supabase is not configured');
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new AppError('UNKNOWN_FAILURE', error.message);
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    try {
      const { apiCache } = require('@/services/api/apiCache');
      await apiCache.clearAll();
    } catch (cacheErr) {
      console.error('Error clearing cache on explicit signOut:', cacheErr);
    }
  };

  const updateProfile = async (updates: Partial<Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>>) => {
    if (!user) {
      throw new AppError('UNKNOWN_FAILURE', 'Not authenticated');
    }
    const updated = await profileRepository.updateProfile(user.id, updates);
    setProfile(updated);
  };

  const isAuthenticated = !!session;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isAuthenticated,
        signIn,
        signUp,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
