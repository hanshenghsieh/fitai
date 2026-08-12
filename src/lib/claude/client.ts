import Anthropic from '@anthropic-ai/sdk'
import {
  WeeklyPlanSchema,
  InBodyParseSchema,
  FoodPhotoParseSchema,
  AiNutritionEstimateSchema,
  type WeeklyPlanOutput,
  type AiNutritionEstimate,
} from './schemas'

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

份量判斷規則（重要）：同一份食材被切開、對半、切片，仍是同一份，不要因為看到多塊/多半就把數量往上加。例如一顆蛋切成兩半，數量是 1 顆，不是 2 顆；一片吐司切成四小塊，數量是 1 片，不是 4 片。"name" 欄位不要包含數量或倍數（不要寫成「蛋 x2」「2份蛋」），若不確定實際數量，"portion" 寫保守估計（例如「約 1 顆」），不要主動放大。

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

export interface AiNutritionEstimateInput {
  foodName: string
  quantity?: number
  unit?: string
  preparation?: string
  portionContext?: string
  locale?: string
}

/**
 * Build 37 — LEVEL 2 AI nutrition fallback. Only called after LEVEL 1
 * (trusted ingredient DB / Food DNA / menu DB / aliases) has already failed
 * to find a confident match — see resolveNutritionWithAiFallback. Reuses
 * the same Anthropic client/model/retry pattern as parseFoodImage above,
 * not a separate SDK. `.parse()` throws on any schema violation (missing
 * field, wrong type, out-of-range number, wrong source_type literal) —
 * callers must not catch-and-save on failure, only catch-and-reject.
 */
export async function estimateFoodNutrition(
  input: AiNutritionEstimateInput
): Promise<{ data: AiNutritionEstimate; tokensUsed: number }> {
  return retryWithBackoff(async () => {
    const contextLines = [
      `food_name: ${input.foodName}`,
      input.quantity != null ? `quantity: ${input.quantity}` : null,
      input.unit ? `unit: ${input.unit}` : null,
      input.preparation ? `preparation: ${input.preparation}` : null,
      input.portionContext ? `portion_context: ${input.portionContext}` : null,
      `locale: ${input.locale ?? 'zh-TW'}`,
    ].filter(Boolean).join('\n')

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system:
        '你是營養估算助手。只根據提供的食物資訊估算營養數值，不得虛構食材未提及的細節。' +
        '只輸出一個有效 JSON 物件，不輸出任何說明文字、不使用 markdown 條列。' +
        '所有數值欄位必須是非負數字。如果無法合理估算，calories/protein_g/carbs_g/fat_g 一律回 0 並將 confidence 設為 0，reason 說明原因。',
      messages: [{
        role: 'user',
        content: `根據以下資訊估算這份食物的營養數值（台灣飲食情境）：\n${contextLines}\n\n輸出 JSON，格式：\n{\n  "canonical_name": "標準化食物名稱",\n  "estimated_weight_g": 估算重量(克),\n  "calories": 熱量(kcal),\n  "protein_g": 蛋白質(g),\n  "carbs_g": 碳水化合物(g),\n  "fat_g": 脂肪(g),\n  "confidence": 0到1之間的信心分數,\n  "reason": "一句話說明估算依據",\n  "source_type": "ai_estimate"\n}\n只輸出這個 JSON，不要其他文字。`,
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, text]
    let parsed: unknown
    try {
      parsed = JSON.parse((jsonMatch[1] ?? text).trim())
    } catch {
      throw new Error(`AI nutrition estimate returned invalid JSON: ${text.slice(0, 200)}`)
    }
    const validated = AiNutritionEstimateSchema.parse(parsed)

    return { data: validated, tokensUsed: response.usage.input_tokens + response.usage.output_tokens }
  }, 1)
}
