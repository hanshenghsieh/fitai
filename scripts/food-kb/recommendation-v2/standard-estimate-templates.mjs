/** Taiwan standard-portion estimate templates for recommendation v2 */

function est(partial) {
  return {
    item_type: partial.portion_type === 'combo' ? 'combo' : 'single',
    is_recommendable: true,
    confidence_level: 'estimated',
    source_type: 'standard_estimate',
    tags: [],
    ...partial,
  }
}

function addon(partial) {
  return {
    item_type: 'single',
    is_recommendable: false,
    portion_type: 'addon',
    meal_role: 'side',
    confidence_level: 'estimated',
    source_type: 'standard_estimate',
    tags: ['addon'],
    ...partial,
  }
}

function blocked(partial) {
  return {
    item_type: 'single',
    is_recommendable: false,
    confidence_level: partial.confidence_level ?? 'estimated',
    source_type: partial.source_type ?? 'standard_estimate',
    tags: [],
    ...partial,
  }
}

function lowEst(partial) {
  return {
    item_type: 'single',
    is_recommendable: false,
    confidence_level: 'low_estimate',
    source_type: 'photo_estimate',
    tags: [],
    ...partial,
  }
}

const CV_COMBOS = [
  ['7-11', '雞胸肉＋地瓜＋茶葉蛋', 340, 31, 6, 38, 'light_meal'],
  ['7-11', '飯糰＋雞胸肉＋茶葉蛋', 430, 28, 10, 52, 'main_meal'],
  ['7-11', '御飯糰＋茶葉蛋＋高蛋白飲', 380, 26, 8, 48, 'main_meal'],
  ['全家', '沙拉＋雞胸肉＋茶葉蛋', 320, 33, 8, 22, 'light_meal'],
  ['全家', '沙拉＋雞胸肉＋無糖豆漿', 350, 35, 9, 24, 'light_meal'],
  ['全家', '糙米飯糰＋舒肥雞胸', 390, 26, 7, 48, 'main_meal'],
  ['7-11', '鮪魚沙拉捲', 280, 18, 9, 30, 'light_meal'],
  ['全家', '花椰菜飯＋雞胸（減醬）', 480, 35, 12, 48, 'main_meal'],
  ['7-11', '茶葉蛋＋地瓜＋無糖優格', 300, 18, 6, 40, 'light_meal'],
  ['萊爾富', '雞胸沙拉盒', 310, 30, 8, 20, 'light_meal'],
  ['全家', '鮭魚飯糰＋沙拉', 420, 22, 12, 50, 'main_meal'],
  ['7-11', '義大利麵沙拉＋雞胸', 400, 28, 10, 42, 'main_meal'],
  ['全家', '蔬菜湯種子＋雞胸（主餐取雞胸）', 290, 27, 6, 22, 'light_meal'],
  ['7-11', '厚切豬排飯糰＋茶葉蛋（小份）', 450, 20, 14, 55, 'main_meal'],
  ['全家', '鮪魚＋蛋三明治組合', 380, 22, 14, 38, 'main_meal'],
  ['7-11', '雞肉沙拉＋茶葉蛋', 300, 28, 7, 18, 'light_meal'],
  ['全家', '雞肉咖哩飯（小份）', 480, 24, 14, 58, 'main_meal'],
  ['7-11', '冷麵沙拉＋雞胸', 360, 26, 8, 40, 'light_meal'],
  ['全家', '蔬食沙拉＋豆漿', 320, 16, 10, 36, 'light_meal'],
  ['7-11', '雞胸＋香蕉＋茶葉蛋', 380, 30, 7, 42, 'light_meal'],
  ['全家', '鮪魚蛋沙拉三明治', 360, 20, 14, 36, 'main_meal'],
  ['7-11', '雞肉飯糰＋沙拉', 410, 22, 10, 52, 'main_meal'],
  ['全家', '花椰菜米＋鮭魚', 450, 28, 16, 38, 'main_meal'],
  ['7-11', '茶葉蛋＋無糖豆漿＋御飯糰', 400, 18, 10, 50, 'main_meal'],
  ['全家', '雞胸＋蔬菜棒＋茶葉蛋', 310, 32, 7, 20, 'light_meal'],
]

