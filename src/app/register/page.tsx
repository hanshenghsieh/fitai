'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { colors } from '@/lib/design-system'
import { pickZaiJianLine } from '@/lib/copy/zaijian'
import ZaiJian from '@/components/character/ZaiJian'

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('密碼至少 8 個字')
      return
    }
    setLoading(true)
    const supabase = createClient()
    try {
      const signupRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      })
      const signupData = await signupRes.json()
      if (!signupRes.ok) throw new Error(signupData.error || '註冊失敗')

      const loginResult = await supabase.auth.signInWithPassword({ email, password })
      if (loginResult.error) throw loginResult.error

      toast.success('好，認識一下。')
      await new Promise(r => setTimeout(r, 400))
      router.push('/onboarding')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : pickZaiJianLine('error').text)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: colors.bg.canvas }}>
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
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[13px]">密碼（8 字以上）</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-[15px] font-semibold disabled:opacity-40"
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
