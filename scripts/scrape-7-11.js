#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function scrape711() {
  let browser;
  try {
    console.log('🔄 啟動瀏覽器...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);

    console.log('📄 加載 7-11 新鮮食品頁面...');
    await page.goto('https://www.7-11.com.tw/freshfoods/19_star/index.aspx', {
      waitUntil: 'networkidle2',
    });

    console.log('⏳ 等待產品數據加載...');
    await new Promise(r => setTimeout(r, 3000));

    // 提取所有產品信息
    const products = await page.evaluate(() => {
      const items = [];

      // 嘗試從 DOM 中找產品
      const productElements = document.querySelectorAll('.product, [data-product], li, .item');

      productElements.forEach((el) => {
        const text = el.innerText || el.textContent;
        const html = el.innerHTML;

        // 搜尋中文名稱和價格
        const nameMatch = text.match(/[^\n\r\t]{3,30}[便當飯糰雞肉牛肉鮭魚]/);
        const priceMatch = text.match(/(\d{2,4})\s*元/);

        if (nameMatch || priceMatch) {
          items.push({
            name: nameMatch ? nameMatch[0] : '未知',
            price: priceMatch ? parseInt(priceMatch[1]) : null,
            fullText: text.substring(0, 200),
            html: html.substring(0, 100),
          });
        }
      });

      return items;
    });

    console.log(`\n找到 ${products.length} 個產品:`);
    products.slice(0, 10).forEach((p) => {
      console.log(`  - ${p.name} (${p.price} 元)`);
    });

    // 嘗試找 JavaScript 中的數據
    console.log('\n🔍 搜尋隱藏的 JavaScript 數據...');
    const jsData = await page.evaluate(() => {
      // 檢查全局變數中是否有數據
      if (window.__DATA__) return window.__DATA__;
      if (window.foodData) return window.foodData;
      if (window.products) return window.products;

      // 搜尋頁面中的 JSON 數據
      const scripts = Array.from(document.querySelectorAll('script'));
      let jsonData = null;

      scripts.forEach((script) => {
        const content = script.textContent;
        if (content.includes('[') && content.includes('{')) {
          try {
            // 尋找 JSON 模式
            const jsonMatch = content.match(/(\[[\s\S]*?\]|\{[\s\S]*?\})/);
            if (jsonMatch && jsonMatch[1].length > 100) {
              jsonData = jsonMatch[1];
            }
          } catch (e) {
            // 繼續
          }
        }
      });

      return jsonData;
    });

    if (jsData) {
      console.log('✅ 找到 JavaScript 數據!');
      console.log(jsData.substring(0, 500));
    } else {
      console.log('❌ 未找到隱藏的 JavaScript 數據');
    }

    // 嘗試找菜單分類連結
    console.log('\n📋 搜尋菜單分類...');
    const categories = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links
        .map(a => ({
          text: a.textContent.trim(),
          href: a.href,
        }))
        .filter(a => a.text.includes('便當') || a.text.includes('飯') || a.text.includes('食') || a.href.includes('fresh'))
        .slice(0, 10);
    });

    console.log(`找到 ${categories.length} 個相關菜單:`);
    categories.forEach((c) => {
      console.log(`  - ${c.text}: ${c.href}`);
    });

    console.log('\n✅ 爬取完成!');
  } catch (error) {
    console.error('❌ 錯誤:', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

scrape711();
