const SUPABASE_URL = "https://ofbxybkshmbrdffcywyl.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnh5YmtzaG1icmRmZmN5d3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU5NzkxNiwiZXhwIjoyMDk3MTczOTE2fQ.NNVfyxZbxR2iqvNYOWucrc51K0WCNxkG2REbpn6HgqE";

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function createTestUser() {
  console.log("📝 Step 1: Creating test user...");
  const email = `fitness-test-${Date.now()}@test.com`;
  const password = "TestPass123!@#";

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
  });

  const data = await res.json();
  if (res.ok && data.id) {
    console.log(`✅ User created: ${email}`);
    console.log(`   ID: ${data.id}`);
    return { userId: data.id, email, password };
  } else {
    console.log(`❌ Error:`, data);
    return null;
  }
}

async function createProfile(userId) {
  console.log("\n📋 Step 2: Creating user profile...");

  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: userId,
      display_name: '测试用户',
      age: 25,
      gender: 'male',
      height_cm: 180,
      weight_kg: 75,
      body_fat_pct: 15,
      activity_level: 'moderate',
    }),
  });

  if (res.ok) {
    console.log('✅ Profile created');
    return true;
  } else {
    const err = await res.text();
    console.log('⚠️  Profile creation warning:', err.substring(0, 100));
    return true;
  }
}

async function createGoal(userId) {
  console.log("\n🎯 Step 3: Creating goal...");

  const startDate = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const res = await fetch(`${SUPABASE_URL}/rest/v1/goals`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      goal_type: 'muscle_gain',
      start_date: startDate,
      end_date: endDate,
      target_weight_kg: 80,
      is_active: true,
    }),
  });

  if (res.ok) {
    console.log('✅ Goal created');
    return true;
  } else {
    const err = await res.text();
    console.log('⚠️  Goal creation warning:', err.substring(0, 100));
    return true;
  }
}

async function createTestPlan(userId) {
  console.log("\n📊 Step 4: Creating test plan...");

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const testPlan = {
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
        { type: 'breakfast', type_zh: '早餐', items: [{ id: '1', name: 'Eggs', name_zh: '蛋', calories: 150, protein_g: 12, carbs_g: 1, fat_g: 11, portion: '2个', preparation: '炒' }], total_calories: 150 },
        { type: 'lunch', type_zh: '午餐', items: [{ id: '2', name: 'Chicken', name_zh: '鸡肉', calories: 300, protein_g: 50, carbs_g: 0, fat_g: 7, portion: '150g', preparation: '烤' }], total_calories: 300 },
        { type: 'dinner', type_zh: '晚餐', items: [{ id: '3', name: 'Rice', name_zh: '米饭', calories: 200, protein_g: 5, carbs_g: 45, fat_g: 0, portion: '1碗', preparation: '煮' }], total_calories: 200 },
      ],
      workout: {
        type: i % 2 === 0 ? 'strength' : 'cardio',
        type_zh: i % 2 === 0 ? '重训' : '有氧',
        warmup: [{ exercise_id: '1', exercise_name: 'Warm up', exercise_name_zh: '热身', youtube_id: null, sets: 1, reps: 10, duration_secs: null, rest_secs: 60, notes: '' }],
        main: [{ exercise_id: '2', exercise_name: 'Push ups', exercise_name_zh: '俯卧撑', youtube_id: null, sets: 3, reps: 15, duration_secs: null, rest_secs: 60, notes: '' }],
        cooldown: [{ exercise_id: '3', exercise_name: 'Stretch', exercise_name_zh: '拉伸', youtube_id: null, sets: 1, reps: null, duration_secs: 300, rest_secs: 0, notes: '' }],
        estimated_duration_mins: 45,
        calories_burned_est: 300,
      },
      daily_targets: { calories: 2200, protein_g: 150, carbs_g: 250, fat_g: 70, water_ml: 3000 },
    })),
    grocery_list: [
      { category: '蛋白质', items: ['鸡肉', '蛋'] },
      { category: '碳水', items: ['米饭', '面包'] },
    ],
    coach_note: '这周继续保持高强度训练，注意补充蛋白质。',
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/weekly_plans`, {
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
      plan_data: testPlan,
      coach_note: testPlan.coach_note,
      generation_status: 'completed',
    }),
  });

  if (res.ok) {
    console.log('✅ Test plan created');
    return true;
  } else {
    const err = await res.json();
    if (err.code === '23505') {
      console.log('⚠️  Plan already exists (updating...)');
      const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/weekly_plans?user_id=eq.${userId}&week_start=eq.${weekStartStr}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_data: testPlan,
          generation_status: 'completed',
        }),
      });
      if (updateRes.ok) {
        console.log('✅ Plan updated');
        return true;
      }
    }
    console.log('❌ Error:', err);
    return false;
  }
}

async function verifyPlan(userId) {
  console.log("\n✅ Step 5: Verifying plan is accessible...");

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const res = await fetch(`${SUPABASE_URL}/rest/v1/weekly_plans?user_id=eq.${userId}&week_start=eq.${weekStartStr}`, {
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    }
  });

  const plans = await res.json();
  if (plans[0]) {
    console.log('✅ Plan accessible');
    console.log('   Status:', plans[0].generation_status);
    console.log('   Days:', plans[0].plan_data.days.length);
    console.log('   Coach note:', plans[0].coach_note);
    return true;
  } else {
    console.log('❌ Plan not found');
    return false;
  }
}

async function main() {
  console.log('🧪 FULL USER FLOW TEST\n' + '='.repeat(40));

  const user = await createTestUser();
  if (!user) return;

  await createProfile(user.userId);
  await createGoal(user.userId);
  await createTestPlan(user.userId);
  await verifyPlan(user.userId);

  console.log('\n' + '='.repeat(40));
  console.log('✨ 完整测试流程完成！\n');
  console.log('📌 测试用户信息：');
  console.log(`   Email: ${user.email}`);
  console.log(`   Password: ${user.password}`);
  console.log(`   User ID: ${user.userId}`);
  console.log('\n🌐 可以访问以下页面测试：');
  console.log('   • Dashboard: http://localhost:3000/dashboard');
  console.log('   • Weekly: http://localhost:3000/weekly');
  console.log('   • Login: http://localhost:3000/login (用上述邮箱密码登录)');
}

main().catch(console.error);
