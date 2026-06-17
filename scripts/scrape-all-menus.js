#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');

const MENUS = [
  // { name: '星級饗宴', url: 'https://www.7-11.com.tw/freshfoods/19_star/index.aspx', category: 'lunch' },
  { name: '御飯糰', url: 'https://www.7-11.com.tw/freshfoods/1_Ricerolls/index.aspx', category: 'breakfast' },
  { name: '原賞三明治', url: 'https://www.7-11.com.tw/freshfoods/16_sandwich/index.aspx', category: 'breakfast' },
  { name: '台式料理', url: 'https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx', category: 'lunch' },
];

async function scrapeMenu(name, url, defaultCategory) {
  let browser;
  try {
    console.log(`\n📄 爬取: ${name}`);

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    await new Promise(r => setTimeout(r, 1500));

    const products = await page.evaluate(() => {
      const items = [];
      const containers = document.querySelectorAll('[class*="product"], li, .item, [data-id]');

      containers.forEach(container => {
        const text = container.innerText || container.textContent || '';

        const nameMatch = text.match(/[\w一-鿿]+(?:飯糰|三明治|便當|飯|套|沙拉)/);
        const priceMatch = text.match(/(\d{2,4})\s*(?:元|$)/);
        const calorieMatch = text.match(/(\d{2,4})\s*(?:kcal|卡)/);
        const img = container.querySelector('img');

        if (nameMatch || priceMatch) {
          items.push({
            name: nameMatch ? nameMatch[0] : '未知',
            price: priceMatch ? parseInt(priceMatch[1]) : null,
            calories: calorieMatch ? parseInt(calorieMatch[1]) : null,
            image: img ? img.src : null,
          });
        }
      });

      return items;
    });

    const validProducts = products.filter(p => p.name && p.name !== '未知' && p.price);

    console.log(`  ✓ 找到 ${validProducts.length} 項`);

    if (browser) await browser.close();

    return validProducts.map(p => ({
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

async function scrapeAll() {
  const allProducts = [];

  console.log('🔄 開始爬取多個菜單...');

  for (const menu of MENUS) {
    const products = await scrapeMenu(menu.name, menu.url, menu.category);
    allProducts.push(...products);
  }

  console.log(`\n✅ 完成! 總共爬取 ${allProducts.length} 項產品`);

  fs.writeFileSync('scripts/all-menus-raw.json', JSON.stringify(allProducts, null, 2));
  console.log('   已保存到: scripts/all-menus-raw.json');

  return allProducts;
}

scrapeAll();
