/** 將 API 錯誤轉成使用者看得懂的中文 */

export async function parseApiError(res: Response, fallback = '操作失敗，請稍後再試'): Promise<string> {
  try {
    const data = await res.json()
    if (typeof data.error === 'string' && data.error.trim()) return data.error
    if (data.code === 'SUBSCRIPTION_REQUIRED') return '試用期已結束，請訂閱以繼續'
    if (data.code === 'MISSING_PROFILE') return '請先完成個人資料設定'
    if (data.code === 'MISSING_GOAL') return '請先設定目標'
  } catch {
    // non-JSON body
  }

  if (res.status === 401) return '請先登入'
  if (res.status === 403) return '試用期已結束，請訂閱以繼續'
  if (res.status === 400) return '資料不完整，請到設定頁確認體重與目標'
  if (res.status >= 500) return '伺服器忙碌中，請稍後再試'
  return fallback
}

export async function parseGeneratePlanError(res: Response): Promise<string> {
  return parseApiError(res, '計畫生成失敗，請稍後再試')
}
