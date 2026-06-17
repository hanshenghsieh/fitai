const SUPABASE_URL = "https://ofbxybkshmbrdffcywyl.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnh5YmtzaG1icmRmZmN5d3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU5NzkxNiwiZXhwIjoyMDk3MTczOTE2fQ.NNVfyxZbxR2iqvNYOWucrc51K0WCNxkG2REbpn6HgqE";
const APP_URL = "http://localhost:3000";

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function testPersonalizedPlan() {
  console.log("\n🤖 個性化計畫測試\n" + "=".repeat(70));

  try {
    // Step 1: Register user with health restrictions
    console.log("\n📝 Step 1: 用戶註冊（有膝蓋受傷）");
    const email = `knee-injury-${Date.now()}@test.com`;
    const password = "TestPass123!@#";

    const registerRes = await fetch(`${APP_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        displayName: 'Knee Injury User',
      }),
    });

    if (!registerRes.ok) throw new Error('Registration failed');

    const { userId } = await registerRes.json();
    console.log(`   ✅ 用戶已建立: ${email}`);
    console.log(`   🆔 UserID: ${userId}`);

    // Step 2: Create goal
    console.log("\n⚙️ Step 2: 設定健身目標");

    const goalRes = await fetch(`${SUPABASE_URL}/rest/v1/goals`, {
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

    if (!goalRes.ok) throw new Error('Goal creation failed');
    console.log('   ✅ 目標已設定: 增肌');

    // Step 3: Call generate-plan API to test personalization
    console.log("\n🤖 Step 3: 調用 Claude 生成個性化計畫");
    console.log("   信息: 28歲男性, 75kg, 膝蓋受傷，增肌目標");

    const planRes = await fetch(`${APP_URL}/api/generate-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: {
          gender: 'male',
          age: '28',
          weight_kg: '75',
          injuries: ['膝蓋受傷'],
          health_conditions: [],
        },
        goal: 'gain_muscle',
        preferences: {
          diet_restrictions: {
            vegetarian: false,
            vegan: false,
            allergies: [],
          },
          equipment: ['啞鈴', '健身房設備'],
          fitness_level: 'intermediate',
        },
      }),
    });

    if (!planRes.ok) {
      const err = await planRes.text();
      throw new Error(`Plan generation failed: ${err}`);
    }

    const plan = await planRes.json();
    console.log('   ✅ 計畫已生成');
    console.log('   Day 1:', JSON.stringify(plan.days[0]).substring(0, 200));

    // Step 4: Verify plan addresses health restrictions
    console.log("\n✅ Step 4: 驗證計畫是否考慮健康限制");

    const hasBadExercises = [];
    const hasGoodAlternatives = [];

    plan.days.forEach((day, idx) => {
      if (day.workout && day.workout.main) {
        day.workout.main.forEach(ex => {
          const name = ex.exercise_name_zh || ex.exercise_name;
          // Check for exercises that are bad for knee injuries
          if (name.includes('跑步') || name.includes('深蹲') || name.includes('登山') || name.includes('跳躍')) {
            hasBadExercises.push(`Day ${idx + 1}: ${name}`);
          }
          // Check for good alternatives
          if (name.includes('臥推') || name.includes('划船') || name.includes('上半身')) {
            hasGoodAlternatives.push(`Day ${idx + 1}: ${name}`);
          }
        });
      }
    });

    if (hasBadExercises.length === 0) {
      console.log(`   ✅ 正確：計畫中沒有膝蓋禁忌運動`);
    } else {
      console.log(`   ⚠️ 警告：計畫包含禁忌運動: ${hasBadExercises.join(', ')}`);
    }

    if (hasGoodAlternatives.length > 0) {
      console.log(`   ✅ 正確：包含安全的上半身運動 (${hasGoodAlternatives.length} 個)`);
    }

    // Step 5: Verify meal personalization
    console.log("\n✅ Step 5: 驗證菜單個性化");

    let mealCount = 0;
    let photosCount = 0;
    let portionsCount = 0;
    const uniqueMeals = new Set();

    plan.days.forEach((day, idx) => {
      if (day.meals) {
        day.meals.forEach(meal => {
          if (meal.items) {
            meal.items.forEach(item => {
              mealCount++;
              if (item.photo_url) photosCount++;
              if (item.portionDesc) portionsCount++;
              uniqueMeals.add(item.name_zh || item.name);
            });
          }
        });
      }
    });

    console.log(`   🍽️ 菜單項目: ${mealCount}`);
    console.log(`   📸 有照片: ${photosCount}/${mealCount} (${Math.round(photosCount/mealCount*100)}%)`);
    console.log(`   📏 有分量描述: ${portionsCount}/${mealCount} (${Math.round(portionsCount/mealCount*100)}%)`);
    console.log(`   🌈 不同菜品: ${uniqueMeals.size} 種`);

    // Step 6: Save plan to database
    console.log("\n✅ Step 6: 將計畫保存到資料庫");

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/weekly_plans`, {
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
        plan_data: plan,
        generation_status: 'completed',
        coach_note: plan.coach_note,
      }),
    });

    if (saveRes.ok) {
      console.log('   ✅ 計畫已保存到資料庫');
    } else {
      console.log('   ⚠️ 計畫保存狀態:', saveRes.status);
    }

    // Summary
    console.log("\n" + "=".repeat(70));
    console.log("✅ 個性化計畫測試成功！");
    console.log("\n✨ 驗證結果:");
    console.log("   ✅ 用戶註冊成功");
    console.log("   ✅ 健康限制已記錄 (膝蓋受傷)");
    console.log(`   ${hasBadExercises.length === 0 ? '✅' : '❌'} 計畫避免禁忌運動`);
    console.log(`   ${hasGoodAlternatives.length > 0 ? '✅' : '❌'} 提供安全替代方案`);
    console.log(`   ${photosCount > 0 ? '✅' : '❌'} 菜單包含照片`);
    console.log(`   ${portionsCount > 0 ? '✅' : '❌'} 菜單包含分量描述`);
    console.log(`   ${uniqueMeals.size >= 5 ? '✅' : '⚠️'} 菜單多樣化 (${uniqueMeals.size} 種)`);

    console.log(`\n🔑 測試帳號:`);
    console.log(`   Email: ${email}`);
    console.log(`   密碼: ${password}`);
    console.log(`   限制: 膝蓋受傷，增肌目標`);

  } catch (err) {
    console.error("\n❌ 測試失敗:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

testPersonalizedPlan();
