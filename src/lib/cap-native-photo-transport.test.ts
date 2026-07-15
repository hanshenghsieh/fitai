import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { NextRequest } from 'next/server'
import {
  FoodPhotoError,
  NATIVE_PHOTO_BASE64_MAX_CHARS,
  NATIVE_PHOTO_JPEG_QUALITY,
  NATIVE_PHOTO_MAX_EDGE,
  foodPhotoErrorCodeForStatus,
  foodPhotoTransport,
  nativePhotoPayloadFitsLimits,
} from '@/lib/food-capture'
import {
  buildApiHeaders,
  resolveApiRequestTransport,
} from '@/lib/api/client'

const foodCaptureSource = readFileSync(
  new URL('./food-capture.ts', import.meta.url),
  'utf8'
)
const apiClientSource = readFileSync(
  new URL('./api/client.ts', import.meta.url),
  'utf8'
)
const todaySource = readFileSync(
  new URL('../components/dashboard/TodayOS.tsx', import.meta.url),
  'utf8'
)
const photoSheetSource = readFileSync(
  new URL('../components/dashboard/today/PhotoLogSheet.tsx', import.meta.url),
  'utf8'
)
const nativeCameraSource = readFileSync(
  new URL('./native-camera.ts', import.meta.url),
  'utf8'
)
const routeSource = readFileSync(
  new URL('../app/api/food-photo/route.ts', import.meta.url),
  'utf8'
)

async function foodPhotoRoute() {
  process.env.ANTHROPIC_API_KEY ||= 'cap-001-test-key'
  return import('@/app/api/food-photo/route')
}

