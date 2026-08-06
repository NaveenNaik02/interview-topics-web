import { NextResponse } from 'next/server'
import { exchangeCode } from '@/features/login'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    try {
      await exchangeCode(code)
      return NextResponse.redirect(`${origin}${next}`)
    } catch (error) {
      console.error('OAuth code exchange failed:', error)
    }
  }

  // If validation fails, return user back to login screen with error state
  return NextResponse.redirect(`${origin}/login?error=Could not verify session`)
}
