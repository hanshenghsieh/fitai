/** 台灣主要商圈門市 seed（品牌級 POI，P0 不依賴外部 API） */
export interface RestaurantPlace {
  id: string
  brand: string
  name: string
  lat: number
  lng: number
  address: string
}

export const RESTAURANT_PLACES: RestaurantPlace[] = [
  { id: 'lsh-xinyi', brand: '梁社漢', name: '梁社漢 信義店', lat: 25.033, lng: 121.5654, address: '台北市信義區' },
  { id: 'lsh-nanjing', brand: '梁社漢', name: '梁社漢 南京店', lat: 25.052, lng: 121.544, address: '台北市中山區' },
  { id: '711-xinyi', brand: '7-11', name: '7-ELEVEN 信義門市', lat: 25.034, lng: 121.567, address: '台北市信義區' },
  { id: '711-zhongxiao', brand: '7-11', name: '7-ELEVEN 忠孝門市', lat: 25.041, lng: 121.544, address: '台北市大安區' },
  { id: 'fm-xinyi', brand: '全家', name: '全家 信義店', lat: 25.035, lng: 121.566, address: '台北市信義區' },
  { id: 'fm-nanjing', brand: '全家', name: '全家 南京店', lat: 25.051, lng: 121.542, address: '台北市中山區' },
  { id: 'mcd-xinyi', brand: '麥當勞', name: '麥當勞 信義店', lat: 25.036, lng: 121.564, address: '台北市信義區' },
  { id: 'mcd-station', brand: '麥當勞', name: '麥當勞 台北車站', lat: 25.047, lng: 121.517, address: '台北市中正區' },
  { id: 'mos-xinyi', brand: '摩斯漢堡', name: '摩斯漢堡 信義店', lat: 25.032, lng: 121.568, address: '台北市信義區' },
  { id: 'sbux-xinyi', brand: '星巴克', name: '星巴克 信義店', lat: 25.0345, lng: 121.568, address: '台北市信義區' },
  { id: 'sbux-nanjing', brand: '星巴克', name: '星巴克 南京店', lat: 25.0525, lng: 121.543, address: '台北市中山區' },
  { id: 'louisa-xinyi', brand: '路易莎', name: '路易莎 信義店', lat: 25.0335, lng: 121.569, address: '台北市信義區' },
  { id: 'sub-xinyi', brand: 'Subway', name: 'Subway 信義店', lat: 25.031, lng: 121.567, address: '台北市信義區' },
  { id: 'hsz-xinyi', brand: '鬍鬚張', name: '鬍鬚張 信義店', lat: 25.0325, lng: 121.563, address: '台北市信義區' },
  { id: 'sunright-nanjing', brand: '三商巧福', name: '三商巧福 南京店', lat: 25.0515, lng: 121.541, address: '台北市中山區' },
  { id: 'ye-xinyi', brand: '野宴', name: '野宴 信義店', lat: 25.034, lng: 121.562, address: '台北市信義區' },
  { id: 'bdf-xinyi', brand: '八方雲集', name: '八方雲集 信義店', lat: 25.0338, lng: 121.561, address: '台北市信義區' },
  { id: 'yoshinoya-station', brand: '吉野家', name: '吉野家 台北車站', lat: 25.0465, lng: 121.516, address: '台北市中正區' },
  { id: 'dk-xinyi', brand: '丼丼屋', name: '丼丼屋 信義店', lat: 25.0355, lng: 121.565, address: '台北市信義區' },
  { id: 'mcd-banqiao', brand: '麥當勞', name: '麥當勞 板橋店', lat: 25.014, lng: 121.464, address: '新北市板橋區' },
  { id: '711-banqiao', brand: '7-11', name: '7-ELEVEN 板橋店', lat: 25.013, lng: 121.465, address: '新北市板橋區' },
  { id: 'lsh-neihu', brand: '梁社漢', name: '梁社漢 內湖店', lat: 25.079, lng: 121.575, address: '台北市內湖區' },
  { id: '711-neihu', brand: '7-11', name: '7-ELEVEN 內湖店', lat: 25.078, lng: 121.576, address: '台北市內湖區' },
  { id: 'wutao-xinyi', brand: '悟饕池上飯包', name: '悟饕池上飯包 信義店', lat: 25.0332, lng: 121.5605, address: '台北市信義區' },
  { id: 'wutao-banqiao', brand: '悟饕池上飯包', name: '悟饕池上飯包 板橋店', lat: 25.012, lng: 121.462, address: '新北市板橋區' },
  { id: 'chishang-xinyi', brand: '池上飯包', name: '池上飯包 信義店', lat: 25.0342, lng: 121.559, address: '台北市信義區' },
  { id: 'dongchi-banqiao', brand: '東池飯包', name: '東池飯包 板橋店', lat: 25.011, lng: 121.463, address: '新北市板橋區' },
  { id: 'fulong-taipei', brand: '福隆便當', name: '福隆便當 台北店', lat: 25.048, lng: 121.518, address: '台北市中正區' },
  { id: 'lsh-banqiao', brand: '梁社漢', name: '梁社漢 板橋店', lat: 25.0135, lng: 121.4645, address: '新北市板橋區' },
  { id: 'songhwa-neihu', brand: '松花湖便當', name: '松花湖便當 內湖店', lat: 25.0775, lng: 121.5745, address: '台北市內湖區' },
  { id: 'jiuru-nanjing', brand: '九如排骨', name: '九如排骨 南京店', lat: 25.0518, lng: 121.5415, address: '台北市中山區' },
  { id: 'protein-xinyi', brand: '蛋白盒子', name: '蛋白盒子 信義店', lat: 25.0335, lng: 121.561, address: '台北市信義區' },
  { id: 'protein-banqiao', brand: '蛋白盒子', name: '蛋白盒子 板橋店', lat: 25.0125, lng: 121.4635, address: '新北市板橋區' },
  { id: 'miss-energy-xinyi', brand: '能量小姐', name: '能量小姐 信義店', lat: 25.0348, lng: 121.562, address: '台北市信義區' },
  { id: 'less-salt-nanjing', brand: '少點鹹', name: '少點鹹 南京店', lat: 25.0522, lng: 121.5425, address: '台北市中山區' },
  { id: 'suizhu-can-tainan', brand: '隨主飡', name: '隨主飡 台南店', lat: 22.9908, lng: 120.2133, address: '台南市中西區' },
  { id: 'bonbox-xinyi', brand: '楽坡Bonbox', name: '楽坡Bonbox 信義店', lat: 25.035, lng: 121.5608, address: '台北市信義區' },
  { id: 'yyc-neihu', brand: '一月初', name: '一月初 內湖店', lat: 25.0785, lng: 121.5755, address: '台北市內湖區' },
  { id: 'louisa-health-xinyi', brand: '路易莎', name: '路易莎 信義店', lat: 25.0335, lng: 121.569, address: '台北市信義區' },
  { id: 'jianren-kaohsiung', brand: '健人餐廚', name: '健人餐廚 高雄店', lat: 22.6273, lng: 120.3014, address: '高雄市苓雅區' },
  { id: 'power-box-neihu', brand: '給力盒子', name: '給力盒子 內湖店', lat: 25.0778, lng: 121.5748, address: '台北市內湖區' },
]

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

export function walkMinutes(distanceM: number): number {
  return Math.max(1, Math.round(distanceM / 80))
}

export function googleMapsUrl(lat: number, lng: number, label?: string): string {
  const q = label ? encodeURIComponent(label) : `${lat},${lng}`
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}
