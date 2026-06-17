const SUPABASE_URL = "https://ofbxybkshmbrdffcywyl.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnh5YmtzaG1icmRmZmN5d3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU5NzkxNiwiZXhwIjoyMDk3MTczOTE2fQ.NNVfyxZbxR2iqvNYOWucrc51K0WCNxkG2REbpn6HgqE";

async function fixUserPlan() {
  console.log("🔍 Finding user by email...");

  // Get auth token first
  const signInRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnh5YmtzaG1icmRmZmN5d3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1OTc5MTYsImV4cCI6MjA5NzE3MzkxNn0.JiHna8LEyhtVqS4kMEWGhfEq2T6nLSyXrg04avkAsTE",
    },
    body: JSON.stringify({
      email: "fitness-test-1781627839622@test.com",
      password: "TestPass123!@#",
    })
  });

  const signInData = await signInRes.json();
  if (!signInData.user) {
    console.log("❌ User not found");
    return;
  }

  const user = signInData.user;

  if (!user) {
    console.log("❌ User not found");
    return;
  }

  console.log(`✅ Found user: ${user.id}`);

  const userId = user.id;
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  console.log(`📋 Week: ${weekStartStr}\n`);

  const completePlan = {
    week_number: 1,
    weekly_targets: {
      avg_daily_calories: 2200,
      avg_daily_protein_g: 150,
      workout_days: 5,
    },
    days: Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      date: new Date(new Date().getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      meals: [
        {
          type: 'breakfast',
          type_zh: '早餐',
          items: [
            { id: '1', name: 'Eggs', name_zh: '蛋', calories: 150, protein_g: 12, carbs_g: 1, fat_g: 11, portion: '2個', preparation: '炒' },
            { id: '2', name: 'Toast', name_zh: '吐司', calories: 100, protein_g: 4, carbs_g: 18, fat_g: 2, portion: '2片', preparation: '烤' }
          ],
          total_calories: 250,
        },
        {
          type: 'lunch',
          type_zh: '午餐',
          items: [
            { id: '3', name: 'Grilled Chicken', name_zh: '烤雞胸肉', calories: 300, protein_g: 50, carbs_g: 0, fat_g: 7, portion: '150g', preparation: '烤' },
            { id: '4', name: 'Rice', name_zh: '白飯', calories: 200, protein_g: 4, carbs_g: 45, fat_g: 0.5, portion: '1碗', preparation: '煮' },
            { id: '5', name: 'Broccoli', name_zh: '花菜', calories: 30, protein_g: 3, carbs_g: 5, fat_g: 0, portion: '100g', preparation: '蒸' }
          ],
          total_calories: 530,
        },
        {
          type: 'dinner',
          type_zh: '晚餐',
          items: [
            { id: '6', name: 'Salmon', name_zh: '鮭魚', calories: 280, protein_g: 40, carbs_g: 0, fat_g: 15, portion: '120g', preparation: '烤' },
            { id: '7', name: 'Sweet Potato', name_zh: '地瓜', calories: 100, protein_g: 2, carbs_g: 22, fat_g: 0, portion: '100g', preparation: '烤' },
            { id: '8', name: 'Green Salad', name_zh: '青菜沙拉', calories: 50, protein_g: 2, carbs_g: 8, fat_g: 0, portion: '150g', preparation: '生食' }
          ],
          total_calories: 430,
        },
      ],
      workout: {
        type: i % 2 === 0 ? 'strength' : 'cardio',
        type_zh: i % 2 === 0 ? '重訓' : '有氧',
        warmup: [
          { exercise_id: '1', exercise_name: 'Arm Circles', exercise_name_zh: '臂繞圈', youtube_id: 'dQw4w9WgXcQ', sets: 1, reps: 15, duration_secs: null, rest_secs: 30, notes: '' }
        ],
        main: i % 2 === 0 ? [
          { exercise_id: '2', exercise_name: 'Bench Press', exercise_name_zh: '臥推', youtube_id: '4YnVV_Ksb1E', sets: 4, reps: 8, duration_secs: null, rest_secs: 120, notes: '主要訓練' },
          { exercise_id: '3', exercise_name: 'Squats', exercise_name_zh: '深蹲', youtube_id: 'aA-_NgDyaLg', sets: 4, reps: 8, duration_secs: null, rest_secs: 120, notes: '' },
        ] : [
          { exercise_id: '4', exercise_name: 'Running', exercise_name_zh: '跑步', youtube_id: null, sets: 1, reps: null, duration_secs: 1800, rest_secs: 0, notes: '30分鐘' },
          { exercise_id: '5', exercise_name: 'Jump Rope', exercise_name_zh: '跳繩', youtube_id: 'J8epyPNR-x0', sets: 3, reps: 50, duration_secs: null, rest_secs: 60, notes: '' },
        ],
        cooldown: [
          { exercise_id: '6', exercise_name: 'Stretching', exercise_name_zh: '伸展', youtube_id: 'J8epyPNR-x0', sets: 1, reps: null, duration_secs: 300, rest_secs: 0, notes: '全身伸展' }
        ],
        estimated_duration_mins: i % 2 === 0 ? 60 : 45,
        calories_burned_est: i % 2 === 0 ? 400 : 350,
      },
      daily_targets: { calories: 2200, protein_g: 150, carbs_g: 280, fat_g: 70, water_ml: 3000 },
    })),
    grocery_list: [
      { category: '蛋白質', items: ['雞胸肉', '鮭魚', '蛋', '牛奶'] },
      { category: '碳水化合物', items: ['白飯', '地瓜', '吐司', '燕麥'] },
      { category: '蔬菜', items: ['花菜', '菠菜', '番茄', '洋蔥'] },
      { category: '水果', items: ['香蕉', '藍莓', '蘋果'] },
    ],
    coach_note: '這週重點放在力量訓練，確保充足蛋白質攝取。有氧日要控制強度避免影響恢復。',
  };

  console.log(`📝 Updating plan with complete data...\n`);

  const plansRes = await fetch(
    `${SUPABASE_URL}/rest/v1/weekly_plans?user_id=eq.${userId}&week_start=eq.${weekStartStr}`,
    {
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      }
    }
  );

  const plans = await plansRes.json();

  if (plans[0]) {
    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/weekly_plans?id=eq.${plans[0].id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_data: completePlan,
          generation_status: 'completed',
          coach_note: completePlan.coach_note,
        })
      }
    );

    if (updateRes.ok) {
      console.log('✅ Plan updated successfully');
    } else {
      console.log('❌ Failed:', await updateRes.text());
    }
  } else {
    const createRes = await fetch(
      `${SUPABASE_URL}/rest/v1/weekly_plans`,
      {
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
          plan_data: completePlan,
          generation_status: 'completed',
          coach_note: completePlan.coach_note,
        })
      }
    );

    if (createRes.ok) {
      console.log('✅ Plan created successfully');
    }
  }

  console.log('\n✨ Ready! Refresh dashboard now.');
}

fixUserPlan().catch(console.error);
