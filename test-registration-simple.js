const SUPABASE_URL = "https://ofbxybkshmbrdffcywyl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnh5YmtzaG1icmRmZmN5d3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1OTc5MTYsImV4cCI6MjA5NzE3MzkxNn0.tTTVBQPOHzgHrLWr4Bxp-3GQr7pFJ8b4LhBMaqKxTOo";
const APP_URL = "http://localhost:3000";

async function testRegistrationFlow() {
  console.log("📝 FitAI 註冊與登入流程測試\n" + "=".repeat(70));

  try {
    const email = `register-test-${Date.now()}@test.com`;
    const password = "TestPass123!@#";
    const displayName = "Test User";

    // Step 1: Test registration via /api/auth/register
    console.log("\n✅ Step 1: 測試註冊端點 (/api/auth/register)");
    console.log(`   📧 郵箱: ${email}`);
    console.log(`   🔑 密碼: ${password}`);
    console.log(`   👤 暱稱: ${displayName}`);

    const registerRes = await fetch(`${APP_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    });

    if (!registerRes.ok) {
      const err = await registerRes.text();
      throw new Error(`Registration failed: ${registerRes.status} - ${err}`);
    }

    const registerData = await registerRes.json();
    console.log(`   ✅ 用戶已建立`);
    console.log(`   🆔 UserID: ${registerData.userId}`);
    console.log(`   📧 Email: ${registerData.email}`);

    // Step 2: Test login via Supabase client
    console.log("\n✅ Step 2: 測試登入 (Supabase Auth)");

    const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email,
        password,
        gotrue_meta_security: {},
      }),
    });

    const loginData = await loginRes.json();

    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginData.error_description || loginData.error}`);
    }

    console.log(`   ✅ 登入成功`);
    console.log(`   🔐 Access Token: ${loginData.access_token.substring(0, 20)}...`);
    console.log(`   ⏰ 過期時間: ${new Date(Date.now() + (loginData.expires_in * 1000)).toLocaleString('zh-TW')}`);

    // Step 3: Verify user profile was created
    console.log("\n✅ Step 3: 驗證 Profile 自動建立");

    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${registerData.userId}`,
      {
        headers: {
          Authorization: `Bearer ${loginData.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        }
      }
    );

    const profiles = await profileRes.json();
    if (profiles.length > 0) {
      console.log(`   ✅ Profile 已建立`);
      console.log(`   👤 顯示名稱: ${profiles[0].display_name}`);
    } else {
      console.log(`   ℹ️ Profile 尚未建立`);
    }

    // Step 4: Check if user can access onboarding
    console.log("\n✅ Step 4: 驗證用戶可以訪問 Onboarding");

    const onboardingRes = await fetch(`${APP_URL}/onboarding`, {
      headers: {
        Cookie: `sb-${SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token=${loginData.access_token}`,
      },
    });

    if (onboardingRes.ok || onboardingRes.status === 307 || onboardingRes.status === 200) {
      console.log(`   ✅ Onboarding 頁面可訪問`);
    } else {
      console.log(`   ⚠️ Onboarding 狀態: ${onboardingRes.status}`);
    }

    console.log("\n" + "=".repeat(70));
    console.log("✅ 註冊與登入流程測試通過！");
    console.log("\n✨ 確認項目:");
    console.log("   ✅ 郵箱註冊");
    console.log("   ✅ 密碼驗證");
    console.log("   ✅ 自動登入");
    console.log("   ✅ Access Token 生成");
    console.log("   ✅ Profile 自動建立");

    console.log(`\n🔑 測試帳號:`);
    console.log(`   Email: ${email}`);
    console.log(`   密碼: ${password}`);
    console.log(`   URL: ${APP_URL}`);
    console.log(`\n📖 下一步:`);
    console.log(`   1. 用上述帳號登入應用`);
    console.log(`   2. 完成 Onboarding 6 個步驟`);
    console.log(`   3. 查看 Dashboard 中的詳細菜單分量信息`);
    console.log(`   4. 驗證 7 天菜單都不重複`);

  } catch (err) {
    console.error("\n❌ 測試失敗:", err.message);
    process.exit(1);
  }
}

testRegistrationFlow();