describe('CAP-001 native photo transport', () => {
  it('Case 1: web JPEG keeps multipart FormData and browser fetch transport', () => {
    const body = new FormData()
    body.append('image', new File(['jpeg'], 'food.jpg', { type: 'image/jpeg' }))
    assert.equal(foodPhotoTransport(false), 'multipart')
    assert.equal(resolveApiRequestTransport(false, body), 'fetch')
    assert.match(foodCaptureSource, /const formData = new FormData\(\)/)
  })

  it('Case 2: native camera selects base64 JSON, CapacitorHttp, and Bearer auth', () => {
    assert.equal(foodPhotoTransport(true), 'base64-json')
    assert.equal(resolveApiRequestTransport(true, JSON.stringify({ imageBase64: 'abc' })), 'capacitor-http')
    assert.equal(buildApiHeaders({ body: '{}' }, 'token-2').get('Authorization'), 'Bearer token-2')
    assert.match(foodCaptureSource, /if \(foodPhotoTransport\(\) === 'base64-json'\)/)
    assert.match(apiClientSource, /CapacitorHttp\.request/)
  })

  it('Case 3: native gallery source is included in the JSON payload contract', () => {
    assert.match(foodCaptureSource, /source: FoodPhotoSource/)
    assert.match(photoSheetSource, /onPickFile\(result\.file, result\.source\)/)
    assert.match(nativeCameraSource, /source: 'library'/)
  })

  it('Case 4: HEIC decode falls back from createImageBitmap to img or typed failure', () => {
    const bitmapCatch = foodCaptureSource.indexOf('WKWebView can expose createImageBitmap')
    const imageFallback = foodCaptureSource.indexOf('downscaleWithImageElement', bitmapCatch)
    assert.ok(bitmapCatch > 0)
    assert.ok(imageFallback > bitmapCatch)
    assert.match(foodCaptureSource, /PHOTO_FORMAT_UNSUPPORTED/)
  })

  it('Case 5: native limits are 512px, quality 0.7, and under 3.5MB base64', () => {
    assert.equal(NATIVE_PHOTO_MAX_EDGE, 512)
    assert.equal(NATIVE_PHOTO_JPEG_QUALITY, 0.7)
    assert.equal(NATIVE_PHOTO_BASE64_MAX_CHARS, Math.floor(3.5 * 1024 * 1024))
    assert.equal(nativePhotoPayloadFitsLimits(100_000, 140_000), true)
  })

  it('Case 6: an oversized post-compression payload is rejected', () => {
    assert.equal(
      nativePhotoPayloadFitsLimits(100_000, NATIVE_PHOTO_BASE64_MAX_CHARS + 1),
      false
    )
    const error = new FoodPhotoError('PHOTO_TOO_LARGE', 'too large')
    assert.equal(error.code, 'PHOTO_TOO_LARGE')
    assert.match(foodCaptureSource, /NATIVE_PHOTO_RETRY_MAX_EDGE/)
  })

  it('Cases 7-10: HTTP status maps to typed photo errors', () => {
    assert.equal(foodPhotoErrorCodeForStatus(401), 'PHOTO_AUTH_REQUIRED')
    assert.equal(foodPhotoErrorCodeForStatus(403), 'PHOTO_AUTH_REQUIRED')
    assert.equal(foodPhotoErrorCodeForStatus(413), 'PHOTO_TOO_LARGE')
    assert.equal(foodPhotoErrorCodeForStatus(415), 'PHOTO_FORMAT_UNSUPPORTED')
    assert.equal(foodPhotoErrorCodeForStatus(500), 'PHOTO_SERVER_ERROR')
    assert.equal(foodPhotoErrorCodeForStatus(503), 'PHOTO_SERVER_ERROR')
  })

  it('Case 11: offline upload retains the prepared draft and retry action', () => {
    assert.match(foodCaptureSource, /PHOTO_OFFLINE/)
    assert.match(todaySource, /recognitionHint: photoError\.message/)
    assert.match(todaySource, /const retryPhotoUpload = useCallback/)
    assert.match(photoSheetSource, /重新嘗試辨識/)
    assert.doesNotMatch(todaySource, /setPhotoDraft\(null\)[\s\S]{0,120}PHOTO_OFFLINE/)
  })

  it('Case 12: native timeout ignores late CapacitorHttp response and returns typed failure', () => {
    assert.match(apiClientSource, /signal\.addEventListener\('abort'/)
    assert.match(foodCaptureSource, /'PHOTO_TIMEOUT'/)
    assert.match(todaySource, /photoError\.code !== 'PHOTO_CANCELLED'/)
  })

  it('Case 13: camera and gallery cancellation remain silent', () => {
    assert.match(nativeCameraSource, /TakePhotoCancelled/)
    assert.match(nativeCameraSource, /ChooseMediaCancelled/)
    assert.doesNotMatch(photoSheetSource, /result\.reason === 'cancelled'[\s\S]{0,100}toast/)
  })

  it('Case 14: permissions are checked separately and denial points to iPhone Settings', () => {
    assert.match(nativeCameraSource, /ensurePermission\('camera'\)/)
    assert.match(nativeCameraSource, /ensurePermission\('photos'\)/)
    assert.match(nativeCameraSource, /requestPermissions\(\{ permissions: \[permission\] \}\)/)
    assert.match(photoSheetSource, /請到 iPhone 設定中開啟/)
  })

  it('Case 15: server JSON and multipart normalize to the same image contract', async () => {
    const { readFoodPhotoRequest } = await foodPhotoRoute()
    const bytes = Buffer.from('same-image')
    const base64 = bytes.toString('base64')

    const jsonRequest = new NextRequest('https://www.betterbit.app/api/food-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: base64,
        mimeType: 'image/jpeg',
        filename: 'food.jpg',
        source: 'camera',
      }),
    })
    const form = new FormData()
    form.append('image', new File([bytes], 'food.jpg', { type: 'image/jpeg' }))
    const multipartRequest = new NextRequest('https://www.betterbit.app/api/food-photo', {
      method: 'POST',
      body: form,
    })

    assert.deepEqual(await readFoodPhotoRequest(jsonRequest), {
      imageBase64: base64,
      mimeType: 'image/jpeg',
    })
    assert.deepEqual(await readFoodPhotoRequest(multipartRequest), {
      imageBase64: base64,
      mimeType: 'image/jpeg',
    })
    assert.match(routeSource, /jsonWithCors\(\{ success: true, data \}/)
  })

  it('server returns 413/415 before recognition and never logs base64', async () => {
    const { FoodPhotoRequestError, readFoodPhotoRequest } = await foodPhotoRoute()
    const unsupported = new NextRequest('https://www.betterbit.app/api/food-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: Buffer.from('heic').toString('base64'),
        mimeType: 'image/heic',
        source: 'library',
      }),
    })
    await assert.rejects(
      () => readFoodPhotoRequest(unsupported),
      (error: unknown) =>
        error instanceof FoodPhotoRequestError && error.status === 415
    )

    const tooLarge = new NextRequest('https://www.betterbit.app/api/food-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: 'a'.repeat(NATIVE_PHOTO_BASE64_MAX_CHARS + 1),
        mimeType: 'image/jpeg',
        source: 'camera',
      }),
    })
    await assert.rejects(
      () => readFoodPhotoRequest(tooLarge),
      (error: unknown) =>
        error instanceof FoodPhotoRequestError && error.status === 413
    )
    assert.doesNotMatch(routeSource, /console\.(?:log|error)\([^)]*imageBase64/)
  })

  it('Case 16: successful recognition creates a draft and save still commits the log', () => {
    assert.match(todaySource, /setPhotoDraft\(\{/)
    assert.match(todaySource, /await parsePhotoDraft\(prepared\.file, prepared\.previewUrl, source\)/)
    assert.match(todaySource, /commitLog\(\{/)
    assert.match(todaySource, /source: 'photo' as const/)
  })
})
