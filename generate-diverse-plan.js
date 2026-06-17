const SUPABASE_URL = "https://ofbxybkshmbrdffcywyl.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnh5YmtzaG1icmRmZmN5d3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU5NzkxNiwiZXhwIjoyMDk3MTczOTE2fQ.NNVfyxZbxR2iqvNYOWucrc51K0WCNxkG2REbpn6HgqE";

const mealOptions = {
  breakfast: [
    { name: '蛋', name_zh: '炒蛋', cal: 150, protein: 12, portion: '2個', prep: '炒', emoji: '🥚' },
    { name: 'Oatmeal', name_zh: '燕麥', cal: 150, protein: 5, portion: '50g', prep: '煮', emoji: '🥣' },
    { name: 'Pancake', name_zh: '鬆餅', cal: 180, protein: 8, portion: '2片', prep: '煎', emoji: '🥞' },
    { name: 'Yogurt', name_zh: '優格', cal: 120, protein: 15, portion: '150ml', prep: '冷凍', emoji: '🥛' },
  ],
  lunch: [
    { name: 'Chicken', name_zh: '雞胸肉', cal: 300, protein: 50, portion: '150g', prep: '烤', emoji: '🍗' },
    { name: 'Beef', name_zh: '牛肉', cal: 280, protein: 45, portion: '120g', prep: '煎', emoji: '🥩' },
    { name: 'Fish', name_zh: '鱈魚', cal: 250, protein: 48, portion: '140g', prep: '蒸', emoji: '🐟' },
    { name: 'Tofu', name_zh: '豆腐', cal: 180, protein: 20, portion: '200g', prep: '炒', emoji: '🟫' },
  ],
  carbs: [
    { name: 'Rice', name_zh: '白飯', cal: 200, protein: 4, portion: '1碗', prep: '煮', emoji: '🍚' },
    { name: 'Pasta', name_zh: '義大利麵', cal: 220, protein: 8, portion: '100g', prep: '煮', emoji: '🍝' },
    { name: 'Bread', name_zh: '全麥麵包', cal: 160, protein: 6, portion: '2片', prep: '烤', emoji: '🍞' },
    { name: 'Potato', name_zh: '馬鈴薯', cal: 150, protein: 3, portion: '200g', prep: '蒸', emoji: '🥔' },
  ],
  vegetables: [
    { name: 'Broccoli', name_zh: '花菜', cal: 35, protein: 4, portion: '150g', prep: '蒸', emoji: '🥦' },
    { name: 'Spinach', name_zh: '菠菜', cal: 25, protein: 3, portion: '100g', prep: '炒', emoji: '🥬' },
    { name: 'Carrots', name_zh: '紅蘿蔔', cal: 50, protein: 1, portion: '100g', prep: '蒸', emoji: '🥕' },
    { name: 'Asparagus', name_zh: '蘆筍', cal: 30, protein: 3, portion: '120g', prep: '烤', emoji: '🌱' },
  ],
  dinner: [
    { name: 'Salmon', name_zh: '鮭魚', cal: 280, protein: 40, portion: '120g', prep: '烤', emoji: '🐟' },
    { name: 'Shrimp', name_zh: '蝦', cal: 120, protein: 26, portion: '150g', prep: '炒', emoji: '🦐' },
    { name: 'Pork', name_zh: '豬肉', cal: 320, protein: 42, portion: '140g', prep: '烤', emoji: '🍖' },
    { name: 'Turkey', name_zh: '火雞', cal: 200, protein: 42, portion: '130g', prep: '蒸', emoji: '🦃' },
  ],
  sweets: [
    { name: 'Sweet Potato', name_zh: '地瓜', cal: 100, protein: 2, portion: '100g', prep: '烤', emoji: '🍠' },
    { name: 'Banana', name_zh: '香蕉', cal: 90, protein: 1, portion: '1根', prep: '新鮮', emoji: '🍌' },
    { name: 'Apple', name_zh: '蘋果', cal: 80, protein: 0, portion: '1顆', prep: '新鮮', emoji: '🍎' },
  ]
};

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateMealForDay(dayIndex) {
  const breakfast = getRandomItem(mealOptions.breakfast);
  const lunch = [getRandomItem(mealOptions.lunch), getRandomItem(mealOptions.carbs), getRandomItem(mealOptions.vegetables)];
  const dinner = [getRandomItem(mealOptions.dinner), getRandomItem(mealOptions.sweets)];

  const breakfastCal = breakfast.cal + 100; // toast
  const lunchCal = lunch.reduce((s, m) => s + m.cal, 0);
  const dinnerCal = dinner.reduce((s, m) => s + m.cal, 0);

  return [
    {
      type: 'breakfast',
      type_zh: '早餐',
      items: [
        { id: 'b1', name: breakfast.name, name_zh: breakfast.name_zh, calories: breakfast.cal, protein_g: breakfast.protein, carbs_g: 15, fat_g: 8, portion: breakfast.portion, preparation: breakfast.prep },
        { id: 'b2', name: 'Toast', name_zh: '吐司', calories: 100, protein_g: 4, carbs_g: 18, fat_g: 2, portion: '2片', preparation: '烤' }
      ],
      total_calories: breakfastCal,
    },
    {
      type: 'lunch',
      type_zh: '午餐',
      items: lunch.map((item, i) => ({
        id: `l${i}`,
        name: item.name,
        name_zh: item.name_zh,
        calories: item.cal,
        protein_g: item.protein,
        carbs_g: item === lunch[1] ? 45 : (item === lunch[2] ? 5 : 0),
        fat_g: item === lunch[0] ? 7 : 0.5,
        portion: item.portion,
        preparation: item.prep,
      })),
      total_calories: lunchCal,
    },
    {
      type: 'dinner',
      type_zh: '晚餐',
      items: dinner.map((item, i) => ({
        id: `d${i}`,
        name: item.name,
        name_zh: item.name_zh,
        calories: item.cal,
        protein_g: item.protein,
        carbs_g: item === dinner[1] ? 22 : 0,
        fat_g: item === dinner[0] ? 15 : 0,
        portion: item.portion,
        preparation: item.prep,
      })),
      total_calories: dinnerCal,
    }
  ];
}