const BREAKFAST = [
  ['里肌蛋吐司', 420, 28, 14, 42],
  ['鮪魚蛋吐司', 450, 24, 18, 44],
  ['火腿蛋起司吐司', 480, 22, 22, 42],
  ['雞肉蛋漢堡', 410, 26, 15, 38],
  ['蛋餅＋無糖豆漿', 380, 18, 14, 40],
  ['飯糰＋茶葉蛋', 340, 14, 8, 52],
  ['總匯吐司', 460, 25, 18, 46],
  ['蘿蔔糕＋蛋', 360, 12, 14, 44],
  ['燻雞蛋餅', 400, 20, 16, 42],
  ['豬肉蛋吐司', 440, 24, 16, 40],
  ['起司蛋餅', 390, 16, 18, 38],
  ['雞肉捲餅', 520, 28, 20, 50],
  ['燻雞吐司', 430, 26, 15, 42],
  ['蔬菜蛋吐司', 380, 18, 12, 40],
  ['鮪魚三明治', 400, 20, 16, 42],
  ['雞肉三明治', 420, 24, 14, 44],
  ['燻雞麥芬', 380, 22, 12, 38],
  ['火腿蛋可頌', 450, 20, 22, 40],
  ['蔬菜蛋餅', 360, 14, 14, 38],
  ['肉鬆蛋吐司', 410, 18, 14, 46],
  ['燻雞蛋堡', 400, 26, 14, 36],
  ['鮪魚蛋餅', 420, 22, 16, 40],
  ['雞肉蛋吐司', 430, 28, 14, 42],
  ['起司火腿吐司', 460, 22, 20, 42],
  ['燻雞飯糰＋蛋', 380, 18, 10, 48],
  ['蛋沙拉三明治', 370, 16, 14, 40],
  ['雞肉蛋可頌', 440, 24, 18, 40],
  ['燻雞蛋捲', 390, 24, 12, 36],
  ['蔬菜三明治', 350, 14, 10, 44],
  ['雞肉蛋捲', 400, 26, 12, 38],
  ['燻雞貝果', 380, 24, 10, 42],
  ['蛋餅加菜', 340, 12, 12, 38],
  ['鮪魚蛋漢堡', 420, 22, 16, 40],
  ['雞肉蛋貝果', 410, 28, 12, 40],
  ['燻雞蛋吐司（去醬）', 400, 26, 12, 40],
]

const BENTO_PROTEINS = [
  ['雞胸', 38, 12, 8, 55],
  ['烤雞腿', 35, 18, 14, 58],
  ['滷雞腿', 33, 20, 16, 60],
  ['魚排', 32, 14, 12, 56],
  ['排骨', 30, 22, 18, 58],
  ['控肉', 24, 22, 20, 58],
  ['燒肉', 28, 20, 16, 56],
  ['三杯雞', 30, 18, 14, 54],
  ['鮭魚', 34, 20, 14, 52],
  ['瘦肉', 30, 14, 10, 54],
]
const BENTO_RICE = [
  ['半飯', 130, 2, 1, 28],
  ['少飯', 90, 1, 0, 20],
  ['正常飯', 195, 4, 1, 42],
]

