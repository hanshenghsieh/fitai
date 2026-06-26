export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { listCollectorStatuses } from '@/growth/collectors/registry'

export async function GET() {
  return NextResponse.json({ collectors: listCollectorStatuses() })
}
