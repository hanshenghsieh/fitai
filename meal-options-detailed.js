// 完整的菜單選項，包含分量參考和食材數量

const mealOptions = {
  breakfast: [
    {
      items: [
        {
          id: '1', name: 'Eggs', name_zh: '雞蛋',
          calories: 160, protein_g: 14, carbs_g: 2, fat_g: 12,
          portion: '2個', preparation: '炒',
          photo_url: 'https://images.unsplash.com/photo-1585238341710-4abb7692202b?w=200&h=200&fit=crop',
          quantity: '2個', // 實際數量
          portionDesc: '約麻將牌大小'
        },
        {
          id: '2', name: 'Toast', name_zh: '吐司',
          calories: 120, protein_g: 5, carbs_g: 20, fat_g: 2,
          portion: '2片', preparation: '烤',
          photo_url: 'https://images.unsplash.com/photo-1599599810694-b5ac4dd0alec?w=200&h=200&fit=crop',
          quantity: '2片',
          portionDesc: '標準切片吐司 2片'
        }
      ],
      cal: 280
    },
    {
      items: [
        {
          id: '1b', name: 'Oatmeal', name_zh: '燕麥粥',
          calories: 150, protein_g: 5, carbs_g: 27, fat_g: 3,
          portion: '50g', preparation: '煮',
          photo_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop',
          quantity: '1碗', // 標準碗量
          portionDesc: '一個飯碗的量'
        },
        {
          id: '2b', name: 'Banana', name_zh: '香蕉',
          calories: 120, protein_g: 1, carbs_g: 27, fat_g: 0,
          portion: '1根', preparation: '新鮮',
          photo_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&h=200&fit=crop',
          quantity: '1根',
          portionDesc: '中等大小香蕉 1根'
        }
      ],
      cal: 270
    },
    {
      items: [
        {
          id: '1c', name: 'Yogurt', name_zh: '希臘優格',
          calories: 120, protein_g: 15, carbs_g: 10, fat_g: 2,
          portion: '150ml', preparation: '冷凍',
          photo_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291840?w=200&h=200&fit=crop',
          quantity: '1杯',
          portionDesc: '小酸奶杯的量'
        },
        {
          id: '2c', name: 'Granola', name_zh: '麥片',
          calories: 160, protein_g: 4, carbs_g: 25, fat_g: 6,
          portion: '40g', preparation: '乾',
          photo_url: 'https://images.unsplash.com/photo-1585238341710-4abb7692202b?w=200&h=200&fit=crop',
          quantity: '約1/2杯',
          portionDesc: '約手握拳的量'
        }
      ],
      cal: 280
    }
  ],

  lunch: [
    {
      items: [
        {
          id: 'l1', name: 'Chicken', name_zh: '雞胸肉',
          calories: 320, protein_g: 55, carbs_g: 0, fat_g: 8,
          portion: '160g', preparation: '烤',
          photo_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=200&h=200&fit=crop',
          quantity: '1塊',
          portionDesc: '約一個手掌大小'
        },
        {
          id: 'l2', name: 'Rice', name_zh: '白飯',
          calories: 220, protein_g: 5, carbs_g: 50, fat_g: 1,
          portion: '1碗', preparation: '煮',
          photo_url: 'https://images.unsplash.com/photo-1585238341710-4abb7692202b?w=200&h=200&fit=crop',
          quantity: '1碗',
          portionDesc: '標準飯碗 8分滿'
        },
        {
          id: 'l3', name: 'Broccoli', name_zh: '綠花菜',
          calories: 40, protein_g: 4, carbs_g: 7, fat_g: 0,
          portion: '150g', preparation: '蒸',
          photo_url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=200&fit=crop',
          quantity: '10朵',
          portionDesc: '約手握拳大小'
        }
      ],
      cal: 580
    },
    {
      items: [
        {
          id: 'l1a', name: 'Beef', name_zh: '牛肉',
          calories: 280, protein_g: 45, carbs_g: 0, fat_g: 10,
          portion: '120g', preparation: '煎',
          photo_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561241?w=200&h=200&fit=crop',
          quantity: '2片',
          portionDesc: '約信用卡大小 2片'
        },
        {
          id: 'l2a', name: 'Pasta', name_zh: '義大利麵',
          calories: 240, protein_g: 8, carbs_g: 45, fat_g: 2,
          portion: '100g', preparation: '煮',
          photo_url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=200&h=200&fit=crop',
          quantity: '1盤',
          portionDesc: '約飯碗量乾麵'
        },
        {
          id: 'l3a', name: 'Spinach', name_zh: '菠菜',
          calories: 30, protein_g: 3, carbs_g: 5, fat_g: 0,
          portion: '100g', preparation: '炒',
          photo_url: 'https://images.unsplash.com/photo-1599599810694-b5ac4dd0alec?w=200&h=200&fit=crop',
          quantity: '1盤',
          portionDesc: '小碟炒青菜'
        }
      ],
      cal: 550
    }
  ],

  dinner: [
    {
      items: [
        {
          id: 'd1', name: 'Salmon', name_zh: '鮭魚',
          calories: 300, protein_g: 42, carbs_g: 0, fat_g: 16,
          portion: '130g', preparation: '烤',
          photo_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop',
          quantity: '1片',
          portionDesc: '約信用卡大小、厚度1指'
        },
        {
          id: 'd2', name: 'Sweet Potato', name_zh: '地瓜',
          calories: 120, protein_g: 2, carbs_g: 27, fat_g: 0,
          portion: '120g', preparation: '烤',
          photo_url: 'https://images.unsplash.com/photo-1596535542636-922503f663d7?w=200&h=200&fit=crop',
          quantity: '中等1個',
          portionDesc: '約拳頭大小'
        }
      ],
      cal: 420
    },
    {
      items: [
        {
          id: 'd1a', name: 'Shrimp', name_zh: '蝦',
          calories: 120, protein_g: 26, carbs_g: 0, fat_g: 1,
          portion: '150g', preparation: '炒',
          photo_url: 'https://images.unsplash.com/photo-1580959375944-abd7e991f971?w=200&h=200&fit=crop',
          quantity: '12-15隻',
          portionDesc: '中等大小蝦 12-15隻'
        },
        {
          id: 'd2a', name: 'Quinoa', name_zh: '藜麥',
          calories: 180, protein_g: 7, carbs_g: 33, fat_g: 4,
          portion: '60g', preparation: '煮',
          photo_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop',
          quantity: '3/4碗',
          portionDesc: '標準飯碗 3/4滿'
        }
      ],
      cal: 330
    }
  ]
};

console.log("✅ 菜單數據結構已准備，包含：");
console.log("   ✅ 食物照片 URL");
console.log("   ✅ 實際分量 (克數)");
console.log("   ✅ 食材數量 (個/片/隻)");
console.log("   ✅ 分量參考描述 (視覺參考)");
console.log("\n📋 範例：");
console.log("   雞胸肉 160g = 1塊 約一個手掌大小");
console.log("   蝦 150g = 12-15隻 中等大小");
console.log("   地瓜 120g = 中等1個 約拳頭大小");
