// Locators for /login. Same names as docs/locators.md → "Login".
import { tid } from './tid';

export const LoginPage = {
  root: tid('page-login'),
  form: tid('login-form'),
  emailInput: tid('login-email-input'),
  emailError: tid('login-email-error'),
  passwordInput: tid('login-password-input'),
  passwordError: tid('login-password-error'),
  passwordToggleBtn: tid('login-password-toggle-btn'),
  rememberCheckbox: tid('login-remember-checkbox'),
  forgotLink: tid('login-forgot-link'),
  error: tid('login-error'),
  sessionExpiredHint: tid('login-session-expired-hint'),
  resendVerificationBtn: tid('login-resend-verification-btn'),
  submitBtn: tid('login-submit-btn'),
  signupLink: tid('login-signup-link'),
} as const;
