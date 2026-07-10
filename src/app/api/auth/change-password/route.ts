import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const currentPassword = String(body.current_password ?? '')
  const newPassword = String(body.new_password ?? '')
  const confirmPassword = String(body.confirm_password ?? '')

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: '請填寫所有密碼欄位' }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: '新密碼至少需要 8 個字元' }, { status: 400 })
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: '兩次輸入的新密碼不一致' }, { status: 400 })
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: '不可與目前密碼相同' }, { status: 400 })
  }

  const provider = user.app_metadata?.provider as string | undefined
  const isOAuth =
    (provider && provider !== 'email') ||
    user.identities?.some(i => i.provider && i.provider !== 'email')
  if (isOAuth) {
    return NextResponse.json(
      { error: '你的帳號使用第三方登入，密碼需至該平台管理。' },
      { status: 400 }
    )
  }

  const email = user.email
  if (!email) {
    return NextResponse.json({ error: '找不到登入 Email' }, { status: 400 })
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  })
  if (signInError) {
    return NextResponse.json({ error: '目前密碼不正確' }, { status: 401 })
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
  if (updateError) {
    return NextResponse.json({ error: '密碼更新失敗，請稍後再試' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
