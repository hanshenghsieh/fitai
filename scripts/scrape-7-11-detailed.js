#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeMenu() {
  let browser;
  try {
    console.log('🔄 啟動瀏覽器...\n');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);

    // 星級饗宴頁面 (高蛋白便當)
    const menuUrl = 'https://www.7-11.com.tw/freshfoods/19_star/index.aspx';

    console.log(`📄 加載菜單: ${menuUrl}`);
    await page.goto(menuUrl, { waitUntil: 'networkidle2' });

    console.log('⏳ 等待數據加載...');
    await new Promise(r => setTimeout(r, 2000));

    // 嘗試點擊和滾動來加載更多產品
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });

    await new Promise(r => setTimeout(r, 1500));

    console.log('🔍 提取產品信息...\n');

    // 提取所有可見的產品
    const products = await page.evaluate(() => {
      const items = [];

      // 方法 1: 查找具有產品信息的容器
      const containers = document.querySelectorAll(
        '[class*="product"], [class*="item"], [class*="food"], li, .grid-item, [data-id]'
      );

      containers.forEach((container) => {
        const text = container.innerText || container.textContent || '';

        // 提取名稱（包含便當、飯等的文本）
        const nameMatch = text.match(/[\w一-鿿]+(?:便當|飯|蓋|套|沙拉|麵|湯)/);

        // 提取價格（數字後跟元）
        const priceMatch = text.match(/(\d{2,4})\s*(?:元|$|NT)/);

        // 提取熱量
        const calorieMatch = text.match(/(\d{2,4})\s*(?:kcal|卡)/);

        // 提取蛋白質
        const proteinMatch = text.match(/(?:蛋白質|蛋|protein)[\s:]*(\d+(?:\.\d+)?)\s*g/i);

        // 搜尋圖片
        const img = container.querySelector('img');
        const imageUrl = img ? img.src : null;

        if (nameMatch || priceMatch) {
          items.push({
            name: nameMatch ? nameMatch[0] : '未知產品',
            price: priceMatch ? parseInt(priceMatch[1]) : null,
            calories: calorieMatch ? parseInt(calorieMatch[1]) : null,
            protein_g: proteinMatch ? parseFloat(proteinMatch[1]) : null,
            image: imageUrl,
            full_text: text.substring(0, 300),
          });
        }
      });

      // 方法 2: 搜尋所有可能包含產品名稱的文本節點
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text.length > 8 && text.length < 50) {
          if (text.includes('便當') || text.includes('飯') || text.includes('蓋')) {
            const parent = node.parentElement;
            const sibling = parent.nextElementSibling;

            let price = null;
            let calories = null;

            if (sibling) {
              const siblingText = sibling.textContent || '';
              const priceMatch = siblingText.match(/(\d{2,4})\s*元/);
              const calMatch = siblingText.match(/(\d{3,4})\s*kcal/);
              price = priceMatch ? parseInt(priceMatch[1]) : null;
              calories = calMatch ? parseInt(calMatch[1]) : null;
            }

            if (!items.some(i => i.name === text)) {
              items.push({
                name: text,
                price: price,
                calories: calories,
                protein_g: null,
                image: null,
              });
            }
          }
        }
      }

      // 移除重複
      const seen = new Set();
      return items.filter(item => {
        if (seen.has(item.name)) return false;
        seen.add(item.name);
        return true;
      });
    });

    console.log(`找到 ${products.length} 個產品:\n`);

    // 過濾有效產品（有名稱和最少一個詳細信息的）
    const validProducts = products.filter(p => p.name && (p.price || p.calories));

    validProducts.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`);
      if (p.price) console.log(`   💰 價格: $${p.price}`);
      if (p.calories) console.log(`   🔥 熱量: ${p.calories} kcal`);
      if (p.protein_g) console.log(`   💪 蛋白質: ${p.protein_g}g`);
      if (p.image) console.log(`   📷 圖片: ${p.image}`);
      console.log('');
    });

    // 保存結果
    const output = {
      source: menuUrl,
      timestamp: new Date().toISOString(),
      store: '7-11',
      products: validProducts.slice(0, 15), // 只保存前15個
    };

    fs.writeFileSync(
      'scripts/scraped-menu.json',
      JSON.stringify(output, null, 2)
    );

    console.log(`✅ 爬取完成! 已保存 ${validProducts.length} 個產品到 scripts/scraped-menu.json`);

  } catch (error) {
    console.error('❌ 錯誤:', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

scrapeMenu();
