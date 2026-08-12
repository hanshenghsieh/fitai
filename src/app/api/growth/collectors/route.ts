export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { requireAdminUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import { listCollectorStatuses } from '@/growth/collectors/registry'

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminUser(request)
  if (!auth.ok) return auth.response

  return jsonWithCors({ collectors: listCollectorStatuses() }, request)
}
