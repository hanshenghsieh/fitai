const SUPABASE_URL = "https://ofbxybkshmbrdffcywyl.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnh5YmtzaG1icmRmZmN5d3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU5NzkxNiwiZXhwIjoyMDk3MTczOTE2fQ.NNVfyxZbxR2iqvNYOWucrc51K0WCNxkG2REbpn6HgqE";

async function generatePlanForUser() {
  const email = process.argv[2] || 'kevinkknn41@gmail.com';
  console.log(`🔍 Finding user: ${email}`);

  // Find user
  const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    }
  });

  const users = await usersRes.json();
  const user = users.users?.find(u => u.email === email);

  if (!user) {
    console.log(`❌ User not found: ${email}`);
    console.log('Available users:', users.users?.map(u => u.email).join(', '));
    return;
  }

  const userId = user.id;
  console.log(`✅ Found user: ${userId}`);

  // Get today's week
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  console.log(`📅 Week start: ${weekStartStr}`);

  // Create plan
  const plan = {
    week_number: 1,
    weekly_targets: { avg_daily_calories: 2300, avg_daily_protein_g: 160, workout_days: 5 },
    days: Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      date: new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      meals: [
        { type: 'breakfast', type_zh: '早餐', items: [{ id: '1', name: 'Eggs', name_zh: '蛋', calories: 160, protein_g: 14, carbs_g: 2, fat_g: 12, portion: '2個', preparation: '炒' }, { id: '2', name: 'Toast', name_zh: '吐司', calories: 120, protein_g: 5, carbs_g: 20, fat_g: 2, portion: '2片', preparation: '烤' }], total_calories: 280 },
        { type: 'lunch', type_zh: '午餐', items: [{ id: '3', name: 'Chicken Breast', name_zh: '雞胸肉', calories: 320, protein_g: 55, carbs_g: 0, fat_g: 8, portion: '160g', preparation: '烤' }, { id: '4', name: 'Rice', name_zh: '白飯', calories: 220, protein_g: 5, carbs_g: 50, fat_g: 1, portion: '1碗', preparation: '煮' }, { id: '5', name: 'Broccoli', name_zh: '花菜', calories: 40, protein_g: 4, carbs_g: 7, fat_g: 0, portion: '150g', preparation: '蒸' }], total_calories: 580 },
        { type: 'dinner', type_zh: '晚餐', items: [{ id: '6', name: 'Salmon', name_zh: '鮭魚', calories: 300, protein_g: 42, carbs_g: 0, fat_g: 16, portion: '130g', preparation: '烤' }, { id: '7', name: 'Sweet Potato', name_zh: '地瓜', calories: 120, protein_g: 2, carbs_g: 27, fat_g: 0, portion: '120g', preparation: '烤' }], total_calories: 420 },
      ],
      workout: {
        type: i % 2 === 0 ? 'strength' : 'cardio',
        type_zh: i % 2 === 0 ? '重訓' : '有氧',
        warmup: [{ exercise_id: '1', exercise_name: 'Warm up', exercise_name_zh: '熱身', youtube_id: 'dQw4w9WgXcQ', sets: 1, reps: 15, duration_secs: null, rest_secs: 30, notes: '' }],
        main: i % 2 === 0 ? [
          { exercise_id: '2', exercise_name: 'Bench Press', exercise_name_zh: '臥推', youtube_id: '4YnVV_Ksb1E', sets: 4, reps: 6, duration_secs: null, rest_secs: 120, notes: '主要力量' },
          { exercise_id: '3', exercise_name: 'Squats', exercise_name_zh: '深蹲', youtube_id: 'aA-_NgDyaLg', sets: 4, reps: 6, duration_secs: null, rest_secs: 120, notes: '' },
        ] : [
          { exercise_id: '4', exercise_name: 'Running', exercise_name_zh: '跑步', youtube_id: null, sets: 1, reps: null, duration_secs: 2400, rest_secs: 0, notes: '40分鐘' },
        ],
        cooldown: [{ exercise_id: '5', exercise_name: 'Stretching', exercise_name_zh: '伸展', youtube_id: 'J8epyPNR-x0', sets: 1, reps: null, duration_secs: 300, rest_secs: 0, notes: '' }],
        estimated_duration_mins: i % 2 === 0 ? 75 : 50,
        calories_burned_est: 400,
      },
      daily_targets: { calories: 2300, protein_g: 160, carbs_g: 300, fat_g: 80, water_ml: 3500 },
    })),
    grocery_list: [
      { category: '🥚 蛋白質', items: ['雞胸肉 1kg', '鮭魚 400g', '蛋 12個'] },
      { category: '🍚 碳水', items: ['白米 2kg', '地瓜 800g', '全麥吐司'] },
      { category: '🥦 蔬菜', items: ['花菜 500g', '菠菜 300g'] },
    ],
    coach_note: '這是你的第一週計畫。力量日著重複合動作，有氧日保持中等強度。每天保證 160g 蛋白質。',
  };

  const planRes = await fetch(`${SUPABASE_URL}/rest/v1/weekly_plans`, {
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

  if (planRes.ok) {
    console.log('✅ Plan created successfully!');
    console.log(`   🔗 Go to http://localhost:3000/dashboard and refresh`);
  } else {
    console.log('❌ Failed to create plan:', await planRes.text());
  }
}

generatePlanForUser().catch(console.error);
