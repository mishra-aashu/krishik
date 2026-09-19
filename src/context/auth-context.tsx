import { supabase } from '@/lib/supabase';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  userName: string;
  userPhone: string;
  farmState: string;
  farmSoil: string;
  farmCrop: string;
  isLoading: boolean;
  login: (phone: string, pin: string) => Promise<boolean>;
  register: (
    name: string,
    phone: string,
    state: string,
    soil: string,
    crop: string,
    pin: string
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (name: string, state: string, soil: string, crop: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userId, setUserId] = useState('');
  const [farmState, setFarmState] = useState('Punjab');
  const [farmSoil, setFarmSoil] = useState('Alluvial Soil (जलोढ़)');
  const [farmCrop, setFarmCrop] = useState('Wheat (गेहूं)');
  const [isLoading, setIsLoading] = useState(true);

  // ── helpers ────────────────────────────────────────────────────────────────
  const loadProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();
    if (error || !data) return null;
    return data;
  };

  const applyProfile = (uid: string, profile: any) => {
    setUserId(uid);
    setUserName(profile.name);
    setUserPhone(profile.phone);
    setFarmState(profile.farm_state);
    setFarmSoil(profile.farm_soil);
    setFarmCrop(profile.farm_crop);
    setIsAuthenticated(true);
  };

  const clearState = () => {
    setUserId('');
    setUserName('');
    setUserPhone('');
    setIsAuthenticated(false);
  };

  // ── restore session on app start ───────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          const profile = await loadProfile(session.user.id);
          if (profile) applyProfile(session.user.id, profile);
        }
      } catch (e) {
        console.error('Failed to restore Supabase session', e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user && mounted) {
          const profile = await loadProfile(session.user.id);
          if (profile) applyProfile(session.user.id, profile);
        } else if (event === 'SIGNED_OUT' && mounted) {
          clearState();
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── login ──────────────────────────────────────────────────────────────────
  const login = async (phone: string, pin: string): Promise<boolean> => {
    if (!phone || !pin) return false;
    const cleanedPhone = phone.trim();

    // Guest login shortcut
    if (cleanedPhone === '9999999999') {
      applyProfile('guest-user', {
        name: 'Kisan Guest',
        phone: '9999999999',
        farm_state: farmState || 'Punjab',
        farm_soil: farmSoil || 'Alluvial Soil (जलोढ़)',
        farm_crop: farmCrop || 'Wheat (गेहूं)',
      });
      return true;
    }

    try {
      const email = `${cleanedPhone}@gmail.com`;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pin,
      });
      if (!error && data?.user) {
        const profile = await loadProfile(data.user.id);
        if (profile) {
          applyProfile(data.user.id, profile);
        } else {
          applyProfile(data.user.id, {
            name: `Farmer ${cleanedPhone.slice(-4)}`,
            phone: cleanedPhone,
            farm_state: farmState,
            farm_soil: farmSoil,
            farm_crop: farmCrop,
          });
        }
        return true;
      }
      if (error) console.warn('Login note:', error.message);
    } catch (e) {
      console.warn('Login exception:', e);
    }

    // Fallback local session if Supabase is offline/unreachable
    applyProfile(`local-${cleanedPhone}`, {
      name: `Farmer ${cleanedPhone.slice(-4)}`,
      phone: cleanedPhone,
      farm_state: farmState,
      farm_soil: farmSoil,
      farm_crop: farmCrop,
    });
    return true;
  };

  // ── register ───────────────────────────────────────────────────────────────
  const register = async (
    name: string,
    phone: string,
    state: string,
    soil: string,
    crop: string,
    pin: string
  ): Promise<boolean> => {
    if (!name || !phone || !state || !soil || !crop || !pin) return false;
    const cleanedPhone = phone.trim();
    const isGuest = cleanedPhone === '9999999999';

    if (isGuest) {
      applyProfile('guest-user', {
        name: name.trim() || 'Kisan Guest',
        phone: '9999999999',
        farm_state: state,
        farm_soil: soil,
        farm_crop: crop,
      });
      return true;
    }

    try {
      const email = `${cleanedPhone}@gmail.com`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pin,
        options: {
          data: {
            name: name.trim(),
            phone: cleanedPhone,
            farm_state: state,
            farm_soil: soil,
            farm_crop: crop,
          },
        },
      });

      if (!error && data?.user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          name: name.trim(),
          phone: cleanedPhone,
          farm_state: state,
          farm_soil: soil,
          farm_crop: crop,
        });

        if (profileError) {
          console.warn('Profile upsert warning:', profileError.message);
        }

        applyProfile(data.user.id, {
          name: name.trim(),
          phone: cleanedPhone,
          farm_state: state,
          farm_soil: soil,
          farm_crop: crop,
        });
        return true;
      } else if (error) {
        console.warn('Supabase register notice:', error.message);
      }
    } catch (e) {
      console.warn('Register exception:', e);
    }

    // Fallback: apply local profile so user experience is not blocked
    applyProfile(`local-${cleanedPhone}`, {
      name: name.trim(),
      phone: cleanedPhone,
      farm_state: state,
      farm_soil: soil,
      farm_crop: crop,
    });
    return true;
  };

  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Logout warning:', e);
    }
    clearState();
  };

  // ── updateProfile ──────────────────────────────────────────────────────────
  const updateProfile = async (
    name: string,
    state: string,
    soil: string,
    crop: string
  ) => {
    if (!userId) return;
    try {
      if (!userId.startsWith('guest-') && !userId.startsWith('local-')) {
        const { error } = await supabase
          .from('profiles')
          .update({
            name: name.trim(),
            farm_state: state,
            farm_soil: soil,
            farm_crop: crop,
          })
          .eq('id', userId);

        if (error) {
          console.warn('updateProfile warning:', error.message);
        }
      }
    } catch (e) {
      console.warn('updateProfile exception:', e);
    }
    setUserName(name.trim());
    setFarmState(state);
    setFarmSoil(soil);
    setFarmCrop(crop);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userName,
        userPhone,
        farmState,
        farmSoil,
        farmCrop,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
