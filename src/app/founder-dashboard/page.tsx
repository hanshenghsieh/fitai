import { createAdminClient } from '@/lib/supabase/server'
import {
  getTodaySnapshot,
  getLast7DaysSnapshot,
  getFunnelCounts,
  getRetentionCurve,
  getSubscriptionOverview,
  mealsPerActiveUser,
  type DashboardSnapshot,
} from '@/lib/founder-dashboard/queries'
import type { RetentionOffsetResult } from '@/lib/founder-dashboard/retention'
import { mostCommonFailureType } from '@/lib/founder-dashboard/photo-outcomes'
import type { FunnelStageCounts } from '@/lib/founder-dashboard/funnel'
import type { PhotoPipelineFailureType } from '@/lib/analytics/events'
import { collectDashboardWarnings } from '@/lib/founder-dashboard/data-quality'
import ReleaseConfigEditor, { type ReleaseConfigFormValue } from './ReleaseConfigEditor'
import {
  activationRateAlert,
  retentionAlert,
  photoResolutionRateAlert,
  photoFailureRateAlert,
  trialToPaidAlert,
  errorCountAlert,
  mostCommonFailureTypeAlert,
  dataQualityAlert,
  KPI_ALERT_COLOR,
} from '@/lib/founder-dashboard/kpi-alerts'

/** D1/D7 have defined danger thresholds; D3 has none yet (stays neutral whenever data is valid) — see PHASE 3 spec. */
function retentionDangerThreshold(offsetDays: number): number | null {
  if (offsetDays === 1) return 25
  if (offsetDays === 7) return 10
  return null
}

export const dynamic = 'force-dynamic'

/** Display-only labels — the underlying stage keys/values in lib/founder-dashboard are untouched. Every stage is "% of 建立帳號 cohort". */
const FUNNEL_STAGE_LABELS_ZH: Record<keyof FunnelStageCounts, string> = {
  accountCreated: '建立帳號',
  onboardingCompleted: '完成引導流程',
  firstMealLogged: '首次記錄餐點（Activation Rate）',
  trialStarted: '開始試用',
  subscriptionStarted: '開始訂閱',
}

/** Display-only labels for the PhotoPipelineFailureType taxonomy shared with Sentry tags. */
const FAILURE_TYPE_LABELS_ZH: Record<PhotoPipelineFailureType, string> = {
  network_error: '網路錯誤',
  provider_error: '服務商錯誤',
  timeout: '逾時',
  parse_error: '解析錯誤',
  schema_error: '格式錯誤',
  no_food_detected: '未偵測到食物',
  database_match_failed: '資料庫比對失敗',
  unknown_error: '未知錯誤',
}

/** Display-only formatting mirroring retention.ts's formatRetentionResult, in Traditional Chinese. */
function formatRetentionResultZh(result: RetentionOffsetResult): string {
  if (result.insufficientData || result.retentionPct == null) return '資料不足'
  return `${result.retentionPct}%（${result.activeCount} / ${result.cohortSize}）`
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ border: '1px solid #e5e5e5', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{title}</h2>
      {children}
    </section>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: 12, fontWeight: 700, color: '#999', marginTop: 12, marginBottom: 4 }}>{children}</h3>
  )
}

export function Row({ label, value, valueColor }: { label: string; value: React.ReactNode; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14 }}>
      <span style={{ color: '#666' }}>{label}</span>
      <span style={{ fontWeight: 600, color: valueColor }}>{value}</span>
    </div>
  )
}

function CoreHealthRows({ label, snapshot }: { label: string; snapshot: DashboardSnapshot }) {
  const perActiveUser = mealsPerActiveUser(snapshot)
  return (
    <>
      <SubHeading>{label}</SubHeading>
      <Row label="活躍飲食記錄者（獨立用戶數）" value={snapshot.activeFoodLoggers} />
      <Row label="新增註冊數" value={snapshot.signups} />
      <Row label="已記錄餐點數" value={snapshot.mealsLogged} />
      <Row label="每活躍用戶餐點數" value={perActiveUser != null ? perActiveUser.toFixed(1) : '資料不足'} />
    </>
  )
}

