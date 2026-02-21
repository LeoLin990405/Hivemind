import { ConfigStorage } from '@/common/storage';
import loginLogo from '@renderer/assets/logos/app.png';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import AppLoader from '../../components/AppLoader';
import { useAuth } from '../../context/AuthContext';
import './LoginPage.css';

type MessageState = {
  type: 'error' | 'success';
  text: string;
};

type FieldErrors = {
  username: string | null;
  password: string | null;
  confirmPassword: string | null;
};

type TouchedFields = {
  username: boolean;
  password: boolean;
  confirmPassword: boolean;
};

type FormData = {
  username: string;
  password: string;
  confirmPassword: string;
};

const REMEMBER_ME_KEY = 'rememberMe';
const REMEMBERED_USERNAME_KEY = 'rememberedUsername';
const REMEMBERED_PASSWORD_KEY = 'rememberedPassword';

// Simple obfuscation for stored credentials (not cryptographically secure, but prevents plain text storage)
const obfuscate = (text: string): string => {
  const encoded = btoa(encodeURIComponent(text));
  return encoded.split('').reverse().join('');
};

const deobfuscate = (text: string): string => {
  try {
    const reversed = text.split('').reverse().join('');
    return decodeURIComponent(atob(reversed));
  } catch {
    return '';
  }
};

