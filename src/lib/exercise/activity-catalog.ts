/**
 * Searchable activity catalog for the "Other" custom-exercise flow.
 *
 * The 6 quick-pick buttons (walking/running/cycling/swimming/strength/other)
 * keep using the flat per-bucket MET values in activity-met.ts — unchanged,
 * per the non-regression requirement. This catalog is a SEPARATE, larger set
 * of specific activities reachable only by typing under "Other", each with
 * its own MET so basketball, yoga, and badminton no longer collapse into one
 * generic estimate. A few entries deliberately mirror a quick-pick bucket's
 * MET (walking/running/cycling/swimming/strength_training) so typing "跑步"
 * under Other produces the same estimate as tapping the 跑步 button.
 */

export type ActivityCategory = 'cardio' | 'strength' | 'flexibility' | 'sport' | 'daily'

export interface ActivityCatalogEntry {
  id: string
  name_zh: string
  aliases: string[]
  met: number
  category: ActivityCategory
}

// MET values are general/moderate-intensity references from the Compendium
// of Physical Activities — estimates for a typical session, not a
// measurement of the specific one the user just logged.
export const ACTIVITY_CATALOG: ActivityCatalogEntry[] = [
  { id: 'walking', name_zh: '走路', aliases: ['走路', 'walking', 'walk'], met: 3.5, category: 'daily' },
  { id: 'casual_walking', name_zh: '散步', aliases: ['散步', '慢走', 'casual walking', 'leisure walk'], met: 2.8, category: 'daily' },
  { id: 'brisk_walking', name_zh: '健走', aliases: ['健走', '快走', 'brisk walking', 'brisk walk'], met: 4.3, category: 'daily' },
  { id: 'jogging', name_zh: '慢跑', aliases: ['慢跑', 'jogging', 'jog'], met: 7.0, category: 'cardio' },
  { id: 'running', name_zh: '跑步', aliases: ['跑步', 'running', 'run'], met: 9.8, category: 'cardio' },
  { id: 'cycling', name_zh: '騎自行車', aliases: ['騎自行車', '騎腳踏車', '單車', 'cycling', 'bike', 'biking'], met: 7.5, category: 'cardio' },
  { id: 'swimming', name_zh: '游泳', aliases: ['游泳', 'swimming', 'swim'], met: 6.0, category: 'cardio' },
  { id: 'strength_training', name_zh: '重量訓練', aliases: ['重訓', '重量訓練', '健身', 'strength training', 'weight training', 'gym'], met: 5.0, category: 'strength' },
  { id: 'basketball', name_zh: '籃球', aliases: ['籃球', '打籃球', 'basketball'], met: 6.5, category: 'sport' },
  { id: 'badminton', name_zh: '羽球', aliases: ['羽球', '羽毛球', 'badminton'], met: 5.5, category: 'sport' },
  { id: 'tennis', name_zh: '網球', aliases: ['網球', 'tennis'], met: 7.3, category: 'sport' },
  { id: 'table_tennis', name_zh: '桌球', aliases: ['桌球', '乒乓球', 'table tennis', 'ping pong'], met: 4.0, category: 'sport' },
  { id: 'hiking', name_zh: '健行', aliases: ['健行', '爬山', '登山', 'hiking'], met: 6.0, category: 'cardio' },
  { id: 'yoga', name_zh: '瑜伽', aliases: ['瑜伽', 'yoga'], met: 3.0, category: 'flexibility' },
  { id: 'pilates', name_zh: '皮拉提斯', aliases: ['皮拉提斯', 'pilates'], met: 3.0, category: 'flexibility' },
  { id: 'dancing', name_zh: '跳舞', aliases: ['跳舞', '舞蹈', 'dancing', 'dance'], met: 4.8, category: 'cardio' },
  { id: 'jump_rope', name_zh: '跳繩', aliases: ['跳繩', 'jump rope', 'jumping rope'], met: 11.0, category: 'cardio' },
  { id: 'soccer', name_zh: '足球', aliases: ['足球', '踢足球', 'soccer', 'football'], met: 7.0, category: 'sport' },
  { id: 'baseball', name_zh: '棒球', aliases: ['棒球', 'baseball'], met: 5.0, category: 'sport' },
  { id: 'volleyball', name_zh: '排球', aliases: ['排球', 'volleyball'], met: 4.0, category: 'sport' },
  { id: 'stair_climbing', name_zh: '爬樓梯', aliases: ['爬樓梯', '上下樓梯', 'stair climbing', 'stairs'], met: 8.8, category: 'cardio' },
  { id: 'elliptical', name_zh: '橢圓機', aliases: ['橢圓機', 'elliptical'], met: 5.0, category: 'cardio' },
  { id: 'rowing', name_zh: '划船機', aliases: ['划船機', '划船', 'rowing'], met: 7.0, category: 'cardio' },
  { id: 'boxing', name_zh: '拳擊', aliases: ['拳擊', 'boxing'], met: 7.8, category: 'sport' },
  { id: 'aerobics', name_zh: '有氧運動', aliases: ['有氧', '有氧運動', 'aerobics'], met: 6.5, category: 'cardio' },
  { id: 'hiit', name_zh: 'HIIT', aliases: ['hiit', '高強度間歇'], met: 8.0, category: 'cardio' },
]

function normalizeActivityQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '')
}

/** Exact alias match only — deliberately no fuzzy/NLP matching, see module header. */
export function resolveActivityCatalogEntry(rawInput: string): ActivityCatalogEntry | null {
  const normalized = normalizeActivityQuery(rawInput)
  if (!normalized) return null
  for (const entry of ACTIVITY_CATALOG) {
    if (entry.aliases.some(alias => normalizeActivityQuery(alias) === normalized)) return entry
  }
  return null
}

/** Substring match across aliases, for populating type-ahead suggestions only — never used to resolve the final save. */
export function searchActivityCatalog(rawInput: string, limit = 6): ActivityCatalogEntry[] {
  const normalized = normalizeActivityQuery(rawInput)
  if (!normalized) return []
  const out: ActivityCatalogEntry[] = []
  for (const entry of ACTIVITY_CATALOG) {
    if (entry.aliases.some(alias => normalizeActivityQuery(alias).includes(normalized))) {
      out.push(entry)
      if (out.length >= limit) break
    }
  }
  return out
}
