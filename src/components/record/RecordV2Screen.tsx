'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Coffee,
  Flame,
  Leaf,
  MoreHorizontal,
  Moon,
  Star,
  Sun,
  UtensilsCrossed,
  X,
  AlertCircle,
  Dumbbell,
} from 'lucide-react'
import { toast } from 'sonner'
import V2Header from '@/components/betterbit-v2/V2Header'
import AppOverlay from '@/components/ui/AppOverlay'
import FoodPhotoThumb from '@/components/dashboard/today/FoodPhotoThumb'
import type { FoodLogEntry } from '@/lib/banks/types'
import type { AnalysisDayPlanHint } from '@/lib/analytics/analysis-summary'
import { getFoodLogDisplayLabel } from '@/lib/nutrition/food-log-display'
import { resolveFoodLogsFromSession, writeFoodLogsSessionCache } from '@/lib/food-log-session-cache'
import { foodLogNutritionDayKey, filterFoodLogsForNutritionDay } from '@/lib/nutrition-day-food-logs'
import {
  buildRecordDayView,
  buildRecordWeekCards,
  extractAllFoodLogs,
  formatRecordDateLabel,
  type RecordCheckinRow,
  type RecordDayTargets,
  type RecordMealGroup,
} from '@/lib/record/record-page-data'
import {
  copyLogToToday,
  deleteTodayFoodLog,
} from '@/lib/record/mutate-today-food-log'
import { addDays, format, parseISO } from 'date-fns'
import {
  recordCaptureHref,
  storePendingCaptureContext,
  targetMealSlotForCaptureLabel,
} from '@/lib/today-actions'
import { traceRecordDate } from '@/lib/record-date-trace'

interface Props {
  todayStr: string
  checkins: RecordCheckinRow[]
  dayPlansByDate: Record<string, AnalysisDayPlanHint>
  fallbackTargets: RecordDayTargets
  calorieBankEnabled: boolean
  weeklyPlanId: string | null
  selectedDate?: string
  onSelectedDateChange?: (date: string) => void
  onRefresh?: () => void
  contentFadeKey?: string
}

type ActionTarget =
  | { kind: 'food'; log: FoodLogEntry; mealLabel: string }
  | { kind: 'meal'; meal: RecordMealGroup }

function toneClass(tone: string, isToday: boolean): string {
  if (tone === 'empty') return 'v2-record-score-card--empty'
  if (isToday) {
    if (tone === 'high') return 'v2-record-score-card--today-high'
    if (tone === 'medium') return 'v2-record-score-card--today-medium'
    return 'v2-record-score-card--today-low'
  }
  if (tone === 'high') return 'v2-record-score-card--high'
  if (tone === 'medium') return 'v2-record-score-card--medium'
  if (tone === 'low') return 'v2-record-score-card--low'
  return 'v2-record-score-card--empty'
}

function StatusIcon({ status }: { status: string }) {
  if (status === '很穩' || status === '不錯') {
    return <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
  }
  if (status === '可調整') {
    return <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
  }
  if (status === '待回補') {
    return <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
  }
  return <Circle className="h-3 w-3" strokeWidth={2} aria-hidden />
}

function MealIcon({ bucket }: { bucket: RecordMealGroup['bucket'] }) {
  const cls = 'h-4 w-4'
  if (bucket === 'breakfast') return <Sun className={cls} strokeWidth={2} aria-hidden />
  if (bucket === 'lunch') return <Coffee className={cls} strokeWidth={2} aria-hidden />
  if (bucket === 'dinner') return <Moon className={cls} strokeWidth={2} aria-hidden />
  return <UtensilsCrossed className={cls} strokeWidth={2} aria-hidden />
}

function formatKcal(n: number): string {
  return n.toLocaleString('zh-TW')
}

function resolveRecordFoodLogs(checkins: RecordCheckinRow[], todayStr: string): FoodLogEntry[] {
  const serverLogs = extractAllFoodLogs(checkins)
  const historicalLogs = serverLogs.filter(log => foodLogNutritionDayKey(log) !== todayStr)
  const serverTodayLogs = filterFoodLogsForNutritionDay(serverLogs, todayStr)
  const resolvedTodayLogs = resolveFoodLogsFromSession(serverTodayLogs, todayStr)
  return [...historicalLogs, ...resolvedTodayLogs].sort((a, b) => a.logged_at.localeCompare(b.logged_at))
}

