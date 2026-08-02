'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export type SignupActionState = {
  error: string | null;
  sent: boolean;
  email: string;
};

export async function signUpWithEmailPassword(
  prevState: SignupActionState,
  formData: FormData,
): Promise<SignupActionState> {
  const fullName = formData.get('fullName') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!email || !password) {
    return { error: 'Email and password are required', sent: false, email: '' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match', sent: false, email: '' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    return { error: error.message, sent: false, email: '' };
  }

  if (data.session) {
    redirect('/');
  }

  return { error: null, sent: true, email };
}
