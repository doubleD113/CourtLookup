import { NextRequest, NextResponse } from 'next/server'

const PLACES_AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json([])

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing GOOGLE_PLACES_API_KEY' }, { status: 500 })
  }

  const body = {
    input: q,
    includedRegionCodes: ['au'],
    includedPrimaryTypes: ['locality', 'postal_code'],
    languageCode: 'en-AU',
  }

  const res = await fetch(PLACES_AUTOCOMPLETE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    return NextResponse.json({ error: 'Places autocomplete failed', detail: errText }, { status: 502 })
  }

  const data = await res.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const suggestions = (data.suggestions ?? []).flatMap((s: any) => {
    const p = s.placePrediction
    if (!p) return []
    return [
      {
        placeId: p.placeId as string,
        mainText: (p.structuredFormat?.mainText?.text ?? p.text?.text ?? '') as string,
        secondaryText: (p.structuredFormat?.secondaryText?.text ?? '') as string,
      },
    ]
  })

  return NextResponse.json(suggestions)
}
