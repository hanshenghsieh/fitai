const SUPABASE_URL = "https://ofbxybkshmbrdffcywyl.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnh5YmtzaG1icmRmZmN5d3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU5NzkxNiwiZXhwIjoyMDk3MTczOTE2fQ.NNVfyxZbxR2iqvNYOWucrc51K0WCNxkG2REbpn6HgqE";

async function verifyDashboardData(userId) {
  console.log("\n📊 VERIFYING DASHBOARD DATA FOR USER:");
  console.log(`   User ID: ${userId}\n`);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  // Get profile
  console.log("1️⃣  Fetching user profile...");
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${userId}`, {
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    }
  });
  const profiles = await profileRes.json();
  if (profiles[0]) {
    console.log("   ✅ Profile found");
    console.log(`      Name: ${profiles[0].display_name}`);
    console.log(`      Weight: ${profiles[0].weight_kg}kg`);
  } else {
    console.log("   ❌ Profile not found");
  }

  // Get weekly plan
  console.log("\n2️⃣  Fetching weekly plan...");
  const planRes = await fetch(`${SUPABASE_URL}/rest/v1/weekly_plans?user_id=eq.${userId}&week_start=eq.${weekStartStr}`, {
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    }
  });
  const plans = await planRes.json();
  if (plans[0]) {
    const plan = plans[0];
    console.log("   ✅ Weekly plan found");
    console.log(`      Status: ${plan.generation_status}`);
    console.log(`      Days: ${plan.plan_data.days.length}`);
    console.log(`      Weekly targets:`);
    console.log(`        • Calories: ${plan.plan_data.weekly_targets.avg_daily_calories}/day`);
    console.log(`        • Protein: ${plan.plan_data.weekly_targets.avg_daily_protein_g}g/day`);
    console.log(`        • Workout days: ${plan.plan_data.weekly_targets.workout_days}`);
    console.log(`      Coach note: "${plan.coach_note}"`);

    // Verify first day's data
    const day1 = plan.plan_data.days[0];
    console.log(`\n      Day 1 Details:`);
    console.log(`        • Meals: ${day1.meals.length}`);
    console.log(`        • Workout: ${day1.workout.type_zh}`);
    console.log(`        • Daily targets: ${day1.daily_targets.calories} cal, ${day1.daily_targets.protein_g}g protein`);
  } else {
    console.log("   ❌ Weekly plan not found");
  }

  // Get today's checkin
  console.log("\n3️⃣  Checking for today's checkin...");
  const checkinRes = await fetch(`${SUPABASE_URL}/rest/v1/daily_checkins?user_id=eq.${userId}&checkin_date=eq.${todayStr}`, {
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    }
  });
  const checkins = await checkinRes.json();
  if (checkins[0]) {
    console.log("   ✅ Today's checkin found");
  } else {
    console.log("   ℹ️  No checkin yet (expected for new user)");
  }

  console.log("\n" + "=".repeat(50));
  console.log("✨ APP VERIFICATION COMPLETE");
  console.log("=".repeat(50));
}

const testUserId = process.argv[2];
if (!testUserId) {
  console.log("Usage: node verify-app.js <user-id>");
  console.log("\nExample: node verify-app.js 18e5282d-4902-49fe-9ec5-fa2b0915c3c6");
  process.exit(1);
}

verifyDashboardData(testUserId).catch(console.error);
