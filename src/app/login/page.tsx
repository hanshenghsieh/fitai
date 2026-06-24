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
      toast.success('回來了。')
      await new Promise(r => setTimeout(r, 400))
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      const friendly =
        /invalid login credentials/i.test(msg)
          ? '帳號或密碼不對。再試一次。'
          : pickZaiJianLine('error').text
      toast.error(friendly)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page-shell flex items-center justify-center p-4" style={{ backgroundColor: colors.bg.canvas }}>
      <div className="w-full max-w-md space-y-6">
        <ZaiJian size="lg" line={{ text: '回來了。', expression: 'normal', subtext: '今天吃什麼？' }} layout="bubble" />
        <form
          onSubmit={handleLogin}
          className="rounded-2xl p-6 space-y-4"
          style={{ backgroundColor: colors.bg.elevated, border: `1px solid ${colors.border.subtle}` }}
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[13px]">電子郵件</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[13px]">密碼</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-[15px] font-semibold disabled:opacity-40"
            style={{ backgroundColor: colors.accent.action, color: '#FFFDF9' }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : '登入'}
          </button>
          <p className="text-[13px] text-center" style={{ color: colors.text.tertiary }}>
            還沒有帳號？{' '}
            <Link href="/register" style={{ color: colors.accent.action }}>註冊</Link>
          </p>
        </form>
        <Link href="/" className="block text-center text-[13px]" style={{ color: colors.text.tertiary }}>← 首頁</Link>
      </div>
    </div>
  )
}
