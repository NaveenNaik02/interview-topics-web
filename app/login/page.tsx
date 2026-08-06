import Link from 'next/link';
import AuthSidebar from '@/components/AuthSidebar';
import { LoginForm } from '@/features/login';

export const metadata = { title: 'Sign in — Prep Tracker' };

export default function LoginPage() {
  return (
    <div className="login-screen">
      <AuthSidebar />
      <div className="login-panel">
        <div className="login-panel-inner">
          <div className="dash-eyebrow">Welcome back</div>
          <h1 className="login-panel-title">Sign in to your account</h1>
          <LoginForm />
          <p className="login-signup-line">
            Don&apos;t have an account? <Link href="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
