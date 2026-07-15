import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import { parseFoodImage } from '@/lib/claude/client'

export const maxDuration = 60

const MAX_MULTIPART_BYTES = 6 * 1024 * 1024
const MAX_JSON_BASE64_CHARS = Math.floor(3.5 * 1024 * 1024)
const MAX_JSON_BINARY_BYTES = Math.floor(MAX_JSON_BASE64_CHARS * 0.75)
const SUPPORTED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export class FoodPhotoRequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'FoodPhotoRequestError'
    this.status = status
  }
}

interface FoodPhotoImageInput {
  imageBase64: string
  mimeType: string
  binaryBytes: number
  transport: 'multipart' | 'json'
}

function validateImageInput(input: FoodPhotoImageInput): {
  imageBase64: string
  mimeType: string
} {
  if (!input.imageBase64) throw new FoodPhotoRequestError('Missing image', 400)
  if (!SUPPORTED_IMAGE_MIME_TYPES.has(input.mimeType)) {
    throw new FoodPhotoRequestError('Unsupported image format', 415)
  }
  const maxBytes =
    input.transport === 'multipart' ? MAX_MULTIPART_BYTES : MAX_JSON_BINARY_BYTES
  if (input.binaryBytes > maxBytes) {
    throw new FoodPhotoRequestError('照片太大，請換一張或重拍', 413)
  }
  return { imageBase64: input.imageBase64, mimeType: input.mimeType }
}

function estimatedBase64Bytes(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding)
}

export async function readFoodPhotoRequest(
  request: NextRequest
): Promise<{ imageBase64: string; mimeType: string }> {
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const image = formData.get('image')
    if (!(image instanceof File)) {
      throw new FoodPhotoRequestError('Missing image', 400)
    }
    const buffer = Buffer.from(await image.arrayBuffer())
    return validateImageInput({
      imageBase64: buffer.toString('base64'),
      mimeType: image.type.toLowerCase() || 'image/jpeg',
      binaryBytes: image.size,
      transport: 'multipart',
    })
  }

  const body = (await request.json()) as {
    imageBase64?: unknown
    mimeType?: unknown
    filename?: unknown
    source?: unknown
  }
  if (typeof body.imageBase64 !== 'string' || !body.imageBase64) {
    throw new FoodPhotoRequestError('Missing image', 400)
  }
  if (body.imageBase64.startsWith('data:')) {
    throw new FoodPhotoRequestError('imageBase64 must not include a data URL prefix', 400)
  }
  if (body.imageBase64.length > MAX_JSON_BASE64_CHARS) {
    throw new FoodPhotoRequestError('照片太大，請換一張或重拍', 413)
  }
  if (
    body.source != null &&
    body.source !== 'camera' &&
    body.source !== 'library'
  ) {
    throw new FoodPhotoRequestError('Invalid photo source', 400)
  }
  const mimeType =
    typeof body.mimeType === 'string' ? body.mimeType.toLowerCase() : 'image/jpeg'
  return validateImageInput({
    imageBase64: body.imageBase64,
    mimeType,
    binaryBytes: estimatedBase64Bytes(body.imageBase64),
    transport: 'json',
  })
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiUser(request)
    if (!auth.ok) return auth.response

    if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
      return jsonWithCors({ error: '拍照辨識尚未設定' }, request, { status: 503 })
    }

    const { imageBase64, mimeType } = await readFoodPhotoRequest(request)
    const { data } = await parseFoodImage(imageBase64, mimeType)

    return jsonWithCors({ success: true, data }, request)
  } catch (err) {
    console.error(
      'Food photo parse error:',
      err instanceof Error ? { name: err.name, message: err.message } : 'Unknown error'
    )
    const message = err instanceof Error ? err.message : '辨識失敗，改用搜尋或常吃？'
    const status = err instanceof FoodPhotoRequestError ? err.status : 502
    return jsonWithCors({ error: message }, request, { status })
  }
}
