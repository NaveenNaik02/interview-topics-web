import Link from 'next/link';
import AuthSidebar from '@/components/AuthSidebar';
import { SignupForm } from '@/features/signup/components';

export const metadata = { title: 'Sign up — Prep Tracker' };

export default function SignupPage() {
  return (
    <div className="login-screen">
      <AuthSidebar />
      <div className="login-panel">
        <div className="login-panel-inner">
          <div className="dash-eyebrow">Get started</div>
          <h1 className="login-panel-title">Create your account</h1>
          <SignupForm />
          <p className="login-terms">
            By continuing you agree to our Terms and Privacy Policy.
          </p>
          <p className="login-signup-line">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
