const SUPABASE_URL = "https://ofbxybkshmbrdffcywyl.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnh5YmtzaG1icmRmZmN5d3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU5NzkxNiwiZXhwIjoyMDk3MTczOTE2fQ.NNVfyxZbxR2iqvNYOWucrc51K0WCNxkG2REbpn6HgqE";

async function check() {
  const userId = "18e5282d-4902-49fe-9ec5-fa2b0915c3c6";

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/weekly_plans?user_id=eq.${userId}`,
    {
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      }
    }
  );

  const plans = await res.json();

  console.log(`Found ${plans.length} plans:\n`);
  plans.forEach((p, i) => {
    console.log(`${i + 1}. Week: ${p.week_start}`);
    console.log(`   ID: ${p.id}`);
    console.log(`   Status: ${p.generation_status}`);
    console.log(`   Has plan_data: ${!!p.plan_data}`);
    console.log();
  });

  // Delete all failed plans
  if (plans.some(p => p.generation_status === 'failed')) {
    console.log('🗑️  Deleting failed plans...');
    for (const plan of plans) {
      if (plan.generation_status === 'failed') {
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
        console.log(`   Deleted: ${plan.id}`);
      }
    }
  }

  // Create fresh completed plan
  console.log('\n📝 Creating fresh completed plan...');
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const plan = {
    week_number: 1,
    weekly_targets: { avg_daily_calories: 2200, avg_daily_protein_g: 150, workout_days: 5 },
    days: Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      date: new Date(new Date().getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      meals: [
        { type: 'breakfast', type_zh: '早餐', items: [{ id: '1', name: 'Eggs', name_zh: '蛋', calories: 150, protein_g: 12, carbs_g: 1, fat_g: 11, portion: '2個', preparation: '炒' }], total_calories: 150 },
        { type: 'lunch', type_zh: '午餐', items: [{ id: '2', name: 'Chicken', name_zh: '雞肉', calories: 300, protein_g: 50, carbs_g: 0, fat_g: 7, portion: '150g', preparation: '烤' }], total_calories: 300 },
        { type: 'dinner', type_zh: '晚餐', items: [{ id: '3', name: 'Rice', name_zh: '米飯', calories: 200, protein_g: 5, carbs_g: 45, fat_g: 0, portion: '1碗', preparation: '煮' }], total_calories: 200 },
      ],
      workout: {
        type: i % 2 === 0 ? 'strength' : 'cardio',
        type_zh: i % 2 === 0 ? '重訓' : '有氧',
        warmup: [{ exercise_id: '1', exercise_name: 'Warm up', exercise_name_zh: '熱身', youtube_id: 'dQw4w9WgXcQ', sets: 1, reps: 10, duration_secs: null, rest_secs: 60, notes: '' }],
        main: [{ exercise_id: '2', exercise_name: 'Push ups', exercise_name_zh: '伏地挺身', youtube_id: '4YnVV_Ksb1E', sets: 3, reps: 15, duration_secs: null, rest_secs: 60, notes: '' }],
        cooldown: [{ exercise_id: '3', exercise_name: 'Stretch', exercise_name_zh: '伸展', youtube_id: 'J8epyPNR-x0', sets: 1, reps: null, duration_secs: 300, rest_secs: 0, notes: '' }],
        estimated_duration_mins: 45,
        calories_burned_est: 300,
      },
      daily_targets: { calories: 2200, protein_g: 150, carbs_g: 250, fat_g: 70, water_ml: 3000 },
    })),
    grocery_list: [
      { category: '蛋白質', items: ['雞肉', '蛋'] },
      { category: '碳水', items: ['米飯', '麵包'] },
    ],
    coach_note: '這週專注於基礎訓練，確保充足營養。',
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
        week_start: weekStartStr,
        week_number: 1,
        plan_data: plan,
        generation_status: 'completed',
        coach_note: plan.coach_note,
      })
    }
  );

  if (createRes.ok) {
    console.log('✅ Fresh plan created\n');
    console.log('🎉 NOW: Refresh dashboard in browser!');
  } else {
    console.log('Error:', await createRes.text());
  }
}

check();
