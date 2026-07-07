import type { DishVariant } from './types'

type M = { min: number; mid: number; max: number }

function v(
  id: string,
  templateId: string,
  name: string,
  cal: M,
  pro: M,
  fat: M,
  carbs: M,
  extra?: Partial<DishVariant>
): DishVariant {
  return {
    id,
    templateId,
    name,
    aliases: extra?.aliases ?? [name],
    tags: extra?.tags ?? [],
    typicalCalories: cal,
    typicalProtein: pro,
    typicalFat: fat,
    typicalCarbs: carbs,
    variantHint: extra?.variantHint,
    recommendedAdjustments: extra?.recommendedAdjustments,
    sourceType: 'database_estimate',
    confidence: extra?.confidence ?? 'medium',
  }
}

/** Additional DishVariants merged into catalog at build time. */
export const VARIANT_EXTENSIONS: DishVariant[] = [
  // --- 雞胸便當（飯量為變體，非品牌） ---
  v('variant_chicken_breast_bento_half', 'dish_chicken_breast_bento', '半飯', { min: 430, mid: 481, max: 530 }, { min: 36, mid: 40, max: 44 }, { min: 10, mid: 13, max: 16 }, { min: 30, mid: 36, max: 42 }, { aliases: ['半飯', '雞胸便當半飯'], tags: ['減脂友善', '高蛋白'], variantHint: '比正常飯穩', recommendedAdjustments: ['醬汁分開'] }),
  v('variant_chicken_breast_bento_less', 'dish_chicken_breast_bento', '少飯', { min: 390, mid: 436, max: 480 }, { min: 35, mid: 39, max: 43 }, { min: 9, mid: 12, max: 15 }, { min: 22, mid: 28, max: 34 }, { aliases: ['少飯', '雞胸便當少飯'], tags: ['減脂友善', '高蛋白'], variantHint: '熱量快滿時優先', recommendedAdjustments: ['醬汁分開'] }),
  v('variant_chicken_breast_bento_normal', 'dish_chicken_breast_bento', '正常飯', { min: 490, mid: 545, max: 600 }, { min: 38, mid: 42, max: 46 }, { min: 10, mid: 13, max: 16 }, { min: 42, mid: 50, max: 58 }, { aliases: ['正常飯', '雞胸便當正常飯'], tags: ['高蛋白'], variantHint: '標準份量' }),

  // --- 排骨飯 ---
  v('variant_pork_rib_braised', 'dish_pork_rib_rice', '滷排骨飯', { min: 760, mid: 860, max: 980 }, { min: 28, mid: 34, max: 40 }, { min: 28, mid: 36, max: 44 }, { min: 72, mid: 88, max: 102 }, { variantHint: '比較穩', recommendedAdjustments: ['少飯', '醬汁少'] }),
  v('variant_pork_rib_fried', 'dish_pork_rib_rice', '炸排骨飯', { min: 900, mid: 1020, max: 1180 }, { min: 26, mid: 32, max: 38 }, { min: 42, mid: 52, max: 62 }, { min: 78, mid: 95, max: 110 }, { tags: ['炸'], variantHint: '脂肪偏高', recommendedAdjustments: ['少飯', '今天脂肪偏高不建議'] }),
  v('variant_pork_rib_grilled', 'dish_pork_rib_rice', '烤排骨飯', { min: 740, mid: 840, max: 960 }, { min: 28, mid: 34, max: 40 }, { min: 26, mid: 34, max: 42 }, { min: 72, mid: 88, max: 102 }, { variantHint: '比炸排骨穩' }),

  // --- 滷肉飯 ---
  v('variant_lurou_small', 'dish_lu_rou_fan', '小碗滷肉飯', { min: 480, mid: 580, max: 680 }, { min: 14, mid: 18, max: 22 }, { min: 22, mid: 28, max: 34 }, { min: 55, mid: 68, max: 80 }, { variantHint: '份量較小' }),
  v('variant_lurou_large', 'dish_lu_rou_fan', '大碗滷肉飯', { min: 780, mid: 880, max: 980 }, { min: 22, mid: 28, max: 34 }, { min: 32, mid: 40, max: 48 }, { min: 85, mid: 100, max: 115 }, { variantHint: '熱量較高' }),
  v('variant_lurou_egg', 'dish_lu_rou_fan', '滷肉飯加蛋', { min: 680, mid: 780, max: 880 }, { min: 22, mid: 28, max: 34 }, { min: 30, mid: 38, max: 46 }, { min: 72, mid: 86, max: 98 }, { recommendedAdjustments: ['加蛋可補蛋白', '仍要注意肥肉'] }),
  v('variant_lurou_bento', 'dish_lu_rou_fan', '滷肉飯便當', { min: 720, mid: 820, max: 920 }, { min: 20, mid: 26, max: 32 }, { min: 32, mid: 38, max: 46 }, { min: 78, mid: 92, max: 105 }, { recommendedAdjustments: ['搭配青菜或豆腐', '少飯'] }),

  // --- 肉燥飯 ---
  v('variant_rouzao_small', 'dish_rou_zao_fan', '小碗肉燥飯', { min: 450, mid: 550, max: 650 }, { min: 12, mid: 16, max: 20 }, { min: 20, mid: 26, max: 32 }, { min: 52, mid: 65, max: 78 }, { variantHint: '小份較穩' }),
  v('variant_rouzao_large', 'dish_rou_zao_fan', '大碗肉燥飯', { min: 720, mid: 820, max: 920 }, { min: 18, mid: 24, max: 30 }, { min: 30, mid: 38, max: 46 }, { min: 82, mid: 95, max: 108 }, { variantHint: '熱量較高' }),
  v('variant_rouzao_egg', 'dish_rou_zao_fan', '肉燥飯加蛋', { min: 620, mid: 720, max: 820 }, { min: 18, mid: 24, max: 30 }, { min: 28, mid: 34, max: 42 }, { min: 68, mid: 82, max: 95 }, { recommendedAdjustments: ['加蛋補蛋白'] }),

  // --- 雞肉飯 ---
  v('variant_chicken_rice_small', 'dish_chicken_rice', '小碗雞肉飯', { min: 480, mid: 580, max: 680 }, { min: 24, mid: 28, max: 34 }, { min: 14, mid: 20, max: 26 }, { min: 55, mid: 68, max: 80 }, { variantHint: '份量較小' }),
  v('variant_chicken_rice_large', 'dish_chicken_rice', '大碗雞肉飯', { min: 720, mid: 820, max: 920 }, { min: 32, mid: 38, max: 44 }, { min: 22, mid: 28, max: 36 }, { min: 85, mid: 98, max: 112 }, { variantHint: '熱量較高' }),
  v('variant_chicken_rice_egg', 'dish_chicken_rice', '雞肉飯加蛋', { min: 640, mid: 740, max: 840 }, { min: 30, mid: 36, max: 42 }, { min: 20, mid: 26, max: 32 }, { min: 68, mid: 82, max: 95 }, { recommendedAdjustments: ['加蛋補蛋白', '醬汁少'] }),
  v('variant_chicken_rice_bento', 'dish_chicken_rice', '雞肉飯便當', { min: 620, mid: 720, max: 820 }, { min: 28, mid: 34, max: 40 }, { min: 18, mid: 24, max: 30 }, { min: 72, mid: 86, max: 98 }, { recommendedAdjustments: ['少飯', '醬汁分開'] }),

  // --- 控肉飯 ---
  v('variant_kongrou_bento', 'dish_kong_rou_fan', '控肉便當', { min: 760, mid: 860, max: 960 }, { min: 24, mid: 30, max: 36 }, { min: 38, mid: 46, max: 54 }, { min: 75, mid: 90, max: 105 }, { variantHint: '脂肪偏高' }),
  v('variant_kongrou_less_rice', 'dish_kong_rou_fan', '少飯控肉飯', { min: 620, mid: 720, max: 820 }, { min: 22, mid: 28, max: 34 }, { min: 32, mid: 40, max: 48 }, { min: 52, mid: 65, max: 78 }, { variantHint: '比較穩', recommendedAdjustments: ['少飯', '去肥'] }),
  v('variant_kongrou_lean', 'dish_kong_rou_fan', '去肥控肉飯', { min: 680, mid: 780, max: 880 }, { min: 24, mid: 30, max: 36 }, { min: 28, mid: 36, max: 44 }, { min: 68, mid: 82, max: 95 }, { recommendedAdjustments: ['去肥', '少飯'] }),

  // --- 牛肉麵 補充 ---
  v('variant_beef_noodle_soup', 'dish_beef_noodle', '牛肉湯麵', { min: 480, mid: 580, max: 680 }, { min: 26, mid: 32, max: 38 }, { min: 16, mid: 22, max: 28 }, { min: 55, mid: 70, max: 85 }, { variantHint: '比大碗麵穩', recommendedAdjustments: ['湯少喝', '麵吃七分'] }),
  v('variant_beef_noodle_soup_half_rice', 'dish_beef_noodle', '牛肉湯 + 半碗飯', { min: 420, mid: 500, max: 600 }, { min: 28, mid: 34, max: 40 }, { min: 12, mid: 18, max: 26 }, { min: 40, mid: 52, max: 65 }, { tags: ['減脂友善'], variantHint: '熱量快滿時優先', recommendedAdjustments: ['湯少喝', '飯可再少'] }),

  // --- 蛋餅 ---
  v('variant_egg_pancake_plain', 'dish_egg_pancake', '原味蛋餅', { min: 260, mid: 320, max: 400 }, { min: 8, mid: 11, max: 14 }, { min: 10, mid: 14, max: 18 }, { min: 26, mid: 36, max: 46 }),
  v('variant_egg_pancake_cheese', 'dish_egg_pancake', '起司蛋餅', { min: 320, mid: 400, max: 480 }, { min: 12, mid: 16, max: 20 }, { min: 18, mid: 24, max: 30 }, { min: 28, mid: 38, max: 48 }, { variantHint: '脂肪較高' }),
  v('variant_egg_pancake_tuna', 'dish_egg_pancake', '鮪魚蛋餅', { min: 300, mid: 380, max: 460 }, { min: 14, mid: 18, max: 22 }, { min: 14, mid: 20, max: 26 }, { min: 28, mid: 38, max: 48 }),
  v('variant_egg_pancake_ham', 'dish_egg_pancake', '火腿蛋餅', { min: 300, mid: 380, max: 460 }, { min: 12, mid: 16, max: 20 }, { min: 16, mid: 22, max: 28 }, { min: 28, mid: 38, max: 48 }),
  v('variant_egg_pancake_bacon', 'dish_egg_pancake', '培根蛋餅', { min: 340, mid: 430, max: 520 }, { min: 12, mid: 16, max: 20 }, { min: 22, mid: 30, max: 38 }, { min: 28, mid: 38, max: 48 }, { tags: ['炸'], variantHint: '脂肪偏高' }),
  v('variant_egg_pancake_chicken', 'dish_egg_pancake', '雞胸蛋餅', { min: 280, mid: 350, max: 430 }, { min: 18, mid: 24, max: 30 }, { min: 10, mid: 14, max: 18 }, { min: 26, mid: 36, max: 46 }, { tags: ['高蛋白', '減脂友善'], variantHint: '較穩' }),
  v('variant_egg_pancake_veggie', 'dish_egg_pancake', '蔬菜蛋餅', { min: 240, mid: 300, max: 380 }, { min: 8, mid: 11, max: 14 }, { min: 8, mid: 12, max: 16 }, { min: 28, mid: 38, max: 48 }, { tags: ['減脂友善'], variantHint: '較穩' }),

  // --- 飯糰 ---
  v('variant_rice_ball_traditional', 'dish_rice_ball', '傳統飯糰', { min: 260, mid: 330, max: 420 }, { min: 6, mid: 9, max: 12 }, { min: 6, mid: 10, max: 14 }, { min: 42, mid: 52, max: 62 }, { variantHint: '碳水偏高注意' }),
  v('variant_rice_ball_purple', 'dish_rice_ball', '紫米飯糰', { min: 280, mid: 350, max: 440 }, { min: 6, mid: 9, max: 12 }, { min: 6, mid: 10, max: 14 }, { min: 45, mid: 55, max: 65 }),
  v('variant_rice_ball_egg', 'dish_rice_ball', '飯糰加蛋', { min: 320, mid: 400, max: 480 }, { min: 12, mid: 16, max: 20 }, { min: 10, mid: 14, max: 18 }, { min: 45, mid: 55, max: 65 }, { recommendedAdjustments: ['加蛋補蛋白'] }),
  v('variant_rice_ball_pork_floss', 'dish_rice_ball', '飯糰加肉鬆', { min: 300, mid: 380, max: 460 }, { min: 8, mid: 11, max: 14 }, { min: 10, mid: 14, max: 18 }, { min: 48, mid: 58, max: 68 }),
  v('variant_rice_ball_half', 'dish_rice_ball', '小飯糰', { min: 180, mid: 230, max: 280 }, { min: 4, mid: 6, max: 8 }, { min: 4, mid: 7, max: 10 }, { min: 28, mid: 36, max: 44 }, { variantHint: '份量較小' }),

  // --- 火鍋 補充 ---
  v('variant_hotpot_kombu', 'dish_hot_pot', '昆布鍋', { min: 480, mid: 620, max: 780 }, { min: 22, mid: 30, max: 38 }, { min: 12, mid: 18, max: 26 }, { min: 40, mid: 55, max: 70 }, { aliases: ['昆布火鍋'], variantHint: '最穩', tags: ['減脂友善'] }),
  v('variant_hotpot_beef', 'dish_hot_pot', '牛肉火鍋', { min: 680, mid: 820, max: 980 }, { min: 36, mid: 44, max: 52 }, { min: 28, mid: 38, max: 48 }, { min: 45, mid: 60, max: 75 }, { tags: ['高蛋白'], variantHint: '蛋白質高' }),
  v('variant_hotpot_pork', 'dish_hot_pot', '豬肉火鍋', { min: 650, mid: 780, max: 920 }, { min: 28, mid: 34, max: 40 }, { min: 32, mid: 42, max: 52 }, { min: 48, mid: 62, max: 78 }, { variantHint: '脂肪中等' }),
  v('variant_hotpot_chicken', 'dish_hot_pot', '雞肉火鍋', { min: 580, mid: 720, max: 860 }, { min: 34, mid: 42, max: 50 }, { min: 18, mid: 26, max: 34 }, { min: 42, mid: 58, max: 72 }, { tags: ['高蛋白'], variantHint: '蛋白高、脂肪較穩' }),
  v('variant_hotpot_sukiyaki', 'dish_hot_pot', '壽喜燒', { min: 820, mid: 950, max: 1100 }, { min: 30, mid: 38, max: 46 }, { min: 42, mid: 52, max: 62 }, { min: 55, mid: 72, max: 88 }, { variantHint: '熱量與脂肪偏高' }),
  v('variant_hotpot_veggie_tofu', 'dish_hot_pot', '蔬菜豆腐鍋', { min: 420, mid: 550, max: 680 }, { min: 18, mid: 24, max: 30 }, { min: 10, mid: 16, max: 22 }, { min: 38, mid: 52, max: 65 }, { tags: ['減脂友善'], variantHint: '熱量快滿時優先' }),

  // --- 滷味 補充 ---
  v('variant_luwei_high_protein', 'dish_lu_wei', '高蛋白滷味', { min: 320, mid: 420, max: 520 }, { min: 28, mid: 34, max: 40 }, { min: 12, mid: 18, max: 24 }, { min: 18, mid: 28, max: 38 }, { tags: ['高蛋白'], variantHint: '雞胸、蛋、豆腐為主' }),
  v('variant_luwei_low_starch', 'dish_lu_wei', '少澱粉滷味', { min: 280, mid: 380, max: 480 }, { min: 22, mid: 28, max: 34 }, { min: 14, mid: 20, max: 26 }, { min: 12, mid: 22, max: 32 }, { variantHint: '避開王子麵、米血' }),
  v('variant_luwei_general', 'dish_lu_wei', '一般滷味', { min: 420, mid: 550, max: 680 }, { min: 20, mid: 26, max: 32 }, { min: 22, mid: 30, max: 38 }, { min: 32, mid: 45, max: 58 }),
  v('variant_luwei_high_cal', 'dish_lu_wei', '高熱量滷味', { min: 580, mid: 700, max: 850 }, { min: 18, mid: 24, max: 30 }, { min: 32, mid: 42, max: 52 }, { min: 48, mid: 62, max: 78 }, { variantHint: '炸物、甜不辣多' }),
  v('variant_luwei_chicken_breast', 'dish_lu_wei', '雞胸滷味', { min: 280, mid: 360, max: 440 }, { min: 30, mid: 36, max: 42 }, { min: 8, mid: 12, max: 16 }, { min: 12, mid: 22, max: 32 }, { aliases: ['雞胸滷味', '滷味雞胸'], tags: ['高蛋白', '減脂友善'], variantHint: '減脂友善' }),
  v('variant_luwei_tofu_veggie', 'dish_lu_wei', '豆腐青菜滷味', { min: 220, mid: 300, max: 380 }, { min: 14, mid: 18, max: 22 }, { min: 8, mid: 12, max: 16 }, { min: 22, mid: 32, max: 42 }, { tags: ['減脂友善'], variantHint: '熱量快滿時優先' }),
  v('variant_luwei_prince_noodle', 'dish_lu_wei', '王子麵滷味', { min: 520, mid: 650, max: 780 }, { min: 16, mid: 22, max: 28 }, { min: 22, mid: 30, max: 38 }, { min: 58, mid: 72, max: 88 }, { variantHint: '碳水偏高不優先' }),
  v('variant_luwei_tempura_mix', 'dish_lu_wei', '甜不辣米血滷味', { min: 480, mid: 600, max: 720 }, { min: 14, mid: 20, max: 26 }, { min: 24, mid: 32, max: 40 }, { min: 52, mid: 68, max: 82 }, { variantHint: '碳水與脂肪都偏高' }),

  // --- 鹽水雞 補充（雞胸已在 seed） ---
  v('variant_salt_chicken_half', 'dish_salt_chicken', '半隻鹽水雞', { min: 380, mid: 480, max: 580 }, { min: 38, mid: 46, max: 54 }, { min: 16, mid: 24, max: 32 }, { min: 8, mid: 16, max: 24 }),
  v('variant_salt_chicken_veggie', 'dish_salt_chicken', '鹽水雞加青菜', { min: 240, mid: 320, max: 400 }, { min: 26, mid: 32, max: 38 }, { min: 8, mid: 12, max: 16 }, { min: 12, mid: 22, max: 32 }, { recommendedAdjustments: ['加青菜', '少油蔥'] }),
  v('variant_salt_chicken_light_sauce', 'dish_salt_chicken', '鹽水雞少醬', { min: 200, mid: 260, max: 320 }, { min: 24, mid: 30, max: 36 }, { min: 6, mid: 10, max: 14 }, { min: 4, mid: 10, max: 16 }, { recommendedAdjustments: ['少油蔥、少醬'] }),

  // --- 鐵板燒 補充 ---
  v('variant_teppan_chicken_leg', 'dish_teppanyaki', '雞腿排鐵板燒', { min: 720, mid: 840, max: 960 }, { min: 36, mid: 42, max: 48 }, { min: 28, mid: 36, max: 44 }, { min: 58, mid: 75, max: 90 }),
  v('variant_teppan_beef', 'dish_teppanyaki', '牛肉鐵板燒', { min: 780, mid: 900, max: 1020 }, { min: 38, mid: 45, max: 52 }, { min: 35, mid: 44, max: 54 }, { min: 55, mid: 72, max: 88 }),
  v('variant_teppan_pork', 'dish_teppanyaki', '豬肉鐵板燒', { min: 740, mid: 860, max: 980 }, { min: 30, mid: 36, max: 42 }, { min: 32, mid: 40, max: 50 }, { min: 60, mid: 78, max: 92 }),
  v('variant_teppan_fish', 'dish_teppanyaki', '魚排鐵板燒', { min: 650, mid: 760, max: 880 }, { min: 34, mid: 40, max: 46 }, { min: 26, mid: 34, max: 42 }, { min: 55, mid: 70, max: 85 }, { variantHint: '比牛豬脂肪低' }),
  v('variant_teppan_tofu', 'dish_teppanyaki', '豆腐鐵板燒', { min: 520, mid: 620, max: 720 }, { min: 18, mid: 24, max: 30 }, { min: 18, mid: 26, max: 34 }, { min: 48, mid: 62, max: 75 }, { tags: ['減脂友善'] }),
  v('variant_teppan_double', 'dish_teppanyaki', '雙主菜鐵板燒', { min: 950, mid: 1100, max: 1250 }, { min: 42, mid: 50, max: 58 }, { min: 48, mid: 58, max: 68 }, { min: 70, mid: 90, max: 105 }, { variantHint: '熱量高' }),

  // --- 自助餐 補充 ---
  v('variant_buffet_chicken_breast', 'dish_buffet_bento', '雞胸自助餐', { min: 480, mid: 580, max: 680 }, { min: 32, mid: 38, max: 44 }, { min: 12, mid: 18, max: 24 }, { min: 45, mid: 58, max: 70 }, { tags: ['高蛋白', '減脂友善'] }),
  v('variant_buffet_chicken_leg', 'dish_buffet_bento', '雞腿自助餐', { min: 620, mid: 720, max: 820 }, { min: 30, mid: 36, max: 42 }, { min: 24, mid: 32, max: 40 }, { min: 55, mid: 70, max: 85 }),
  v('variant_buffet_fish', 'dish_buffet_bento', '魚排自助餐', { min: 520, mid: 620, max: 720 }, { min: 28, mid: 34, max: 40 }, { min: 18, mid: 26, max: 34 }, { min: 48, mid: 62, max: 75 }),
  v('variant_buffet_high_protein', 'dish_buffet_bento', '高蛋白自助餐', { min: 550, mid: 650, max: 750 }, { min: 35, mid: 42, max: 48 }, { min: 16, mid: 24, max: 32 }, { min: 48, mid: 62, max: 75 }, { tags: ['高蛋白'] }),
  v('variant_buffet_three_dish', 'dish_buffet_bento', '三菜一肉便當', { min: 580, mid: 680, max: 780 }, { min: 26, mid: 32, max: 38 }, { min: 20, mid: 28, max: 36 }, { min: 58, mid: 72, max: 85 }),
  v('variant_buffet_double_main', 'dish_buffet_bento', '雙主菜便當', { min: 780, mid: 880, max: 980 }, { min: 32, mid: 38, max: 44 }, { min: 32, mid: 40, max: 48 }, { min: 65, mid: 82, max: 95 }, { variantHint: '熱量偏高' }),

  // --- Subway ---
  v('variant_subway_6inch_chicken', 'dish_subway_chicken', '6 吋雞胸潛艇堡', { min: 320, mid: 380, max: 440 }, { min: 28, mid: 34, max: 40 }, { min: 6, mid: 10, max: 14 }, { min: 38, mid: 48, max: 58 }, { variantHint: '減脂推薦' }),
  v('variant_subway_6inch_turkey', 'dish_subway_chicken', '6 吋火雞胸潛艇堡', { min: 300, mid: 360, max: 420 }, { min: 26, mid: 32, max: 38 }, { min: 5, mid: 9, max: 13 }, { min: 38, mid: 48, max: 58 }),
  v('variant_subway_chicken_salad', 'dish_subway_chicken', '雞胸沙拉', { min: 220, mid: 280, max: 340 }, { min: 26, mid: 32, max: 38 }, { min: 8, mid: 12, max: 16 }, { min: 12, mid: 22, max: 32 }, { tags: ['減脂友善'] }),
  v('variant_subway_turkey_salad', 'dish_subway_chicken', '火雞胸沙拉', { min: 200, mid: 260, max: 320 }, { min: 24, mid: 30, max: 36 }, { min: 6, mid: 10, max: 14 }, { min: 10, mid: 20, max: 28 }, { tags: ['減脂友善'] }),
  v('variant_subway_double_meat', 'dish_subway_chicken', '雙倍肉雞胸堡', { min: 420, mid: 500, max: 580 }, { min: 40, mid: 48, max: 56 }, { min: 10, mid: 14, max: 18 }, { min: 42, mid: 52, max: 62 }, { tags: ['高蛋白'], variantHint: '蛋白不足時可選' }),

  // --- 超商雞胸餐 ---
  v('variant_cv_chicken_sweet_potato', 'dish_cv_chicken_meal', '雞胸 + 地瓜', { min: 280, mid: 340, max: 400 }, { min: 30, mid: 36, max: 42 }, { min: 6, mid: 10, max: 14 }, { min: 32, mid: 42, max: 52 }, { tags: ['高蛋白', '減脂友善'] }),
  v('variant_cv_chicken_egg', 'dish_cv_chicken_meal', '雞胸 + 茶葉蛋', { min: 240, mid: 300, max: 360 }, { min: 34, mid: 40, max: 46 }, { min: 8, mid: 12, max: 16 }, { min: 8, mid: 16, max: 24 }, { tags: ['高蛋白'] }),
  v('variant_cv_chicken_salad', 'dish_cv_chicken_meal', '雞胸 + 沙拉', { min: 260, mid: 320, max: 380 }, { min: 32, mid: 38, max: 44 }, { min: 8, mid: 12, max: 16 }, { min: 12, mid: 22, max: 32 }, { tags: ['減脂友善'] }),
  v('variant_cv_chicken_rice_ball', 'dish_cv_chicken_meal', '雞胸 + 飯糰', { min: 380, mid: 450, max: 520 }, { min: 32, mid: 38, max: 44 }, { min: 10, mid: 14, max: 18 }, { min: 48, mid: 58, max: 68 }, { variantHint: '碳水偏高注意' }),
  v('variant_cv_chicken_soy_milk', 'dish_cv_chicken_meal', '雞胸 + 無糖豆漿', { min: 300, mid: 360, max: 420 }, { min: 36, mid: 42, max: 48 }, { min: 10, mid: 14, max: 18 }, { min: 18, mid: 28, max: 38 }, { tags: ['高蛋白'] }),

  // --- 沙拉餐 ---
  v('variant_salad_chicken', 'dish_salad_meal', '雞胸沙拉', { min: 280, mid: 360, max: 440 }, { min: 28, mid: 34, max: 40 }, { min: 10, mid: 14, max: 18 }, { min: 12, mid: 22, max: 32 }, { tags: ['高蛋白'] }),
  v('variant_salad_tuna', 'dish_salad_meal', '鮪魚沙拉', { min: 300, mid: 380, max: 460 }, { min: 24, mid: 30, max: 36 }, { min: 14, mid: 20, max: 26 }, { min: 14, mid: 24, max: 34 }),
  v('variant_salad_tofu', 'dish_salad_meal', '豆腐沙拉', { min: 240, mid: 320, max: 400 }, { min: 16, mid: 22, max: 28 }, { min: 10, mid: 14, max: 18 }, { min: 18, mid: 28, max: 38 }, { tags: ['減脂友善'] }),
  v('variant_salad_caesar', 'dish_salad_meal', '凱薩雞肉沙拉', { min: 380, mid: 480, max: 580 }, { min: 26, mid: 32, max: 38 }, { min: 22, mid: 30, max: 38 }, { min: 18, mid: 28, max: 38 }, { variantHint: '凱薩醬脂肪高' }),
  v('variant_salad_high_protein', 'dish_salad_meal', '高蛋白沙拉', { min: 320, mid: 400, max: 480 }, { min: 32, mid: 40, max: 48 }, { min: 12, mid: 18, max: 24 }, { min: 14, mid: 24, max: 34 }, { tags: ['高蛋白'] }),

  // --- 地瓜+茶葉蛋 ---
  v('variant_sweet_potato_egg_small', 'dish_sweet_potato_egg', '小地瓜 + 茶葉蛋', { min: 180, mid: 240, max: 300 }, { min: 10, mid: 14, max: 18 }, { min: 4, mid: 7, max: 10 }, { min: 28, mid: 38, max: 48 }, { variantHint: '熱量快滿時優先' }),
  v('variant_sweet_potato_two_eggs', 'dish_sweet_potato_egg', '地瓜 + 兩顆茶葉蛋', { min: 280, mid: 340, max: 400 }, { min: 18, mid: 24, max: 30 }, { min: 8, mid: 12, max: 16 }, { min: 32, mid: 42, max: 52 }, { tags: ['高蛋白'] }),
  v('variant_sweet_potato_chicken', 'dish_sweet_potato_egg', '地瓜 + 雞胸', { min: 320, mid: 400, max: 480 }, { min: 32, mid: 40, max: 48 }, { min: 8, mid: 12, max: 16 }, { min: 32, mid: 42, max: 52 }, { tags: ['高蛋白'] }),
  v('variant_sweet_potato_soy_milk', 'dish_sweet_potato_egg', '地瓜 + 無糖豆漿', { min: 260, mid: 320, max: 380 }, { min: 12, mid: 16, max: 20 }, { min: 6, mid: 10, max: 14 }, { min: 38, mid: 48, max: 58 }),

  // --- 乾麵 / 炒飯 / 吐司 基本變體 ---
  v('variant_dry_noodle_oil', 'dish_dry_noodle', '油蔥乾麵', { min: 420, mid: 520, max: 620 }, { min: 12, mid: 16, max: 20 }, { min: 14, mid: 20, max: 26 }, { min: 62, mid: 78, max: 92 }),
  v('variant_dry_noodle_sesame', 'dish_dry_noodle', '麻醬乾麵', { min: 480, mid: 580, max: 680 }, { min: 14, mid: 18, max: 22 }, { min: 20, mid: 28, max: 36 }, { min: 58, mid: 72, max: 86 }),
  v('variant_fried_rice_egg', 'dish_fried_rice', '蛋炒飯', { min: 680, mid: 780, max: 880 }, { min: 14, mid: 18, max: 22 }, { min: 26, mid: 34, max: 42 }, { min: 82, mid: 98, max: 112 }),
  v('variant_fried_rice_pork', 'dish_fried_rice', '肉絲炒飯', { min: 720, mid: 820, max: 920 }, { min: 18, mid: 24, max: 30 }, { min: 28, mid: 36, max: 44 }, { min: 85, mid: 100, max: 115 }),
  v('variant_toast_plain', 'dish_toast', '原味吐司', { min: 220, mid: 280, max: 340 }, { min: 6, mid: 8, max: 10 }, { min: 6, mid: 10, max: 14 }, { min: 32, mid: 42, max: 52 }),
  v('variant_toast_jam', 'dish_toast', '果醬吐司', { min: 280, mid: 340, max: 400 }, { min: 5, mid: 7, max: 9 }, { min: 8, mid: 12, max: 16 }, { min: 42, mid: 52, max: 62 }),

  // --- 飲料輕食搭配 ---
  v('variant_soy_milk_egg', 'dish_unsweetened_soy_milk', '無糖豆漿 + 茶葉蛋', { min: 150, mid: 190, max: 230 }, { min: 14, mid: 18, max: 22 }, { min: 6, mid: 9, max: 12 }, { min: 10, mid: 16, max: 22 }),
  v('variant_latte_egg', 'dish_latte', '拿鐵 + 茶葉蛋', { min: 200, mid: 260, max: 320 }, { min: 12, mid: 16, max: 20 }, { min: 8, mid: 12, max: 16 }, { min: 12, mid: 20, max: 28 }),
]
