import {
  BarChart3,
  Sparkles,
  Camera,
  ClipboardList,
  Download,
  Headphones,
} from 'lucide-react'

export const PRO_V2_FEATURES = [
  { icon: BarChart3, title: '進階數據分析', subtitle: '更多圖表與趨勢分析，全面掌握進度' },
  { icon: Sparkles, title: '智慧飲食與運動推薦', subtitle: '根據你的目標與進度，提供個人化建議' },
  { icon: Camera, title: '拍照辨識進階模式', subtitle: '更精準的食物辨識與份量估算' },
  { icon: ClipboardList, title: '自訂營養目標', subtitle: '彈性設定熱量與三大營養素目標' },
  { icon: Download, title: '匯出與備份', subtitle: '匯出完整紀錄，跨裝置備份更安心' },
  { icon: Headphones, title: '優先客服支援', subtitle: '專屬團隊快速協助，使用更順暢' },
] as const

export const PRO_V2_FEATURE_TITLES = PRO_V2_FEATURES.map(f => f.title)
