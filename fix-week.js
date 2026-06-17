const SUPABASE_URL = "https://ofbxybkshmbrdffcywyl.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnh5YmtzaG1icmRmZmN5d3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU5NzkxNiwiZXhwIjoyMDk3MTczOTE2fQ.NNVfyxZbxR2iqvNYOWucrc51K0WCNxkG2REbpn6HgqE";

async function fixWeek() {
  const userId = "18e5282d-4902-49fe-9ec5-fa2b0915c3c6";

  // Today is 2026-06-17, so week_start should be 2026-06-15 (Monday)
  const correctWeekStart = "2026-06-15";

  console.log(`📅 Creating plan for correct week: ${correctWeekStart}\n`);

  const plan = {
    week_number: 1,
    weekly_targets: { avg_daily_calories: 2200, avg_daily_protein_g: 150, workout_days: 5 },
    days: Array.from({ length: 7 }, (_, i) => {
      const date = new Date(2026, 5, 15 + i); // June 15, 2026 + i days
      return {
        day: i + 1,
        date: date.toISOString().split('T')[0],
        meals: [
          {
            type: 'breakfast',
            type_zh: '早餐',
            items: [
              { id: '1', name: 'Scrambled Eggs', name_zh: '炒蛋', calories: 150, protein_g: 12, carbs_g: 1, fat_g: 11, portion: '2個', preparation: '炒' },
              { id: '2', name: 'Toast', name_zh: '吐司', calories: 100, protein_g: 4, carbs_g: 18, fat_g: 2, portion: '2片', preparation: '烤' },
            ],
            total_calories: 250,
          },
          {
            type: 'lunch',
            type_zh: '午餐',
            items: [
              { id: '3', name: 'Grilled Chicken Breast', name_zh: '烤雞胸肉', calories: 300, protein_g: 50, carbs_g: 0, fat_g: 7, portion: '150g', preparation: '烤' },
              { id: '4', name: 'White Rice', name_zh: '白飯', calories: 200, protein_g: 4, carbs_g: 45, fat_g: 0.5, portion: '1碗', preparation: '煮' },
              { id: '5', name: 'Steamed Broccoli', name_zh: '蒸花菜', calories: 35, protein_g: 4, carbs_g: 6, fat_g: 0, portion: '150g', preparation: '蒸' },
            ],
            total_calories: 535,
          },
          {
            type: 'dinner',
            type_zh: '晚餐',
            items: [
              { id: '6', name: 'Baked Salmon', name_zh: '烤鮭魚', calories: 280, protein_g: 40, carbs_g: 0, fat_g: 15, portion: '120g', preparation: '烤' },
              { id: '7', name: 'Roasted Sweet Potato', name_zh: '烤地瓜', calories: 100, protein_g: 2, carbs_g: 22, fat_g: 0, portion: '100g', preparation: '烤' },
              { id: '8', name: 'Green Salad', name_zh: '生菜沙拉', calories: 50, protein_g: 2, carbs_g: 8, fat_g: 0, portion: '150g', preparation: '生食' },
            ],
            total_calories: 430,
          },
        ],
        workout: {
          type: i % 2 === 0 ? 'strength' : 'cardio',
          type_zh: i % 2 === 0 ? '重訓' : '有氧',
          warmup: [
            { exercise_id: '100', exercise_name: 'Arm Circles', exercise_name_zh: '臂繞圈', youtube_id: 'dQw4w9WgXcQ', sets: 1, reps: 15, duration_secs: null, rest_secs: 30, notes: '輕鬆熱身' }
          ],
          main: i % 2 === 0 ? [
            { exercise_id: '101', exercise_name: 'Barbell Bench Press', exercise_name_zh: '槓鈴臥推', youtube_id: '4YnVV_Ksb1E', sets: 4, reps: 6, duration_secs: null, rest_secs: 180, notes: '主要力量訓練' },
            { exercise_id: '102', exercise_name: 'Barbell Squat', exercise_name_zh: '槓鈴深蹲', youtube_id: 'aA-_NgDyaLg', sets: 4, reps: 6, duration_secs: null, rest_secs: 180, notes: '下半身主訓練' },
            { exercise_id: '103', exercise_name: 'Bent Over Rows', exercise_name_zh: '槓鈴划船', youtube_id: 'w5qQarebJV0', sets: 3, reps: 8, duration_secs: null, rest_secs: 120, notes: '背部訓練' },
          ] : [
            { exercise_id: '104', exercise_name: 'Running', exercise_name_zh: '跑步', youtube_id: null, sets: 1, reps: null, duration_secs: 1800, rest_secs: 0, notes: '30分鐘中等強度' },
            { exercise_id: '105', exercise_name: 'Jump Rope', exercise_name_zh: '跳繩', youtube_id: 'J8epyPNR-x0', sets: 3, reps: 60, duration_secs: null, rest_secs: 60, notes: '增加心肺能力' },
          ],
          cooldown: [
            { exercise_id: '106', exercise_name: 'Full Body Stretching', exercise_name_zh: '全身伸展', youtube_id: 'J8epyPNR-x0', sets: 1, reps: null, duration_secs: 600, notes: '10分鐘靜態伸展' }
          ],
          estimated_duration_mins: i % 2 === 0 ? 75 : 50,
          calories_burned_est: i % 2 === 0 ? 500 : 350,
        },
        daily_targets: { calories: 2200, protein_g: 150, carbs_g: 280, fat_g: 70, water_ml: 3000 },
      };
    }),
    grocery_list: [
      { category: '🥚 蛋白質', items: ['雞胸肉 1kg', '鮭魚 300g', '雞蛋 12個', '低脂牛奶 1L'] },
      { category: '🍚 碳水化合物', items: ['白米 2kg', '地瓜 1kg', '全麥吐司 1條', '燕麥 500g'] },
      { category: '🥦 蔬菜', items: ['花椰菜 500g', '菠菜 300g', '番茄 500g', '洋蔥 500g', '青椒 3個'] },
      { category: '🍌 水果', items: ['香蕉 6根', '藍莓 500g', '蘋果 6個'] },
      { category: '🧈 油脂', items: ['橄欖油 500ml', '杏仁 200g'] },
    ],
    coach_note: '本週訓練重點：週一三五進行力量訓練，著重複合動作；週二四進行有氧運動。每天保證 150g 蛋白質攝取，配合充足睡眠和補水。',
  };

  const res = await fetch(
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
        week_start: correctWeekStart,
        week_number: 1,
        plan_data: plan,
        generation_status: 'completed',
        coach_note: plan.coach_note,
      })
    }
  );

  if (res.ok) {
    console.log('✅ Plan created for correct week!\n');
    console.log('🎉 NOW: Refresh dashboard (F5)');
  } else {
    const err = await res.json();
    console.log('❌ Error:', err.message);
  }
}

fixWeek();
