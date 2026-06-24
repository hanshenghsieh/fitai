#!/usr/bin/env node
/**
 * Build Food Source Allowlist (P0: 1–300, P1: 301–600) — protected brands, never quarantine.
 * Usage: node scripts/build-top300-allowlist.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const RAW_NAMES = `
7-ELEVEN
全家
萊爾富
OK mart
全聯
家樂福
Costco
愛買
大潤發
美廉社
麥當勞
肯德基
漢堡王
摩斯漢堡
SUBWAY
丹丹漢堡
頂呱呱
拿坡里
必勝客
達美樂
八方雲集
四海遊龍
三商巧福
鬍鬚張
吉野家
Sukiya
大戶屋
彌生軒
すき家
丸龜製麵
藏壽司
壽司郎
爭鮮
合點壽司
金子半之助
乾杯
老乾杯
燒肉同話
胡同燒肉
茶六燒肉堂
築間
石二鍋
12MINI
這一鍋
肉多多
馬辣
辛殿麻辣鍋
鼎王
無老鍋
老四川
王品牛排
西堤牛排
陶板屋
夏慕尼
原燒
藝奇
聚北海道鍋物
品田牧場
青花驕
尬鍋
瓦城
非常泰
1010湘
時時香
開飯川食堂
饗泰多
大心
金色三麥
TGI FRIDAYS
Chilis
星巴克
路易莎
cama café
伯朗咖啡
怡客咖啡
丹堤咖啡
85度C
Mister Donut
Krispy Kreme
Dunkin
50嵐
清心福全
CoCo
可不可熟成紅茶
迷客夏
一芳
萬波
龜記
麻古茶坊
珍煮丹
春水堂
翰林茶館
COMEBUY
TEA TOP
再睡5分鐘
得正
大苑子
老賴茶棧
五桐號
烏弄
鼎泰豐
欣葉台菜
欣葉小聚
度小月
阿霞飯店
金峰魯肉飯
黃記魯肉飯
今大魯肉飯
矮仔財滷肉飯
天天利美食坊
阜杭豆漿
永和豆漿
世界豆漿大王
美而美
弘爺漢堡
拉亞漢堡
Q Burger
麥味登
早安美芝城
晨間廚房
梁社漢排骨
悟饕池上飯包
正忠排骨飯
福隆便當
台鐵便當
池上木片便當
金仙魯肉飯
鬍鬚張便當
悟饕飯包
佳味鮮便當
大埔鐵板燒
紅花鐵板燒
夏慕尼鐵板燒
龐德羅莎
貴族世家
孫東寶
我家牛排
牛角日本燒肉
安安燒肉
燒肉眾
添好運
點點心
檀島香港茶餐廳
金獅樓
京星港式飲茶
了凡油雞飯
香港發財燒臘
香港九記海鮮
茗香園冰室
波記茶餐廳
大阪王將
京都勝牛
勝博殿
銀座杏子日式豬排
福勝亭
靜岡勝政
樂麵屋
一風堂
屯京拉麵
花月嵐
山頭火
一蘭拉麵
Nagi凪拉麵
麵屋武藏
鷹流拉麵
鬼金棒
博多一幸舍
拉麵公子
麵屋壹之穴
麵屋一燈
bb.q CHICKEN
起家雞
NENE CHICKEN
韓姜熙
涓豆腐
豆腐村
八色烤肉
姜虎東白丁
小韓坊
韓虎嘯
雙月食品社
林東芳牛肉麵
永康牛肉麵
劉山東牛肉麵
老山東牛肉家常麵店
建宏牛肉麵
史記正宗牛肉麵
牛店精燉牛肉麵
老王記牛肉麵
張家清真黃牛肉麵館
阿宗麵線
陳記腸蚵專業麵線
油庫口麵線
賴阿婆芋圓
東區粉圓
三兄妹雪花冰
冰讚
龍都冰菓專業家
陳三鼎黑糖青蛙鮮奶
施家鮮肉湯圓
士林夜市
饒河夜市
寧夏夜市
臨江街夜市
南機場夜市
樂華夜市
輔大花園夜市
逢甲夜市
一中街商圈
旱溪夜市
花園夜市
武聖夜市
六合夜市
瑞豐夜市
羅東夜市
東大門夜市
基隆廟口夜市
城隍廟小吃
淡水老街
九份老街
新光三越美食街
遠東SOGO美食街
微風廣場美食街
台北101美食街
誠品生活美食街
遠百美食街
板橋大遠百美食街
Global Mall 環球購物中心美食街
LaLaport美食街
南紡購物中心美食街
夢時代美食街
漢神巨蛋美食街
台茂購物中心美食街
大江購物中心美食街
美麗華美食街
京站美食街
CITYLINK美食街
Mitsui Outlet Park美食街
ATT 4 FUN美食街
統一時代百貨美食街
IKEA餐廳
MUJI Café
TSUTAYA BOOKSTORE Café
N.Y. Bagels Café
Second Floor貳樓
樂子
Sarabeth’s
The Diner樂子
Belle Époque
Woolloomooloo
開丼
金子咖哩
魔法咖哩
咖哩匠
Coco壱番屋
甘泉魚麵
老先覺
大呼過癮
錢都
小蒙牛
養鍋
涮乃葉
饗食天堂
饗饗
旭集
漢來海港
果然匯
島語
欣葉日本料理
千葉火鍋
Subway美式潛艇堡
SaladStop!
Miacucina
Miss Green
BaganHood
Herban Kitchen & Bar
Ooh Cha Cha
Plants
Naked Deli
FitBox
享健康
健身工廠健康餐
森度餐廚
福勝亭便當
健康橘子工坊
Light House健康餐
Miss Energy
有肌勵
初飯
貝果貝果之東西廚房
三明治先生
卡路里健康餐盒
Muscle Food
野人舒食
良食煮意
蔬坊
好丘
碳佐麻里
阿城鵝肉
富霸王豬腳
`.trim().split(/\n/).map(s => s.trim()).filter(Boolean)

function loadP1Names() {
  const fp = path.join(__dirname, 'data/allowlist-p1-301-600.txt')
  return fs.readFileSync(fp, 'utf8').trim().split(/\n/).map(s => s.trim()).filter(Boolean)
}

const CANONICAL = {
  '7-ELEVEN': '7-11',
  'OK mart': 'OK超商',
  'SUBWAY': 'Subway',
  'Subway美式潛艇堡': 'Subway',
  'Sukiya': 'SUKIYA',
  'すき家': 'SUKIYA',
  '彌生軒': 'YAYOI彌生軒',
  '爭鮮': '爭鮮迴轉壽司',
  'Chilis': "Chili's",
  'cama café': 'cama',
  '50嵐': '五十嵐',
  'CoCo': 'CoCo都可',
  '可不可熟成紅茶': '可不可',
  '再睡5分鐘': '再睡五分鐘',
  'TEA TOP': '茶湯會',
  'COMEBUY': 'COMEBUY',
  '欣葉台菜': '欣葉',
  '欣葉小聚': '欣葉',
  '欣葉日本料理': '欣葉',
  '金仙魯肉飯': '金仙滷肉飯',
  '悟饕池上飯包': '悟饕池上便當',
  '悟饕飯包': '悟饕池上便當',
  '夏慕尼鐵板燒': '夏慕尼',
  'Second Floor貳樓': '貳樓',
  'The Diner樂子': '樂子',
  'Coco壱番屋': 'CoCo壹番屋',
  'TGI FRIDAYS': 'TGI Fridays',
  'Krispy Kreme': 'Krispy Kreme',
  'Dunkin': "Dunkin'",
  'Mister Donut': 'Mister Donut',
  '一芳': '一芳水果茶',
  '健身工廠健康餐': '健身工廠',
  'Light House健康餐': 'Light House',
  '卡路里健康餐盒': '卡路里',
  '蔬坊': '蔬方',
  'IKEA餐廳': 'IKEA',
  // P1 branch → parent
  '雙月食品社濟南店': '雙月食品社',
  '茶六公益店': '茶六燒肉堂',
  '度小月擔仔麵': '度小月',
  '春水堂創始店': '春水堂',
  '丹丹漢堡七賢店': '丹丹漢堡',
  '正忠排骨飯高雄總店': '正忠排骨飯',
  '貳樓餐廳': '貳樓',
  '滴妹再睡5分鐘': '再睡五分鐘',
  '可不可熟成紅茶台北南陽店': '可不可',
  '萬波島嶼紅茶': '萬波',
  '珍煮丹黑糖飲品': '珍煮丹',
  '吳寶春麥方店': '吳寶春',
  'Woolloomooloo信義店': 'Woolloomooloo',
  '狸小路手作烘焙': '狸小路',
  "Robin's Grill": "Robin's Grill",
}

const ALIASES = {
  '7-11': ['7-ELEVEN', '7-ELEVEN', '統一超商', 'seven eleven'],
  '全家': ['FamilyMart', 'familymart'],
  '萊爾富': ['Hi-Life', 'hilife'],
  'OK超商': ['OK mart', 'OK Mart', 'okmart'],
  '全聯': ['全聯福利中心', 'PX Mart', 'pxmart'],
  '家樂福': ['Carrefour', 'carrefour'],
  'Costco': ['好市多', '好市多熟食'],
  '美廉社': ['Simple Mart'],
  '麥當勞': ["McDonald's", 'Mcdonalds', 'McDonald'],
  '肯德基': ['KFC', 'kfc'],
  '漢堡王': ['Burger King', '必艾客'],
  '摩斯漢堡': ['MOS', 'MOS Burger'],
  'Subway': ['SUBWAY', 'Subway美式潛艇堡'],
  '星巴克': ['Starbucks', 'starbucks'],
  '路易莎': ['路易莎咖啡', 'Louisa'],
  'cama': ['cama café', 'cama咖啡'],
  '伯朗咖啡': ['伯朗'],
  '五十嵐': ['50嵐', '50嵐'],
  '清心福全': ['清心'],
  'CoCo都可': ['CoCo', 'coco'],
  '可不可': ['可不可熟成紅茶'],
  '再睡五分鐘': ['再睡5分鐘'],
  '茶湯會': ['TEA TOP'],
  '老賴茶棧': ['老賴紅茶'],
  '爭鮮迴轉壽司': ['爭鮮', '爭鮮PLUS', '爭鮮plus'],
  '西堤牛排': ['西堤'],
  '梁社漢排骨': ['梁社漢'],
  '悟饕池上便當': ['悟饕池上飯包', '悟饕飯包', '悟饕'],
  '欣葉': ['欣葉台菜', '欣葉小聚', '欣葉日本料理'],
  '金仙滷肉飯': ['金仙魯肉飯'],
  'CoCo壹番屋': ['Coco壱番屋', '咖哩'],
  'SUKIYA': ['Sukiya', 'すき家'],
  'YAYOI彌生軒': ['彌生軒', 'YAYOI'],
  'TGI Fridays': ['TGI FRIDAYS'],
  "Chili's": ['Chilis', "Chili's"],
  '貳樓': ['Second Floor', 'Second Floor貳樓'],
  'IKEA': ['IKEA餐廳', '宜家'],
  'FitBox': ['FITBOX', 'fitbox'],
  '享健康': ['享健康餐盒'],
  'Miss Energy': ['能量小姐'],
  '森度餐廚': ['森度餐廚（Uber Eats）'],
  '雙月食品社': ['雙月食品社濟南店'],
  '茶六燒肉堂': ['茶六公益店', '茶六'],
  '度小月': ['度小月擔仔麵'],
  '春水堂': ['春水堂創始店'],
  '丹丹漢堡': ['丹丹漢堡七賢店'],
  '正忠排骨飯': ['正忠排骨飯高雄總店'],
  '貳樓': ['貳樓餐廳', 'Second Floor貳樓'],
  '再睡五分鐘': ['滴妹再睡5分鐘', '再睡5分鐘'],
  '可不可': ['可不可熟成紅茶台北南陽店', '可不可熟成紅茶'],
  '萬波': ['萬波島嶼紅茶'],
  '珍煮丹': ['珍煮丹黑糖飲品'],
  '吳寶春': ['吳寶春麥方店'],
  'Woolloomooloo': ['Woolloomooloo信義店'],
  '屋馬': ['屋馬燒肉'],
  '和牛涮': ['和牛涮'],
  '燒肉LIKE': ['燒肉LIKE'],
}

const SOURCE_TYPE_RULES = [
  { test: /夜市|老街|商圈|廟口|城隍廟/, type: 'night_market' },
  { test: /美食街|CITYLINK|Outlet|ATT|時代百貨/, type: 'mall_food_court' },
  { test: /^7-11$|^全家$|^萊爾富$|^OK超商$|^美廉社$/, type: 'convenience_store' },
  { test: /^全聯$|^家樂福$|^Costco$|^愛買$|^大潤發$/, type: 'supermarket' },
  { test: /咖啡|星巴克|路易莎|cama|伯朗|怡客|丹堤|85度C|MUJI Café|TSUTAYA|Bagels|貳樓|樂子|Sarabeth|Woolloomooloo|Belle/, type: 'cafe' },
  { test: /嵐$|可不可|清心|CoCo都可|迷客夏|一芳|萬波|龜記|麻古|珍煮丹|翰林|COMEBUY|茶湯會|再睡|得正|大苑子|老賴|五桐|烏弄|春水堂|陳三鼎/, type: 'drink_shop' },
  { test: /美而美|弘爺|拉亞|Q Burger|麥味登|早安美芝城|晨間廚房|豆漿|阜杭|永和豆漿/, type: 'street_food' },
  { test: /牛肉麵|魯肉飯|滷肉飯|麵線|芋圓|粉圓|雪花冰|冰菓|湯圓|鵝肉|豬腳|雙月|阿宗|了凡|金峰|黃記|今大|矮仔財|天天利|阿霞/, type: 'local_restaurant' },
  { test: /健康餐|FitBox|享健康|森度|Miss Energy|SaladStop|Miacucina|Miss Green|BaganHood|Herban|Ooh Cha Cha|Plants|Naked Deli|Muscle Food|野人舒食|良食煮意|蔬方|卡路里|有肌勵|初飯|健身工廠|Light House|健康橘子|三明治先生/, type: 'delivery_only' },
]

const CLUSTER_BY_TYPE = {
  convenience_store: ['飲料', '飯糰', '三明治', '便當', '熟食'],
  supermarket: ['熟食', '沙拉', '便當', '烘焙', '飲料'],
  mall_food_court: ['套餐', '定食', '輕食', '飲料', '甜點'],
  night_market: ['小吃', '鹽酥雞', '滷味', '飲料', '甜點'],
  cafe: ['咖啡', '輕食', '貝果', '三明治', '甜點'],
  drink_shop: ['手搖飲', '奶茶', '果茶', '鮮奶茶', '冰品'],
  street_food: ['蛋餅', '漢堡', '三明治', '飲料', '套餐'],
  local_restaurant: ['招牌主食', '小菜', '湯品', '飲料'],
  delivery_only: ['健康餐盒', '沙拉', '舒肥雞胸', '低卡主食', '蛋白質餐'],
  chain_restaurant: ['套餐', '定食', '主食', '小菜', '飲料'],
}

const CLUSTER_OVERRIDES = {
  '麥當勞': ['漢堡', '薯條', '早餐', '雞塊', '飲料'],
  '肯德基': ['炸雞', '漢堡', '蛋塔', '套餐', '飲料'],
  '鼎泰豐': ['小籠包', '炒飯', '麵點', '小菜', '飲料'],
  '藏壽司': ['迴轉壽司', '握壽司', '副食', '甜點', '飲料'],
  '壽司郎': ['迴轉壽司', '握壽司', '副食', '甜點', '飲料'],
  '爭鮮迴轉壽司': ['迴轉壽司', '握壽司', '副食', '甜點', '飲料'],
  '丸龜製麵': ['烏龍麵', '天婦羅', '釜玉', '副食', '飲料'],
  '八方雲集': ['鍋貼', '水餃', '酸辣湯', '麵食', '飲料'],
  '石二鍋': ['火鍋', '肉盤', '菜盤', '副食', '飲料'],
  '築間': ['火鍋', '肉盤', '菜盤', '副食', '飲料'],
  '饗食天堂': ['自助餐', '海鮮', '熟食', '甜點', '飲料'],
  '漢來海港': ['自助餐', '海鮮', '熟食', '甜點', '飲料'],
  '五十嵐': ['珍珠奶茶', '烏龍茶', '青茶', '鮮奶茶', '果茶'],
  '森度餐廚': ['舒肥雞胸餐盒', '低卡主食', '沙拉', '蛋白質餐'],
  'FitBox': ['舒肥雞胸', '健康餐盒', '沙拉', '低卡主食'],
}

const P1_CLUSTER_RULES = [
  { test: /米其林|RAW|MUME|Logy|Impromptu|Molino|Orchid|侯布雄|Forchetta|Tavernist|Tairroir|JL Studio|鹽之華|山海樓|富錦樹/, clusters: ['品嚐菜單', '主餐', '前菜', '甜點', '酒單'] },
  { test: /牛排|A CUT|Lawry|Robin's|教父|N°168|Prime Rib|俺達/, clusters: ['牛排', '海鮮', '配菜', '湯品', '甜點'] },
  { test: /燒肉|肉屋|和牛涮|牛角|板前|屋馬|風間|牧島/, clusters: ['燒肉', '套餐', '副食', '飲料', '甜點'] },
  { test: /火鍋|麻辣|涮涮|石研|湯棧|臭臭鍋|問鼎|辛殿|鼎王|無老鍋|養鍋|涮乃葉|詹記|滿堂紅|鬼椒/, clusters: ['火鍋', '肉盤', '海鮮', '副食', '飲料'] },
  { test: /小籠|湯包|點水樓|港式|飲茶|添好運|檀島/, clusters: ['點心', '麵食', '主餐', '飲料', '甜點'] },
  { test: /魯肉|滷肉|肉燥|豬腳|雞肉飯|火雞肉|排骨|便當|米糕|碗粿|割包|鹹粥|擔仔麵|魚羹|米粉/, clusters: ['主食', '小菜', '湯品', '飲料'] },
  { test: /牛肉麵|牛肉湯|肉羹|涮牛肉/, clusters: ['牛肉麵', '湯品', '小菜', '飲料'] },
  { test: /夜市|廟口|老街|商圈|雞排|木瓜牛奶/, clusters: ['小吃', '主食', '飲料', '甜點'] },
  { test: /咖啡|Cafe|Coffee|Roasting|Fika|Kaffa|醫務所/, clusters: ['咖啡', '輕食', '甜點', '飲料'] },
  { test: /甜點|餅|蛋糕|烘焙|鳳梨酥|芋圓|豆花|冰|Pâtisserie|Lady M|亞尼克|微熱山丘|佳德/, clusters: ['甜點', '烘焙', '飲料', '伴手禮'] },
  { test: /茶|飲|奶茶|紅茶|手搖/, clusters: ['手搖飲', '奶茶', '果茶', '冰品'] },
  { test: /早餐|蛋餅|美而美|豆漿|鬆餅|吐司/, clusters: ['蛋餅', '三明治', '飲料', '套餐'] },
  { test: /肉乾|肉鬆|糕餅|伴手禮|鐵蛋|茶葉蛋/, clusters: ['伴手禮', '零食', '糕餅', '飲料'] },
]

const MIXED_DEFAULT_CLUSTERS = ['招牌菜', '主食', '小菜', '湯品', '飲料']

function inferSourceType(canonical, raw) {
  for (const r of SOURCE_TYPE_RULES) {
    if (r.test.test(canonical) || r.test.test(raw)) return r.type
  }
  return 'chain_restaurant'
}

function inferConfidence(canonical, sourceType) {
  if (['convenience_store', 'supermarket'].includes(sourceType)) return 'A'
  const national = ['麥當勞', '肯德基', '星巴克', '鼎泰豐', '全聯', '家樂福', '藏壽司', '壽司郎', '五十嵐', '瓦城', '王品牛排', '西堤牛排', '夏慕尼', '陶板屋', 'IKEA']
  if (national.includes(canonical)) return 'A'
  if (sourceType === 'night_market' || sourceType === 'local_restaurant') return 'B'
  if (sourceType === 'mall_food_court') return 'A'
  if (sourceType === 'delivery_only') return 'B'
  return 'A'
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '') || 'brand'
}

function inferP1Clusters(canonical, raw) {
  for (const r of P1_CLUSTER_RULES) {
    if (r.test.test(canonical) || r.test.test(raw)) return r.clusters
  }
  return MIXED_DEFAULT_CLUSTERS
}

function buildEntry(rank, raw, tier) {
  const canonical_name = CANONICAL[raw] ?? raw
  const isP1 = tier === 'P1'

  const source_type = isP1
    ? 'mixed'
    : inferSourceType(canonical_name, raw)

  const menu_clusters = isP1
    ? (CLUSTER_OVERRIDES[canonical_name] ?? inferP1Clusters(canonical_name, raw))
    : (CLUSTER_OVERRIDES[canonical_name] ?? CLUSTER_BY_TYPE[source_type] ?? CLUSTER_BY_TYPE.chain_restaurant)

  const search_aliases = [...new Set([raw, ...(ALIASES[canonical_name] ?? [])].filter(a => a !== canonical_name))]
  const confidence_level = isP1 ? 'B' : inferConfidence(canonical_name, source_type)

  return {
    rank,
    input_name: raw,
    canonical_name,
    source_type,
    menu_clusters,
    search_aliases,
    confidence_level,
    quarantine_exempt: true,
    seed_priority: isP1 ? 'P1' : 'P0',
    needs_cross_validation: isP1,
    slug: slugify(canonical_name),
  }
}

function main() {
  const p1Names = loadP1Names()
  if (RAW_NAMES.length !== 300) {
    console.error(`Expected 300 P0 names, got ${RAW_NAMES.length}`)
    process.exit(1)
  }
  if (p1Names.length !== 300) {
    console.error(`Expected 300 P1 names, got ${p1Names.length}`)
    process.exit(1)
  }

  const entries = [
    ...RAW_NAMES.map((name, i) => buildEntry(i + 1, name, 'P0')),
    ...p1Names.map((name, i) => buildEntry(i + 301, name, 'P1')),
  ]

  const byCanonical = new Map()
  for (const e of entries) {
    if (!byCanonical.has(e.canonical_name)) byCanonical.set(e.canonical_name, e)
  }

  const payload = {
    version: '2.0.0',
    generated_at: new Date().toISOString(),
    count: entries.length,
    p0_count: 300,
    p1_count: 300,
    unique_canonical: byCanonical.size,
    policy: 'quarantine_exempt',
    entries,
    index: Object.fromEntries(
      entries.flatMap(e => {
        const keys = [e.canonical_name, e.input_name, ...e.search_aliases]
        return keys.map(k => [k.toLowerCase().replace(/\s+/g, ''), e.canonical_name])
      })
    ),
  }

  const jsonDir = path.join(ROOT, 'data/food-kb')
  fs.mkdirSync(jsonDir, { recursive: true })
  const primaryJson = path.join(jsonDir, 'food-source-allowlist.json')
  const legacyJson = path.join(jsonDir, 'top300-allowlist.json')
  fs.writeFileSync(primaryJson, JSON.stringify(payload, null, 2), 'utf8')
  fs.writeFileSync(legacyJson, JSON.stringify(payload, null, 2), 'utf8')

  const csvHeader = [
    'rank', 'canonical_name', 'source_type', 'seed_priority', 'needs_cross_validation',
    'confidence_level', 'menu_clusters', 'search_aliases', 'quarantine_exempt',
  ]
  const csvLines = [csvHeader.join(',')]
  for (const e of entries) {
    csvLines.push([
      e.rank,
      csvEscape(e.canonical_name),
      e.source_type,
      e.seed_priority,
      e.needs_cross_validation,
      e.confidence_level,
      csvEscape(e.menu_clusters.join('|')),
      csvEscape(e.search_aliases.join('|')),
      'true',
    ].join(','))
  }
  const csvPath = path.join(ROOT, 'food_source_allowlist.csv')
  const legacyCsv = path.join(ROOT, 'food_source_top300_allowlist.csv')
  const csvBody = csvLines.join('\n')
  fs.writeFileSync(csvPath, csvBody, 'utf8')
  fs.writeFileSync(legacyCsv, [csvHeader.join(','), ...csvLines.slice(1, 301)].join('\n'), 'utf8')

  const tsPath = path.join(ROOT, 'src/lib/food-kb/top300-allowlist.ts')
  const ts = `/** Auto-generated by scripts/build-top300-allowlist.mjs — do not edit manually */
