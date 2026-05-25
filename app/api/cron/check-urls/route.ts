import { NextRequest, NextResponse } from 'next/server'
import { checkAllBookingUrls } from '@/lib/check-booking-urls'

export const maxDuration = 600
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }

  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const summary = await checkAllBookingUrls({ log: false })
  return NextResponse.json({ success: true, ...summary })
}
