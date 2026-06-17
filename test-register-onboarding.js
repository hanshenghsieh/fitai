const SUPABASE_URL = "https://ofbxybkshmbrdffcywyl.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnh5YmtzaG1icmRmZmN5d3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU5NzkxNiwiZXhwIjoyMDk3MTczOTE2fQ.NNVfyxZbxR2iqvNYOWucrc51K0WCNxkG2REbpn6HgqE";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnh5YmtzaG1icmRmZmN5d3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1OTc5MTYsImV4cCI6MjA5NzE3MzkxNn0.JiHna8LEyhtVqS4kMEWGhfEq2T6nLSyXrg04avkAsTE";

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function testRegisterOnboarding() {
  console.log("🧪 TEST REGISTER → ONBOARDING → DASHBOARD\n" + "=".repeat(60));

  // Step 1: Create user via API (simulate registration)
  console.log("\n✏️  Step 1: Creating user account...");
  const testEmail = `fitai-test-${Date.now()}@test.com`;
  const testPassword = "TestPass123!@#";

  const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    }),
  });

  const userData = await signupRes.json();
  if (!userData.id) {
    console.log("❌ User creation failed:", userData);
    return;
  }

  const userId = userData.id;
  console.log(`✅ User created: ${testEmail}`);
  console.log(`   ID: ${userId}`);

  // Step 2: Create profile (should happen on registration)
  console.log("\n📋 Step 2: Creating user profile...");
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: userId,
      display_name: 'Test User',
      gender: 'male',
      age: 28,
      height_cm: 175,
      weight_kg: 80,
      body_fat_pct: 18,
      activity_level: 'moderate',
      fitness_level: 'intermediate',
      equipment: ['dumbbells', 'barbell'],
    }),
  });

  if (profileRes.ok) {
    console.log("✅ Profile created");
  } else {
    console.log("⚠️  Profile creation:", profileRes.status, await profileRes.text());
  }

  // Step 3: Simulate onboarding - create goal
  console.log("\n🎯 Step 3: Creating fitness goal...");
  const today = new Date();
  const endDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

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
      start_date: today.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      target_weight_kg: 85,
    }),
  });

  if (goalRes.ok) {
    console.log("✅ Goal created");
  } else {
    console.log("⚠️  Goal creation:", goalRes.status, await goalRes.text());
  }

  // Step 4: Simulate /api/generate-plan call
  console.log("\n📊 Step 4: Calling /api/generate-plan...");

  // First, we need to get a session token for the user
  const signInRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
    },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });

  const tokenData = await signInRes.json();
  if (!tokenData.access_token) {
    console.log("❌ Failed to get session token:", tokenData);
    return;
  }

  console.log("✅ Got session token for user");

  // Now call generate-plan with the user's session
  const planRes = await fetch('http://localhost:3000/api/generate-plan', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  console.log(`   Response status: ${planRes.status} ${planRes.statusText}`);

  if (planRes.status === 303) {
    console.log("✅ Plan generation completed (303 redirect to dashboard)");
  } else if (planRes.ok) {
    console.log("✅ Plan generation completed");
    const data = await planRes.json();
    console.log("   Response:", data);
  } else {
    const errorText = await planRes.text();
    console.log("❌ Plan generation failed");
    console.log("   Response:", errorText);
    return;
  }

  // Step 5: Verify dashboard loads
  console.log("\n✅ Step 5: Verifying dashboard data...");

  const profileCheck = await fetch(
    `${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${userId}`,
    {
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      }
    }
  );
  const profiles = await profileCheck.json();
  if (profiles[0]) {
    console.log(`✅ Profile loads: ${profiles[0].display_name}`);
  }

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const planCheck = await fetch(
    `${SUPABASE_URL}/rest/v1/weekly_plans?user_id=eq.${userId}&week_start=eq.${weekStartStr}`,
    {
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      }
    }
  );
  const plans = await planCheck.json();
  if (plans[0]) {
    console.log(`✅ Weekly plan loads (${plans[0].plan_data.days.length} days)`);
  } else {
    console.log("⚠️  No weekly plan found for this week");
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ TEST COMPLETE!\n");
  console.log("📌 Test Account:");
  console.log(`   Email: ${testEmail}`);
  console.log(`   Password: ${testPassword}`);
  console.log(`\n   Try logging in: http://localhost:3000/login`);
}

testRegisterOnboarding().catch(console.error);
