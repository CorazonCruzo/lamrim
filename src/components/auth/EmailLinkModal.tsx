import { useState } from 'react';
import { useAuth } from '../../contexts';
import './EmailLinkModal.css';

interface EmailLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'input' | 'sent' | 'error';

export function EmailLinkModal({ isOpen, onClose }: EmailLinkModalProps) {
  const { sendEmailLink } = useAuth();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      await sendEmailLink(email.trim());
      setStep('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить письмо');
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setStep('input');
    setError('');
    onClose();
  };

  return (
    <div className="email-modal__overlay" onClick={handleClose}>
      <div className="email-modal" onClick={(e) => e.stopPropagation()}>
        {step === 'input' && (
          <>
            <h3 className="email-modal__title">Привязать email</h3>
            <p className="email-modal__description">
              Введите email для синхронизации данных между устройствами.
              Мы отправим вам ссылку для входа.
            </p>
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                className="email-modal__input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
              <div className="email-modal__actions">
                <button
                  type="button"
                  className="email-modal__btn email-modal__btn--cancel"
                  onClick={handleClose}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="email-modal__btn email-modal__btn--submit"
                  disabled={isLoading || !email.trim()}
                >
                  {isLoading ? 'Отправка...' : 'Отправить ссылку'}
                </button>
              </div>
            </form>
          </>
        )}

        {step === 'sent' && (
          <>
            <h3 className="email-modal__title">Письмо отправлено</h3>
            <p className="email-modal__description">
              Мы отправили ссылку на <strong>{email}</strong>.
              Перейдите по ней для завершения привязки.
            </p>
            <div className="email-modal__actions">
              <button
                className="email-modal__btn email-modal__btn--submit"
                onClick={handleClose}
              >
                Понятно
              </button>
            </div>
          </>
        )}

        {step === 'error' && (
          <>
            <h3 className="email-modal__title">Ошибка</h3>
            <p className="email-modal__description email-modal__description--error">
              {error}
            </p>
            <div className="email-modal__actions">
              <button
                className="email-modal__btn email-modal__btn--cancel"
                onClick={handleClose}
              >
                Закрыть
              </button>
              <button
                className="email-modal__btn email-modal__btn--submit"
                onClick={() => setStep('input')}
              >
                Попробовать снова
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
