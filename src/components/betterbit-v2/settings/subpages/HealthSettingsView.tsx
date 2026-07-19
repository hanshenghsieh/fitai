'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  Activity,
  Apple,
  Dumbbell,
  HeartPulse,
  Loader2,
  RefreshCw,
  Ruler,
  Scale,
} from 'lucide-react'
import V2SettingsSubpageShell from './V2SettingsSubpageShell'
import {
  HealthKit,
  canQueryHealthData,
  classifyHealthKitError,
  healthKitErrorMessage,
  localDayRange,
  recentWorkoutRange,
  type HealthAuthorizationSummary,
  type HealthBodyMetrics,
  type HealthDailyActivity,
  type HealthWorkout,
} from '@/lib/health-sync'

type LoadingState = 'initial' | 'authorizing' | 'refreshing' | null

function formatNumber(value: number | undefined, maximumFractionDigits = 1): string {
  if (value === undefined || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('zh-TW', { maximumFractionDigits }).format(value)
}

function formatSample(value: number | undefined, unit: string | undefined): string {
  if (value === undefined) return '尚無資料'
  return `${formatNumber(value)}${unit ? ` ${unit}` : ''}`
}

function formatWorkoutDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const WORKOUT_NAMES: Record<number, string> = {
  13: '自行車',
  37: '跑步',
  46: '游泳',
  50: '肌力訓練',
  52: '步行',
  57: '瑜伽',
  63: '高強度間歇訓練',
}

function workoutName(activityType: number): string {
  return WORKOUT_NAMES[activityType] ?? '運動'
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-black/5 last:border-b-0">
      <span className="text-[14px]" style={{ color: '#537060' }}>{label}</span>
      <span className="text-[15px] text-right" style={{ color: '#123d24', fontWeight: 650 }}>{value}</span>
    </div>
  )
}

function HealthCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-[22px] bg-white p-4 shadow-[0_5px_20px_rgba(24,71,41,0.06)]">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#eaf5ed] text-[#287447]">
          {icon}
        </span>
        <h2 className="text-[16px]" style={{ color: '#123d24', fontWeight: 700 }}>{title}</h2>
      </div>
      {children}
    </section>
  )
}

