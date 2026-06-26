import type { AuditEntityType, AuditLogEntry } from './types'

let sequence = 0

export function createAuditEntry(input: {
  actor: string
  entity_type: AuditEntityType
  entity_id: string
  action: string
  reason: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  at?: string
  id?: string
}): AuditLogEntry {
  sequence += 1
  return {
    id: input.id ?? `audit-${Date.now()}-${sequence}`,
    at: input.at ?? new Date().toISOString(),
    actor: input.actor,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    action: input.action,
    reason: input.reason,
    before: input.before,
    after: input.after,
  }
}

export class AuditLog {
  private entries: AuditLogEntry[] = []

  constructor(initial: AuditLogEntry[] = []) {
    this.entries = [...initial]
  }

  append(entry: AuditLogEntry): void {
    this.entries.push(entry)
  }

  logChange(input: {
    actor: string
    entity_type: AuditEntityType
    entity_id: string
    action: string
    reason: string
    before?: Record<string, unknown>
    after?: Record<string, unknown>
  }): AuditLogEntry {
    const entry = createAuditEntry(input)
    this.append(entry)
    return entry
  }

  getAll(): AuditLogEntry[] {
    return [...this.entries]
  }

  filterByEntity(entity_id: string): AuditLogEntry[] {
    return this.entries.filter(e => e.entity_id === entity_id)
  }

  filterByActor(actor: string): AuditLogEntry[] {
    return this.entries.filter(e => e.actor === actor)
  }

  count(): number {
    return this.entries.length
  }
}

export function auditPromotion(
  log: AuditLog,
  input: { actor: string; record_id: string; from: string; to: string; reason: string }
): AuditLogEntry {
  return log.logChange({
    actor: input.actor,
    entity_type: 'promotion',
    entity_id: input.record_id,
    action: 'promote',
    reason: input.reason,
    before: { stage: input.from },
    after: { stage: input.to },
  })
}

export function auditNutritionChange(
  log: AuditLog,
  input: { actor: string; record_id: string; reason: string; before: Record<string, unknown>; after: Record<string, unknown> }
): AuditLogEntry {
  return log.logChange({
    actor: input.actor,
    entity_type: 'nutrition',
    entity_id: input.record_id,
    action: 'update_nutrition',
    reason: input.reason,
    before: input.before,
    after: input.after,
  })
}
