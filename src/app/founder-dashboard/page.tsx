import { createAdminClient } from '@/lib/supabase/server'
import {
  getTodaySnapshot,
  getLast7DaysSnapshot,
  getFunnelCounts,
  getRetentionCurve,
  getSubscriptionOverview,
  type DashboardSnapshot,
} from '@/lib/founder-dashboard/queries'
import { formatRetentionResult } from '@/lib/founder-dashboard/retention'
import { mostCommonFailureType } from '@/lib/founder-dashboard/photo-outcomes'

export const dynamic = 'force-dynamic'

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
      <Row label="Signups" value={snapshot.signups} />
      <Row label="Active Food Loggers" value={snapshot.activeFoodLoggers} />
      <Row label="Meals logged" value={snapshot.mealsLogged} />
      <Row label="Photo attempts" value={snapshot.photo.attempts} />
      <Row label="Photo success" value={snapshot.photo.success} />
      <Row label="Photo failure" value={snapshot.photo.failure} />
      <Row
        label="Photo failure rate"
        value={snapshot.photo.failureRatePct != null ? `${snapshot.photo.failureRatePct}%` : 'Insufficient data'}
      />
      <Row label="Most common failure type" value={worstFailureType ?? '—'} />
      <Row label="Trials started" value={snapshot.trialsStarted} />
      <Row label="Subscriptions started" value={snapshot.subscriptionsStarted} />
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
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Founder Dashboard</h1>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
        Daily buckets use plain Asia/Taipei calendar days. Admin-only — gated the same way as /growth.
      </p>

      <Card title={`Today (${today.dayKey})`}>
        <SnapshotRows snapshot={today} />
      </Card>

      <Card title={`Last 7 Days (${last7Days.dayKey})`}>
        <SnapshotRows snapshot={last7Days} />
      </Card>

      <Card title="Funnel">
        {funnel.map(stage => (
          <Row
            key={stage.stage}
            label={stage.stage}
            value={
              stage.conversionPct != null
                ? `${stage.count} (${stage.conversionPct}%)`
                : stage.count
            }
          />
        ))}
      </Card>

      <Card title="Retention (first_meal cohort)">
        {retention.map(r => (
          <Row key={r.offsetDays} label={`D${r.offsetDays}`} value={formatRetentionResult(r)} />
        ))}
      </Card>

      <Card title="Subscriptions">
        <Row label="Monthly" value={subscriptionOverview.monthlyCount} />
        <Row label="Annual" value={subscriptionOverview.annualCount} />
        <Row label="Unknown (pre-migration/legacy)" value={subscriptionOverview.unknownCount} />
        <Row label="Est. MRR (TWD)" value={`NT$${subscriptionOverview.mrrTwd.toLocaleString()}`} />
      </Card>

      <Card title="Error Overview (last 24h)">
        <Row label="Food photo failures" value={today.photo.failure} />
        <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
          Total error / subscription-error / checkin-save-error counts read from Sentry directly —
          configure SENTRY_AUTH_TOKEN / SENTRY_ORG / SENTRY_PROJECT to surface them here. Stack
          traces are intentionally not shown in this dashboard — open the Sentry issue instead.
        </p>
      </Card>
    </div>
  )
}
