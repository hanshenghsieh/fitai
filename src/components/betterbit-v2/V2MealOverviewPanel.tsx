'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ShoppingBag, UtensilsCrossed, Salad, Cookie, Moon, X } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import type { FoodLogEntry } from '@/lib/banks/types'
import { normalizeFoodLogSlot, type FoodSlot } from '@/lib/food-slots'
import { groupTodayMealOverviewLogs } from '@/lib/today-meal-overview'
import { setAppScrollLocked } from '@/lib/today-actions'
import V2Card from './V2Card'

const LONG_PRESS_MS = 1500
const MOVE_CANCEL_PX = 12

const SLOT_ROWS: { slot: FoodSlot; icon: typeof ShoppingBag }[] = [
  { slot: 'meal1', icon: ShoppingBag },
  { slot: 'meal2', icon: UtensilsCrossed },
  { slot: 'meal3', icon: Salad },
  { slot: 'before_sleep', icon: Moon },
  { slot: 'other', icon: Cookie },
]

const NAMED_LABELS: Record<FoodSlot, string> = {
  meal1: '早餐',
  meal2: '午餐',
  meal3: '晚餐',
  other: '點心',
  before_sleep: '睡前',
}

const NUMBERED_LABELS: Record<FoodSlot, string> = {
  meal1: '第一餐',
  meal2: '第二餐',
  meal3: '第三餐',
  other: '第四餐',
  before_sleep: '睡前',
}

export type MealLabelMode = 'named' | 'numbered'

function logDisplayName(log: FoodLogEntry) {
  return log.name || '餐點'
}

interface Props {
  foodLogs: FoodLogEntry[]
  labelMode: MealLabelMode
  onMoveLog?: (logId: string, slot: FoodSlot) => void
  onEditLog?: (log: FoodLogEntry) => void
  onDeleteLog?: (logId: string) => void
}

