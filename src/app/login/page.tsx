'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import { getSanitizedLoginError, logLoginError } from '@/lib/auth/login-error'
import { clearUserLocalState } from '@/lib/clear-user-local-state'
import V2PageBackground from '@/components/betterbit-v2/V2PageBackground'
import V2Card from '@/components/betterbit-v2/V2Card'
import { iosLocalPath } from '@/lib/ios-local-path'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      clearUserLocalState()
      toast.success('回來了。')
      await new Promise(r => setTimeout(r, 400))
      router.push(iosLocalPath('/dashboard'))
      router.refresh()
    } catch (err: unknown) {
      logLoginError(err)
      const sanitized = getSanitizedLoginError(err)
      if (process.env.NEXT_PUBLIC_BUILD_TARGET === 'ios-local') {
        const d = sanitized.debug
        toast.error(`${sanitized.message}｜${d.name ?? ''} ${d.status ?? ''} ${d.message ?? ''}`.trim())
      } else {
        toast.error(sanitized.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <V2PageBackground className="min-h-[100dvh] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-[24px]" style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}>
            回來了。今天吃什麼？
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
              <Link href={iosLocalPath('/register')} style={{ color: BB_V2.accent.green, fontWeight: 600 }}>
                註冊
              </Link>
            </p>
          </form>
        </V2Card>
        <Link href={iosLocalPath('/')} className="block text-center text-[13px]" style={{ color: BB_V2.text.muted }}>
          ← 首頁
        </Link>
      </div>
    </V2PageBackground>
  )
}
