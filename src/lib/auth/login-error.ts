type LoginErrorLike = {
  name?: string
  message?: string
  status?: number
  code?: string
}

export type SanitizedLoginError = {
  message: string
  debug: {
    name?: string
    message?: string
    status?: number
    code?: string
  }
}

export function getSanitizedLoginError(error: unknown): SanitizedLoginError {
  const err = (error ?? {}) as LoginErrorLike
  const name = err.name ?? 'Error'
  const message = err.message ?? String(error)
  const status = err.status
  const code = err.code
  const debug = { name, message, status, code }

  if (/invalid login credentials/i.test(message) || code === 'invalid_credentials') {
    return { message: '帳號或密碼不正確，請再確認一次。', debug }
  }

  if (
    /failed to fetch|network request failed|networkerror|load failed|enotfound|econnrefused|importing a module script failed|module script failed|dynamically imported module|chunkloaderror|loading chunk/i.test(
      message,
    ) ||
    (name === 'TypeError' && /fetch/i.test(message))
  ) {
    return { message: '目前連線不穩，請確認網路後再試。', debug }
  }

  if (/cors|blocked|access-control|not allowed/i.test(message)) {
    return { message: '登入服務暫時無法使用，請稍後再試。', debug }
  }

  return { message: '登入失敗，請稍後再試。', debug }
}

export function logLoginError(error: unknown): void {
  const { debug } = getSanitizedLoginError(error)
  console.error('[login] signIn failed', debug)
}
