'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AuthCancelledError,
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
  type AuthCompletion,
} from '@/lib/auth/auth-service'
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
  const [loadingProvider, setLoadingProvider] = useState<'email' | 'google' | 'apple' | null>(null)

  function finishLogin(completion: AuthCompletion | null) {
    // Web OAuth navigates away from this page itself.
    if (!completion) return
    window.location.assign(`${completion.nextPath}?login=1`)
  }

  function showAuthError(err: unknown) {
    if (err instanceof AuthCancelledError) return
    const msg = err instanceof Error ? err.message : ''
    let friendly: string
    if (/invalid login credentials/i.test(msg)) {
      friendly = '帳號或密碼不對。再試一次。'
    } else if (/email not confirmed/i.test(msg)) {
      friendly = '這個 email 還沒完成驗證。'
    } else if (/failed to fetch|network|timeout|fetch/i.test(msg)) {
      friendly = '網路連線有問題，請確認網路後再試。'
    } else {
      friendly = msg || pickZaiJianLine('error').text
    }
    console.log('[login] failed:', msg || '(unknown)')
    toast.error(friendly)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (loadingProvider !== null) return
    console.log('[LOGIN] submit start', { provider: 'email' })
    setLoadingProvider('email')
    try {
      finishLogin(await signInWithEmail(email, password))
    } catch (err) {
      showAuthError(err)
    } finally {
      setLoadingProvider(null)
    }
  }

  async function handleProvider(provider: 'google' | 'apple') {
    if (loadingProvider !== null) return
    console.log('[LOGIN] submit start', { provider })
    setLoadingProvider(provider)
    try {
      const completion =
        provider === 'google' ? await signInWithGoogle() : await signInWithApple()
      finishLogin(completion)
    } catch (err) {
      showAuthError(err)
    } finally {
      setLoadingProvider(null)
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
            <button type="submit" disabled={loadingProvider === 'email'} className="v2-btn-primary w-full disabled:opacity-40">
              {loadingProvider === 'email' ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : '登入'}
            </button>
            <div className="flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1" style={{ backgroundColor: BB_V2.border }} />
              <span className="text-[12px]" style={{ color: BB_V2.text.muted }}>或</span>
              <span className="h-px flex-1" style={{ backgroundColor: BB_V2.border }} />
            </div>
            <button
              type="button"
              disabled={loadingProvider === 'google'}
              onClick={() => void handleProvider('google')}
              className="w-full min-h-[44px] rounded-xl border flex items-center justify-center gap-2 text-[14px] font-semibold disabled:opacity-40"
              style={{ borderColor: BB_V2.border, color: BB_V2.text.primary, backgroundColor: BB_V2.bg.card }}
            >
              {loadingProvider === 'google' ? <Loader2 className="h-4 w-4 animate-spin" /> : <span aria-hidden="true">G</span>}
              使用 Google 登入
            </button>
            <button
              type="button"
              disabled={loadingProvider === 'apple'}
              onClick={() => void handleProvider('apple')}
              className="w-full min-h-[44px] rounded-md flex items-center justify-center gap-2 text-[14px] font-semibold disabled:opacity-40"
              style={{ color: '#fff', backgroundColor: '#000' }}
            >
              {loadingProvider === 'apple' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span aria-hidden="true" className="text-[20px] leading-none" style={{ fontFamily: '-apple-system, BlinkMacSystemFont' }}>
                  
                </span>
              )}
              使用 Apple 登入
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
