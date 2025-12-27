import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts';
import './EmailLinkHandler.css';

export function EmailLinkHandler() {
  const { checkPendingEmailLink, getStoredEmail, completeEmailSignIn, linkEmail, user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [needsEmail, setNeedsEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSignIn = useCallback(async (emailToUse: string) => {
    setIsProcessing(true);
    setError('');

    try {
      if (user?.isAnonymous) {
        await linkEmail(emailToUse);
      } else {
        await completeEmailSignIn(emailToUse);
      }
      setNeedsEmail(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка входа';
      setError(message);
      setIsProcessing(false);
    }
  }, [user, linkEmail, completeEmailSignIn]);

  useEffect(() => {
    if (!checkPendingEmailLink()) return;

    const storedEmail = getStoredEmail();
    if (storedEmail) {
      handleSignIn(storedEmail);
    } else {
      setNeedsEmail(true);
    }
  }, [checkPendingEmailLink, getStoredEmail, handleSignIn]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      handleSignIn(email.trim());
    }
  };

  if (!needsEmail && !isProcessing) return null;

  return (
    <div className="email-handler__overlay">
      <div className="email-handler">
        {isProcessing ? (
          <>
            <h3 className="email-handler__title">Выполняется вход...</h3>
            <p className="email-handler__description">Подождите, пожалуйста</p>
          </>
        ) : (
          <>
            <h3 className="email-handler__title">Подтверждение email</h3>
            <p className="email-handler__description">
              Введите email, на который была отправлена ссылка
            </p>
            {error && <p className="email-handler__error">{error}</p>}
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                className="email-handler__input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
              <button
                type="submit"
                className="email-handler__btn"
                disabled={!email.trim()}
              >
                Войти
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
