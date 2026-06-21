/**
 * Food image display policy — trust > visuals until Food DNA matures.
 * Only user-captured photos are shown in UI.
 */
export const SHOW_AI_FOOD_IMAGES = false

export function hasUserFoodPhoto(url: string | undefined | null): boolean {
  if (!url?.trim()) return false
  return url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http') || url.startsWith('/')
}
