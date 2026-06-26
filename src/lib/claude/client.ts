import Anthropic from '@anthropic-ai/sdk'
import { WeeklyPlanSchema, InBodyParseSchema, FoodPhotoParseSchema, type WeeklyPlanOutput } from './schemas'

const anthropic = new Anthropic(
  process.env.ANTHROPIC_API_KEY
    ? { apiKey: process.env.ANTHROPIC_API_KEY }
    : { authToken: process.env.ANTHROPIC_AUTH_TOKEN }
)

const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 2000, 4000]

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === retries) throw err
      await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]))
    }
  }
  throw new Error('Max retries exceeded')
}

export async function generateWeeklyPlan(prompt: string): Promise<{
  plan: WeeklyPlanOutput
  tokensUsed: number
}> {
  return retryWithBackoff(async () => {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      system: '你是專業健身教練兼營養師，只輸出有效的JSON，不輸出任何說明文字。確保JSON格式完整且符合規格。',
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extract JSON if wrapped in markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, text]
    const jsonString = (jsonMatch[1] ?? text).trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(jsonString)
    } catch {
      throw new Error(`Claude returned invalid JSON: ${jsonString.slice(0, 200)}`)
    }

    const validated = WeeklyPlanSchema.safeParse(parsed)
    if (!validated.success) {
      throw new Error(`Plan validation failed: ${validated.error.message}`)
    }

    return {
      plan: validated.data,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    }
  })
}

export async function parseInBodyImage(imageBase64: string, mimeType: string): Promise<{
  data: ReturnType<typeof InBodyParseSchema.parse>
  tokensUsed: number
}> {
  return retryWithBackoff(async () => {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `請分析這張InBody體組成報告，提取以下數值並輸出JSON：
{
  "weight_kg": number | null,
  "body_fat_pct": number | null,
  "muscle_mass_kg": number | null,
  "bmi": number | null,
  "waist_cm": number | null,
  "visceral_fat_level": number | null,
  "basal_metabolic_rate": number | null,
  "confidence": "high" | "medium" | "low",
  "raw_values": { "key": "value" }
}
confidence為你對解析準確度的評估。raw_values放入你看到的所有數值。只輸出JSON。`,
          },
        ],
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, text]
    const parsed = JSON.parse((jsonMatch[1] ?? text).trim())
    const validated = InBodyParseSchema.parse(parsed)

    return { data: validated, tokensUsed: response.usage.input_tokens + response.usage.output_tokens }
  })
}

export async function parseFoodImage(imageBase64: string, mimeType: string): Promise<{
  data: ReturnType<typeof FoodPhotoParseSchema.parse>
  tokensUsed: number
}> {
  return retryWithBackoff(async () => {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1536,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `分析這張食物照片（台灣常見外食/便利商店/手搖/便當皆可）。
只輸出食物名稱與辨識信心，不得估算或輸出任何營養數值（熱量、蛋白質、碳水、脂肪等）。
輸出 JSON：
{
  "items": [{
    "name": "食物名稱",
    "portion": "份量描述（可選）",
    "confidence": "high"|"medium"|"low"
  }],
  "meal_summary": "一句話描述"
}
多項食物分開列。只輸出 JSON。`,
          },
        ],
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, text]
    const parsed = JSON.parse((jsonMatch[1] ?? text).trim())
    const validated = FoodPhotoParseSchema.parse(parsed)

    return { data: validated, tokensUsed: response.usage.input_tokens + response.usage.output_tokens }
  })
}
