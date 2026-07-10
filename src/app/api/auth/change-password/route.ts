import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth

  const body = await request.json()
  const currentPassword = String(body.current_password ?? '')
  const newPassword = String(body.new_password ?? '')
  const confirmPassword = String(body.confirm_password ?? '')

  if (!currentPassword || !newPassword) {
    return jsonWithCors({ error: '請填寫所有密碼欄位' }, request, { status: 400 })
  }
  if (newPassword.length < 8) {
    return jsonWithCors({ error: '新密碼至少需要 8 個字元' }, request, { status: 400 })
  }
  if (newPassword !== confirmPassword) {
    return jsonWithCors({ error: '兩次輸入的新密碼不一致' }, request, { status: 400 })
  }
  if (newPassword === currentPassword) {
    return jsonWithCors({ error: '不可與目前密碼相同' }, request, { status: 400 })
  }

  const provider = user.app_metadata?.provider as string | undefined
  const isOAuth =
    (provider && provider !== 'email') ||
    user.identities?.some(i => i.provider && i.provider !== 'email')
  if (isOAuth) {
    return jsonWithCors(
      { error: '你的帳號使用第三方登入，密碼需至該平台管理。' },
      request,
      { status: 400 }
    )
  }

  const email = user.email
  if (!email) {
    return jsonWithCors({ error: '找不到登入 Email' }, request, { status: 400 })
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  })
  if (signInError) {
    return jsonWithCors({ error: '目前密碼不正確' }, request, { status: 401 })
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
  if (updateError) {
    return jsonWithCors({ error: '密碼更新失敗，請稍後再試' }, request, { status: 500 })
  }

  return jsonWithCors({ ok: true }, request)
}