import data from '../../../data/food-kb/food-source-allowlist.json'

export interface FoodSourceAllowlistEntry {
  rank: number
  input_name: string
  canonical_name: string
  source_type: string
  menu_clusters: string[]
  search_aliases: string[]
  confidence_level: 'A' | 'B'
  quarantine_exempt: true
  seed_priority: 'P0' | 'P1'
  needs_cross_validation: boolean
  slug: string
}

export interface FoodSourceAllowlist {
  version: string
  generated_at: string
  count: number
  p0_count: number
  p1_count: number
  unique_canonical: number
  policy: 'quarantine_exempt'
  entries: FoodSourceAllowlistEntry[]
  index: Record<string, string>
}

export const FOOD_SOURCE_ALLOWLIST = data as FoodSourceAllowlist
/** @deprecated use FOOD_SOURCE_ALLOWLIST */
export const TOP300_ALLOWLIST = FOOD_SOURCE_ALLOWLIST

export type Top300AllowlistEntry = FoodSourceAllowlistEntry
export type Top300Allowlist = FoodSourceAllowlist

export function isQuarantineExempt(name: string): boolean {
  const key = name.trim().toLowerCase().replace(/\\s+/g, '')
  return Boolean(FOOD_SOURCE_ALLOWLIST.index[key])
}

