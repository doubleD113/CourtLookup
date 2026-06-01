import { NextRequest, NextResponse } from 'next/server'
import { BETA_COOKIE, expectedBetaCookieValue, isValidBetaToken } from '@/lib/beta-auth'

export async function POST(req: NextRequest) {
  let body: { token?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!isValidBetaToken(body.token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const value = expectedBetaCookieValue()
  if (!value) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(BETA_COOKIE, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  })
  return res
}
