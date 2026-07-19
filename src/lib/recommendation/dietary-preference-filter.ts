import {
  inferDietaryIngredientGroups,
  type DietaryIngredientGroup,
  type DietaryIngredientMetadata,
} from './dietary-ingredient-ontology'

export interface DietaryPreferenceContext {
  restrictions?: string[] | null
  allergens?: string[] | null
  blockedFoods?: string[] | null
}

export type DietaryFoodMetadata = DietaryIngredientMetadata

const RESTRICTION_ALIASES: Record<string, string> = {
  egg: 'no_egg',
  eggs: 'no_egg',
  milk: 'no_dairy',
  no_milk: 'no_dairy',
  dairy: 'no_dairy',
  beef: 'no_beef',
  pork: 'no_pork',
  chicken: 'no_chicken',
  seafood: 'no_seafood',
  ovo_lacto: 'ovo_lacto_vegetarian',
}

const DIETARY_CONTEXT_STORAGE_PREFIX = 'betterbit:dietary-context:'

const RESTRICTION_GROUPS: Record<string, DietaryIngredientGroup[]> = {
  no_egg: ['egg'],
  no_beef: ['beef'],
  no_pork: ['pork'],
  no_chicken: ['chicken'],
  no_seafood: ['seafood'],
  no_dairy: ['dairy'],
  no_peanut: ['peanut'],
  no_nuts: ['tree_nut'],
  no_soy: ['soy'],
  no_wheat: ['wheat'],
  no_sesame: ['sesame'],
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase('zh-TW')
}

const ALLERGEN_RESTRICTIONS: Record<string, string> = {
  peanut: 'no_peanut',
  nuts: 'no_nuts',
  tree_nut: 'no_nuts',
  milk: 'no_dairy',
  dairy: 'no_dairy',
  egg: 'no_egg',
  shellfish: 'no_seafood',
  fish: 'no_seafood',
  seafood: 'no_seafood',
  soy: 'no_soy',
  wheat: 'no_wheat',
  gluten: 'no_wheat',
  sesame: 'no_sesame',
}

export function normalizeDietaryRestrictions(values?: string[] | null): string[] {
  const normalizedValues = [...new Set((values ?? []).map(value => {
    const key = normalized(value)
    return RESTRICTION_ALIASES[key] ?? key
  }).filter(Boolean))]
  if (normalizedValues.includes('ovo_lacto_vegetarian')) {
    return normalizedValues.filter(value => value !== 'vegetarian')
  }
  return normalizedValues
}

export function normalizeDietaryPreferenceContext(
  context?: DietaryPreferenceContext | null
): Required<DietaryPreferenceContext> {
  const restrictions = new Set(normalizeDietaryRestrictions(context?.restrictions))
  for (const allergen of context?.allergens ?? []) {
    const key = normalized(allergen)
    const restriction = ALLERGEN_RESTRICTIONS[key] ?? RESTRICTION_ALIASES[key]
    if (restriction) restrictions.add(restriction)
  }
  return {
    restrictions: [...restrictions].sort(),
    allergens: [...new Set((context?.allergens ?? []).map(normalized))].sort(),
    blockedFoods: [...new Set((context?.blockedFoods ?? []).map(normalized))].sort(),
  }
}

export function persistDietaryPreferenceContext(
  userId: string,
  context: DietaryPreferenceContext
): void {
  if (typeof window === 'undefined' || !userId) return
  try {
    localStorage.setItem(
      `${DIETARY_CONTEXT_STORAGE_PREFIX}${userId}`,
      JSON.stringify(normalizeDietaryPreferenceContext(context))
    )
  } catch {
    /* private mode */
  }
}

export function readPersistedDietaryPreferenceContext(
  userId?: string | null
): Required<DietaryPreferenceContext> | null {
  if (typeof window === 'undefined' || !userId) return null
  try {
    const raw = localStorage.getItem(`${DIETARY_CONTEXT_STORAGE_PREFIX}${userId}`)
    if (!raw) return null
    return normalizeDietaryPreferenceContext(JSON.parse(raw) as DietaryPreferenceContext)
  } catch {
    return null
  }
}

function canonicalRestrictions(context?: DietaryPreferenceContext | null): Set<string> {
  const normalizedContext = normalizeDietaryPreferenceContext(context)
  const result = new Set<string>()
  for (const restriction of normalizedContext.restrictions) result.add(restriction)
  if (result.has('vegetarian') || result.has('ovo_lacto_vegetarian')) {
    for (const value of ['no_beef', 'no_pork', 'no_chicken', 'no_seafood']) result.add(value)
  }
  return result
}

function semanticText(metadata: DietaryFoodMetadata): string {
  return [
    metadata.name,
    ...(metadata.aliases ?? []),
    metadata.category ?? '',
    metadata.description ?? '',
    metadata.canonicalName ?? '',
    metadata.mainIngredient ?? '',
    ...(metadata.ingredients ?? []),
    ...(metadata.allergens ?? []),
    metadata.dishFamily ?? '',
  ]
    .map(normalized)
    .join(' ')
}

/**
 * One dietary gate shared by recommendation catalogs. Structured metadata is
 * preferred, then compound dish phrases are inferred through the ontology.
 */
export function dietaryExclusionReason(
  metadata: DietaryFoodMetadata,
  context?: DietaryPreferenceContext | null
): string | null {
  const text = semanticText(metadata)
  const ingredientGroups = inferDietaryIngredientGroups(metadata)
  const restrictions = canonicalRestrictions(context)

  for (const restriction of restrictions) {
    if ((RESTRICTION_GROUPS[restriction] ?? []).some(group => ingredientGroups.has(group))) {
      return restriction
    }
  }

  for (const blocked of context?.blockedFoods ?? []) {
    const keyword = normalized(blocked)
    if (keyword && text.includes(keyword)) return `blocked:${keyword}`
  }

  return null
}

export function foodAllowedByDiet(
  metadata: DietaryFoodMetadata,
  context?: DietaryPreferenceContext | null
): boolean {
  return dietaryExclusionReason(metadata, context) === null
}

export function invalidateDietaryRecommendationCaches(): void {
  if (typeof window === 'undefined') return
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = sessionStorage.key(index)
      if (
        key?.startsWith('dice-session-') ||
        key?.includes('recommendation') ||
        key?.includes('variant-cache')
      ) {
        sessionStorage.removeItem(key)
      }
    }
  } catch {
    /* private mode */
  }
  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index)
      if (key?.includes('recommendation-cache') || key?.includes('dice-queue')) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event('betterbit:diet-preferences-changed'))
}
