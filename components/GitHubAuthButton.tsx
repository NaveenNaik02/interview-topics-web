'use client';

import { useActionState } from 'react';

type GithubAuthState = { error: string | null };
type GithubAuthAction = (
  prevState: GithubAuthState,
  formData: FormData,
) => GithubAuthState | Promise<GithubAuthState>;

export default function GitHubAuthButton({
  action: githubAction,
}: {
  action: GithubAuthAction;
}) {
  const [state, action, isPending] = useActionState(githubAction, {
    error: null,
  });

  return (
    <form action={action}>
      {state.error && <div className="login-error">{state.error}</div>}
      <button type="submit" className="login-github-btn" disabled={isPending}>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.5 0 12.3c0 5.44 3.44 10.05 8.2 11.68.6.11.82-.27.82-.6 0-.29-.01-1.06-.02-2.08-3.34.75-4.04-1.65-4.04-1.65-.55-1.44-1.34-1.82-1.34-1.82-1.09-.77.08-.75.08-.75 1.2.09 1.84 1.26 1.84 1.26 1.07 1.87 2.81 1.33 3.49 1.02.11-.79.42-1.33.76-1.64-2.67-.31-5.47-1.38-5.47-6.13 0-1.35.47-2.46 1.24-3.32-.12-.31-.54-1.57.12-3.28 0 0 1.01-.33 3.3 1.27a11.2 11.2 0 0 1 6 0c2.29-1.6 3.3-1.27 3.3-1.27.66 1.71.24 2.97.12 3.28.77.86 1.24 1.97 1.24 3.32 0 4.76-2.8 5.81-5.48 6.12.43.38.81 1.14.81 2.3 0 1.66-.02 3-.02 3.41 0 .33.22.72.83.6C20.56 22.34 24 17.73 24 12.3 24 5.5 18.63 0 12 0z" />
        </svg>
        {isPending ? 'Signing in…' : 'GitHub'}
      </button>
    </form>
  );
}
