/** Client-safe query patterns — no fs / ONR imports */

export function isClearlyUnknownQuery(query: string): boolean {
  const q = query.trim()
  return /阿嬤|媽媽|公司附近|自製|便當店|路邊|食堂|家裡|家常菜|混合菜|配菜|無法辨識|不清楚/.test(q)
}

/**
 * Build 38 BUG 5 — single source of truth for the "generic high-risk dish,
 * no specific sub-variant question, just portion/candidate clarify" keyword
 * group (滷味/鹽酥雞/火鍋/自助餐/...). hasClarificationPattern (below) and
 * buildClarificationQuestions (clarification.ts) used to each hardcode
 * their own copy of this list and had drifted apart — hasClarificationPattern
 * accepted bare "鹽酥" while buildClarificationQuestions required "鹽酥雞",
 * so a query like "鹽酥蝦" forced action:'clarify' but produced zero actual
 * questions, an unrecoverable dead-end. Both call sites must import this
 * exact constant — never re-list these keywords locally.
 */
export const HIGH_RISK_CLARIFICATION_RE = /滷味|鹽酥雞|鹹酥雞|鹽酥|火鍋|自助餐|燒肉|串串/

export function hasClarificationPattern(query: string): boolean {
  const q = query.trim()

  if (/竹筍.*湯|湯.*竹筍/.test(q)) {
    if (/排骨|雞|蛤蜊|麻竹筍|711|7-11|全家/.test(q)) return false
    return true
  }

  if (/雞湯/.test(q)) {
    if (/清雞湯|香菇|人參|麻油|枸杞/.test(q)) return false
    return true
  }

  if (/牛肉麵|牛麵/.test(q)) {
    if (/清燉|紅燒|半筋半肉/.test(q)) return false
    return true
  }

  if (/便當/.test(q)) return true
  if (HIGH_RISK_CLARIFICATION_RE.test(q)) return true
  return false
}