export default function V2MealOverviewPanel({
  foodLogs,
  labelMode,
  onMoveLog,
  onEditLog,
  onDeleteLog,
}: Props) {
  const grouped = useMemo(() => groupTodayMealOverviewLogs(foodLogs), [foodLogs])
  const labels = labelMode === 'named' ? NAMED_LABELS : NUMBERED_LABELS

  const [editMode, setEditMode] = useState(false)
  const [draggingLogId, setDraggingLogId] = useState<string | null>(null)
  const [hoverSlot, setHoverSlot] = useState<FoodSlot | null>(null)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressOrigin = useRef<{ x: number; y: number } | null>(null)
  const pendingLogId = useRef<string | null>(null)
  const longPressActivated = useRef(false)
  const isDraggingRef = useRef(false)
  const draggingLogIdRef = useRef<string | null>(null)
  const hoverSlotRef = useRef<FoodSlot | null>(null)

  useEffect(() => {
    draggingLogIdRef.current = draggingLogId
  }, [draggingLogId])

  useEffect(() => {
    hoverSlotRef.current = hoverSlot
  }, [hoverSlot])

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    pendingLogId.current = null
    pressOrigin.current = null
  }, [])

  const exitEditMode = useCallback(() => {
    clearLongPress()
    longPressActivated.current = false
    isDraggingRef.current = false
    setEditMode(false)
    setDraggingLogId(null)
    setHoverSlot(null)
    setDragPos(null)
  }, [clearLongPress])

  const resolveHoverSlot = useCallback((x: number, y: number): FoodSlot | null => {
    const el = document.elementFromPoint(x, y)
    const row = el?.closest('[data-meal-slot]') as HTMLElement | null
    return (row?.dataset.mealSlot as FoodSlot | undefined) ?? null
  }, [])

  useEffect(() => {
    if (!editMode) return
    setAppScrollLocked(true)
    return () => {
      setAppScrollLocked(false)
    }
  }, [editMode])

  useEffect(() => {
    if (!editMode) return

    const onMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return
      e.preventDefault()
      setDragPos({ x: e.clientX, y: e.clientY })
      setHoverSlot(resolveHoverSlot(e.clientX, e.clientY))
    }

    const onUp = () => {
      if (!isDraggingRef.current) return

      const logId = draggingLogIdRef.current
      const slot = hoverSlotRef.current
      if (logId && slot && onMoveLog) {
        const log = foodLogs.find(l => l.id === logId)
        if (log) {
          const fromSlot = normalizeFoodLogSlot(log)
          if (fromSlot !== slot) onMoveLog(logId, slot)
        }
      }

      isDraggingRef.current = false
      draggingLogIdRef.current = null
      setDraggingLogId(null)
      setHoverSlot(null)
      setDragPos(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [editMode, foodLogs, onMoveLog, resolveHoverSlot])

  const startDragging = useCallback(
    (logId: string, x: number, y: number) => {
      isDraggingRef.current = true
      draggingLogIdRef.current = logId
      setDraggingLogId(logId)
      setDragPos({ x, y })
      setHoverSlot(resolveHoverSlot(x, y))
    },
    [resolveHoverSlot]
  )

  const handleChipPointerDown = useCallback(
    (logId: string, e: React.PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return

      if (editMode) {
        if (onMoveLog) {
          e.preventDefault()
          startDragging(logId, e.clientX, e.clientY)
        }
        return
      }

      longPressActivated.current = false
      pendingLogId.current = logId
      pressOrigin.current = { x: e.clientX, y: e.clientY }

      if (!onMoveLog && !onEditLog) return

      if (onMoveLog) {
        longPressTimer.current = setTimeout(() => {
          longPressActivated.current = true
          pendingLogId.current = null
          pressOrigin.current = null
          setEditMode(true)
          try {
            navigator.vibrate?.(15)
          } catch {
            /* ignore */
          }
        }, LONG_PRESS_MS)
      }
    },
    [editMode, onEditLog, onMoveLog, startDragging]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pressOrigin.current || !pendingLogId.current) return
      const dx = e.clientX - pressOrigin.current.x
      const dy = e.clientY - pressOrigin.current.y
      if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) clearLongPress()
    },
    [clearLongPress]
  )

  const handlePointerUp = useCallback(() => {
    if (editMode || longPressActivated.current) {
      clearLongPress()
      return
    }

    const logId = pendingLogId.current
    const wasTap = logId != null

    clearLongPress()

    if (wasTap && onEditLog) {
      const log = foodLogs.find(l => l.id === logId)
      if (log) onEditLog(log)
    }
  }, [clearLongPress, editMode, foodLogs, onEditLog])

  const handleEditBackgroundPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!editMode || isDraggingRef.current) return
      const target = e.target
      if (!(target instanceof Element)) return
      if (
        target.closest(
          'button, input, textarea, select, [data-reorder-item], [data-reorder-action]'
        )
      ) {
        return
      }
      exitEditMode()
    },
    [editMode, exitEditMode]
  )

  const draggingLog = draggingLogId ? foodLogs.find(l => l.id === draggingLogId) : null

  return (
    <>
      {editMode && (
        <button
          type="button"
          aria-label="取消移動"
          className="fixed inset-0 z-[59] cursor-default"
          style={{ backgroundColor: 'rgba(26, 46, 26, 0.12)' }}
          onPointerDown={exitEditMode}
        />
      )}

      <div
        className={editMode ? 'relative z-[63] pointer-events-none' : undefined}
        onPointerDownCapture={handleEditBackgroundPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <V2Card padding="4px 16px 8px">
        {SLOT_ROWS.map(({ slot, icon: Icon }, rowIndex) => {
          const logs = grouped[slot]
          const kcal = logs.reduce((s, l) => s + (l.calories ?? 0), 0)
          const isDropTarget = editMode && hoverSlot === slot
          const isLast = rowIndex === SLOT_ROWS.length - 1

          return (
            <div
              key={slot}
              data-meal-slot={slot}
              className={`py-3.5${editMode ? ' pointer-events-auto' : ''}`}
              style={{
                borderBottom: isLast ? undefined : `1px solid ${BB_V2.divider}`,
                backgroundColor: isDropTarget ? BB_V2.bg.softGreen : undefined,
                borderRadius: isDropTarget ? 12 : undefined,
                marginLeft: isDropTarget ? -8 : 0,
                marginRight: isDropTarget ? -8 : 0,
                paddingLeft: isDropTarget ? 8 : 0,
                paddingRight: isDropTarget ? 8 : 0,
                transition: 'background-color 0.15s ease',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: BB_V2.bg.softGreen, color: BB_V2.accent.green }}
                >
                  <Icon className="h-5 w-5" strokeWidth={BB_V2.iconStroke} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[15px]" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
                      {labels[slot]}
                    </p>
                    {kcal > 0 && (
                      <span
                        className="text-[14px] tabular-nums shrink-0"
                        style={{ color: BB_V2.text.primary, fontWeight: 600 }}
                      >
                        {Math.round(kcal).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {logs.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {logs.map((log, chipIndex) => {
                        const isDragging = draggingLogId === log.id
                        return (
                          <MealChip
                            key={log.id}
                            name={logDisplayName(log)}
                            kcal={log.calories}
                            jiggle={editMode && !isDragging}
                            jiggleDelay={chipIndex * 0.04}
                            hidden={isDragging}
                            showDelete={editMode && !isDragging && Boolean(onDeleteLog)}
                            draggable={Boolean(onMoveLog) || Boolean(onEditLog)}
                            onPointerDown={e => handleChipPointerDown(log.id, e)}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                            onDelete={
                              onDeleteLog
                                ? () => {
                                    exitEditMode()
                                    onDeleteLog(log.id)
                                  }
                                : undefined
                            }
                          />
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-[13px] mt-0.5" style={{ color: BB_V2.text.secondary }}>
                      還沒記錄
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        </V2Card>
      </div>

      {editMode && draggingLog && dragPos && (
        <DragGhost name={logDisplayName(draggingLog)} kcal={draggingLog.calories} x={dragPos.x} y={dragPos.y} />
      )}
    </>
  )
}

function MealChip({
  name,
  kcal,
  jiggle,
  jiggleDelay,
  hidden,
  showDelete,
  draggable,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onDelete,
}: {
  name: string
  kcal?: number | null
  jiggle?: boolean
  jiggleDelay?: number
  hidden?: boolean
  showDelete?: boolean
  draggable?: boolean
  onPointerDown?: (e: React.PointerEvent) => void
  onPointerMove?: (e: React.PointerEvent) => void
  onPointerUp?: (e: React.PointerEvent) => void
  onPointerCancel?: (e: React.PointerEvent) => void
  onDelete?: () => void
}) {
  return (
    <span
      data-reorder-item
      role={draggable ? 'button' : undefined}
      tabIndex={draggable ? -1 : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className={`relative inline-flex items-center gap-1 max-w-full px-2.5 py-1 rounded-lg text-[12px] select-none ${
        jiggle ? 'touch-none' : 'touch-manipulation'
      } ${
        jiggle ? 'v2-meal-chip-jiggle' : ''
      }`}
      style={{
        backgroundColor: BB_V2.bg.softGreen,
        border: `1px solid ${BB_V2.bg.pill}`,
        color: BB_V2.text.primary,
        fontWeight: 500,
        visibility: hidden ? 'hidden' : undefined,
        animationDelay: jiggle ? `${jiggleDelay ?? 0}s` : undefined,
        cursor: draggable ? 'grab' : 'default',
      }}
    >
      {showDelete && onDelete && (
        <button
          type="button"
          data-reorder-action
          aria-label="刪除餐點"
          className="v2-meal-chip-delete"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <X className="h-2.5 w-2.5" strokeWidth={2.5} />
        </button>
      )}
      <span className="truncate max-w-[120px]">{name}</span>
      {kcal != null && kcal > 0 && (
        <span className="tabular-nums shrink-0" style={{ color: BB_V2.text.secondary }}>
          {Math.round(kcal)}
        </span>
      )}
    </span>
  )
}

function DragGhost({ name, kcal, x, y }: { name: string; kcal?: number | null; x: number; y: number }) {
  return (
    <div
      className="fixed z-[70] pointer-events-none px-2.5 py-1 rounded-lg text-[12px] shadow-lg"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%) scale(1.06)',
        backgroundColor: BB_V2.bg.card,
        border: `1.5px solid ${BB_V2.accent.green}`,
        color: BB_V2.text.primary,
        fontWeight: 600,
      }}
    >
      <span>{name}</span>
      {kcal != null && kcal > 0 && (
        <span className="ml-1 tabular-nums" style={{ color: BB_V2.text.secondary }}>
          {Math.round(kcal)}
        </span>
      )}
    </div>
  )
}
