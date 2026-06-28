import { CapacitorHttp } from '@capacitor/core'
import { isNativeIOS } from '@/lib/capacitor-native'

function parseJsonBody<T>(data: unknown): T {
  if (typeof data === 'string') {
    return JSON.parse(data) as T
  }
  return data as T
}

/** Native URLSession on iOS — long AI requests won't take down the WebView process. */
export async function appJsonPost<TResponse>(
  path: string,
  data: unknown
): Promise<{ ok: boolean; status: number; body: TResponse }> {
  const url = `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`

  if (isNativeIOS()) {
    const response = await CapacitorHttp.post({
      url,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      data,
    })
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      body: parseJsonBody<TResponse>(response.data),
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  return {
    ok: response.ok,
    status: response.status,
    body: (await response.json()) as TResponse,
  }
}
