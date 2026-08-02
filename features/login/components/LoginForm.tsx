'use client';

import { useSearchParams } from 'next/navigation';
import GoogleAuthButton from '@/components/GoogleAuthButton';
import { loginWithGoogle } from '@/features/login/actions';
import EmailLoginForm from './EmailLoginForm';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error');

  return (
    <>
      {oauthError && <div className="login-error">{oauthError}</div>}
      <GoogleAuthButton action={loginWithGoogle} />
      <div className="login-divider">or</div>
      <EmailLoginForm />
    </>
  );
}