const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { status, login, register } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    username: null,
    password: null,
    confirmPassword: null,
  });
  const [touched, setTouched] = useState<TouchedFields>({
    username: false,
    password: false,
    confirmPassword: false,
  });

  const usernameRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const messageTimer = useRef<number | undefined>(undefined);

  // Validation function
  const validateField = useCallback(
    (name: keyof FormData, value: string): string | null => {
      const trimmedValue = value.trim();

      switch (name) {
        case 'username':
          if (!trimmedValue) {
            return t('login.errors.usernameRequired');
          }
          if (trimmedValue.length < 2) {
            return t('login.errors.usernameTooShort');
          }
          return null;

        case 'password':
          if (!value) {
            return t('login.errors.passwordRequired');
          }
          if (value.length < 4) {
            return t('login.errors.passwordTooShort');
          }
          return null;

        case 'confirmPassword':
          if (authMode !== 'register') {
            return null;
          }
          if (!value) {
            return 'Please confirm your password';
          }
          if (value !== formData.password) {
            return 'Passwords do not match';
          }
          return null;

        default:
          return null;
      }
    },
    [authMode, formData.password, t]
  );

  // Validate all fields
  const validateForm = useCallback((): boolean => {
    const errors: FieldErrors = {
      username: validateField('username', formData.username),
      password: validateField('password', formData.password),
      confirmPassword: validateField('confirmPassword', formData.confirmPassword),
    };
    setFieldErrors(errors);

    // Mark all fields as touched
    setTouched({
      username: true,
      password: true,
      confirmPassword: authMode === 'register',
    });

    return !errors.username && !errors.password && (authMode !== 'register' || !errors.confirmPassword);
  }, [authMode, formData, validateField]);

  // Handle field change
  const handleFieldChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = event.target;
      const fieldName = name as keyof FormData;

      setFormData((prev) => ({
        ...prev,
        [fieldName]: value,
      }));

      // Clear error when user starts typing
      if (fieldErrors[fieldName]) {
        setFieldErrors((prev) => ({
          ...prev,
          [fieldName]: null,
        }));
      }
    },
    [fieldErrors]
  );

  // Handle field blur for validation
  const handleFieldBlur = useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      const { name, value } = event.target;
      const fieldName = name as keyof FormData;

      setTouched((prev) => ({
        ...prev,
        [fieldName]: true,
      }));

      const error = validateField(fieldName, value);
      setFieldErrors((prev) => ({
        ...prev,
        [fieldName]: error,
      }));
    },
    [validateField]
  );

  // Show field error if touched and has error
  const getFieldError = useCallback(
    (fieldName: keyof FormData): string | null => {
      return touched[fieldName] ? fieldErrors[fieldName] : null;
    },
    [touched, fieldErrors]
  );

  // Get input class based on error state
  const getInputClassName = useCallback(
    (fieldName: keyof FormData): string => {
      const error = getFieldError(fieldName);
      return `login-page__input${error ? ' login-page__input--error' : ''}`;
    },
    [getFieldError]
  );

  useEffect(() => {
    document.body.classList.add('login-page-active');
    return () => {
      document.body.classList.remove('login-page-active');
      if (messageTimer.current) {
        window.clearTimeout(messageTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    document.title = t('login.pageTitle');
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  useEffect(() => {
    const isRememberMe = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
    if (isRememberMe) {
      const storedUsername = localStorage.getItem(REMEMBERED_USERNAME_KEY);
      const storedPassword = localStorage.getItem(REMEMBERED_PASSWORD_KEY);
      if (storedUsername) {
        setFormData((prev) => ({
          ...prev,
          username: deobfuscate(storedUsername),
        }));
      }
      if (storedPassword) {
        setFormData((prev) => ({
          ...prev,
          password: deobfuscate(storedPassword),
        }));
      }
      setRememberMe(true);
    }
    window.setTimeout(() => {
      usernameRef.current?.focus();
    }, 0);

    return () => {
      if (messageTimer.current) {
        window.clearTimeout(messageTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      void navigate('/guid', { replace: true });
    }
  }, [navigate, status]);

  const clearMessageLater = useCallback(() => {
    if (messageTimer.current) {
      window.clearTimeout(messageTimer.current);
    }
    messageTimer.current = window.setTimeout(() => {
      setMessage((prev) => (prev?.type === 'success' ? prev : null));
    }, 5000);
  }, []);

  const showMessage = useCallback(
    (next: MessageState) => {
      setMessage(next);
      if (next.type === 'error') {
        clearMessageLater();
      }
    },
    [clearMessageLater]
  );

  const supportedLanguages = useMemo<{ code: string; label: string }[]>(
    () => [
      { code: 'zh-CN', label: '简体中文' },
      { code: 'zh-TW', label: '繁體中文' },
      { code: 'ja-JP', label: '日本語' },
      { code: 'ko-KR', label: '한국어' },
      { code: 'tr-TR', label: 'Türkçe' },
      { code: 'en-US', label: 'English' },
    ],
    []
  );

  const handleLanguageChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const nextLanguage = event.target.value;
      i18n.changeLanguage(nextLanguage).catch((error: Error) => {
        console.error('Failed to change language:', error);
      });
      ConfigStorage.set('language', nextLanguage).catch((error: Error) => {
        console.error('Failed to persist language preference:', error);
      });
    },
    [i18n]
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      // Validate form before submission
      if (!validateForm()) {
        showMessage({ type: 'error', text: t('login.errors.empty') });
        // Focus on first field with error
        if (fieldErrors.username) {
          usernameRef.current?.focus();
        } else if (fieldErrors.password) {
          passwordRef.current?.focus();
        }
        return;
      }

      const trimmedUsername = formData.username.trim();

      setLoading(true);
      setMessage(null);

      if (authMode === 'register') {
        const registerResult = await register({
          username: trimmedUsername,
          password: formData.password,
        });

        if (registerResult.success) {
          showMessage({ type: 'success', text: 'Account created successfully' });
          window.setTimeout(() => {
            void navigate('/guid', { replace: true });
          }, 600);
        } else {
          const registerErrorText = (() => {
            switch (registerResult.code) {
              case 'usernameTaken':
                return 'Username already exists';
              case 'validationError':
                return registerResult.message ?? 'Invalid username or password';
              case 'networkError':
                return t('login.errors.networkError');
              case 'serverError':
                return t('login.errors.serverError');
              case 'unknown':
              default:
                return registerResult.message ?? t('login.errors.unknown');
            }
          })();

          showMessage({ type: 'error', text: registerErrorText });
        }
      } else {
        const result = await login({
          username: trimmedUsername,
          password: formData.password,
          remember: rememberMe,
        });

        if (result.success) {
          if (rememberMe) {
            localStorage.setItem(REMEMBER_ME_KEY, 'true');
            localStorage.setItem(REMEMBERED_USERNAME_KEY, obfuscate(trimmedUsername));
            localStorage.setItem(REMEMBERED_PASSWORD_KEY, obfuscate(formData.password));
          } else {
            localStorage.removeItem(REMEMBER_ME_KEY);
            localStorage.removeItem(REMEMBERED_USERNAME_KEY);
            localStorage.removeItem(REMEMBERED_PASSWORD_KEY);
          }

          const successText = t('login.success');
          showMessage({ type: 'success', text: successText });

          window.setTimeout(() => {
            void navigate('/guid', { replace: true });
          }, 600);
        } else {
          const errorText = (() => {
            switch (result.code) {
              case 'invalidCredentials':
                return t('login.errors.invalidCredentials');
              case 'tooManyAttempts':
                return t('login.errors.tooManyAttempts');
              case 'networkError':
                return t('login.errors.networkError');
              case 'serverError':
                return t('login.errors.serverError');
              case 'unknown':
              default:
                return result.message ?? t('login.errors.unknown');
            }
          })();

          showMessage({ type: 'error', text: errorText });
        }
      }

      setLoading(false);
    },
    [validateForm, fieldErrors.password, fieldErrors.username, formData.password, formData.username, login, authMode, navigate, register, rememberMe, showMessage, t]
  );

  if (status === 'checking') {
    return <AppLoader />;
  }

  const usernameError = getFieldError('username');
  const passwordError = getFieldError('password');

  return (
    <div className='login-page'>
      {/* <div className='login-page__background' aria-hidden='true'>
        <div className='login-page__background-circle login-page__background-circle--lg' />
        <div className='login-page__background-circle login-page__background-circle--md' />
        <div className='login-page__background-circle login-page__background-circle--sm' />
      </div> */}

      <div className='login-page__card'>
        <label className='login-page__lang-select-wrapper' htmlFor='lang-select'>
          <select id='lang-select' className='login-page__lang-select' value={i18n.language} onChange={handleLanguageChange}>
            {supportedLanguages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </label>

        <div className='login-page__header'>
          <div className='login-page__logo'>
            <img src={loginLogo} alt={t('login.brand')} />
          </div>
          <h1 className='login-page__title'>{t('login.brand')}</h1>
          <p className='login-page__subtitle'>{t('login.subtitle')}</p>
        </div>

        <form className='login-page__form' onSubmit={handleSubmit} noValidate>
          <div className='login-page__form-item'>
            <label className='login-page__label' htmlFor='username'>
              {t('login.username')}
            </label>
            <div className='login-page__input-wrapper'>
              <svg className='login-page__input-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
                <path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' />
                <circle cx='12' cy='7' r='4' />
              </svg>
              <input ref={usernameRef} id='username' name='username' className={getInputClassName('username')} placeholder={t('login.usernamePlaceholder')} autoComplete='username' value={formData.username} onChange={handleFieldChange} onBlur={handleFieldBlur} aria-required='true' aria-invalid={usernameError ? 'true' : 'false'} aria-describedby={usernameError ? 'username-error' : undefined} />
            </div>
            {usernameError && (
              <p id='username-error' className='login-page__field-error' role='alert'>
                {usernameError}
              </p>
            )}
          </div>

          <div className='login-page__form-item'>
            <label className='login-page__label' htmlFor='password'>
              {t('login.password')}
            </label>
            <div className='login-page__input-wrapper'>
              <svg className='login-page__input-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
                <rect x='3' y='11' width='18' height='11' rx='2' ry='2' />
                <path d='M7 11V7a5 5 0 0 1 10 0v4' />
              </svg>
              <input ref={passwordRef} id='password' name='password' type={passwordVisible ? 'text' : 'password'} className={getInputClassName('password')} placeholder={t('login.passwordPlaceholder')} autoComplete='current-password' value={formData.password} onChange={handleFieldChange} onBlur={handleFieldBlur} aria-required='true' aria-invalid={passwordError ? 'true' : 'false'} aria-describedby={passwordError ? 'password-error' : undefined} />
              <button type='button' className='login-page__toggle-password' onClick={() => setPasswordVisible((prev) => !prev)} aria-label={passwordVisible ? t('login.hidePassword') : t('login.showPassword')}>
                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                  {passwordVisible ? (
                    <>
                      <path d='M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24' />
                      <line x1='1' y1='1' x2='23' y2='23' />
                    </>
                  ) : (
                    <>
                      <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
                      <circle cx='12' cy='12' r='3' />
                    </>
                  )}
                </svg>
              </button>
            </div>
            {passwordError && (
              <p id='password-error' className='login-page__field-error' role='alert'>
                {passwordError}
              </p>
            )}
          </div>

          {authMode === 'login' && (
            <div className='login-page__checkbox'>
              <input type='checkbox' id='remember-me' checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
              <label htmlFor='remember-me'>{t('login.rememberMe')}</label>
            </div>
          )}

          {authMode === 'register' && (
            <div className='login-page__form-item'>
              <label className='login-page__label' htmlFor='confirmPassword'>
                Confirm Password
              </label>
              <div className='login-page__input-wrapper'>
                <svg className='login-page__input-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
                  <rect x='3' y='11' width='18' height='11' rx='2' ry='2' />
                  <path d='M7 11V7a5 5 0 0 1 10 0v4' />
                </svg>
                <input id='confirmPassword' name='confirmPassword' type={passwordVisible ? 'text' : 'password'} className={getInputClassName('confirmPassword')} placeholder='Repeat your password' autoComplete='new-password' value={formData.confirmPassword} onChange={handleFieldChange} onBlur={handleFieldBlur} aria-required='true' aria-invalid={getFieldError('confirmPassword') ? 'true' : 'false'} aria-describedby={getFieldError('confirmPassword') ? 'confirmPassword-error' : undefined} />
              </div>
              {getFieldError('confirmPassword') && (
                <p id='confirmPassword-error' className='login-page__field-error' role='alert'>
                  {getFieldError('confirmPassword')}
                </p>
              )}
            </div>
          )}

          <button type='submit' className='login-page__submit' disabled={loading}>
            {loading && (
              <svg className='login-page__spinner' viewBox='0 0 24 24' width='18' height='18'>
                <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='3' fill='none' strokeDasharray='50' strokeDashoffset='25' strokeLinecap='round' />
              </svg>
            )}
            <span>{loading ? t('login.submitting') : authMode === 'register' ? 'Create Account' : t('login.submit')}</span>
          </button>

          <button
            type='button'
            className='login-page__mode-toggle'
            onClick={() => {
              setAuthMode((prev) => (prev === 'login' ? 'register' : 'login'));
              setMessage(null);
              setFieldErrors({ username: null, password: null, confirmPassword: null });
              setTouched({ username: false, password: false, confirmPassword: false });
            }}
          >
            {authMode === 'login' ? 'Create account' : 'Back to login'}
          </button>

          <div role='alert' aria-live='polite' className={`login-page__message ${message ? 'login-page__message--visible' : ''} ${message ? (message.type === 'success' ? 'login-page__message--success' : 'login-page__message--error') : ''}`} hidden={!message}>
            {message?.text}
          </div>
        </form>

        <div className='login-page__footer'>
          <div className='login-page__footer-content'>
            <span>{t('login.footerPrimary')}</span>
            <span className='login-page__footer-divider'>•</span>
            <span>{t('login.footerSecondary')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