function ProductCoreRows({ label, snapshot }: { label: string; snapshot: DashboardSnapshot }) {
  const worstFailureType = mostCommonFailureType(snapshot.photo)
  const failureLevel = errorCountAlert(snapshot.photo.failure)
  const resolutionLevel = photoResolutionRateAlert(snapshot.photo)
  const failureRateLevel = photoFailureRateAlert(snapshot.photo)
  const failureTypeLevel = mostCommonFailureTypeAlert(snapshot.photo.failure)
  return (
    <>
      <SubHeading>{label}</SubHeading>
      <Row label="拍照嘗試次數" value={snapshot.photo.attempts} />
      <Row label="完成辨識次數" value={snapshot.photo.success} />
      <Row label="失敗次數" value={snapshot.photo.failure} valueColor={KPI_ALERT_COLOR[failureLevel]} />
      <Row label="未完成中止次數" value={snapshot.photo.abandoned} />
      <Row
        label="失敗率（成功+失敗為分母）"
        value={snapshot.photo.failureRatePct != null ? `${snapshot.photo.failureRatePct}%` : '資料不足'}
        valueColor={KPI_ALERT_COLOR[failureRateLevel]}
      />
      <Row
        label="拍照解析率（真正解析出營養資料）"
        value={snapshot.photo.resolutionRatePct != null ? `${snapshot.photo.resolutionRatePct}%` : '資料不足'}
        valueColor={KPI_ALERT_COLOR[resolutionLevel]}
      />
      <Row
        label="最常見失敗類型"
        value={worstFailureType ? FAILURE_TYPE_LABELS_ZH[worstFailureType] : '—'}
        valueColor={KPI_ALERT_COLOR[failureTypeLevel]}
      />
    </>
  )
}

