'use client';

import { useActionState } from 'react';
import { signUpWithEmailPassword } from '@/features/signup/actions';

export default function EmailSignupForm() {
  const [state, action, isPending] = useActionState(signUpWithEmailPassword, {
    error: null,
    sent: false,
    email: '',
  });

  if (state.sent) {
    return (
      <p className="login-terms">
        Check {state.email} for a confirmation link to finish creating your
        account.
      </p>
    );
  }

  return (
    <form action={action}>
      {state.error && <div className="login-error">{state.error}</div>}
      <div className="login-field">
        <label htmlFor="su-name">Full name</label>
        <input
          id="su-name"
          name="fullName"
          type="text"
          placeholder="Ada Lovelace"
          autoComplete="name"
          required
        />
      </div>
      <div className="login-field">
        <label htmlFor="su-email">Email</label>
        <input
          id="su-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </div>
      <div className="login-field">
        <label htmlFor="su-password">Password</label>
        <input
          id="su-password"
          name="password"
          type="password"
          placeholder="Create a password"
          autoComplete="new-password"
          required
          minLength={6}
        />
      </div>
      <div className="login-field">
        <label htmlFor="su-confirm">Confirm password</label>
        <input
          id="su-confirm"
          name="confirmPassword"
          type="password"
          placeholder="Re-enter password"
          autoComplete="new-password"
          required
          minLength={6}
        />
      </div>
      <button className="login-submit-btn" type="submit" disabled={isPending}>
        {isPending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
