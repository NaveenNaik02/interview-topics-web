// Local-dev-only account used instead of an anonymous session (see the
// NODE_ENV branch in ProgressContext) so authoring features behave the same
// in dev as in prod without any isLocalSupabase()-style branching in the
// actions themselves. Only ever signed into the local `supabase start`
// stack, where auth.email.enable_confirmations is off — signUp both creates
// and confirms it in one call, no email step required.
export const DEV_USER = {
  email: 'dev@local.test',
  password: 'local-dev-password',
}
