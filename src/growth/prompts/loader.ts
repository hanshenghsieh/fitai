import { readFileSync } from 'fs'
import { join } from 'path'

const PROMPTS_DIR = join(process.cwd(), 'src/growth/prompts')

export function loadPrompt(filename: string): string {
  return readFileSync(join(PROMPTS_DIR, filename), 'utf-8').trim()
}

export function loadKeywordList(filename: string): string[] {
  return loadPrompt(filename)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

export function renderPrompt(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value),
    template
  )
}