async function generatePlan() {
  const userId = "18e5282d-4902-49fe-9ec5-fa2b0915c3c6";

  console.log("📝 生成7天不同菜單...\n");

  const plan = {
    week_number: 1,
    weekly_targets: { avg_daily_calories: 2200, avg_daily_protein_g: 150, workout_days: 5 },
    days: Array.from({ length: 7 }, (_, i) => {
      const meals = generateMealForDay(i);
      const totalCal = meals.reduce((s, m) => s + m.total_calories, 0);

      return {
        day: i + 1,
        date: new Date(2026, 5, 15 + i).toISOString().split('T')[0],
        meals,
        workout: {
          type: i % 2 === 0 ? 'strength' : 'cardio',
          type_zh: i % 2 === 0 ? '重訓' : '有氧',
          warmup: [
            { exercise_id: '1', exercise_name: 'Warm up', exercise_name_zh: '熱身', youtube_id: 'dQw4w9WgXcQ', sets: 1, reps: 15, duration_secs: null, rest_secs: 30, notes: '' }
          ],
          main: i % 2 === 0 ? [
            { exercise_id: '2', exercise_name: 'Bench Press', exercise_name_zh: '臥推', youtube_id: '4YnVV_Ksb1E', sets: 4, reps: 8, duration_secs: null, rest_secs: 120, notes: '' },
            { exercise_id: '3', exercise_name: 'Squats', exercise_name_zh: '深蹲', youtube_id: 'aA-_NgDyaLg', sets: 4, reps: 8, duration_secs: null, rest_secs: 120, notes: '' },
          ] : [
            { exercise_id: '4', exercise_name: 'Running', exercise_name_zh: '跑步', youtube_id: null, sets: 1, reps: null, duration_secs: 1800, rest_secs: 0, notes: '' },
          ],
          cooldown: [
            { exercise_id: '5', exercise_name: 'Stretching', exercise_name_zh: '伸展', youtube_id: 'J8epyPNR-x0', sets: 1, reps: null, duration_secs: 300, rest_secs: 0, notes: '' }
          ],
          estimated_duration_mins: 45,
          calories_burned_est: 300,
        },
        daily_targets: { calories: Math.round(totalCal), protein_g: 150, carbs_g: 280, fat_g: 70, water_ml: 3000 },
      };
    }),
    grocery_list: [
      { category: '🥚 蛋白質', items: ['雞胸肉', '牛肉', '鮭魚', '蝦', '豆腐', '蛋'] },
      { category: '🍚 碳水', items: ['白飯', '義大利麵', '全麥麵包', '馬鈴薯'] },
      { category: '🥦 蔬菜', items: ['花菜', '菠菜', '紅蘿蔔', '蘆筍'] },
      { category: '🍌 水果', items: ['香蕉', '蘋果', '地瓜'] },
    ],
    coach_note: '本週7天完全不同菜單組合，提供更多營養多樣性。力量訓練日確保蛋白質充足。',
  };

  const updateRes = await fetch(
    `${SUPABASE_URL}/rest/v1/weekly_plans?user_id=eq.${userId}&week_start=eq.2026-06-15`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_data: plan,
        generation_status: 'completed',
        coach_note: plan.coach_note,
      })
    }
  );

  if (updateRes.ok) {
    console.log('✅ 7天不同菜單已生成！\n');
    console.log('每一天的菜單：');
    plan.days.forEach((day, i) => {
      console.log(`\n Day ${i + 1}:`);
      day.meals.forEach(meal => {
        console.log(`  ${meal.type_zh}: ${meal.items.map(it => it.name_zh).join(' + ')}`);
      });
    });
    console.log('\n🎉 F5 刷新 Dashboard 查看！');
  } else {
    console.log('Error:', await updateRes.text());
  }
}

generatePlan();
