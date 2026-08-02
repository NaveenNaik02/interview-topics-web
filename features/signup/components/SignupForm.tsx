import GoogleAuthButton from '@/components/GoogleAuthButton';
import { signUpWithGoogle } from '@/features/signup/actions';
import EmailSignupForm from './EmailSignupForm';

export default function SignupForm() {
  return (
    <>
      <GoogleAuthButton action={signUpWithGoogle} />
      <div className="login-divider">or</div>
      <EmailSignupForm />
    </>
  );
}
