#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const menuDataPath = path.join(__dirname, '../src/lib/convenience-store-menu.ts');

// Example format - user can paste their data as JSON array
const exampleFormat = {
  id: '7-11-breakfast-1',
  name: '雞胸肉蛋白早餐便當',
  store: '7-11', // or '全家'
  category: 'breakfast', // breakfast, lunch, or dinner
  calories: 350,
  protein_g: 52,
  carbs_g: 20,
  fat_g: 8,
  price: 89,
  photo_url: 'https://example.com/image.jpg',
  description: '高蛋白早餐：烤雞胸肉+米飯+蔬菜',
};

async function promptUser() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log('');
    console.log('=== Convenience Store Menu Importer ===');
    console.log('');
    console.log('Paste your menu data as JSON array and press Enter twice when done:');
    console.log('Example format:');
    console.log(JSON.stringify([exampleFormat], null, 2));
    console.log('');
    console.log('---');
    console.log('');

    let input = '';
    rl.on('line', (line) => {
      if (line === '' && input.length > 0) {
        rl.close();
        resolve(input);
      } else {
        input += line + '\n';
      }
    });
  });
}

async function generateMenuFile(items) {
  const header = `// 便利店菜單資料庫 - 7-11 & 全家常見便當
// 優先選擇高蛋白選項，支持減脂目標

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

export const convenienceStoreMenu: ConvenienceItem[] = ${JSON.stringify(items, null, 2)}

export function getConvenienceItems(category: 'breakfast' | 'lunch' | 'dinner'): ConvenienceItem[] {
  return convenienceStoreMenu.filter(item => item.category === category)
}

export function getConvenienceItemsByStore(store: '7-11' | '全家', category: 'breakfast' | 'lunch' | 'dinner'): ConvenienceItem[] {
  return convenienceStoreMenu.filter(item => item.store === store && item.category === category)
}
`;

  fs.writeFileSync(menuDataPath, header);
  console.log(`✅ Menu data saved to ${menuDataPath}`);
  console.log(`📊 Total items imported: ${items.length}`);
  console.log('');
  console.log('Breakdown:');
  const byStore = {};
  const byCategory = {};
  items.forEach((item) => {
    byStore[item.store] = (byStore[item.store] || 0) + 1;
    byCategory[item.category] = (byCategory[item.category] || 0) + 1;
  });
  Object.entries(byStore).forEach(([store, count]) => {
    console.log(`  ${store}: ${count} items`);
  });
  Object.entries(byCategory).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} items`);
  });
}

async function main() {
  try {
    const input = await promptUser();
    const items = JSON.parse(input);

    if (!Array.isArray(items)) {
      console.error('❌ Error: Input must be a JSON array');
      process.exit(1);
    }

    // Validate required fields
    for (const item of items) {
      if (!item.id || !item.name || !item.store || !item.category || !item.calories || item.protein_g === undefined || !item.price) {
        console.error('❌ Error: Missing required fields in item:', item);
        console.error('Required: id, name, store, category, calories, protein_g, price');
        process.exit(1);
      }
    }

    await generateMenuFile(items);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
