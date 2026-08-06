import GoogleAuthButton from '@/components/GoogleAuthButton';
import GitHubAuthButton from '@/components/GitHubAuthButton';
import { signUpWithGoogle, signUpWithGithub } from '@/features/signup/actions';
import EmailSignupForm from './components/EmailSignupForm';

export default function SignupForm() {
  return (
    <>
      <div className="login-oauth-row">
        <GoogleAuthButton action={signUpWithGoogle} />
        <GitHubAuthButton action={signUpWithGithub} />
      </div>
      <div className="login-divider">or</div>
      <EmailSignupForm />
    </>
  );
}
