'use client';

import { useSearchParams } from 'next/navigation';
import GoogleAuthButton from '@/components/GoogleAuthButton';
import GitHubAuthButton from '@/components/GitHubAuthButton';
import { loginWithGoogle, loginWithGithub } from '@/features/login/actions';
import EmailLoginForm from './components/EmailLoginForm';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error');

  return (
    <>
      {oauthError && <div className="login-error">{oauthError}</div>}
      <div className="login-oauth-row">
        <GoogleAuthButton action={loginWithGoogle} />
        <GitHubAuthButton action={loginWithGithub} />
      </div>
      <div className="login-divider">or</div>
      <EmailLoginForm />
    </>
  );
}