export function resolveCanonicalAllowlist(name: string): FoodSourceAllowlistEntry | null {
  const key = name.trim().toLowerCase().replace(/\\s+/g, '')
  const canonical = FOOD_SOURCE_ALLOWLIST.index[key]
  if (!canonical) return null
  return FOOD_SOURCE_ALLOWLIST.entries.find(e => e.canonical_name === canonical) ?? null
}

export function needsCrossValidation(name: string): boolean {
  const entry = resolveCanonicalAllowlist(name)
  return entry?.needs_cross_validation === true
}

export function allAllowlistCanonicalNames(): string[] {
  return [...new Set(FOOD_SOURCE_ALLOWLIST.entries.map(e => e.canonical_name))]
}

export function p1SeedEntries(): FoodSourceAllowlistEntry[] {
  return FOOD_SOURCE_ALLOWLIST.entries.filter(e => e.seed_priority === 'P1')
}
`
  fs.writeFileSync(tsPath, ts, 'utf8')

  const md = buildMd(entries, byCanonical.size, p1Names.length)
  fs.writeFileSync(path.join(ROOT, 'docs/FOOD_SOURCE_TOP300_ALLOWLIST.md'), md, 'utf8')
  fs.writeFileSync(path.join(ROOT, 'docs/FOOD_SOURCE_ALLOWLIST.md'), md, 'utf8')

  console.log('Food source allowlist built (600)')
  console.log({
    entries: entries.length,
    p0: 300,
    p1: 300,
    unique_canonical: byCanonical.size,
    json: primaryJson,
    csv: csvPath,
    ts: tsPath,
  })
}

function csvEscape(v) {
  const s = String(v ?? '')
  return s.includes(',') || s.includes('|') ? `"${s.replace(/"/g, '""')}"` : s
}

