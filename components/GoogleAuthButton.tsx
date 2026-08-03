'use client';

import { useActionState } from 'react';

type GoogleAuthState = { error: string | null };
type GoogleAuthAction = (
  prevState: GoogleAuthState,
  formData: FormData,
) => GoogleAuthState | Promise<GoogleAuthState>;

export default function GoogleAuthButton({
  action: googleAction,
}: {
  action: GoogleAuthAction;
}) {
  const [state, action, isPending] = useActionState(googleAction, {
    error: null,
  });

  return (
    <form action={action}>
      {state.error && <div className="login-error">{state.error}</div>}
      <button type="submit" className="login-google-btn" disabled={isPending}>
        <svg viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.52 12.27c0-.82-.07-1.62-.2-2.38H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.76z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.28v3.11A12 12 0 0 0 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.6H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l3.99-3.11z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.6l3.99 3.11C6.22 6.86 8.87 4.75 12 4.75z"
          />
        </svg>
        {isPending ? 'Signing in…' : 'Google'}
      </button>
    </form>
  );
}
