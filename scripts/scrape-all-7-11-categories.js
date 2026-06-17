#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');

// 所有菜單分類
const MENUS = [
  { name: '星級饗宴', url: '/freshfoods/19_star/index.aspx', category: 'lunch' },
  { name: '鮮食新品', url: '/freshfoods/hot.aspx', category: 'lunch' },
  { name: 'Ohlala', url: '/freshfoods/17_ohlala/index.aspx', category: 'lunch' },
  { name: '天素地蔬', url: '/freshfoods/18_veg/index.aspx', category: 'lunch' },
  { name: '御飯糰', url: '/freshfoods/1_Ricerolls/index.aspx', category: 'breakfast' },
  { name: '原賞', url: '/freshfoods/16_sandwich/index.aspx', category: 'breakfast' },
  { name: '光合蔬果沙拉', url: '/freshfoods/2_Light/index.aspx', category: 'lunch' },
  { name: '台式料理', url: '/freshfoods/3_Cuisine/index.aspx', category: 'lunch' },
  { name: '風味小食', url: '/freshfoods/4_Snacks/index.aspx', category: 'lunch' },
  { name: '異國料理', url: '/freshfoods/5_International/index.aspx', category: 'lunch' },
  { name: '龍食', url: '/freshfoods/9_Noodles/index.aspx', category: 'lunch' },
  { name: '關東煮', url: '/freshfoods/8_OdenSection/index.aspx', category: 'dinner' },
  { name: '大亨堡', url: '/freshfoods/7_Burger/index.aspx', category: 'lunch' },
];

async function scrapeCategory(name, url, defaultCategory, baseUrl = 'https://www.7-11.com.tw') {
  let browser;
  try {
    console.log(`\n📄 爬取: ${name}`);

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.goto(baseUrl + url, { waitUntil: 'networkidle2', timeout: 30000 });

    console.log('⏳ 等待數據加載...');
    await new Promise(r => setTimeout(r, 2000));

    // 滾動頁面以加載更多產品
    await page.evaluate(() => {
      window.scrollBy(0, document.body.scrollHeight);
    });

    await new Promise(r => setTimeout(r, 1000));

    const products = await page.evaluate(() => {
      const items = [];
      const seen = new Set();

      // 方法1: 查找所有容器
      const containers = document.querySelectorAll(
        'li, div[class*="item"], div[class*="product"], a[href*="freshfoods"], [data-id]'
      );

      containers.forEach(container => {
        const text = container.innerText || container.textContent || '';

        // 提取名稱
        const nameMatch = text.match(/[\w一-鿿]{2,30}(?:飯糰|三明治|便當|飯|套|沙拉|麵|湯|堡|卷|丼)?/);

        // 提取價格
        const priceMatch = text.match(/(\d{2,4})\s*(?:元|$|NT)/);

        // 提取熱量
        const calorieMatch = text.match(/(\d{2,4})\s*(?:kcal|卡)/);

        // 提取圖片
        const img = container.querySelector('img');

        if ((nameMatch || priceMatch) && !seen.has(nameMatch?.[0])) {
          const name = nameMatch ? nameMatch[0].trim() : '未知';
          if (name.length > 2) {
            items.push({
              name: name,
              price: priceMatch ? parseInt(priceMatch[1]) : null,
              calories: calorieMatch ? parseInt(calorieMatch[1]) : null,
              image: img ? img.src : null,
            });
            seen.add(name);
          }
        }
      });

      return items;
    });

    const validProducts = products.filter(p => p.price && p.name.length > 2);

    console.log(`  ✓ 找到 ${validProducts.length} 項 (${defaultCategory})`);

    if (browser) await browser.close();

    return validProducts.map((p, idx) => ({
      name: p.name,
      store: '7-11',
      category: defaultCategory,
      price: p.price,
      calories: p.calories,
      image: p.image,
    }));
  } catch (error) {
    console.error(`  ✗ 錯誤: ${error.message}`);
    if (browser) await browser.close();
    return [];
  }
}

async function scrapeAllCategories() {
  const allProducts = [];

  console.log('🔄 開始爬取所有 7-11 菜單分類...\n');

  for (const menu of MENUS) {
    const products = await scrapeCategory(menu.name, menu.url, menu.category);
    allProducts.push(...products);

    // 延遲以避免被檢測為爬蟲
    await new Promise(r => setTimeout(r, 1500));
  }

  // 統計
  const stats = {
    breakfast: allProducts.filter(p => p.category === 'breakfast').length,
    lunch: allProducts.filter(p => p.category === 'lunch').length,
    dinner: allProducts.filter(p => p.category === 'dinner').length,
  };

  console.log(`\n✅ 完成! 總共爬取 ${allProducts.length} 項產品`);
  console.log(`  早餐: ${stats.breakfast} 項`);
  console.log(`  午餐: ${stats.lunch} 項`);
  console.log(`  晚餐: ${stats.dinner} 項`);

  // 移除重複
  const seen = new Set();
  const uniqueProducts = allProducts.filter(p => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });

  console.log(`  去重後: ${uniqueProducts.length} 項\n`);

  fs.writeFileSync('scripts/all-categories-raw.json', JSON.stringify(uniqueProducts, null, 2));
  console.log('✓ 已保存到: scripts/all-categories-raw.json');

  return uniqueProducts;
}

scrapeAllCategories();