export default async function FounderDashboardPage() {
  const supabase = createAdminClient()

  const [today, last7Days, funnel, retention, subscriptionOverview, releaseConfigRow] = await Promise.all([
    getTodaySnapshot(supabase),
    getLast7DaysSnapshot(supabase),
    getFunnelCounts(supabase),
    getRetentionCurve(supabase),
    getSubscriptionOverview(supabase),
    supabase
      .from('app_release_config')
      .select('latest_version, minimum_version, title, message, update_url, force_update, enabled')
      .eq('platform', 'ios')
      .maybeSingle()
      .then(res => res.data),
  ])

  const releaseConfigInitial: ReleaseConfigFormValue = releaseConfigRow ?? {
    latest_version: '',
    minimum_version: '',
    title: '',
    message: '',
    update_url: '',
    force_update: false,
    enabled: false,
  }

  const warnings = collectDashboardWarnings({
    funnel: funnel.stages,
    photoToday: today.photo,
    photoLast7Days: last7Days.photo,
    retention,
    subscriptionOverview,
  })

  const notYetEligibleNote = retention.filter(r => r.notYetEligibleCount > 0)
  const dataQualityLevel = dataQualityAlert(warnings.length)

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>創辦人儀表板</h1>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
        每日區間採用 Asia/Taipei 日曆日計算。僅限管理員存取 — 權限規則與 /growth 相同。
      </p>

      {dataQualityLevel === 'danger' && (
        <section
          style={{
            border: `1px solid ${KPI_ALERT_COLOR.danger}`,
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 20,
            fontSize: 13,
          }}
        >
          <strong style={{ color: KPI_ALERT_COLOR.danger }}>⚠️ 資料口徑異常</strong>
          <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 18, color: KPI_ALERT_COLOR.danger }}>
            {warnings.map((w, i) => (
              <li key={i}>{w.message}</li>
            ))}
          </ul>
        </section>
      )}

      <Card title="核心健康度">
        <CoreHealthRows label={`今日（DAU） (${today.dayKey})`} snapshot={today} />
        <CoreHealthRows label={`過去 7 天（WAU） (${last7Days.dayKey})`} snapshot={last7Days} />
      </Card>

      <Card title="產品核心（拍照 / AI 辨識）">
        <ProductCoreRows label="今日" snapshot={today} />
        <ProductCoreRows label="過去 7 天" snapshot={last7Days} />
      </Card>

      <Card title="轉換漏斗（建立帳號世代，全部以建立帳號人數為分母）">
        {funnel.stages.map(stage => (
          <Row
            key={stage.stage}
            label={FUNNEL_STAGE_LABELS_ZH[stage.stage]}
            value={
              stage.conversionPct != null
                ? `${stage.count} (${stage.conversionPct}%)`
                : stage.count
            }
            valueColor={
              stage.stage === 'firstMealLogged'
                ? KPI_ALERT_COLOR[activationRateAlert(stage)]
                : undefined
            }
          />
        ))}
      </Card>

      <Card title="留存率（首次記錄餐點世代）">
        {retention.map(r => (
          <Row
            key={r.offsetDays}
            label={`第 ${r.offsetDays} 天`}
            value={formatRetentionResultZh(r)}
            valueColor={KPI_ALERT_COLOR[retentionAlert(r, retentionDangerThreshold(r.offsetDays))]}
          />
        ))}
        {notYetEligibleNote.length > 0 && (
          <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
            {notYetEligibleNote
              .map(r => `${r.notYetEligibleCount} 位用戶尚未達到第 ${r.offsetDays} 天，未列入計算`)
              .join('；')}
          </p>
        )}
      </Card>

      <Card title="訂閱 / 營收">
        <Row label="今日開始試用數" value={today.trialsStarted} />
        <Row label="過去 7 天開始試用數" value={last7Days.trialsStarted} />
        <Row label="今日開始訂閱數（獨立用戶數）" value={today.subscriptionsStarted} />
        <Row label="過去 7 天開始訂閱數（獨立用戶數）" value={last7Days.subscriptionsStarted} />
        <Row
          label="試用 → 付費轉換率（建立帳號世代內）"
          value={funnel.trialToPaidPct != null ? `${funnel.trialToPaidPct}%` : '資料不足'}
          valueColor={KPI_ALERT_COLOR[trialToPaidAlert(funnel.trialToPaidPct)]}
        />
        <Row label="月訂閱" value={subscriptionOverview.monthlyCount} />
        <Row label="年訂閱" value={subscriptionOverview.annualCount} />
        <Row label="未知（遷移前／舊資料）" value={subscriptionOverview.unknownCount} />
        <Row label="預估月經常性收入（新台幣）" value={`NT$${subscriptionOverview.mrrTwd.toLocaleString()}`} />
      </Card>

      <Card title="錯誤總覽（過去 24 小時）">
        <Row
          label="食物拍照失敗次數（今日）"
          value={today.photo.failure}
          valueColor={KPI_ALERT_COLOR[errorCountAlert(today.photo.failure)]}
        />
        <Row
          label="食物拍照失敗次數（過去 7 天）"
          value={last7Days.photo.failure}
          valueColor={KPI_ALERT_COLOR[errorCountAlert(last7Days.photo.failure)]}
        />
        <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
          總錯誤數／訂閱錯誤數／打卡儲存錯誤數是直接從 Sentry 讀取的 — 請設定
          SENTRY_AUTH_TOKEN／SENTRY_ORG／SENTRY_PROJECT 才會在這裡顯示。這個儀表板刻意不顯示完整的錯誤堆疊
          （stack trace）— 請改到 Sentry 上查看該筆 issue。
        </p>
      </Card>

      <Card title="App 更新公告設定（iOS）">
        <ReleaseConfigEditor initial={releaseConfigInitial} />
      </Card>
    </div>
  )
}
