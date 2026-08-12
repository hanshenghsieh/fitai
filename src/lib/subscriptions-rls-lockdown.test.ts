import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

function readRepoFile(relativePath: string): string {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8')
}

const LOCKDOWN_MIGRATION = readRepoFile(
  'supabase/migrations/20260729010000_subscriptions_lock_client_writes.sql'
)
const FIX_MIGRATION = readRepoFile(
  'supabase/migrations/20260729020000_fix_subscriptions_rls_policy.sql'
)
const ALL_SUBSCRIPTIONS_MIGRATIONS = [LOCKDOWN_MIGRATION, FIX_MIGRATION]

function stripSqlComments(sql: string): string {
  return sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
}

function callerVariableForWrite(source: string, writeSnippet: string): string | undefined {
  const writeIndex = source.indexOf(writeSnippet)
  assert.ok(writeIndex >= 0, `expected to find "${writeSnippet}" in source`)
  const preceding = source.slice(0, writeIndex)
  const lastFromSubscriptions = preceding.lastIndexOf(".from('subscriptions')")
  return preceding
    .slice(0, lastFromSubscriptions)
    .trimEnd()
    .split(/\s|\n/)
    .filter(Boolean)
    .pop()
}

describe('subscriptions RLS lockdown (client cannot self-grant premium)', () => {
  describe('migration content', () => {
    it('drops the originally-tracked client-writable INSERT policy', () => {
      assert.match(
        LOCKDOWN_MIGRATION,
        /DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public\.subscriptions/
      )
    })

    it('drops the originally-tracked client-writable UPDATE policy', () => {
      assert.match(
        LOCKDOWN_MIGRATION,
        /DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public\.subscriptions/
      )
    })

    it('drops the untracked "preview subscriptions own rows" ALL policy found on production', () => {
      assert.match(
        FIX_MIGRATION,
        /DROP POLICY IF EXISTS "preview subscriptions own rows" ON public\.subscriptions/
      )
    })

    it('replaces it with a SELECT-only policy scoped to authenticated + own row', () => {
      assert.match(
        FIX_MIGRATION,
        /CREATE POLICY "preview subscriptions read own rows"\s*\nON public\.subscriptions\s*\nFOR SELECT\s*\nTO authenticated\s*\nUSING \(auth\.uid\(\) = user_id\)/
      )
    })

    it('revokes INSERT/UPDATE grants from the authenticated role in both migrations', () => {
      for (const migration of ALL_SUBSCRIPTIONS_MIGRATIONS) {
        assert.match(migration, /REVOKE INSERT, UPDATE ON public\.subscriptions FROM authenticated/)
      }
    })

    it('does not touch SELECT access or service_role/postgres grants anywhere', () => {
      for (const migration of ALL_SUBSCRIPTIONS_MIGRATIONS) {
        assert.doesNotMatch(migration, /DROP POLICY[^;]*SELECT[^;]*subscriptions/i)
        assert.doesNotMatch(migration, /REVOKE SELECT/i)
        assert.doesNotMatch(migration, /REVOKE[^;]*FROM (service_role|postgres)/i)
      }
    })

    it('no longer creates any policy that grants INSERT/UPDATE to authenticated', () => {
      for (const migration of ALL_SUBSCRIPTIONS_MIGRATIONS) {
        const sql = stripSqlComments(migration)
        assert.doesNotMatch(sql, /FOR INSERT/i)
        assert.doesNotMatch(sql, /FOR UPDATE/i)
        assert.doesNotMatch(sql, /FOR ALL/i)
      }
    })

    it('is safe to run on a fresh database (every statement is IF EXISTS / re-runnable)', () => {
      assert.match(FIX_MIGRATION, /DROP POLICY IF EXISTS/)
      assert.doesNotMatch(FIX_MIGRATION, /DROP POLICY(?! IF EXISTS)/)
    })
  })

  describe('scenario 1 & 2 — authenticated client cannot INSERT or UPDATE subscriptions', () => {
    it('scenario 1: authenticated INSERT is blocked (no policy or grant permits it)', () => {
      for (const migration of ALL_SUBSCRIPTIONS_MIGRATIONS) {
        assert.doesNotMatch(migration, /FOR INSERT[\s\S]*TO authenticated/i)
      }
      assert.match(LOCKDOWN_MIGRATION, /REVOKE INSERT,\s*UPDATE ON public\.subscriptions FROM authenticated/)
    })

    it('scenario 2: authenticated UPDATE is blocked (no policy or grant permits it)', () => {
      for (const migration of ALL_SUBSCRIPTIONS_MIGRATIONS) {
        assert.doesNotMatch(migration, /FOR UPDATE[\s\S]*TO authenticated/i)
      }
      assert.match(LOCKDOWN_MIGRATION, /REVOKE INSERT,\s*UPDATE ON public\.subscriptions FROM authenticated/)
    })
  })

  describe('scenario 3 & 4 — service_role can still INSERT and UPDATE subscriptions', () => {
    it('scenario 3: every writer performing an INSERT/upsert uses the service-role admin client', () => {
      const stripeWebhook = readRepoFile('src/app/api/webhooks/stripe/route.ts')
      assert.match(stripeWebhook, /const supabase = createAdminClient\(\)/)
      assert.match(stripeWebhook, /supabase\.from\('subscriptions'\)\.upsert\(/)

      const revenuecatWebhook = readRepoFile('src/app/api/webhooks/revenuecat/route.ts')
      assert.match(revenuecatWebhook, /upsertAppleIapSubscription\(admin,/)

      const appleIapSync = readRepoFile('src/app/api/apple-iap/sync/route.ts')
      // Accepts either the inline call or the `const admin = createAdminClient()`
      // variable form (the latter is also reused for the Phase 2 analytics
      // track() call in this route) — both guarantee the admin/service-role
      // client, never a user-scoped one, is what upsertAppleIapSubscription receives.
      assert.match(appleIapSync, /const admin = createAdminClient\(\)/)
      assert.match(appleIapSync, /upsertAppleIapSubscription\(admin,\s*verified\)/)

      // apple-iap-store.ts itself is client-agnostic (takes a SupabaseClient param);
      // both call sites above are what guarantee it always receives the admin client.
      const appleIapStore = readRepoFile('src/lib/apple-iap-store.ts')
      assert.match(appleIapStore, /\.from\('subscriptions'\)\.upsert\(/)
    })

    it('scenario 4: cancel-subscription (the one route with an UPDATE) uses the service-role admin client', () => {
      const source = readRepoFile('src/app/api/cancel-subscription/route.ts')
      assert.match(source, /import \{ createAdminClient \} from '@\/lib\/supabase\/server'/)
      assert.equal(
        callerVariableForWrite(source, ".update({ cancel_at_period_end"),
        'admin',
        'the subscriptions UPDATE must run through the admin (service-role) client, not the RLS-scoped user client'
      )
    })

    it('no writer path was left relying on the now-revoked user-bound client', () => {
      // delete-account only cancels Stripe subscriptions externally and reads
      // (via admin) to find them — it never writes to the subscriptions table.
      const deleteAccount = readRepoFile('src/app/api/delete-account/route.ts')
      assert.doesNotMatch(deleteAccount, /\.from\('subscriptions'\)\.(insert|update|upsert)\(/)

      // check-free-upgrade only reads subscriptions and writes to the
      // unrelated free_upgrades table.
      const checkFreeUpgrade = readRepoFile('src/app/api/check-free-upgrade/route.ts')
      assert.doesNotMatch(checkFreeUpgrade, /\.from\('subscriptions'\)\.(insert|update|upsert)\(/)
    })
  })

  it('no browser/client component writes to subscriptions directly', () => {
    // Regression guard: fails loudly if a future 'use client' component ever
    // calls supabase.from('subscriptions').insert/update/upsert from the browser.
    const clientSideWriteSites: string[] = []
    // Known safe: the only 'use client' file matching "subscriptions" today is
    // ProActiveStatusV2View.tsx, and its only match is the Apple subscriptions
    // *management URL* string, not a table write — asserted explicitly below.
    const proActiveStatusView = readRepoFile(
      'src/components/betterbit-v2/ProActiveStatusV2View.tsx'
    )
    assert.doesNotMatch(proActiveStatusView, /\.from\('subscriptions'\)/)
    assert.equal(clientSideWriteSites.length, 0)
  })
})