export default function RecordV2Screen({
  todayStr,
  checkins: initialCheckins,
  dayPlansByDate,
  fallbackTargets,
  calorieBankEnabled,
  weeklyPlanId,
  selectedDate: selectedDateProp,
  onSelectedDateChange,
  onRefresh,
  contentFadeKey,
}: Props) {
  const router = useRouter()
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [internalDate, setInternalDate] = useState(todayStr)
  const selectedDate = selectedDateProp ?? internalDate
  const [foodLogs, setFoodLogs] = useState<FoodLogEntry[]>(() =>
    resolveRecordFoodLogs(initialCheckins, todayStr)
  )
  const [fadeKey, setFadeKey] = useState(0)
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ActionTarget | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    setFoodLogs(resolveRecordFoodLogs(initialCheckins, todayStr))
  }, [initialCheckins, todayStr])

  const applySelectedDate = useCallback(
    (date: string) => {
      if (date > todayStr) return
      if (onSelectedDateChange) {
        onSelectedDateChange(date)
      } else {
        setInternalDate(date)
        setFadeKey(k => k + 1)
      }
    },
    [onSelectedDateChange, todayStr]
  )

  const shiftDate = useCallback(
    (delta: number) => {
      const next = format(addDays(parseISO(selectedDate), delta), 'yyyy-MM-dd')
      applySelectedDate(next)
    },
    [applySelectedDate, selectedDate]
  )

  const pickDate = useCallback(
    (date: string) => {
      applySelectedDate(date)
    },
    [applySelectedDate]
  )

  const weekCards = useMemo(
    () =>
      buildRecordWeekCards(
        selectedDate,
        todayStr,
        foodLogs,
        dayPlansByDate,
        fallbackTargets,
        calorieBankEnabled
      ),
    [selectedDate, todayStr, foodLogs, dayPlansByDate, fallbackTargets, calorieBankEnabled]
  )

  const dayView = useMemo(
    () =>
      buildRecordDayView(
        selectedDate,
        todayStr,
        foodLogs,
        dayPlansByDate,
        fallbackTargets,
        calorieBankEnabled
      ),
    [selectedDate, todayStr, foodLogs, dayPlansByDate, fallbackTargets, calorieBankEnabled]
  )

  const isViewingToday = selectedDate === todayStr

  const openAddMeal = useCallback((slot?: RecordMealGroup['bucket']) => {
    const selectedLogs = filterFoodLogsForNutritionDay(foodLogs, selectedDate)
    const targetMealSlot = targetMealSlotForCaptureLabel(slot)
    traceRecordDate('record-entry-click', {
      selectedDate,
      targetDate: selectedDate,
      targetMealSlot,
    })
    writeFoodLogsSessionCache(selectedLogs, selectedDate)
    storePendingCaptureContext({ targetDate: selectedDate, targetMealSlot, source: 'record' })
    router.push(recordCaptureHref({
      targetDate: selectedDate,
      targetMealSlot,
      source: 'record',
    }))
  }, [foodLogs, router, selectedDate])

  const openCalendar = useCallback(() => {
    dateInputRef.current?.showPicker?.()
    dateInputRef.current?.click()
  }, [])

  const guardTodayOnly = useCallback((): boolean => {
    if (isViewingToday) return true
    toast.message('僅能編輯今天的餐點')
    return false
  }, [isViewingToday])

  const refreshAfterMutation = useCallback(
    (nextLogs: FoodLogEntry[]) => {
      setFoodLogs(nextLogs)
      if (onRefresh) {
        startTransition(() => onRefresh())
      }
    },
    [onRefresh]
  )

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    if (!guardTodayOnly()) {
      setDeleteTarget(null)
      return
    }

    try {
      if (deleteTarget.kind === 'food') {
        const next = foodLogs.filter(l => l.id !== deleteTarget.log.id)
        await deleteTodayFoodLog(deleteTarget.log.id, weeklyPlanId)
        refreshAfterMutation(next)
      } else {
        const ids = new Set(deleteTarget.meal.logs.map(l => l.id))
        for (const id of ids) {
          await deleteTodayFoodLog(id, weeklyPlanId)
        }
        refreshAfterMutation(foodLogs.filter(l => !ids.has(l.id)))
      }
      toast.message('餐點已刪除')
    } catch {
      toast.error('刪除失敗，請稍後再試')
    } finally {
      setDeleteTarget(null)
      setActionTarget(null)
    }
  }, [deleteTarget, foodLogs, guardTodayOnly, refreshAfterMutation, weeklyPlanId])

  const handleCopy = useCallback(
    async (log: FoodLogEntry) => {
      try {
        const next = await copyLogToToday(log, weeklyPlanId)
        setFoodLogs(prev => {
          const merged = [...prev]
          const copy = next.find(l => !prev.some(p => p.id === l.id))
          if (copy) merged.push(copy)
          return merged
        })
        toast.message('餐點已新增')
        if (onRefresh) {
          startTransition(() => onRefresh())
        }
      } catch {
        toast.error('複製失敗，請稍後再試')
      } finally {
        setActionTarget(null)
      }
    },
    [onRefresh, weeklyPlanId]
  )

  const contentKey = contentFadeKey ?? String(fadeKey)

  const summaryScoreColor =
    dayView.summary.tone === 'high'
      ? '#2f8f35'
      : dayView.summary.tone === 'medium'
        ? '#f2a23a'
        : dayView.summary.tone === 'low'
          ? '#d85b4a'
          : '#7a807a'

  return (
    <div className="v2-record-page">
      <V2Header
        title="Betterbit"
        hideRight
        rightSlot={
          <button
            type="button"
            onClick={openCalendar}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl touch-manipulation"
            aria-label="選擇日期"
          >
            <Calendar className="h-5 w-5" strokeWidth={1.75} style={{ color: '#123d24' }} />
          </button>
        }
      />

      <div className="v2-record-inner app-tab-page-content app-tab-column">
        <div className="v2-record-date-switch">
          <button
            type="button"
            className="v2-record-date-arrow touch-manipulation"
            onClick={() => shiftDate(-1)}
            aria-label="前一天"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button type="button" className="v2-record-date-pill touch-manipulation" onClick={openCalendar}>
            <Calendar className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span className="truncate">{formatRecordDateLabel(selectedDate)}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60" strokeWidth={2} />
          </button>

          <button
            type="button"
            className="v2-record-date-arrow touch-manipulation"
            onClick={() => shiftDate(1)}
            disabled={selectedDate >= todayStr}
            aria-label="後一天"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <input
          ref={dateInputRef}
          type="date"
          max={todayStr}
          value={selectedDate}
          onChange={e => pickDate(e.target.value)}
          className="sr-only"
          aria-hidden
          tabIndex={-1}
        />

        <section className="v2-record-section">
          <div className="v2-record-section-head">
            <h2 className="v2-record-section-title">每日紀錄</h2>
            <span className="v2-record-section-hint">點日期看細節 ⓘ</span>
          </div>
          <div className="v2-record-week-scroll">
            <div className="v2-record-week-row">
              {weekCards.map(card => (
                <button
                  key={card.date}
                  type="button"
                  disabled={card.isFuture}
                  onClick={() => pickDate(card.date)}
                  className={`v2-record-score-card touch-manipulation ${toneClass(card.tone, card.isToday)} ${
                    card.date === selectedDate ? 'v2-record-score-card--selected' : ''
                  }`}
                >
                  {card.isToday && <span className="v2-record-score-today-label">今天</span>}
                  <span className="v2-record-score-weekday">{card.weekdayLabel}</span>
                  <span className="v2-record-score-value">{card.score ?? '—'}</span>
                  <span className="v2-record-score-icon">
                    <StatusIcon status={card.status} />
                  </span>
                  <span className="v2-record-score-status">{card.status}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <div key={contentKey} className="v2-record-content-fade">
          {dayView.isFuture ? (
            <div className="v2-record-empty">
              <Leaf className="h-10 w-10" strokeWidth={1.5} style={{ color: '#2f8f35' }} />
              <p className="v2-record-empty-title">無法查看未來日期</p>
              <p className="v2-record-empty-desc">請選擇今天或過去的日期查看飲食紀錄。</p>
            </div>
          ) : (
            <>
              {dayView.isEmpty && isViewingToday && (
                <div className="v2-record-empty v2-record-empty--inline">
                  <UtensilsCrossed className="h-10 w-10" strokeWidth={1.5} style={{ color: '#2f8f35' }} />
                  <p className="v2-record-empty-title">今天還沒有餐點紀錄</p>
                  <p className="v2-record-empty-desc">拍一餐，讓 Betterbit 幫你算熱量與營養。</p>
                  <button type="button" className="v2-record-empty-cta touch-manipulation" onClick={() => openAddMeal()}>
                    <Camera className="h-5 w-5" />
                    拍照記錄第一餐
                  </button>
                </div>
              )}

              <section className="v2-record-summary-card">
            <h2 className="v2-record-summary-title">本日摘要</h2>
            <div className="v2-record-summary-grid">
              <div className="v2-record-summary-item">
                <span className="v2-record-summary-icon v2-record-summary-icon--cal">
                  <Flame className="h-4 w-4" strokeWidth={2} />
                </span>
                <div>
                  <p className="v2-record-summary-label">總熱量</p>
                  <p className="v2-record-summary-value">{formatKcal(dayView.summary.totalKcal)} kcal</p>
                  <p className="v2-record-summary-sub">目標 {formatKcal(dayView.summary.targetKcal)} kcal</p>
                </div>
              </div>
              <div className="v2-record-summary-item">
                <span className="v2-record-summary-icon v2-record-summary-icon--meal">
                  <UtensilsCrossed className="h-4 w-4" strokeWidth={2} />
                </span>
                <div>
                  <p className="v2-record-summary-label">已記錄餐數</p>
                  <p className="v2-record-summary-value">{dayView.summary.mealCount} 餐</p>
                  <p className="v2-record-summary-sub">目標 {dayView.summary.mealTarget} 餐</p>
                </div>
              </div>
              <div className="v2-record-summary-item">
                <span className="v2-record-summary-icon v2-record-summary-icon--protein">
                  <Dumbbell className="h-4 w-4" strokeWidth={2} />
                </span>
                <div>
                  <p className="v2-record-summary-label">蛋白質</p>
                  <p className="v2-record-summary-value">{dayView.summary.proteinG} g</p>
                  <p className="v2-record-summary-sub">目標 {dayView.summary.proteinTarget} g</p>
                </div>
              </div>
              <div className="v2-record-summary-item">
                <span className="v2-record-summary-icon v2-record-summary-icon--score">
                  <Star className="h-4 w-4" strokeWidth={2} />
                </span>
                <div>
                  <p className="v2-record-summary-label">今日分數</p>
                  <p className="v2-record-summary-value" style={{ color: summaryScoreColor }}>
                    {dayView.summary.score != null ? `${dayView.summary.score} 分` : '—'}
                  </p>
                  <p className="v2-record-summary-sub" style={{ color: summaryScoreColor }}>
                    {dayView.summary.status}
                  </p>
                </div>
              </div>
            </div>
          </section>

              <div className="v2-record-meals">
                {dayView.meals.map(meal => (
                <article key={meal.bucket} className="v2-record-meal-card">
                  <header className="v2-record-meal-head">
                    <div className="v2-record-meal-head-left">
                      <span className="v2-record-meal-icon">
                        <MealIcon bucket={meal.bucket} />
                      </span>
                      <span className="v2-record-meal-name">{meal.label}</span>
                      {meal.timeLabel && <span className="v2-record-meal-time">{meal.timeLabel}</span>}
                    </div>
                    <div className="v2-record-meal-head-right">
                      <span className="v2-record-meal-kcal">{formatKcal(meal.totalKcal)} kcal</span>
                      <button
                        type="button"
                        className="v2-record-meal-more touch-manipulation"
                        aria-label={`${meal.label}選單`}
                        onClick={() => setActionTarget({ kind: 'meal', meal })}
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </div>
                  </header>

                  {meal.logs.length === 0 ? (
                    <div className="v2-record-meal-empty">
                      <span className="v2-record-meal-empty-icon">
                        <Leaf className="h-6 w-6" strokeWidth={1.75} />
                      </span>
                      <p className="v2-record-meal-empty-title">尚未記錄{meal.label}</p>
                      {meal.bucket === 'dinner' && (
                        <p className="v2-record-meal-empty-desc">
                          建議補充優質蛋白與蔬菜，幫助減脂更有效率
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="v2-record-meal-body">
                      <div className="v2-record-meal-photo">
                        {meal.photoUrl ? (
                          <FoodPhotoThumb photo_url={meal.photoUrl} userUploadedPhoto={meal.photoUrl} size={72} radius={16} />
                        ) : (
                          <div className="v2-record-meal-photo-placeholder" aria-hidden>
                            <UtensilsCrossed className="h-6 w-6" strokeWidth={1.75} />
                          </div>
                        )}
                      </div>
                      <ul className="v2-record-food-list">
                        {meal.logs.map(log => (
                          <li key={log.id}>
                            <button
                              type="button"
                              className="v2-record-food-row touch-manipulation"
                              onClick={() => setActionTarget({ kind: 'food', log, mealLabel: meal.label })}
                            >
                              <span className="v2-record-food-name">{getFoodLogDisplayLabel(log)}</span>
                              <span className="v2-record-food-kcal">{formatKcal(log.calories)} kcal</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    type="button"
                    className="v2-record-meal-add touch-manipulation"
                    onClick={() => openAddMeal(meal.bucket)}
                  >
                    + 新增{meal.label}
                  </button>
                </article>
                ))}
              </div>
            </>
          )}
        </div>

      </div>

      <AppOverlay
        open={!!actionTarget}
        onClose={() => setActionTarget(null)}
        variant="sheet"
        ariaLabel="餐點操作"
      >
        {actionTarget && (
          <div className="v2-record-action-sheet">
            <p className="v2-record-action-title">
              {actionTarget.kind === 'food'
                ? getFoodLogDisplayLabel(actionTarget.log)
                : actionTarget.meal.label}
            </p>
            <button
              type="button"
              className="v2-record-action-item"
              onClick={() => {
                setActionTarget(null)
                if (!guardTodayOnly()) return
                router.push('/dashboard?record=1')
              }}
            >
              編輯
            </button>
            <button
              type="button"
              className="v2-record-action-item"
              onClick={() => {
                if (actionTarget.kind === 'food') {
                  void handleCopy(actionTarget.log)
                } else {
                  void (async () => {
                    for (const log of actionTarget.meal.logs) {
                      await handleCopy(log)
                    }
                  })()
                }
              }}
            >
              複製
            </button>
            {actionTarget.kind === 'food' && (
              <button
                type="button"
                className="v2-record-action-item"
                onClick={() => {
                  const log = actionTarget.log
                  toast.message(
                    `${getFoodLogDisplayLabel(log)} · ${log.calories} kcal · 蛋白質 ${Math.round(log.protein_g)}g`
                  )
                  setActionTarget(null)
                }}
              >
                查看營養明細
              </button>
            )}
            <button
              type="button"
              className="v2-record-action-item v2-record-action-item--danger"
              onClick={() => {
                setDeleteTarget(actionTarget)
                setActionTarget(null)
              }}
            >
              刪除
            </button>
            <button type="button" className="v2-record-action-cancel" onClick={() => setActionTarget(null)}>
              取消
            </button>
          </div>
        )}
      </AppOverlay>

      <AppOverlay open={!!deleteTarget} onClose={() => setDeleteTarget(null)} variant="dialog">
        <div className="v2-record-delete-dialog" onClick={e => e.stopPropagation()}>
          <p className="v2-record-delete-title">刪除這筆餐點？</p>
          <p className="v2-record-delete-desc">刪除後無法復原。</p>
          <div className="v2-record-delete-actions">
            <button type="button" className="v2-record-delete-cancel" onClick={() => setDeleteTarget(null)}>
              取消
            </button>
            <button type="button" className="v2-record-delete-confirm" onClick={() => void handleDelete()}>
              刪除
            </button>
          </div>
        </div>
      </AppOverlay>
    </div>
  )
}
