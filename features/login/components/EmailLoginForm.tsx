'use client';

import { useActionState } from 'react';
import { loginWithEmailPassword } from '@/features/login/actions';

export default function EmailLoginForm() {
  const [state, action, isPending] = useActionState(loginWithEmailPassword, {
    error: null,
  });

  return (
    <form action={action}>
      {state.error && <div className="login-error">{state.error}</div>}
      <div className="login-field">
        <label htmlFor="li-email">Email</label>
        <input
          id="li-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </div>
      <div className="login-field">
        <label htmlFor="li-password">Password</label>
        <input
          id="li-password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="login-row-between">
        <a
          className="login-forgot"
          href="#"
          onClick={(e) => e.preventDefault()}
        >
          Forgot password?
        </a>
      </div>
      <button className="login-submit-btn" type="submit" disabled={isPending}>
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
