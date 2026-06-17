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
      console.log('Attempting login with email:', email)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      console.log('Login response:', { data, error })

      if (error) {
        console.error('Auth error:', error)
        throw error
      }

      console.log('Login successful, redirecting to dashboard')
      toast.success('登入成功！')

      // Wait a moment for session to be set, then redirect
      await new Promise(r => setTimeout(r, 500))
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '登入失敗，請再試一次'
      console.error('Login error:', msg)
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
            <CardTitle className="text-xl">歡迎回來</CardTitle>
            <CardDescription>登入你的健身帳號</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
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
                <Label htmlFor="password">密碼</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                登入
              </Button>
              <p className="text-sm text-gray-500 text-center">
                還沒有帳號？{' '}
                <Link href="/register" className="text-emerald-600 hover:underline font-medium">
                  立即註冊
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
        <p className="text-xs text-gray-400 text-center mt-4">
          本服務提供健康參考資訊，不構成醫療建議。請諮詢醫師後再調整飲食及運動計畫。
        </p>
      </div>
    </div>
  )
}