const BUFFET_TEMPLATES = [
  ['半飯＋雞胸＋兩樣青菜', 480, 35, 10, 50],
  ['半飯＋魚肉＋青菜', 460, 30, 12, 48],
  ['半飯＋瘦肉＋蛋＋青菜', 500, 32, 14, 50],
  ['少飯＋豆腐＋雞肉＋青菜', 420, 30, 10, 38],
  ['不飯＋雙蛋白＋青菜', 350, 38, 10, 18],
  ['半飯＋蝦仁＋青菜', 440, 28, 10, 46],
  ['半飯＋豆腐＋青菜', 420, 22, 12, 48],
  ['少飯＋雞胸＋兩樣青菜', 420, 34, 9, 38],
  ['半飯＋滷蛋＋雞胸＋青菜', 520, 38, 12, 52],
  ['不飯＋雞胸＋兩樣青菜', 320, 36, 8, 18],
  ['半飯＋鯛魚＋青菜', 450, 28, 11, 48],
  ['少飯＋魚肉＋蛋＋青菜', 480, 30, 13, 42],
  ['半飯＋豬里肌＋青菜', 490, 30, 15, 50],
  ['不飯＋豆腐＋蛋＋青菜', 300, 24, 12, 16],
  ['半飯＋雞腿（去皮）＋青菜', 520, 32, 14, 50],
  ['少飯＋鮭魚＋青菜', 460, 30, 16, 38],
  ['半飯＋豆干＋青菜', 400, 20, 10, 48],
  ['不飯＋蝦仁＋豆腐＋青菜', 340, 32, 8, 20],
  ['半飯＋牛肉片＋青菜', 510, 32, 16, 50],
  ['少飯＋雞胸＋滷蛋＋青菜', 450, 36, 11, 40],
  ['半飯＋雞肉＋菇類青菜', 470, 30, 10, 48],
  ['不飯＋雙蛋＋青菜', 280, 22, 14, 12],
  ['半飯＋旗魚＋青菜', 440, 30, 10, 46],
  ['少飯＋瘦肉＋兩樣青菜', 400, 26, 12, 36],
  ['半飯＋雞胸＋豆腐＋青菜', 490, 36, 11, 48],
  ['不飯＋雞胸＋蛋＋青菜', 360, 40, 10, 16],
  ['半飯＋鯖魚＋青菜', 480, 28, 16, 46],
  ['少飯＋豆干＋雞肉＋青菜', 410, 28, 10, 36],
  ['半飯＋雞肉丸＋青菜', 460, 26, 12, 50],
  ['不飯＋魚肉＋蛋＋青菜', 340, 30, 12, 18],
]

const LUWEI = [
  ['雞胸肉＋豆腐＋青菜（不加麵）', 350, 36, 10, 20],
  ['雞肉＋豆腐＋青菜＋冬粉', 420, 32, 12, 38],
  ['豆腐＋蛋＋青菜＋王子麵', 480, 24, 14, 52],
  ['低碳滷味（雞胸＋豆腐＋青菜）', 330, 34, 9, 18],
  ['高蛋白滷味（雙雞胸＋蛋）', 400, 42, 12, 16],
  ['鴨胸＋豆腐＋青菜', 400, 30, 14, 18],
  ['牛肉＋豆干＋青菜', 430, 34, 16, 22],
  ['雞腿肉＋青菜（去皮）', 380, 30, 12, 16],
  ['雞胸＋海帶＋青菜', 320, 32, 8, 18],
  ['豆干＋蛋＋青菜', 300, 22, 12, 20],
  ['雞肉＋冬粉＋青菜', 400, 28, 10, 42],
  ['雞胸＋百頁＋青菜', 360, 34, 10, 18],
  ['鴨血＋豆腐＋青菜（少醬）', 380, 24, 14, 28],
  ['雞肉＋蛋＋青菜', 390, 32, 12, 18],
  ['雞胸＋豆包＋青菜', 370, 36, 11, 20],
  ['牛肉＋青菜（不加麵）', 360, 30, 14, 16],
  ['雞腿＋豆腐＋青菜', 420, 32, 14, 22],
  ['雞胸＋木耳＋青菜', 340, 32, 9, 18],
  ['豆干＋青菜＋冬粉', 380, 18, 10, 48],
  ['雞肉＋豆干＋蛋＋青菜', 440, 36, 14, 24],
  ['雞胸＋花干＋青菜', 350, 30, 10, 20],
  ['鴨胸＋蛋＋青菜', 410, 32, 14, 16],
  ['雞肉＋油豆腐＋青菜', 400, 28, 12, 26],
  ['雞胸＋豆皮＋青菜', 360, 34, 10, 18],
  ['牛肉＋蛋＋青菜', 420, 34, 16, 18],
]

