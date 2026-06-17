'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Dumbbell, Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('密碼至少需要 8 個字元')
      return
    }
    setLoading(true)
    const supabase = createClient()
    try {
      console.log('📝 Creating user...')

      // Create user via server API
      const signupRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      })

      const signupData = await signupRes.json()

      if (!signupRes.ok) {
        throw new Error(signupData.error || '註冊失敗')
      }

      console.log('✅ User created:', signupData.userId)
      console.log('🔐 Attempting login...')

      // Auto-login
      const loginResult = await supabase.auth.signInWithPassword({ email, password })

      if (loginResult.error) {
        console.error('Login failed:', loginResult.error)
        toast.error('登入失敗：' + loginResult.error.message)
        setLoading(false)
        return
      }

      console.log('✅ Login successful, redirecting to onboarding...')
      toast.success('帳號已建立！開始onboarding...')

      // Wait a moment for session to be set
      await new Promise(r => setTimeout(r, 500))

      router.push('/onboarding')
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '註冊失敗，請再試一次'
      console.error('❌ Register error:', msg)
      toast.error(msg)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="bg-emerald-500 p-2 rounded-xl">
            <Dumbbell className="h-7 w-7 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">FitAI</span>
        </div>
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">開始你的健身旅程</CardTitle>
            <CardDescription>建立帳號，取得 AI 量身打造的計畫</CardDescription>
          </CardHeader>
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">暱稱</Label>
                <Input
                  id="name"
                  placeholder="你想讓教練怎麼稱呼你？"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">電子郵件</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密碼（至少 8 字元）</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                建立帳號
              </Button>
              <p className="text-sm text-gray-500 text-center">
                已有帳號？{' '}
                <Link href="/login" className="text-emerald-600 hover:underline font-medium">
                  登入
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
        <p className="text-xs text-gray-400 text-center mt-4">
          本服務提供健康參考資訊，不構成醫療建議。請諮詢醫師後再調整計畫。
        </p>
      </div>
    </div>
  )
}
