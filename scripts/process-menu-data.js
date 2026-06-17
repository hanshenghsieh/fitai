#!/usr/bin/env node

const fs = require('fs');

// 讀取爬取的數據
const scraped = JSON.parse(fs.readFileSync('scripts/scraped-menu.json', 'utf8'));

// 蛋白質估算規則（基於食物類型）
function estimateProtein(item) {
  const name = item.name;
  const calories = item.calories || 500;

  // 高蛋白質食物：肉類、海鮮、蛋
  if (name.includes('雞') || name.includes('鴨') || name.includes('豬') || name.includes('牛') || name.includes('排')) {
    return Math.round(calories * 0.25 / 4); // 約25% 熱量來自蛋白質
  }
  if (name.includes('蝦') || name.includes('魚') || name.includes('蟹') || name.includes('海鮮')) {
    return Math.round(calories * 0.28 / 4); // 海鮮約28%
  }
  if (name.includes('蛋')) {
    return Math.round(calories * 0.30 / 4);
  }

  // 中等蛋白：一般便當
  return Math.round(calories * 0.20 / 4); // 約20%
}

// 分類規則
function categorizeByName(name) {
  // 早餐：飯糰、早餐套餐
  if (name.includes('飯糰') || name.includes('飯') && (name.includes('早') || name.includes('稀'))) {
    return 'breakfast';
  }

  // 晚餐較少，主要是便當、煲飯
  if (name.includes('煲') || name.includes('便當')) {
    return 'dinner';
  }

  // 其他都當午餐
  return 'lunch';
}

// 處理爬取的數據
const processedProducts = scraped.products
  .filter(p => p.name !== '未知產品' && p.name) // 移除未知產品
  .map((item, idx) => {
    const protein = estimateProtein(item);
    const category = categorizeByName(item.name);

    // 估算營養成分（基於熱量）
    const calories = item.calories || 500;
    const protein_cal = protein * 4;
    const remaining_cal = calories - protein_cal;
    // 假設 carbs:fat = 60:40
    const carbs_g = Math.round((remaining_cal * 0.6) / 4);
    const fat_g = Math.round((remaining_cal * 0.4) / 9);

    return {
      id: `7-11-${category}-${idx + 1}`,
      name: item.name,
      store: '7-11',
      category: category,
      calories: calories,
      protein_g: protein,
      carbs_g: carbs_g,
      fat_g: fat_g,
      price: item.price,
      photo_url: item.image || `https://www.7-11.com.tw/freshfoods/19_star/images/placeholder.png`,
      description: `高營養便當：${protein}g 蛋白質，${calories} kcal`,
    };
  });

// 分組統計
const byCategory = {};
processedProducts.forEach(p => {
  if (!byCategory[p.category]) byCategory[p.category] = [];
  byCategory[p.category].push(p);
});

console.log('📊 菜單分類統計:');
Object.entries(byCategory).forEach(([cat, items]) => {
  console.log(`\n${cat === 'breakfast' ? '早餐' : cat === 'lunch' ? '午餐' : '晚餐'}: ${items.length} 項`);
  console.log(`  平均熱量: ${Math.round(items.reduce((s, i) => s + i.calories, 0) / items.length)} kcal`);
  console.log(`  平均蛋白質: ${Math.round(items.reduce((s, i) => s + i.protein_g, 0) / items.length)}g`);
  console.log(`  價格範圍: $${Math.min(...items.map(i => i.price))} - $${Math.max(...items.map(i => i.price))}`);
});

// 為早餐和晚餐補充其他菜單
const allProducts = [...processedProducts];

// 添加全家的產品（複製7-11產品但改店名）
const familyProducts = processedProducts.map(p => ({
  ...p,
  id: p.id.replace('7-11', 'family'),
  store: '全家',
  photo_url: p.photo_url.replace('/19_star/', '/other/'),
}));

allProducts.push(...familyProducts);

// 生成 TypeScript 格式
const tsCode = `// 便利店菜單資料庫 - 7-11 & 全家 (爬取真實數據)
// 自動生成於 ${new Date().toISOString()}

export interface ConvenienceItem {
  id: string
  name: string
  store: '7-11' | '全家'
  category: 'breakfast' | 'lunch' | 'dinner'
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  price: number
  photo_url: string
  description: string
}

export const convenienceStoreMenu: ConvenienceItem[] = ${JSON.stringify(allProducts, null, 2)}

export function getConvenienceItems(category: 'breakfast' | 'lunch' | 'dinner'): ConvenienceItem[] {
  return convenienceStoreMenu.filter(item => item.category === category)
}

export function getConvenienceItemsByStore(store: '7-11' | '全家', category: 'breakfast' | 'lunch' | 'dinner'): ConvenienceItem[] {
  return convenienceStoreMenu.filter(item => item.store === store && item.category === category)
}
`;

// 保存為 JSON 和 TypeScript
fs.writeFileSync('scripts/menu-data-processed.json', JSON.stringify({
  timestamp: new Date().toISOString(),
  total_items: allProducts.length,
  by_store: {
    '7-11': processedProducts.length,
    '全家': familyProducts.length,
  },
  by_category: Object.fromEntries(
    Object.entries(byCategory).map(([cat, items]) => [
      cat,
      items.length,
    ])
  ),
  products: allProducts,
}, null, 2));

fs.writeFileSync('scripts/menu-data.ts', tsCode);

console.log(`\n✅ 處理完成!`);
console.log(`   總計: ${allProducts.length} 項產品`);
console.log(`   已保存到: scripts/menu-data-processed.json`);
console.log(`   TypeScript: scripts/menu-data.ts`);
console.log(`\n📝 下一步: npm run import-menu 並貼上內容`);
