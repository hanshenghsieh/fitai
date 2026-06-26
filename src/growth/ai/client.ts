import Anthropic from '@anthropic-ai/sdk'
import type { z } from 'zod'

const MODEL = 'claude-sonnet-4-6'

function getClient() {
  return new Anthropic(
    process.env.ANTHROPIC_API_KEY
      ? { apiKey: process.env.ANTHROPIC_API_KEY }
      : { authToken: process.env.ANTHROPIC_AUTH_TOKEN }
  )
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  return (fenced?.[1] ?? text).trim()
}

export async function callGrowthJson<T extends z.ZodType>(
  system: string,
  user: string,
  schema: T
): Promise<z.infer<T>> {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 2048,
    system,
    messages: [{ role: 'user', content: user }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonString = extractJson(text)

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    throw new Error(`Growth AI returned invalid JSON: ${jsonString.slice(0, 200)}`)
  }

  const validated = schema.safeParse(parsed)
  if (!validated.success) {
    throw new Error(`Growth AI validation failed: ${validated.error.message}`)
  }

  return validated.data
}
