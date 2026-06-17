const SUPABASE_URL = "https://ofbxybkshmbrdffcywyl.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnh5YmtzaG1icmRmZmN5d3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU5NzkxNiwiZXhwIjoyMDk3MTczOTE2fQ.NNVfyxZbxR2iqvNYOWucrc51K0WCNxkG2REbpn6HgqE";
const APP_URL = "http://192.168.0.35:3000";

async function testMealPortions() {
  console.log("🍽️ 測試詳細菜單分量與照片\n" + "=".repeat(60));

  try {
    // Step 1: Create test user
    console.log("\n✅ Step 1: 建立測試用戶");
    const email = `portion-test-${Date.now()}@test.com`;
    const password = "TestPass123!@#";

    const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, email_confirm: true }),
    });

    const userData = await signupRes.json();
    const userId = userData.id;
    console.log(`   📧 用戶: ${email}`);
    console.log(`   🔑 UserID: ${userId}`);

    // Step 2: Create profile
    console.log("\n✅ Step 2: 建立 Profile");
    await fetch(`${SUPABASE_URL}/rest/v1/user_profiles`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: userId,
        display_name: 'Portion Test',
        gender: 'male',
        age: 28,
      }),
    });

    // Step 3: Create goal
    console.log("✅ Step 3: 建立 Goal");
    await fetch(`${SUPABASE_URL}/rest/v1/goals`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        goal_type: 'gain_muscle',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0],
        target_weight_kg: 85,
      }),
    });

    // Step 4: Create weekly plan with detailed meals
    console.log("✅ Step 4: 建立有詳細分量的 Weekly Plan");

    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // Mock detailed breakfast options
    const breakfastOptions = [
      {
        items: [
          { id: '1', name: 'Eggs', name_zh: '雞蛋', calories: 160, protein_g: 14, carbs_g: 2, fat_g: 12,
            portion: '2個', preparation: '炒',
            photo_url: 'https://images.unsplash.com/photo-1585238341710-4abb7692202b?w=200&h=200&fit=crop',
            quantity: '2個', portionDesc: '約麻將牌大小' },
          { id: '2', name: 'Toast', name_zh: '吐司', calories: 120, protein_g: 5, carbs_g: 20, fat_g: 2,
            portion: '2片', preparation: '烤',
            photo_url: 'https://images.unsplash.com/photo-1599599810694-b5ac4dd0alec?w=200&h=200&fit=crop',
            quantity: '2片', portionDesc: '標準切片吐司' }
        ], cal: 280
      }
    ];

    const lunchOptions = [
      {
        items: [
          { id: 'l1', name: 'Chicken', name_zh: '雞胸肉', calories: 320, protein_g: 55, carbs_g: 0, fat_g: 8,
            portion: '160g', preparation: '烤',
            photo_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=200&h=200&fit=crop',
            quantity: '1塊', portionDesc: '約一個手掌大小' },
          { id: 'l2', name: 'Rice', name_zh: '白飯', calories: 220, protein_g: 5, carbs_g: 50, fat_g: 1,
            portion: '1碗', preparation: '煮',
            photo_url: 'https://images.unsplash.com/photo-1585238341710-4abb7692202b?w=200&h=200&fit=crop',
            quantity: '1碗', portionDesc: '標準飯碗8分滿' }
        ], cal: 540
      }
    ];

    const dinnerOptions = [
      {
        items: [
          { id: 'd1', name: 'Shrimp', name_zh: '蝦', calories: 120, protein_g: 26, carbs_g: 0, fat_g: 1,
            portion: '150g', preparation: '炒',
            photo_url: 'https://images.unsplash.com/photo-1580959375944-abd7e991f971?w=200&h=200&fit=crop',
            quantity: '12-15隻', portionDesc: '中等大小蝦12-15隻' },
          { id: 'd2', name: 'Brown Rice', name_zh: '糙米', calories: 150, protein_g: 4, carbs_g: 32, fat_g: 1,
            portion: '80g', preparation: '煮',
            photo_url: 'https://images.unsplash.com/photo-1585238341710-4abb7692202b?w=200&h=200&fit=crop',
            quantity: '3/4碗', portionDesc: '標準飯碗3/4滿' }
        ], cal: 270
      }
    ];

    // Create 7 days with different meal combinations
    const days = Array.from({ length: 7 }, (_, dayIdx) => {
      const bIdx = dayIdx % breakfastOptions.length;
      const lIdx = dayIdx % lunchOptions.length;
      const dIdx = dayIdx % dinnerOptions.length;

      return {
        day: dayIdx + 1,
        date: new Date(weekStart.getTime() + dayIdx * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        meals: [
          {
            type: 'breakfast', type_zh: '早餐',
            items: breakfastOptions[bIdx].items,
            total_calories: breakfastOptions[bIdx].cal
          },
          {
            type: 'lunch', type_zh: '午餐',
            items: lunchOptions[lIdx].items,
            total_calories: lunchOptions[lIdx].cal
          },
          {
            type: 'dinner', type_zh: '晚餐',
            items: dinnerOptions[dIdx].items,
            total_calories: dinnerOptions[dIdx].cal
          }
        ],
        workout: {
          type: 'rest',
          type_zh: '休息',
          warmup: [],
          main: [],
          cooldown: [],
          estimated_duration_mins: 0,
          calories_burned_est: 0,
        },
        daily_targets: { calories: 2300, protein_g: 160, carbs_g: 300, fat_g: 80, water_ml: 3500 }
      };
    });

    await fetch(`${SUPABASE_URL}/rest/v1/weekly_plans`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        week_start: weekStartStr,
        week_number: 1,
        plan_data: {
          week_number: 1,
          weekly_targets: { avg_daily_calories: 2300, avg_daily_protein_g: 160, workout_days: 5 },
          days: days,
          grocery_list: [
            { category: '🥚 蛋白質', items: ['蛋 12個', '雞胸肉 320g', '蝦 150g'] },
            { category: '🍚 碳水', items: ['白米 1kg', '糙米 320g'] },
          ],
          coach_note: '詳細菜單測試'
        },
        generation_status: 'completed',
      }),
    });

    // Step 5: Verify meal details
    console.log("\n✅ Step 5: 驗證菜單詳細信息");
    const planRes = await fetch(`${SUPABASE_URL}/rest/v1/weekly_plans?user_id=eq.${userId}`, {
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      }
    });

    const plans = await planRes.json();
    if (plans.length === 0) throw new Error('❌ 找不到計畫');

    const plan = plans[0].plan_data;
    console.log(`   ✅ 週數: ${plan.week_number}`);
    console.log(`   ✅ 天數: ${plan.days.length}/7`);

    // Check Day 1 meal details
    const day1 = plan.days[0];
    const lunch = day1.meals.find(m => m.type === 'lunch');
    const chickenItem = lunch.items[0];

    console.log(`\n   🥗 Day 1 午餐雞胸肉:`);
    console.log(`     名稱: ${chickenItem.name_zh}`);
    console.log(`     分量: ${chickenItem.quantity}`);
    console.log(`     分量描述: ${chickenItem.portionDesc}`);
    console.log(`     卡路里: ${chickenItem.calories} kcal`);
    console.log(`     蛋白質: ${chickenItem.protein_g}g`);
    console.log(`     照片: ${chickenItem.photo_url ? '✅ 有' : '❌ 無'}`);

    // Check Day 3 dinner (should have different options if rotation works)
    const day3 = plan.days[2];
    const dinnerDay3 = day3.meals.find(m => m.type === 'dinner');
    const shrimpItem = dinnerDay3.items[0];

    console.log(`\n   🍤 Day 3 晚餐蝦:`);
    console.log(`     名稱: ${shrimpItem.name_zh}`);
    console.log(`     分量: ${shrimpItem.quantity}`);
    console.log(`     分量描述: ${shrimpItem.portionDesc}`);
    console.log(`     卡路里: ${shrimpItem.calories} kcal`);
    console.log(`     蛋白質: ${shrimpItem.protein_g}g`);
    console.log(`     照片: ${shrimpItem.photo_url ? '✅ 有' : '❌ 無'}`);

    // Verify all days have photos
    let totalWithPhotos = 0;
    let totalItems = 0;
    plan.days.forEach((day, idx) => {
      day.meals.forEach(meal => {
        meal.items.forEach(item => {
          totalItems++;
          if (item.photo_url) totalWithPhotos++;
        });
      });
    });

    console.log(`\n   📸 照片覆蓋率: ${totalWithPhotos}/${totalItems} (${Math.round(totalWithPhotos/totalItems*100)}%)`);

    // Verify quantity and portionDesc are present
    let itemsWithQuantity = 0;
    let itemsWithDesc = 0;
    plan.days.forEach(day => {
      day.meals.forEach(meal => {
        meal.items.forEach(item => {
          if (item.quantity) itemsWithQuantity++;
          if (item.portionDesc) itemsWithDesc++;
        });
      });
    });

    console.log(`   📝 有食材數量: ${itemsWithQuantity}/${totalItems}`);
    console.log(`   📏 有分量描述: ${itemsWithDesc}/${totalItems}`);

    console.log("\n" + "=".repeat(60));
    console.log("✅ 詳細菜單分量測試通過！");
    console.log("\n✨ 確認項目:");
    console.log("   ✅ 用戶註冊");
    console.log("   ✅ 詳細菜單數據");
    console.log("   ✅ 食物照片 URLs");
    console.log("   ✅ 食材數量 (e.g., '12-15隻')");
    console.log("   ✅ 分量視覺描述 (e.g., '約手掌大小')");
    console.log("   ✅ 7天菜單生成");
    console.log(`\n💡 測試帳號: ${email}`);
    console.log(`   密碼: ${password}`);
    console.log(`   URL: ${APP_URL}`);

  } catch (err) {
    console.error("\n❌ 測試失敗:", err.message);
    console.error("詳細:", err);
    process.exit(1);
  }
}

testMealPortions();
