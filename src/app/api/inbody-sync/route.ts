import { NextRequest, NextResponse } from 'next/server'

/**
 * INBODY account sync is not shipped — mock responses removed for App Store compliance.
 * Photo-based InBody parse (`/api/parse-inbody`) remains separate if/when product surfaces it.
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: 'INBODY 同步尚未開放' },
    { status: 503 }
  )
}

export async function GET(_req: NextRequest) {
  return NextResponse.json(
    { error: 'INBODY 同步尚未開放' },
    { status: 503 }
  )
}
