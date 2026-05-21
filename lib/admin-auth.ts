import { createHash, timingSafeEqual } from 'node:crypto'

export const ADMIN_COOKIE = 'cl_admin'

function hashToken(token: string): Buffer {
  return createHash('sha256').update(token).digest()
}

export function expectedCookieValue(): string | null {
  const token = process.env.ADMIN_TOKEN
  if (!token) return null
  return hashToken(token).toString('hex')
}

export function isValidAdminToken(submitted: string | undefined | null): boolean {
  const token = process.env.ADMIN_TOKEN
  if (!token || !submitted) return false
  const a = hashToken(token)
  const b = hashToken(submitted)
  return timingSafeEqual(a, b)
}

export function isValidAdminCookie(cookieValue: string | undefined | null): boolean {
  const expected = expectedCookieValue()
  if (!expected || !cookieValue) return false
  const a = Buffer.from(expected, 'hex')
  let b: Buffer
  try {
    b = Buffer.from(cookieValue, 'hex')
  } catch {
    return false
  }
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
