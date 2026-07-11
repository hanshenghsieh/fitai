export interface HelpFaqItem {
  id: string
  question: string
  answer: string
}

export interface HelpGuideItem {
  id: string
  title: string
  subtitle: string
  body: string
}

export const HELP_FAQ_ITEMS: HelpFaqItem[] = [
  {
    id: 'what-is-betterbit',
    question: 'Betterbit 是什麼？',
    answer:
      'Betterbit 是為外食族設計的 AI 減脂助手，幫你記錄餐點、估算熱量與營養素，並依照你的目標調整每日計畫。',
  },
  {
    id: 'log-meals',
    question: '如何記錄餐點？',
    answer:
      '你可以使用拍照辨識、手動新增，或從推薦餐點中加入紀錄。拍照辨識後仍可以手動調整食物與份量。',
  },
  {
    id: 'calorie-accuracy',
    question: '熱量計算準確嗎？',
    answer:
      'Betterbit 會依照食物資料、品牌菜單與 AI 估算提供參考值。實際熱量可能因份量、料理方式與醬料不同而有差異。',
  },
  {
    id: 'set-goals',
    question: '如何設定減脂目標？',
    answer: '你可以到「我的 > 目標設定」調整目標體重、體脂、減脂節奏與每日熱量策略。',
  },
  {
    id: 'edit-meals',
    question: '可以修改已記錄的餐點嗎？',
    answer: '可以。進入餐點紀錄後，選擇要修改的餐點，即可調整份量、餐別或刪除紀錄。',
  },
  {
    id: 'sync-data',
    question: '如何同步資料？',
    answer:
      '登入同一個帳號後，Betterbit 會同步你的主要紀錄與設定。若資料沒有立即更新，請重新整理或稍後再試。',
  },
  {
    id: 'cancel-pro',
    question: '如何取消 Pro 訂閱？',
    answer: 'iPhone 使用者可以到 App Store > Apple ID > 訂閱項目中管理或取消 Betterbit Pro。',
  },
  {
    id: 'contact-info',
    question: '聯絡客服需要什麼資訊？',
    answer:
      '請提供你的帳號 Email、問題描述、發生時間、裝置型號與截圖，這能幫助我們更快定位問題。',
  },
]

export const HELP_GUIDE_ITEMS: HelpGuideItem[] = [
  {
    id: 'quick-start',
    title: '快速上手指南',
    subtitle: '第一次使用看這裡',
    body: '完成 onboarding 後，從 Today 頁開始記錄第一餐。你可以拍照、手動輸入，或從推薦餐點加入。每日熱量與蛋白質目標會依你的身體數據自動計算。',
  },
  {
    id: 'photo-tutorial',
    title: '拍照辨識教學',
    subtitle: '如何拍出更準確的辨識結果',
    body: '拍攝時盡量讓食物完整入鏡、光線充足，並避免過度反光。辨識後請確認份量與餐別，必要時手動調整。',
  },
  {
    id: 'goal-tutorial',
    title: '目標設定教學',
    subtitle: '設定減脂目標與熱量策略',
    body: '到「目標設定」調整目標體重、減脂節奏與每日熱量。可選擇系統自動計算或手動設定每日 kcal 與三大營養素。',
  },
  {
    id: 'calorie-bank',
    title: '回補機制說明',
    subtitle: 'Calorie Bank 如何運作',
    body: '當你短期超標時，Calorie Bank 會把差額分攤到未來幾天，避免一次吃多就放棄。可在目標設定中調整回補天數與強度。',
  },
  {
    id: 'analysis-tutorial',
    title: '數據分析教學',
    subtitle: '如何看懂分析報告',
    body: 'Analysis 頁會顯示體重趨勢、熱量達成率與營養素分布。每週回顧可幫你了解哪些習慣需要調整。',
  },
]