function buildMd(entries, uniqueCanonical, p1Count) {
  const byType = {}
  for (const e of entries) {
    byType[e.source_type] = (byType[e.source_type] ?? 0) + 1
  }
  const p0 = entries.filter(e => e.seed_priority === 'P0')
  const p1 = entries.filter(e => e.seed_priority === 'P1')

  return `# Food Source Allowlist (600)

**Generated:** ${new Date().toISOString()}  
**Policy:** \`quarantine_exempt: true\` — 此清單內品牌 **不得 quarantine**

---

## Summary

| Metric | Value |
|--------|------:|
| 清單項目 | 600 |
| P0（1–300 連鎖/通路） | 300 |
| P1（301–600 精選/名店/夜市） | ${p1Count} |
| 唯一 canonical 品牌 | ${uniqueCanonical} |
| P0 信心 A 級 | ${p0.filter(e => e.confidence_level === 'A').length} |
| P1 信心 B 級（需交叉驗證） | ${p1.filter(e => e.confidence_level === 'B').length} |

### P1 種子規則

- \`seed_priority = P1\`
- \`needs_cross_validation = true\`
- \`source_type = mixed\`
- \`quarantine_exempt = true\`（仍不得隔離）

### 依 source_type

| source_type | 數量 |
|-------------|-----:|
${Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => `| ${t} | ${n} |`).join('\n')}

---

## 欄位說明

| 欄位 | 說明 |
|------|------|
| canonical_name | 標準品牌名（合併別名後） |
| source_type | P0 依類型；P1 固定 \`mixed\` |
| menu_clusters | 常見菜單群組 |
| search_aliases | 搜尋別名 |
| confidence_level | A（P0 多數）/ B（P1 全數） |
| seed_priority | P0 / P1 |
| needs_cross_validation | P1 = true |
| quarantine_exempt | 固定 true |

---

## 檔案

- \`data/food-kb/food-source-allowlist.json\`
- \`food_source_allowlist.csv\`
- \`src/lib/food-kb/top300-allowlist.ts\` — \`isQuarantineExempt()\` / \`needsCrossValidation()\`

---

## P1 精選（301–320 預覽）

| # | canonical | clusters |
|---|-----------|----------|
${p1.slice(0, 20).map(e => `| ${e.rank} | ${e.canonical_name} | ${e.menu_clusters.join(', ')} |`).join('\n')}

---

## 完整清單

見 \`food_source_allowlist.csv\`（600 rows）
`
}

main()
