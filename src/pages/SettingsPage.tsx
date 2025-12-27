import { useState } from 'react';
import { useSettings, useAuth } from '../contexts';
import { EmailLinkModal } from '../components/auth';
import type { Theme, FontSize, FontFamily, LineHeight } from '../types';
import './SettingsPage.css';

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
  { value: 'sepia', label: 'Сепия' },
];

const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: 'small', label: 'Маленький' },
  { value: 'medium', label: 'Средний' },
  { value: 'large', label: 'Большой' },
  { value: 'xlarge', label: 'Очень большой' },
];

const FONT_FAMILY_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: 'serif', label: 'С засечками (Georgia)' },
  { value: 'sans-serif', label: 'Без засечек (System)' },
  { value: 'monospace', label: 'Моноширинный (Fira Code)' },
];

const LINE_HEIGHT_OPTIONS: { value: LineHeight; label: string }[] = [
  { value: 'compact', label: 'Компактный' },
  { value: 'normal', label: 'Обычный' },
  { value: 'relaxed', label: 'Свободный' },
];

export default function SettingsPage() {
  const { settings, setTheme, setFontSize, setFontFamily, setLineHeight, resetSettings } = useSettings();
  const { user, status } = useAuth();
  const [showEmailModal, setShowEmailModal] = useState(false);

  const isAnonymous = status === 'anonymous' || user?.isAnonymous;
  const userEmail = user?.email;

  return (
    <div className="settings-page">
      <h1>Настройки</h1>

      <section className="settings-section">
        <h2>Аккаунт</h2>
        <div className="settings-group">
          {isAnonymous ? (
            <>
              <p className="settings-account-info">
                Вы используете анонимный аккаунт. Данные хранятся только на этом устройстве.
              </p>
              <button
                className="settings-link-email"
                onClick={() => setShowEmailModal(true)}
              >
                Привязать email
              </button>
            </>
          ) : (
            <p className="settings-account-info settings-account-info--linked">
              Email: <strong>{userEmail}</strong>
            </p>
          )}
        </div>
      </section>

      <EmailLinkModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
      />

      <section className="settings-section">
        <h2>Оформление</h2>

        <div className="settings-group">
          <label className="settings-label">Тема</label>
          <div className="settings-options">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={`settings-option ${settings.theme === option.value ? 'active' : ''}`}
                onClick={() => setTheme(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2>Чтение</h2>

        <div className="settings-group">
          <label className="settings-label">Размер шрифта</label>
          <div className="settings-options">
            {FONT_SIZE_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={`settings-option ${settings.fontSize === option.value ? 'active' : ''}`}
                onClick={() => setFontSize(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-group">
          <label className="settings-label">Шрифт</label>
          <div className="settings-options">
            {FONT_FAMILY_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={`settings-option ${settings.fontFamily === option.value ? 'active' : ''}`}
                onClick={() => setFontFamily(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-group">
          <label className="settings-label">Межстрочный интервал</label>
          <div className="settings-options">
            {LINE_HEIGHT_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={`settings-option ${settings.lineHeight === option.value ? 'active' : ''}`}
                onClick={() => setLineHeight(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <button className="settings-reset" onClick={resetSettings}>
          Сбросить настройки
        </button>
      </section>
    </div>
  );
}