const NOODLES_STREET = [
  ['牛肉麵（半麵加肉）', 520, 30, 16, 58],
  ['陽春麵＋滷蛋＋燙青菜', 420, 16, 10, 62],
  ['乾麵＋豆干＋滷蛋', 480, 18, 12, 68],
  ['雞肉飯＋滷蛋', 480, 28, 14, 55],
  ['火雞肉飯＋滷蛋', 460, 26, 12, 54],
  ['滷肉飯＋燙青菜＋豆腐', 520, 22, 18, 58],
  ['乾麵＋燙雞胸', 500, 30, 12, 60],
  ['牛肉湯麵（少麵多菜）', 450, 28, 12, 48],
  ['雞絲涼麵（少醬）', 420, 22, 10, 58],
  ['麻醬麵（小份）＋燙青菜', 480, 16, 14, 64],
  ['餛飩麵（少麵）', 440, 20, 12, 56],
  ['擔擔麵（小份）', 500, 18, 16, 62],
  ['炒麵（小份）＋燙青菜', 520, 16, 14, 68],
  ['肉燥麵（小份）＋滷蛋', 480, 20, 14, 60],
  ['雞肉飯（小份）＋燙青菜', 420, 24, 10, 50],
  ['火雞肉飯（小份）＋豆腐', 400, 22, 10, 48],
  ['滷肉飯（小份）', 450, 18, 16, 52],
  ['牛肉麵（清燉半麵）', 480, 28, 14, 52],
  ['陽春麵＋燙青菜＋豆干', 400, 14, 8, 58],
  ['乾麵＋滷蛋', 450, 14, 10, 64],
  ['雞肉飯＋燙青菜', 440, 24, 12, 50],
  ['火雞肉飯＋燙青菜', 420, 22, 10, 48],
  ['滷肉飯＋滷蛋', 500, 20, 18, 54],
  ['牛肉麵（湯多麵少）', 460, 26, 14, 46],
  ['雞絲麵（清湯小份）', 400, 22, 8, 52],
  ['擔仔麵（小份）', 420, 18, 12, 54],
  ['肉羹麵（少麵）', 440, 16, 12, 56],
  ['麻醬麵＋燙青菜＋豆干', 460, 18, 12, 58],
  ['乾拌麵＋雞胸', 480, 28, 10, 58],
  ['雞肉飯＋豆腐', 450, 26, 12, 52],
  ['火雞肉飯＋滷蛋＋青菜', 480, 28, 12, 52],
  ['滷肉飯＋青菜', 460, 18, 16, 50],
  ['牛肉麵（加肉少麵）', 540, 34, 16, 54],
  ['陽春麵＋雞胸', 440, 26, 10, 56],
  ['乾麵＋燙青菜', 420, 12, 8, 62],
  ['雞肉飯（正常）', 500, 26, 14, 56],
  ['火雞肉飯（正常）', 480, 24, 12, 54],
  ['滷肉飯＋蛋＋青菜', 520, 22, 18, 52],
  ['牛肉麵（半麵）', 480, 26, 14, 50],
  ['雞絲麵＋滷蛋', 430, 20, 10, 54],
]

