import React, { createContext, useContext, useState, useEffect } from 'react';
import { LocalStorage } from '@/utils/storage';

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
  updateProfile: (state: string, soil: string, crop: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [farmState, setFarmState] = useState('Punjab');
  const [farmSoil, setFarmSoil] = useState('Alluvial Soil (जलोढ़)');
  const [farmCrop, setFarmCrop] = useState('Wheat (गेहूं)');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAuthState() {
      try {
        const loggedIn = await LocalStorage.getItem('user_logged_in');
        const name = await LocalStorage.getItem('user_name');
        const phone = await LocalStorage.getItem('user_phone');
        const state = await LocalStorage.getItem('farm_state');
        const soil = await LocalStorage.getItem('farm_soil');
        const crop = await LocalStorage.getItem('farm_crop');

        if (loggedIn === 'true') {
          setIsAuthenticated(true);
          if (name) setUserName(name);
          if (phone) setUserPhone(phone);
          if (state) setFarmState(state);
          if (soil) setFarmSoil(soil);
          if (crop) setFarmCrop(crop);
        }
      } catch (e) {
        console.error('Failed to load auth state from local storage', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadAuthState();
  }, []);

  const login = async (phone: string, pin: string): Promise<boolean> => {
    // Simple mock authentication
    if (!phone || !pin) return false;
    
    // In a real application, you would verify these credentials with an API.
    // For demo/offline support, we check if the credentials match the registered values.
    // If no values are found, we allow it as a generic demo account or read from storage.
    const registeredPhone = await LocalStorage.getItem('registered_phone');
    const registeredPin = await LocalStorage.getItem('registered_pin');
    const name = await LocalStorage.getItem('registered_name') || 'Kisan Mitra';
    const state = await LocalStorage.getItem('registered_state') || 'Punjab';
    const soil = await LocalStorage.getItem('registered_soil') || 'Alluvial Soil (जलोढ़)';
    const crop = await LocalStorage.getItem('registered_crop') || 'Wheat (गेहूं)';

    if (registeredPhone === phone && registeredPin === pin) {
      await LocalStorage.setItem('user_logged_in', 'true');
      await LocalStorage.setItem('user_name', name);
      await LocalStorage.setItem('user_phone', phone);
      await LocalStorage.setItem('farm_state', state);
      await LocalStorage.setItem('farm_soil', soil);
      await LocalStorage.setItem('farm_crop', crop);

      setUserName(name);
      setUserPhone(phone);
      setFarmState(state);
      setFarmSoil(soil);
      setFarmCrop(crop);
      setIsAuthenticated(true);
      return true;
    } else if (!registeredPhone) {
      // If no user has registered yet, auto-register them
      await LocalStorage.setItem('registered_name', 'Kisan Mitra');
      await LocalStorage.setItem('registered_phone', phone);
      await LocalStorage.setItem('registered_pin', pin);
      await LocalStorage.setItem('registered_state', 'Punjab');
      await LocalStorage.setItem('registered_soil', 'Alluvial Soil (जलोढ़)');
      await LocalStorage.setItem('registered_crop', 'Wheat (गेहूं)');

      await LocalStorage.setItem('user_logged_in', 'true');
      await LocalStorage.setItem('user_name', 'Kisan Mitra');
      await LocalStorage.setItem('user_phone', phone);
      await LocalStorage.setItem('farm_state', 'Punjab');
      await LocalStorage.setItem('farm_soil', 'Alluvial Soil (जलोढ़)');
      await LocalStorage.setItem('farm_crop', 'Wheat (गेहूं)');

      setUserName('Kisan Mitra');
      setUserPhone(phone);
      setFarmState('Punjab');
      setFarmSoil('Alluvial Soil (जलोढ़)');
      setFarmCrop('Wheat (गेहूं)');
      setIsAuthenticated(true);
      return true;
    }

    return false;
  };

  const register = async (
    name: string,
    phone: string,
    state: string,
    soil: string,
    crop: string,
    pin: string
  ): Promise<boolean> => {
    if (!name || !phone || !state || !soil || !crop || !pin) return false;

    // Save registration credentials
    await LocalStorage.setItem('registered_name', name);
    await LocalStorage.setItem('registered_phone', phone);
    await LocalStorage.setItem('registered_pin', pin);
    await LocalStorage.setItem('registered_state', state);
    await LocalStorage.setItem('registered_soil', soil);
    await LocalStorage.setItem('registered_crop', crop);

    // Set active user state
    await LocalStorage.setItem('user_logged_in', 'true');
    await LocalStorage.setItem('user_name', name);
    await LocalStorage.setItem('user_phone', phone);
    await LocalStorage.setItem('farm_state', state);
    await LocalStorage.setItem('farm_soil', soil);
    await LocalStorage.setItem('farm_crop', crop);

    setUserName(name);
    setUserPhone(phone);
    setFarmState(state);
    setFarmSoil(soil);
    setFarmCrop(crop);
    setIsAuthenticated(true);
    return true;
  };

  const logout = async () => {
    await LocalStorage.removeItem('user_logged_in');
    await LocalStorage.removeItem('user_name');
    await LocalStorage.removeItem('user_phone');
    // We keep farm_state, farm_soil, and farm_crop in registry, but clear active login states
    setUserName('');
    setUserPhone('');
    setIsAuthenticated(false);
  };

  const updateProfile = async (state: string, soil: string, crop: string) => {
    await LocalStorage.setItem('farm_state', state);
    await LocalStorage.setItem('farm_soil', soil);
    await LocalStorage.setItem('farm_crop', crop);

    // Also update registered state if the user changes it
    await LocalStorage.setItem('registered_state', state);
    await LocalStorage.setItem('registered_soil', soil);
    await LocalStorage.setItem('registered_crop', crop);

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
