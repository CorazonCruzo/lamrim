import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type UserSettings, type Theme, type FontSize, type FontFamily, type LineHeight, DEFAULT_SETTINGS } from '../types';

interface SettingsContextType {
  settings: UserSettings;
  setTheme: (theme: Theme) => void;
  setFontSize: (fontSize: FontSize) => void;
  setFontFamily: (fontFamily: FontFamily) => void;
  setLineHeight: (lineHeight: LineHeight) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

const STORAGE_KEY = 'lamrim-settings';

function loadSettings(): UserSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(loadSettings);

  // Применяем настройки к документу
  useEffect(() => {
    const root = document.documentElement;

    // Тема
    root.setAttribute('data-theme', settings.theme);

    // Размер шрифта
    root.setAttribute('data-font-size', settings.fontSize);

    // Семейство шрифтов
    root.setAttribute('data-font-family', settings.fontFamily);

    // Межстрочный интервал
    root.setAttribute('data-line-height', settings.lineHeight);

    // Сохраняем в localStorage
    saveSettings(settings);
  }, [settings]);

  const setTheme = (theme: Theme) => {
    setSettings(prev => ({ ...prev, theme }));
  };

  const setFontSize = (fontSize: FontSize) => {
    setSettings(prev => ({ ...prev, fontSize }));
  };

  const setFontFamily = (fontFamily: FontFamily) => {
    setSettings(prev => ({ ...prev, fontFamily }));
  };

  const setLineHeight = (lineHeight: LineHeight) => {
    setSettings(prev => ({ ...prev, lineHeight }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        setTheme,
        setFontSize,
        setFontFamily,
        setLineHeight,
        resetSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
