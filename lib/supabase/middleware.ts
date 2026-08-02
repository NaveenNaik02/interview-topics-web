import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touching auth.getUser() here is what actually refreshes an expiring
  // session cookie — do not add logic between client creation and this call.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Prod-only: dev keeps its zero-friction seeded-user auto-login (see
  // authSlice.ts's initAuth), which is client-side JS that hasn't run yet on
  // a cold server's first request — gating here too would strand dev on
  // /login with nothing to navigate it away. In prod, no session is ever
  // anonymous (the auto-provisioning fallback is gone), so `isAuthed` is a
  // real "did this visitor actually log in" check.
  if (process.env.NODE_ENV === 'production') {
    const { pathname } = request.nextUrl;
    const isAuthPage = pathname === '/login' || pathname === '/signup';
    const isExempt = pathname === '/manifest.json' || pathname === '/sw.js';
    const isAuthed = !!user && !user.is_anonymous;

    if (!isAuthed && !isAuthPage && !isExempt) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    if (isAuthed && isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
