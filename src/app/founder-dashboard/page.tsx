import { createAdminClient } from '@/lib/supabase/server'
import {
  getTodaySnapshot,
  getLast7DaysSnapshot,
  getFunnelCounts,
  getRetentionCurve,
  getSubscriptionOverview,
  type DashboardSnapshot,
} from '@/lib/founder-dashboard/queries'
import type { RetentionOffsetResult } from '@/lib/founder-dashboard/retention'
import { mostCommonFailureType } from '@/lib/founder-dashboard/photo-outcomes'
import type { FunnelStageCounts } from '@/lib/founder-dashboard/funnel'
import type { PhotoPipelineFailureType } from '@/lib/analytics/events'

export const dynamic = 'force-dynamic'

/** Display-only labels — the underlying stage keys/values in lib/founder-dashboard are untouched. */
const FUNNEL_STAGE_LABELS_ZH: Record<keyof FunnelStageCounts, string> = {
  accountCreated: '建立帳號',
  onboardingCompleted: '完成引導流程',
  firstMealLogged: '首次記錄餐點',
  d1Active: '第 1 天活躍',
  d7Active: '第 7 天活躍',
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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14 }}>
      <span style={{ color: '#666' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function SnapshotRows({ snapshot }: { snapshot: DashboardSnapshot }) {
  const worstFailureType = mostCommonFailureType(snapshot.photo)
  return (
    <>
      <Row label="註冊人數" value={snapshot.signups} />
      <Row label="活躍飲食記錄者" value={snapshot.activeFoodLoggers} />
      <Row label="已記錄餐點數" value={snapshot.mealsLogged} />
      <Row label="拍照嘗試次數" value={snapshot.photo.attempts} />
      <Row label="拍照成功次數" value={snapshot.photo.success} />
      <Row label="拍照失敗次數" value={snapshot.photo.failure} />
      <Row
        label="拍照失敗率"
        value={snapshot.photo.failureRatePct != null ? `${snapshot.photo.failureRatePct}%` : '資料不足'}
      />
      <Row
        label="最常見失敗類型"
        value={worstFailureType ? FAILURE_TYPE_LABELS_ZH[worstFailureType] : '—'}
      />
      <Row label="開始試用數" value={snapshot.trialsStarted} />
      <Row label="開始訂閱數" value={snapshot.subscriptionsStarted} />
    </>
  )
}

export default async function FounderDashboardPage() {
  const supabase = createAdminClient()

  const [today, last7Days, funnel, retention, subscriptionOverview] = await Promise.all([
    getTodaySnapshot(supabase),
    getLast7DaysSnapshot(supabase),
    getFunnelCounts(supabase),
    getRetentionCurve(supabase),
    getSubscriptionOverview(supabase),
  ])

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>創辦人儀表板</h1>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
        每日區間採用 Asia/Taipei 日曆日計算。僅限管理員存取 — 權限規則與 /growth 相同。
      </p>

      <Card title={`今日 (${today.dayKey})`}>
        <SnapshotRows snapshot={today} />
      </Card>

      <Card title={`過去 7 天 (${last7Days.dayKey})`}>
        <SnapshotRows snapshot={last7Days} />
      </Card>

      <Card title="轉換漏斗">
        {funnel.map(stage => (
          <Row
            key={stage.stage}
            label={FUNNEL_STAGE_LABELS_ZH[stage.stage]}
            value={
              stage.conversionPct != null
                ? `${stage.count} (${stage.conversionPct}%)`
                : stage.count
            }
          />
        ))}
      </Card>

      <Card title="留存率（首次記錄餐點世代）">
        {retention.map(r => (
          <Row key={r.offsetDays} label={`第 ${r.offsetDays} 天`} value={formatRetentionResultZh(r)} />
        ))}
      </Card>

      <Card title="訂閱">
        <Row label="月訂閱" value={subscriptionOverview.monthlyCount} />
        <Row label="年訂閱" value={subscriptionOverview.annualCount} />
        <Row label="未知（遷移前／舊資料）" value={subscriptionOverview.unknownCount} />
        <Row label="預估月經常性收入（新台幣）" value={`NT$${subscriptionOverview.mrrTwd.toLocaleString()}`} />
      </Card>

      <Card title="錯誤總覽（過去 24 小時）">
        <Row label="食物拍照失敗次數" value={today.photo.failure} />
        <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
          總錯誤數／訂閱錯誤數／打卡儲存錯誤數是直接從 Sentry 讀取的 — 請設定
          SENTRY_AUTH_TOKEN／SENTRY_ORG／SENTRY_PROJECT 才會在這裡顯示。這個儀表板刻意不顯示完整的錯誤堆疊
          （stack trace）— 請改到 Sentry 上查看該筆 issue。
        </p>
      </Card>
    </div>
  )
}
