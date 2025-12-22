export type AuthStatus = 'anonymous' | 'authenticated' | 'loading';

export type Theme = 'light' | 'dark' | 'sepia';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
export type FontFamily = 'serif' | 'sans-serif' | 'monospace';
export type LineHeight = 'compact' | 'normal' | 'relaxed';

export interface UserSettings {
  theme: Theme;
  fontSize: FontSize;
  fontFamily: FontFamily;
  lineHeight: LineHeight;
}

export interface UserProfile {
  uid: string;
  isAnonymous: boolean;
  email?: string;
  createdAt: Date;
  settings: UserSettings;
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  fontSize: 'medium',
  fontFamily: 'serif',
  lineHeight: 'normal',
};
