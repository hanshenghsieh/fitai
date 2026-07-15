'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient, isCapacitorNative, clientType, NATIVE_AUTH_STORAGE_KEY } from '@/lib/supabase/client'
import { waitForSession } from '@/lib/supabase/wait-for-session'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import { pickZaiJianLine } from '@/lib/copy/zaijian'
import V2PageBackground from '@/components/betterbit-v2/V2PageBackground'
import V2Card from '@/components/betterbit-v2/V2Card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    console.log('[LOGIN] submit start')
    console.log('[LOGIN] isNative =', isCapacitorNative())
    console.log('[LOGIN] clientType =', clientType())
    setLoading(true)
    const supabase = createClient()
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        console.log('[LOGIN] signIn success = false', error.message)
        throw error
      }
      console.log('[LOGIN] signIn success =', true, '| immediate session =', !!data.session)

      const { clearUserLocalState } = await import('@/lib/clear-user-local-state')
      clearUserLocalState()

      // Confirm the session is actually persisted (localStorage on native)
      // before navigating — avoids redirecting into a guard that sees no session.
      const session = await waitForSession(supabase, { retries: 6, delayMs: 300 })
      console.log('[LOGIN] session after signIn =', !!session?.user)
      if (typeof window !== 'undefined') {
        const authKeys = Object.keys(window.localStorage).filter(
          k => k.includes(NATIVE_AUTH_STORAGE_KEY) || k.includes('auth-token')
        )
        console.log('[LOGIN] localStorage auth keys =', authKeys)
      }
      if (!session?.user) {
        toast.error('登入連線建立失敗，請確認網路後再試一次。')
        setLoading(false)
        return
      }

      console.log('[LOGIN] redirect to /dashboard?login=1')
      // Hard navigation (NOT router.push): forces a clean page load so the
      // dashboard guard reads the freshly-restored session instead of bouncing.
      // No success toast — the redirect itself is the confirmation.
      window.location.assign('/dashboard?login=1')
      // Safety net: if assign somehow didn't navigate (rare WKWebView quirk),
      // force a replace so we never sit stuck on /login.
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname.includes('/login')) {
          console.log('[LOGIN] assign stalled — forcing replace')
          window.location.replace('/dashboard?login=1')
        }
      }, 1000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      let friendly: string
      if (/invalid login credentials/i.test(msg)) {
        friendly = '帳號或密碼不對。再試一次。'
      } else if (/email not confirmed/i.test(msg)) {
        friendly = '這個 email 還沒完成驗證。'
      } else if (/failed to fetch|network|timeout|fetch/i.test(msg)) {
        friendly = '網路連線有問題，請確認網路後再試。'
      } else {
        friendly = pickZaiJianLine('error').text
      }
      console.log('[login] failed:', msg || '(unknown)')
      toast.error(friendly)
      setLoading(false)
    }
  }

  return (
    <V2PageBackground className="min-h-[100dvh] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-[24px]" style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}>
            今天吃什麼？
          </h1>
          <p className="text-[14px]" style={{ color: BB_V2.text.secondary }}>
            登入 Betterbit，繼續你的減脂節奏。
          </p>
        </div>
        <V2Card padding="24px">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[13px]">
                電子郵件
              </Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[13px]">
                密碼
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="v2-btn-primary w-full disabled:opacity-40">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : '登入'}
            </button>
            <p className="text-[13px] text-center" style={{ color: BB_V2.text.muted }}>
              還沒有帳號？{' '}
              <Link href="/register" style={{ color: BB_V2.accent.green, fontWeight: 600 }}>
                註冊
              </Link>
            </p>
          </form>
        </V2Card>
        <Link href="/" className="block text-center text-[13px]" style={{ color: BB_V2.text.muted }}>
          ← 首頁
        </Link>
      </div>
    </V2PageBackground>
  )
}
