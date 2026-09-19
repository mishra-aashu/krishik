import { supabase } from '@/lib/supabase';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { LocalStorage } from '@/utils/storage';

interface AuthContextType {
  isAuthenticated: boolean;
  userName: string;
  userPhone: string;
  userEmail: string;
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
  updateProfile: (
    name: string,
    emailOrState: string,
    stateOrSoil?: string,
    soilOrCrop?: string,
    cropParam?: string,
    langParam?: string,
    themeParam?: string,
    weatherAlerts?: boolean,
    mandiAlerts?: boolean,
    pestAlerts?: boolean,
    voiceResponse?: boolean
  ) => Promise<void>;
  resetPin: (phone: string, newPin: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userEmail, setUserEmail] = useState('');
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
    const fullProfile = {
      id: uid,
      name: profile.name || 'Kisan',
      phone: profile.phone || '',
      email: profile.email || (profile.phone ? `${profile.phone}@gmail.com` : ''),
      farm_state: profile.farm_state || farmState || 'Punjab',
      farm_soil: profile.farm_soil || farmSoil || 'Alluvial Soil (जलोढ़)',
      farm_crop: profile.farm_crop || farmCrop || 'Wheat (गेहूं)',
      preferred_language: profile.preferred_language || 'hi',
      preferred_theme: profile.preferred_theme || 'light',
      weather_alerts: profile.weather_alerts ?? true,
      mandi_alerts: profile.mandi_alerts ?? true,
      pest_alerts: profile.pest_alerts ?? true,
      voice_response: profile.voice_response ?? false,
    };
    setUserId(uid);
    setUserName(fullProfile.name);
    setUserPhone(fullProfile.phone);
    setUserEmail(fullProfile.email);
    setFarmState(fullProfile.farm_state);
    setFarmSoil(fullProfile.farm_soil);
    setFarmCrop(fullProfile.farm_crop);
    setIsAuthenticated(true);

    // Persist alert settings to LocalStorage for Settings screen
    LocalStorage.setItem('weather_alerts', String(fullProfile.weather_alerts));
    LocalStorage.setItem('mandi_alerts', String(fullProfile.mandi_alerts));
    LocalStorage.setItem('pest_alerts', String(fullProfile.pest_alerts));
    LocalStorage.setItem('voice_response', String(fullProfile.voice_response));

