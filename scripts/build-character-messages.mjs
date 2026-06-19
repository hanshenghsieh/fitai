/**
 * Builds src/lib/copy/characterMessages.ts from embedded message data.
 * Run: node scripts/build-character-messages.mjs
 */
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { MESSAGE_DATA, DICE_REROLL_DATA } from './character-message-data.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '../src/lib/copy/characterMessages.ts')

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function fmtMsg(m) {
  const sub = m.subtext ? `, subtext: '${esc(m.subtext)}'` : ''
  return `  { id: '${m.id}', text: '${esc(m.text)}'${sub}, expression: '${m.expression}', category: '${m.category}' }`
}

function fmtArray(msgs) {
  return `[\n${msgs.map(fmtMsg).join(',\n')},\n]`
}

const diceTiers = ['first', 'second', 'third', 'fifth', 'tenth', 'twentieth', 'thirtieth', 'fiftieth']
const diceRerollBlocks = diceTiers
  .map((t) => `  ${t}: ${fmtArray(DICE_REROLL_DATA[t])}`)
  .join(',\n')

const categoryBlocks = Object.entries(MESSAGE_DATA)
  .map(([cat, msgs]) => `  ${cat}: ${fmtArray(msgs)}`)
  .join(',\n')

const content = `/** 再健 permanent message database */

export type ZaijianExpression =
  | 'normal'
  | 'happy'
  | 'proud'
  | 'eyeRoll'
  | 'suspicious'
  | 'plateau'
  | 'sleepy'
  | 'hungry'
  | 'tired'
  | 'coffee'
  | 'sleep'
  | 'water'
  | 'cheat'
  | 'workout'

export type MessageCategory =
  | 'morning'
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'snack'
  | 'water'
  | 'workout'
  | 'missionComplete'
  | 'progress'
  | 'weightPlateau'
  | 'lateNight'
  | 'sleep'
  | 'rainyDay'
  | 'weekend'
  | 'cheatMeal'
  | 'restDay'
  | 'stressEating'
  | 'workOvertime'
  | 'pushNotification'
  | 'loading'
  | 'error'
  | 'empty'
  | 'achievement'
  | 'firstWeek'
  | 'streak7'
  | 'streak30'
  | 'streak100'
  | 'dice'
  | 'mealReplacement'
  | 'lowMotivation'
  | 'monday'
  | 'friday'
  | 'afterOvereating'
  | 'holiday'
  | 'familyDinner'
  | 'travel'
  | 'noExercise'
  | 'missedCheckin'
  | 'success'
  | 'randomThoughts'

export interface CharacterMessage {
  id: string
  text: string
  subtext?: string
  expression: ZaijianExpression
  category: MessageCategory
}

export const EXPRESSION_EMOJI: Record<ZaijianExpression, string> = {
  normal: '😐',
  happy: '🙂',
  proud: '😏',
  eyeRoll: '🙄',
  suspicious: '🤨',
  plateau: '📉',
  sleepy: '😴',
  hungry: '🍽️',
  tired: '😮‍💨',
  coffee: '☕',
  sleep: '🌙',
  water: '💧',
  cheat: '🍕',
  workout: '🏃',
}

export type DiceRollTier =
  | 'first'
  | 'second'
  | 'third'
  | 'fifth'
  | 'tenth'
  | 'twentieth'
  | 'thirtieth'
  | 'fiftieth'

export const DICE_REROLL_MESSAGES: Record<DiceRollTier, CharacterMessage[]> = {
${diceRerollBlocks},
}

export const CHARACTER_MESSAGES: Record<MessageCategory, CharacterMessage[]> = {
${categoryBlocks},
}

export function getMessagesByCategory(category: MessageCategory): CharacterMessage[] {
  return CHARACTER_MESSAGES[category] ?? []
}

export function getAllMessages(): CharacterMessage[] {
  const fromCategories = Object.values(CHARACTER_MESSAGES).flat()
  const fromDice = Object.values(DICE_REROLL_MESSAGES).flat()
  return [...fromCategories, ...fromDice]
}

export function pickCharacterMessage(category: MessageCategory, salt = ''): CharacterMessage {
  const pool = getMessagesByCategory(category)
  if (!pool.length) {
    return { id: 'fallback', text: '照著做就好。', expression: 'normal', category }
  }
  const key = \`\${category}:\${salt}:\${new Date().toDateString()}\`
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return pool[Math.abs(hash) % pool.length]
}

export function getDiceRollTier(rollCount: number): DiceRollTier {
  if (rollCount >= 50) return 'fiftieth'
  if (rollCount >= 30) return 'thirtieth'
  if (rollCount >= 20) return 'twentieth'
  if (rollCount >= 10) return 'tenth'
  if (rollCount >= 5) return 'fifth'
  if (rollCount >= 3) return 'third'
  if (rollCount >= 2) return 'second'
  return 'first'
}

export function pickDiceRerollMessage(rollCount: number): CharacterMessage {
  const tier = getDiceRollTier(rollCount)
  const pool = DICE_REROLL_MESSAGES[tier]
  const key = \`dice:\${rollCount}:\${new Date().toDateString()}\`
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return pool[Math.abs(hash) % pool.length]
}

export function formatMessageWithExpression(msg: CharacterMessage): string {
  const emoji = EXPRESSION_EMOJI[msg.expression]
  return msg.subtext ? \`\${emoji} \${msg.text} \${msg.subtext}\` : \`\${emoji} \${msg.text}\`
}

export const TOTAL_MESSAGE_COUNT: number = getAllMessages().length
`

writeFileSync(outPath, content, 'utf8')

const all = [...Object.values(MESSAGE_DATA).flat(), ...Object.values(DICE_REROLL_DATA).flat()]
console.log(`Wrote ${outPath}`)
console.log(`Total messages: ${all.length}`)
for (const [cat, msgs] of Object.entries(MESSAGE_DATA)) {
  console.log(`  ${cat}: ${msgs.length}`)
}
for (const [tier, msgs] of Object.entries(DICE_REROLL_DATA)) {
  console.log(`  dice-${tier}: ${msgs.length}`)
}
