import { createHash, timingSafeEqual } from 'node:crypto'

export const BETA_COOKIE = 'cl_beta'

function hashToken(token: string): Buffer {
  return createHash('sha256').update(token).digest()
}

export function expectedBetaCookieValue(): string | null {
  const token = process.env.BETA_ACCESS_TOKEN
  if (!token) return null
  return hashToken(token).toString('hex')
}

export function isValidBetaToken(submitted: string | undefined | null): boolean {
  const token = process.env.BETA_ACCESS_TOKEN
  if (!token || !submitted) return false
  const a = hashToken(token)
  const b = hashToken(submitted)
  return timingSafeEqual(a, b)
}
