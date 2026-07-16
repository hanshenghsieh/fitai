export type GeneratePlanErrorCode =
  | 'UNAUTHORIZED'
  | 'MISSING_PROFILE'
  | 'MISSING_GOAL'
  | 'SUBSCRIPTION_REQUIRED'
  | 'SAVE_FAILED'
  | 'UNKNOWN'

export function messageForGeneratePlanError(input: {
  error?: string
  code?: string
}): string {
  switch (input.code) {
    case 'UNAUTHORIZED':
      return '請先登入後再試一次。'
    case 'MISSING_PROFILE':
    case 'MISSING_GOAL':
      return input.error ?? '請先到「我的」完成基本設定。'
    case 'SUBSCRIPTION_REQUIRED':
      return input.error ?? '試用期已結束，請訂閱後繼續使用。'
    case 'SAVE_FAILED':
      return '計畫存檔失敗，再試一次。'
    default:
      return '計畫暫時無法建立，請再試一次。'
  }
}

/** Final UI boundary for stale cached/server errors from older native builds. */
export function safeGeneratePlanErrorForDisplay(message: string | null | undefined): string {
  if (!message) return '計畫暫時無法建立，請再試一次。'
  if (
    /before initialization|referenceerror|typeerror|syntaxerror|at\s+\w+|webpack|turbopack/i.test(
      message
    )
  ) {
    return '計畫暫時無法建立，請再試一次。'
  }
  return message
}
