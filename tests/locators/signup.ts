// Locators for /register, /register/pending and the "waiting for approval" screen. Same names as docs/locators.md.
import { tid } from './tid';

export const SignupPage = {
  root: tid('page-signup'),
  form: tid('signup-form'),
  errorSummary: tid('signup-error-summary'),
  errorSummaryLink: tid('signup-error-summary-link'),
  serverError: tid('signup-server-error'),
  orgNameInput: tid('signup-org-name-input'),
  orgNameError: tid('signup-org-name-error'),
  instTypeSelect: tid('signup-inst-type-select'),
  instTypeError: tid('signup-inst-type-error'),
  cityInput: tid('signup-city-input'),
  stateSelect: tid('signup-state-select'),
  firstNameInput: tid('signup-first-name-input'),
  lastNameInput: tid('signup-last-name-input'),
  emailInput: tid('signup-email-input'),
  emailError: tid('signup-email-error'),
  mobileInput: tid('signup-mobile-input'),
  mobileError: tid('signup-mobile-error'),
  heardSelect: tid('signup-heard-select'),
  passwordInput: tid('signup-password-input'),
  confirmInput: tid('signup-confirm-input'),
  confirmError: tid('signup-confirm-error'),
  termsCheckbox: tid('signup-terms-checkbox'),
  termsError: tid('signup-terms-error'),
  submitBtn: tid('signup-submit-btn'),
  loginLink: tid('signup-login-link'),
} as const;

export const SignupPending = {
  root: tid('signup-pending'),
  step: tid('signup-pending-step'),
  resendBtn: tid('signup-pending-resend-btn'),
  loginLink: tid('signup-pending-login-link'),
} as const;

export const OrganizationNotActive = {
  root: tid('organization-not-active'),
  recheckBtn: tid('organization-not-active-recheck-btn'),
  signOutBtn: tid('organization-not-active-signout-btn'),
} as const;
