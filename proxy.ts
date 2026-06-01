import { NextRequest, NextResponse } from 'next/server'

const ADMIN_COOKIE = 'cl_admin'
const BETA_COOKIE = 'cl_beta'

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

  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/api/admin')
  const isBetaPath =
    pathname === '/search' ||
    pathname.startsWith('/search/') ||
    pathname.startsWith('/courts/')

  if (isAdminPath) {
    if (pathname === '/admin/login' || pathname.startsWith('/api/admin/login')) {
      return NextResponse.next()
    }
    return enforceCookie(req, ADMIN_COOKIE, process.env.ADMIN_TOKEN, '/admin/login', {
      disabledMessage: 'Admin tool disabled (ADMIN_TOKEN not set)',
    })
  }

  if (isBetaPath) {
    const token = process.env.BETA_ACCESS_TOKEN
    if (!token) return NextResponse.next()
    return enforceCookie(req, BETA_COOKIE, token, '/beta', { includeNextParam: true })
  }

  return NextResponse.next()
}

async function enforceCookie(
  req: NextRequest,
  cookieName: string,
  token: string | undefined,
  redirectPath: string,
  opts: { disabledMessage?: string; includeNextParam?: boolean } = {},
) {
  if (!token) {
    if (opts.disabledMessage) {
      return new NextResponse(opts.disabledMessage, { status: 503 })
    }
    return NextResponse.next()
  }

  const cookie = req.cookies.get(cookieName)?.value
  if (!cookie) {
    return redirect(req, redirectPath, opts.includeNextParam)
  }

  const expected = await sha256Hex(token)
  if (!timingSafeEqual(cookie, expected)) {
    return redirect(req, redirectPath, opts.includeNextParam)
  }

  return NextResponse.next()
}

function redirect(req: NextRequest, path: string, includeNextParam?: boolean) {
  const url = req.nextUrl.clone()
  url.pathname = path
  url.search = ''
  if (includeNextParam) {
    const next = req.nextUrl.pathname + req.nextUrl.search
    url.searchParams.set('next', next)
  }
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/search', '/search/:path*', '/courts/:path*'],
}
