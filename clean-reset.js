const SUPABASE_URL = "https://ofbxybkshmbrdffcywyl.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnh5YmtzaG1icmRmZmN5d3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU5NzkxNiwiZXhwIjoyMDk3MTczOTE2fQ.NNVfyxZbxR2iqvNYOWucrc51K0WCNxkG2REbpn6HgqE";

async function cleanReset() {
  const userId = "18e5282d-4902-49fe-9ec5-fa2b0915c3c6";

  console.log("🧹 Deleting ALL plans for this user...");

  const getRes = await fetch(
    `${SUPABASE_URL}/rest/v1/weekly_plans?user_id=eq.${userId}`,
    {
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      }
    }
  );

  const plans = await getRes.json();

  for (const plan of plans) {
    await fetch(
      `${SUPABASE_URL}/rest/v1/weekly_plans?id=eq.${plan.id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
        }
      }
    );
    console.log(`  ✓ Deleted ${plan.week_start}`);
  }

  console.log("\n📝 Creating fresh plan for 2026-06-15...");

  const plan = {
    week_number: 1,
    weekly_targets: { avg_daily_calories: 2200, avg_daily_protein_g: 150, workout_days: 5 },
    days: Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      date: new Date(2026, 5, 15 + i).toISOString().split('T')[0],
      meals: [
        { type: 'breakfast', type_zh: '早餐', items: [{ id: '1', name: 'Eggs', name_zh: '炒蛋', calories: 150, protein_g: 12, carbs_g: 1, fat_g: 11, portion: '2個', preparation: '炒' }, { id: '2', name: 'Toast', name_zh: '吐司', calories: 100, protein_g: 4, carbs_g: 18, fat_g: 2, portion: '2片', preparation: '烤' }], total_calories: 250 },
        { type: 'lunch', type_zh: '午餐', items: [{ id: '3', name: 'Chicken', name_zh: '雞肉', calories: 300, protein_g: 50, carbs_g: 0, fat_g: 7, portion: '150g', preparation: '烤' }, { id: '4', name: 'Rice', name_zh: '白飯', calories: 200, protein_g: 4, carbs_g: 45, fat_g: 0.5, portion: '1碗', preparation: '煮' }], total_calories: 500 },
        { type: 'dinner', type_zh: '晚餐', items: [{ id: '5', name: 'Salmon', name_zh: '鮭魚', calories: 280, protein_g: 40, carbs_g: 0, fat_g: 15, portion: '120g', preparation: '烤' }, { id: '6', name: 'Sweet Potato', name_zh: '地瓜', calories: 100, protein_g: 2, carbs_g: 22, fat_g: 0, portion: '100g', preparation: '烤' }], total_calories: 380 },
      ],
      workout: {
        type: i % 2 === 0 ? 'strength' : 'cardio',
        type_zh: i % 2 === 0 ? '重訓' : '有氧',
        warmup: [{ exercise_id: '1', exercise_name: 'Warm up', exercise_name_zh: '熱身', youtube_id: 'dQw4w9WgXcQ', sets: 1, reps: 15, duration_secs: null, rest_secs: 30, notes: '' }],
        main: [{ exercise_id: '2', exercise_name: i % 2 === 0 ? 'Bench Press' : 'Running', exercise_name_zh: i % 2 === 0 ? '臥推' : '跑步', youtube_id: i % 2 === 0 ? '4YnVV_Ksb1E' : null, sets: i % 2 === 0 ? 4 : 1, reps: i % 2 === 0 ? 8 : null, duration_secs: i % 2 === 0 ? null : 1800, rest_secs: i % 2 === 0 ? 120 : 0, notes: '' }],
        cooldown: [{ exercise_id: '3', exercise_name: 'Stretch', exercise_name_zh: '伸展', youtube_id: 'J8epyPNR-x0', sets: 1, reps: null, duration_secs: 300, rest_secs: 0, notes: '' }],
        estimated_duration_mins: 45,
        calories_burned_est: 300,
      },
      daily_targets: { calories: 2200, protein_g: 150, carbs_g: 280, fat_g: 70, water_ml: 3000 },
    })),
    grocery_list: [
      { category: '蛋白質', items: ['雞肉', '鮭魚', '蛋'] },
      { category: '碳水', items: ['白飯', '吐司', '地瓜'] },
    ],
    coach_note: '本週訓練計畫已就緒。力量日著重複合動作，有氧日控制強度。',
  };

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
        week_start: "2026-06-15",
        week_number: 1,
        plan_data: plan,
        generation_status: 'completed',
        coach_note: plan.coach_note,
      })
    }
  );

  if (createRes.ok) {
    console.log('✅ Fresh plan created!\n');
    console.log('🎉 NOW: F5 refresh dashboard!');
  } else {
    console.log('Error:', await createRes.text());
  }
}

cleanReset();