const HEALTHY_BOX = [
  ['舒肥雞胸餐盒', 450, 40, 10, 38],
  ['鮭魚餐盒', 520, 35, 22, 40],
  ['牛肉餐盒', 500, 38, 18, 42],
  ['雞腿排餐盒（去皮）', 520, 34, 16, 44],
  ['豆腐蔬食餐盒', 420, 22, 12, 48],
  ['火雞胸餐盒', 430, 42, 8, 36],
  ['蝦仁餐盒', 410, 32, 10, 40],
  ['蔬食雞胸餐盒', 440, 38, 9, 42],
  ['低碳水雞胸餐盒', 380, 42, 12, 18],
  ['里肌豬肉餐盒（瘦）', 480, 34, 16, 44],
  ['鯖魚餐盒', 500, 32, 20, 38],
  ['雞胸＋地瓜餐盒', 460, 38, 10, 42],
  ['鮭魚＋花椰菜米餐盒', 480, 34, 18, 36],
  ['牛肉＋糙米餐盒', 510, 36, 16, 44],
  ['雞腿＋沙拉餐盒', 490, 32, 14, 40],
  ['豆腐＋雞胸餐盒', 430, 36, 10, 38],
  ['鮪魚＋蛋餐盒', 440, 32, 14, 40],
  ['雞胸＋鮮蔬餐盒', 420, 40, 8, 36],
  ['鮭魚＋蛋餐盒', 500, 36, 20, 36],
  ['火雞＋地瓜餐盒', 450, 40, 8, 40],
  ['蝦仁＋花椰菜米餐盒', 400, 30, 8, 34],
  ['雞胸＋鮮蔬＋糙米', 470, 38, 10, 44],
  ['鯖魚＋沙拉餐盒', 480, 30, 18, 36],
  ['豆腐＋蔬食餐盒', 390, 20, 10, 44],
  ['雞腿排＋沙拉（去皮）', 500, 32, 14, 42],
]

