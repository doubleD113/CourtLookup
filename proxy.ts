import { NextRequest, NextResponse } from 'next/server'

const ADMIN_COOKIE = 'cl_admin'

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname === '/admin/login' || pathname.startsWith('/api/admin/login')) {
    return NextResponse.next()
  }

  const token = process.env.ADMIN_TOKEN
  if (!token) {
    return new NextResponse('Admin tool disabled (ADMIN_TOKEN not set)', { status: 503 })
  }

  const cookie = req.cookies.get(ADMIN_COOKIE)?.value
  if (!cookie) {
    return redirectToLogin(req)
  }

  const expected = await sha256Hex(token)
  if (!timingSafeEqual(cookie, expected)) {
    return redirectToLogin(req)
  }

  return NextResponse.next()
}

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone()
  url.pathname = '/admin/login'
  url.search = ''
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
