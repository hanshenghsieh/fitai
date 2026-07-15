'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient, isCapacitorNative } from '@/lib/supabase/client'
import { waitForSession } from '@/lib/supabase/wait-for-session'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { colors } from '@/lib/design-system'
import { pickZaiJianLine } from '@/lib/copy/zaijian'
import ZaiJian from '@/components/character/ZaiJian'
import { apiFetch } from '@/lib/api/client'

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('密碼至少 8 個字')
      return
    }
    setLoading(true)
    const supabase = createClient()
    try {
      const signupRes = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      })
      const signupData = await signupRes.json()
      if (!signupRes.ok) throw new Error(signupData.error || '註冊失敗')
      if (typeof signupData.userId !== 'string' || !signupData.userId) {
        throw new Error('帳號已建立，但無法確認新帳號身分。請重新登入。')
      }

      const loginResult = await supabase.auth.signInWithPassword({ email, password })
      if (loginResult.error) throw loginResult.error
      const immediateSession = loginResult.data.session
      const immediateUser = loginResult.data.user
      if (!immediateSession || !immediateUser) {
        throw new Error('帳號已建立，但登入連線尚未建立。請重新登入。')
      }
      if (immediateUser.id !== signupData.userId || immediateSession.user.id !== signupData.userId) {
        throw new Error('登入帳號與新建立帳號不一致。請先登出後再試。')
      }
      if (!immediateSession.access_token) {
        throw new Error('帳號已建立，但登入憑證不完整。請重新登入。')
      }

      const stabilized = await waitForSession(supabase, {
        expectedUserId: signupData.userId,
        requireAccessToken: true,
        verifyPersistedStorage: isCapacitorNative(),
        timeoutMs: 5_000,
        intervalMs: 150,
      })
      if (!stabilized.ok) {
        const reason =
          stabilized.reason === 'user_mismatch'
            ? '登入帳號與新建立帳號不一致。'
            : stabilized.reason === 'missing_access_token'
              ? '登入憑證不完整。'
              : stabilized.reason === 'storage_not_persisted'
                ? '登入狀態無法儲存到裝置。'
                : stabilized.reason === 'get_session_error'
                  ? '無法讀取登入狀態。'
                  : '登入連線未在時間內建立。'
        throw new Error(`帳號已建立，但${reason}請重新登入。`)
      }

      const { clearUserLocalState } = await import('@/lib/clear-user-local-state')
      clearUserLocalState()
      toast.success('好，認識一下。')
      window.location.assign('/onboarding?login=1')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : pickZaiJianLine('error').text)
      setLoading(false)
    }
  }

  return (
    <div className="auth-page-shell flex items-center justify-center p-4" style={{ backgroundColor: colors.bg.canvas }}>
      <div className="w-full max-w-md space-y-6">
        <ZaiJian size="lg" line={pickZaiJianLine('onboarding_1')} layout="bubble" />
        <form
          onSubmit={handleRegister}
          className="rounded-2xl p-6 space-y-4"
          style={{ backgroundColor: colors.bg.elevated, border: `1px solid ${colors.border.subtle}` }}
        >
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[13px]">暱稱</Label>
            <Input id="name" placeholder="怎麼叫你？" value={displayName} onChange={e => setDisplayName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[13px]">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[13px]">密碼（8 字以上）</Label>
            <Input id="password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
          </div>
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full py-3 rounded-xl text-[15px] font-semibold disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ backgroundColor: colors.accent.action, color: '#FFFDF9' }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : '建立帳號'}
          </button>
          <p className="text-[13px] text-center" style={{ color: colors.text.tertiary }}>
            已有帳號？ <Link href="/login" style={{ color: colors.accent.action }}>登入</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
