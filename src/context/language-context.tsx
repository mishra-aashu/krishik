import React, { createContext, useContext, useState, useEffect } from 'react';
import { LocalStorage } from '@/utils/storage';
import { LanguageSelectionModal } from '@/components/language-selection-modal';

export type Language = 'hi' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  showLanguageModal: () => void;
  hideLanguageModal: () => void;
  isHi: boolean;
  isLanguageModalOpen: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('hi');
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState<boolean>(false);

  useEffect(() => {
    async function initLanguage() {
      try {
        const savedLang = (await LocalStorage.getItem('app_language')) || (await LocalStorage.getItem('chat_lang'));
        const hasChosen = await LocalStorage.getItem('has_chosen_language');

        if (savedLang === 'hi' || savedLang === 'en') {
          setLanguageState(savedLang);
        } else {
          setLanguageState('hi');
        }

        // If user has never selected a language on startup, prompt the modal popup
        if (hasChosen !== 'true') {
          // Small 300ms delay to allow UI to mount smoothly
          setTimeout(() => {
            setIsLanguageModalOpen(true);
          }, 300);
        }
      } catch (err) {
        console.warn('Language initialization notice:', err);
      }
    }
    initLanguage();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await LocalStorage.setItem('app_language', lang);
    await LocalStorage.setItem('chat_lang', lang);
    await LocalStorage.setItem('has_chosen_language', 'true');
  };

  const toggleLanguage = async () => {
    const nextLang = language === 'hi' ? 'en' : 'hi';
    await setLanguage(nextLang);
  };

  const handleSelectLanguageFromModal = async (selectedLang: Language) => {
    await setLanguage(selectedLang);
    setIsLanguageModalOpen(false);
  };

  const showLanguageModal = () => setIsLanguageModalOpen(true);
  const hideLanguageModal = () => setIsLanguageModalOpen(false);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        showLanguageModal,
        hideLanguageModal,
        isHi: language === 'hi',
        isLanguageModalOpen,
      }}
    >
      {children}
      <LanguageSelectionModal
        visible={isLanguageModalOpen}
        onSelectLanguage={handleSelectLanguageFromModal}
        currentLanguage={language}
      />
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