    // Save session to LocalStorage for persistent auto-login
    LocalStorage.setItem('krishik_saved_user_profile', JSON.stringify(fullProfile));
  };

  const clearState = () => {
    setUserId('');
    setUserName('');
    setUserPhone('');
    setUserEmail('');
    setIsAuthenticated(false);

    // Clear saved session on explicit logout
    LocalStorage.removeItem('krishik_saved_user_profile');
  };

  // ── restore session on app start ───────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        // 1. Try restoring from Supabase Auth Session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          const profile = await loadProfile(session.user.id);
          if (profile) {
            applyProfile(session.user.id, profile);
            if (mounted) setIsLoading(false);
            return;
          }
        }

        // 2. Try restoring from LocalStorage saved profile fallback
        const savedStr = await LocalStorage.getItem('krishik_saved_user_profile');
        if (savedStr && mounted) {
          const savedProfile = JSON.parse(savedStr);
          if (savedProfile && savedProfile.phone && savedProfile.name) {
            setUserId(savedProfile.id || `user-${savedProfile.phone}`);
            setUserName(savedProfile.name);
            setUserPhone(savedProfile.phone);
            setUserEmail(savedProfile.email || `${savedProfile.phone}@gmail.com`);
            setFarmState(savedProfile.farm_state || 'Punjab');
            setFarmSoil(savedProfile.farm_soil || 'Alluvial Soil (जलोढ़)');
            setFarmCrop(savedProfile.farm_crop || 'Wheat (गेहूं)');
            setIsAuthenticated(true);
          }
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

      // Establish Auth Session with Supabase GoTrue
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password: pin,
      });

      if (authErr || !authData?.user) {
        console.warn('signInWithPassword error:', authErr?.message);
        return false;
      }

      const activeUid = authData.user.id;
      const profile = await loadProfile(activeUid);
      if (profile) {
        applyProfile(activeUid, profile);
      } else {
        applyProfile(activeUid, {
          name: authData.user.user_metadata?.name || `Farmer ${cleanedPhone.slice(-4)}`,
          phone: cleanedPhone,
          farm_state: authData.user.user_metadata?.farm_state || farmState,
          farm_soil: authData.user.user_metadata?.farm_soil || farmSoil,
          farm_crop: authData.user.user_metadata?.farm_crop || farmCrop,
        });
      }
      return true;
    } catch (e) {
      console.warn('Login exception:', e);
      return false;
    }
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

      // 1. Sync user profile to Supabase public.profiles & auth.users via RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc('sync_user_profile', {
        p_name: name.trim(),
        p_phone: cleanedPhone,
        p_state: state,
        p_soil: soil,
        p_crop: crop,
        p_pin: pin,
      });

      if (rpcError) {
        console.warn('sync_user_profile notice:', rpcError.message);
      }

      // 2. Establish Auth Session
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password: pin,
      });

      const activeUid = authData?.user?.id || rpcData?.id;

      if (activeUid) {
        applyProfile(activeUid, {
          name: name.trim(),
          phone: cleanedPhone,
          farm_state: state,
          farm_soil: soil,
          farm_crop: crop,
        });
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Register exception:', e);
      return false;
    }
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
    emailOrState: string,
    stateOrSoil?: string,
    soilOrCrop?: string,
    cropParam?: string,
    langParam?: string,
    themeParam?: string,
    weatherAlertsParam?: boolean,
    mandiAlertsParam?: boolean,
    pestAlertsParam?: boolean,
    voiceResponseParam?: boolean
  ) => {
    if (!userPhone) return;

    let emailVal = userEmail || `${userPhone}@gmail.com`;
    let stateVal = farmState;
    let soilVal = farmSoil;
    let cropVal = farmCrop;

    if (cropParam !== undefined) {
      emailVal = emailOrState ? emailOrState.trim() : emailVal;
      stateVal = stateOrSoil || farmState;
      soilVal = soilOrCrop || farmSoil;
      cropVal = cropParam || farmCrop;
    } else {
      stateVal = emailOrState || farmState;
      soilVal = stateOrSoil || farmSoil;
      cropVal = soilOrCrop || farmCrop;
    }

    const savedLang = langParam || (await LocalStorage.getItem('chat_lang')) || 'hi';
    const savedTheme = themeParam || (await LocalStorage.getItem('app_theme')) || 'light';
    const weatherVal = weatherAlertsParam ?? true;
    const mandiVal = mandiAlertsParam ?? true;
    const pestVal = pestAlertsParam ?? true;
    const voiceVal = voiceResponseParam ?? false;

    try {
      if (userPhone !== '9999999999') {
        await supabase.rpc('sync_user_profile', {
          p_name: name.trim(),
          p_phone: userPhone,
          p_state: stateVal,
          p_soil: soilVal,
          p_crop: cropVal,
          p_email: emailVal,
          p_language: savedLang,
          p_theme: savedTheme,
          p_weather_alerts: weatherVal,
          p_mandi_alerts: mandiVal,
          p_pest_alerts: pestVal,
          p_voice_response: voiceVal,
        });
      }
    } catch (e) {
      console.warn('updateProfile exception:', e);
    }

    // Persist alert settings locally
    LocalStorage.setItem('weather_alerts', String(weatherVal));
    LocalStorage.setItem('mandi_alerts', String(mandiVal));
    LocalStorage.setItem('pest_alerts', String(pestVal));
    LocalStorage.setItem('voice_response', String(voiceVal));

    setUserName(name.trim());
    setUserEmail(emailVal);
    setFarmState(stateVal);
    setFarmSoil(soilVal);
    setFarmCrop(cropVal);
  };

  const resetPin = async (phone: string, newPin: string): Promise<boolean> => {
    if (!phone || !newPin) return false;
    const cleanedPhone = phone.trim();
    try {
      const { data, error } = await supabase.rpc('reset_user_pin', {
        p_phone: cleanedPhone,
        p_new_pin: newPin,
      });
      if (error) {
        console.warn('Supabase resetPin RPC notice:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('resetPin exception:', e);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userName,
        userPhone,
        userEmail,
        farmState,
        farmSoil,
        farmCrop,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        resetPin,
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
