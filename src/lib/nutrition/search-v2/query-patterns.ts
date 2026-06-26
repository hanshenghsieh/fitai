/** Client-safe query patterns — no fs / ONR imports */

export function isClearlyUnknownQuery(query: string): boolean {
  const q = query.trim()
  return /阿嬤|媽媽|公司附近|自製|便當店|路邊|食堂|家裡|家常菜|混合菜|配菜|無法辨識|不清楚/.test(q)
}

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
  if (/滷味/.test(q)) return true
  if (/鹽酥雞|鹽酥/.test(q)) return true
  if (/火鍋/.test(q)) return true
  if (/自助餐/.test(q)) return true
  return false
}