export function buildStandardEstimateItems() {
  const items = []
  let n = 0
  const id = prefix => `${prefix}-${++n}`

  for (const [brand, name, cal, pro, fat, carb, role] of CV_COMBOS) {
    items.push(
      est({
        id: id('est-cv'),
        brand,
        name,
        calories: cal,
        protein: pro,
        fat,
        carbs: carb,
        meal_role: role,
        portion_type: 'combo',
        meal_time: ['breakfast', 'lunch', 'dinner', 'late_night'].filter(t =>
          role === 'main_meal' ? true : t !== 'breakfast' || name.includes('飯糰')
        ),
        venue_type: 'convenience_store',
        source_note: '台灣便利商店常見組合標準份量估算',
        tags: ['便利商店', 'easy_buy', name.includes('雞胸') ? 'high_protein' : 'balanced'],
        estimate_basis: { portion_note: '超商常見組合一份' },
      })
    )
  }

  for (const [name, cal, pro, fat, carb] of BREAKFAST) {
    items.push(
      est({
        id: id('est-bf'),
        brand: '早餐店',
        name,
        calories: cal,
        protein: pro,
        fat,
        carbs: carb,
        meal_role: 'main_meal',
        portion_type: name.includes('＋') ? 'combo' : 'single_main',
        meal_time: ['breakfast'],
        venue_type: 'breakfast_shop',
        source_note: '台式早餐店標準份量估算（去醬/正常醬）',
        tags: pro >= 24 ? ['high_protein'] : ['balanced'],
        estimate_basis: { cooking_method: '煎', sauce_level: 'light', portion_note: '一份吐司或蛋餅組合' },
      })
    )
  }

  for (const [protein, pPro, pFat, pCarb, pCal] of BENTO_PROTEINS) {
    for (const [riceLabel, rCal, rPro, rFat, rCarb] of BENTO_RICE) {
      const name = `${protein}便當${riceLabel}`
      items.push(
        est({
          id: id('est-bento'),
          brand: '便當店',
          name,
          calories: pCal + rCal,
          protein: pPro + rPro,
          fat: pFat + rFat,
          carbs: pCarb + rCarb,
          meal_role: riceLabel === '正常飯' ? 'main_meal' : 'main_meal',
          portion_type: 'single_main',
          meal_time: ['lunch', 'dinner'],
          venue_type: 'bento',
          source_note: '便當店標準份量估算',
          tags: pPro >= 32 ? ['high_protein', 'weight_loss'] : ['balanced'],
          estimate_basis: {
            rice_g: riceLabel === '半飯' ? 100 : riceLabel === '少飯' ? 70 : 150,
            main_protein: protein,
            vegetable_servings: 1,
            sauce_level: 'normal',
          },
        })
      )
    }
  }

  for (const [name, cal, pro, fat, carb] of BUFFET_TEMPLATES) {
    items.push(
      est({
        id: id('est-buffet'),
        brand: '自助餐',
        name,
        calories: cal,
        protein: pro,
        fat,
        carbs: carb,
        meal_role: name.startsWith('不飯') || name.includes('少飯') ? 'light_meal' : 'main_meal',
        portion_type: 'combo',
        meal_time: ['lunch', 'dinner'],
        venue_type: 'buffet',
        source_note: '自助餐常見搭配標準份量估算',
        tags: pro >= 32 ? ['high_protein', 'weight_loss'] : ['減脂友善', 'weight_loss'],
        estimate_basis: {
          rice_g: name.includes('不飯') ? 0 : name.includes('少飯') ? 70 : 100,
          vegetable_servings: 2,
          portion_note: name,
        },
      })
    )
  }

  for (const [name, cal, pro, fat, carb] of LUWEI) {
    items.push(
      est({
        id: id('est-luwei'),
        brand: '滷味',
        name,
        calories: cal,
        protein: pro,
        fat,
        carbs: carb,
        meal_role: carb <= 25 ? 'light_meal' : 'main_meal',
        portion_type: 'combo',
        meal_time: ['lunch', 'dinner', 'late_night'],
        venue_type: 'custom',
        source_note: '滷味店標準份量估算（少醬）',
        tags: pro >= 32 ? ['high_protein', 'weight_loss'] : ['減脂友善'],
        estimate_basis: { sauce_level: 'light', portion_note: name },
      })
    )
  }

  for (const [name, cal, pro, fat, carb] of NOODLES_STREET) {
    items.push(
      est({
        id: id('est-noodle'),
        brand: name.includes('飯') ? '小吃店' : '麵店',
        name,
        calories: cal,
        protein: pro,
        fat,
        carbs: carb,
        meal_role: cal <= 450 ? 'light_meal' : 'main_meal',
        portion_type: name.includes('＋') ? 'combo' : 'single_main',
        meal_time: ['lunch', 'dinner', 'late_night'],
        venue_type: 'street_food',
        source_note: '台灣麵店/小吃標準份量估算',
        tags: pro >= 26 ? ['high_protein'] : ['balanced'],
        estimate_basis: { sauce_level: name.includes('少醬') ? 'light' : 'normal', portion_note: name },
      })
    )
  }

  for (const [name, cal, pro, fat, carb] of HEALTHY_BOX) {
    items.push(
      est({
        id: id('est-healthy'),
        brand: '健康餐盒',
        name,
        calories: cal,
        protein: pro,
        fat,
        carbs: carb,
        meal_role: cal <= 430 ? 'light_meal' : 'main_meal',
        portion_type: 'single_main',
        meal_time: ['lunch', 'dinner'],
        venue_type: 'healthy_box',
        source_note: '健康餐盒標準份量估算',
        tags: ['high_protein', 'weight_loss', '減脂友善'],
        estimate_basis: { main_protein: name.replace('餐盒', ''), portion_note: '一份外送健康餐' },
      })
    )
  }

  // addons
  items.push(
    addon({ id: 'addon-tea-egg', brand: '便利商店', name: '茶葉蛋', calories: 80, protein: 7, fat: 5, carbs: 1, meal_time: ['breakfast', 'lunch', 'dinner', 'late_night'], venue_type: 'convenience_store', source_note: '超商茶葉蛋標準估算' }),
    addon({ id: 'addon-chicken-breast', brand: '便利商店', name: '即食雞胸肉', calories: 120, protein: 23, fat: 2, carbs: 1, meal_time: ['lunch', 'dinner', 'late_night'], venue_type: 'convenience_store', source_note: '超商即食雞胸' }),
    addon({ id: 'addon-tofu', brand: '滷味', name: '豆腐', calories: 90, protein: 8, fat: 5, carbs: 4, meal_time: ['lunch', 'dinner', 'late_night'], venue_type: 'custom', source_note: '滷豆腐標準估算' }),
    addon({ id: 'addon-boiled-egg', brand: '便利商店', name: '水煮蛋', calories: 70, protein: 6, fat: 5, carbs: 0, meal_time: ['breakfast', 'lunch', 'dinner'], venue_type: 'convenience_store', source_note: '超商水煮蛋' }),
    addon({ id: 'addon-edamame', brand: '便利商店', name: '毛豆', calories: 120, protein: 11, fat: 5, carbs: 8, meal_time: ['lunch', 'dinner', 'late_night'], venue_type: 'convenience_store', source_note: '超商毛豆' }),
  )

  // blocked non-main roles
  items.push(
    blocked({ id: 'blk-soup-miso', brand: '便利商店', name: '味噌湯', calories: 35, protein: 2, fat: 1, carbs: 5, meal_role: 'soup', portion_type: 'addon', meal_time: ['lunch', 'dinner'], venue_type: 'convenience_store', source_note: '湯品 — 不可作主推薦' }),
    blocked({ id: 'blk-drink-tea', brand: '便利商店', name: '無糖烏龍茶', calories: 0, protein: 0, fat: 0, carbs: 0, meal_role: 'drink', portion_type: 'drink_only', meal_time: ['breakfast', 'lunch', 'dinner'], venue_type: 'convenience_store', source_note: '飲料 — 不可作主推薦' }),
    blocked({ id: 'blk-side-kimchi', brand: '自助餐', name: '泡菜小菜', calories: 30, protein: 1, fat: 0, carbs: 6, meal_role: 'side', portion_type: 'addon', meal_time: ['lunch', 'dinner'], venue_type: 'buffet', source_note: '配菜 — 不可作主推薦' }),
    blocked({ id: 'blk-snack-chips', brand: '便利商店', name: '洋芋片', calories: 280, protein: 3, fat: 18, carbs: 28, meal_role: 'snack', portion_type: 'single_main', meal_time: ['late_night'], venue_type: 'convenience_store', source_note: '點心 — 不可作主推薦' }),
    blocked({ id: 'blk-dessert-cake', brand: '便利商店', name: '蛋糕', calories: 320, protein: 4, fat: 14, carbs: 44, meal_role: 'dessert', portion_type: 'single_main', meal_time: ['late_night'], venue_type: 'convenience_store', source_note: '甜點 — 不可作主推薦' }),
  )

  // low_estimate — logging only, not main pool
  items.push(
    lowEst({ id: 'low-night-market-oyster', brand: '夜市', name: '蚵仔煎（醬料不明）', calories: 420, protein: 14, fat: 22, carbs: 40, meal_role: 'snack', portion_type: 'single_main', meal_time: ['late_night'], venue_type: 'street_food', source_note: '夜市小吃粗略估算', is_recommendable: false }),
    lowEst({ id: 'low-night-market-sausage', brand: '夜市', name: '香腸（份量不明）', calories: 350, protein: 12, fat: 28, carbs: 8, meal_role: 'snack', portion_type: 'single_main', meal_time: ['late_night'], venue_type: 'street_food', source_note: '夜市小吃粗略估算', is_recommendable: false }),
    lowEst({ id: 'low-photo-bento-unknown', brand: '便當店', name: '不明便當（照片估算）', calories: 650, protein: 25, fat: 22, carbs: 80, meal_role: 'main_meal', portion_type: 'single_main', meal_time: ['lunch', 'dinner'], venue_type: 'bento', source_note: '照片不清楚時的粗略估算', is_recommendable: false }),
  )

  return items
}
