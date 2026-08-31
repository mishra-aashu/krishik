import React, { createContext, useContext, useState, useEffect } from 'react';
import { LocalStorage } from '@/utils/storage';

export type Language = 'hi' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  isHi: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('hi');

  useEffect(() => {
    async function loadSavedLanguage() {
      const savedLang = await LocalStorage.getItem('app_language');
      if (savedLang === 'hi' || savedLang === 'en') {
        setLanguageState(savedLang);
      }
    }
    loadSavedLanguage();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await LocalStorage.setItem('app_language', lang);
  };

  const toggleLanguage = async () => {
    const nextLang = language === 'hi' ? 'en' : 'hi';
    await setLanguage(nextLang);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        isHi: language === 'hi',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
