import { NextRequest } from 'next/server'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'

/**
 * INBODY account sync is not shipped — mock responses removed for App Store compliance.
 * Photo-based InBody parse (`/api/parse-inbody`) remains separate if/when product surfaces it.
 */
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function POST(request: NextRequest) {
  return jsonWithCors(
    { error: 'INBODY 同步尚未開放' },
    request,
    { status: 503 }
  )
}

export async function GET(request: NextRequest) {
  return jsonWithCors(
    { error: 'INBODY 同步尚未開放' },
    request,
    { status: 503 }
  )
}
