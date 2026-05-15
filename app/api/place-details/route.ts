import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('placeId')?.trim()
  if (!placeId) {
    return NextResponse.json({ error: 'Missing placeId' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing GOOGLE_PLACES_API_KEY' }, { status: 500 })
  }

  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'location,displayName,formattedAddress',
    },
  })

  if (!res.ok) {
    const errText = await res.text()
    return NextResponse.json({ error: 'Place details failed', detail: errText }, { status: 502 })
  }

  const data = await res.json()
  return NextResponse.json({
    lat: data.location?.latitude as number | undefined,
    lng: data.location?.longitude as number | undefined,
    displayName: (data.displayName?.text ?? '') as string,
    formattedAddress: (data.formattedAddress ?? '') as string,
  })
}
