export interface RecordDateTraceFields {
  selectedDate?: string | null
  targetDate?: string | null
  targetMealSlot?: string | null
  captureTargetDate?: string | null
  nutritionDate?: string | null
  checkinDate?: string | null
  loggedAt?: string | null
  loggedAtLocalDate?: string | null
  mealSlot?: string | null
  foodLogId?: string | null
  persisted?: boolean
  reason?: string
}

export interface RecordDateTraceEntry extends RecordDateTraceFields {
  stage: string
  at: string
}

function traceEnabled(): boolean {
  if (process.env.NODE_ENV === 'test') return true
  if (typeof window === 'undefined') return false
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
}

/**
 * Local-only diagnostic trace. The allowlisted fields intentionally exclude
 * user ids, auth headers, tokens, request bodies, and other sensitive data.
 */
export function traceRecordDate(stage: string, fields: RecordDateTraceFields): void {
  if (!traceEnabled()) return
  const entry: RecordDateTraceEntry = {
    stage,
    at: new Date().toISOString(),
    ...fields,
  }
  console.info('[RECORD-DATE-002]', entry)
  if (typeof window !== 'undefined') {
    const target = window as unknown as { __recordDateTrace?: RecordDateTraceEntry[] }
    let persisted: RecordDateTraceEntry[] = []
    try {
      persisted = JSON.parse(window.sessionStorage.getItem('betterbit:record-date-trace') ?? '[]')
    } catch {
      persisted = []
    }
    target.__recordDateTrace = [...persisted, ...(target.__recordDateTrace ?? []), entry]
      .filter((item, index, all) =>
        all.findIndex(other => other.at === item.at && other.stage === item.stage) === index
      )
      .slice(-100)
    window.sessionStorage.setItem(
      'betterbit:record-date-trace',
      JSON.stringify(target.__recordDateTrace)
    )
  }
}