export default function HealthSettingsView() {
  const [available, setAvailable] = useState<boolean | null>(null)
  const [summary, setSummary] = useState<HealthAuthorizationSummary | null>(null)
  const [bodyMetrics, setBodyMetrics] = useState<HealthBodyMetrics | null>(null)
  const [activity, setActivity] = useState<HealthDailyActivity | null>(null)
  const [workouts, setWorkouts] = useState<HealthWorkout[]>([])
  const [loading, setLoading] = useState<LoadingState>('initial')
  const [error, setError] = useState<string | null>(null)
  const [authorizationDenied, setAuthorizationDenied] = useState(false)

  const loadHealthData = useCallback(async (authorization: HealthAuthorizationSummary) => {
    if (!canQueryHealthData(authorization)) {
      setBodyMetrics(null)
      setActivity(null)
      setWorkouts([])
      return
    }

    const results = await Promise.allSettled([
      HealthKit.getLatestBodyMetrics(),
      HealthKit.getDailyActivity(localDayRange()),
      HealthKit.getWorkouts(recentWorkoutRange()),
    ])

    if (results[0].status === 'fulfilled') setBodyMetrics(results[0].value)
    if (results[1].status === 'fulfilled') setActivity(results[1].value)
    if (results[2].status === 'fulfilled') setWorkouts(results[2].value.workouts)

    const failure = results.find(result => result.status === 'rejected')
    if (failure?.status === 'rejected') {
      const denied = classifyHealthKitError(failure.reason) === 'denied'
      setAuthorizationDenied(denied)
      setError(healthKitErrorMessage(failure.reason))
    }
  }, [])

  const refresh = useCallback(async (mode: LoadingState = 'refreshing') => {
    setLoading(mode)
    setError(null)
    try {
      const availability = await HealthKit.isAvailable()
      setAvailable(availability.available)
      if (!availability.available) {
        setSummary(null)
        return
      }
      const authorization = await HealthKit.getAuthorizationSummary()
      setSummary(authorization)
      await loadHealthData(authorization)
    } catch (caught) {
      setError(healthKitErrorMessage(caught))
      if (classifyHealthKitError(caught) === 'unavailable') setAvailable(false)
    } finally {
      setLoading(null)
    }
  }, [loadHealthData])

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh('initial'), 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  async function requestAuthorization() {
    setLoading('authorizing')
    setError(null)
    try {
      const result = await HealthKit.requestAuthorization()
      if (!result.requestCompleted) {
        setAuthorizationDenied(true)
        return
      }
      setAuthorizationDenied(false)
      const authorization = await HealthKit.getAuthorizationSummary()
      setSummary(authorization)
      await loadHealthData(authorization)
    } catch (caught) {
      setAuthorizationDenied(classifyHealthKitError(caught) === 'denied')
      setError(healthKitErrorMessage(caught))
    } finally {
      setLoading(null)
    }
  }

  const canQuery = canQueryHealthData(summary)
  const todayActivity = activity?.days[0]
  const noBodyData = bodyMetrics !== null && !bodyMetrics.hasData
  const noActivityData = activity !== null
    && (!todayActivity || (todayActivity.steps === 0 && todayActivity.activeEnergyKcal === 0))

  return (
    <V2SettingsSubpageShell
      title="Apple Health"
      subtitle="由 Apple Health 讀取身體與活動資料，協助你掌握近期狀態。"
      headerAction={
        available ? (
          <button
            type="button"
            aria-label="重新整理健康資料"
            disabled={loading !== null}
            onClick={() => void refresh()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#287447] disabled:opacity-40"
          >
            <RefreshCw className={`h-5 w-5 ${loading === 'refreshing' ? 'animate-spin' : ''}`} />
          </button>
        ) : undefined
      }
    >
      <HealthCard icon={<Apple className="h-4 w-4" />} title="連線與權限">
        {loading === 'initial' ? (
          <div className="flex items-center gap-2 py-4 text-[14px] text-[#537060]">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在檢查 Apple Health…
          </div>
        ) : available === false ? (
          <p className="py-3 text-[14px] leading-relaxed text-[#7a807a]">
            此裝置無法使用 Apple Health。請在支援 HealthKit 的 iPhone App 中開啟此頁面。
          </p>
        ) : (
          <div className="space-y-3 py-2">
            <p className="text-[14px] leading-relaxed text-[#537060]">
              Betterbit 僅要求讀取步數、活動能量、運動、身高、體重與體脂資料；不會寫入或修改 Apple Health。
            </p>
            <p className="text-[13px]" style={{ color: authorizationDenied ? '#a53d2e' : '#537060' }}>
              {authorizationDenied
                ? '授權流程未完成，Betterbit 無法讀取健康資料。'
                : canQuery
                  ? '授權流程已完成，可以向 Apple Health 查詢資料。'
                  : '尚未完成 Apple Health 授權流程。'}
            </p>
            {canQuery ? (
              <p className="rounded-xl bg-[#f4f7f4] p-3 text-[12px] leading-relaxed text-[#6a756d]">
                Apple 為保護隱私，不會向 App 揭露各項「讀取」權限是否遭拒。若查詢沒有結果，Betterbit 會標示為「未回傳資料」，不會誤稱已連線或已授權。
              </p>
            ) : null}
            {!canQuery || authorizationDenied ? (
              <button
                type="button"
                disabled={loading !== null}
                onClick={() => void requestAuthorization()}
                className="min-h-[46px] w-full rounded-full bg-[#287447] px-4 text-[15px] font-semibold text-white disabled:opacity-50"
              >
                {loading === 'authorizing' ? '正在要求權限…' : authorizationDenied ? '再次要求授權' : '允許讀取 Apple Health'}
              </button>
            ) : null}
          </div>
        )}
        {error ? (
          <p role="alert" className="mt-2 rounded-xl bg-[#fff1ee] p-3 text-[13px] leading-relaxed text-[#a53d2e]">
            {error}
          </p>
        ) : null}
      </HealthCard>

      {available && canQuery ? (
        <>
          <HealthCard icon={<Scale className="h-4 w-4" />} title="最新身體數據">
            {noBodyData ? (
              <p className="py-3 text-[14px] leading-relaxed text-[#7a807a]">
                Apple Health 未回傳身體數據；可能尚無紀錄，或此資料類型未允許讀取。
              </p>
            ) : (
              <>
                <DataRow label="體重" value={formatSample(bodyMetrics?.weightKg?.value, 'kg')} />
                <DataRow label="體脂" value={formatSample(bodyMetrics?.bodyFatPercent?.value, '%')} />
                <DataRow label="身高" value={formatSample(bodyMetrics?.heightCm?.value, 'cm')} />
              </>
            )}
          </HealthCard>

          <HealthCard icon={<Activity className="h-4 w-4" />} title="今天的活動">
            {noActivityData ? (
              <p className="py-3 text-[14px] leading-relaxed text-[#7a807a]">
                Apple Health 未回傳今天的活動資料；可能尚無紀錄，或此資料類型未允許讀取。
              </p>
            ) : (
              <>
                <DataRow label="步數" value={todayActivity ? `${formatNumber(todayActivity.steps, 0)} 步` : '尚無資料'} />
                <DataRow label="活動能量" value={todayActivity ? `${formatNumber(todayActivity.activeEnergyKcal, 0)} kcal` : '尚無資料'} />
              </>
            )}
          </HealthCard>

          <HealthCard icon={<Dumbbell className="h-4 w-4" />} title="最近運動">
            {workouts.length === 0 ? (
              <p className="py-3 text-[14px] leading-relaxed text-[#7a807a]">
                最近 14 天未回傳運動紀錄；可能沒有紀錄，或運動資料未允許讀取。
              </p>
            ) : (
              <div className="divide-y divide-black/5">
                {workouts.slice(0, 10).map(workout => (
                  <div key={workout.uuid} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[15px] font-semibold text-[#123d24]">{workoutName(workout.activityType)}</p>
                        <p className="mt-1 text-[12px] text-[#7a807a]">{formatWorkoutDate(workout.startDate)}</p>
                      </div>
                      <p className="text-[14px] font-semibold text-[#287447]">
                        {formatNumber(workout.durationSeconds / 60, 0)} 分鐘
                      </p>
                    </div>
                    {workout.activeEnergyKcal !== undefined ? (
                      <p className="mt-1 text-[12px] text-[#537060]">
                        {formatNumber(workout.activeEnergyKcal, 0)} kcal
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </HealthCard>

          <div className="flex items-start gap-2 px-2 text-[12px] leading-relaxed text-[#7a807a]">
            <HeartPulse className="mt-0.5 h-4 w-4 shrink-0" />
            資料只在此畫面顯示，不會儲存在 Betterbit 資料庫。
          </div>
        </>
      ) : null}

      {available && authorizationDenied ? (
        <div className="flex items-start gap-2 rounded-[18px] bg-[#fff8e9] p-4 text-[13px] leading-relaxed text-[#705b2f]">
          <Ruler className="mt-0.5 h-4 w-4 shrink-0" />
          授權流程未完成。若要開啟讀取，請到 iPhone 的「設定 &gt; 健康 &gt; 資料存取權限與裝置」調整 Betterbit 權限。
        </div>
      ) : null}
    </V2SettingsSubpageShell>
  )
}
