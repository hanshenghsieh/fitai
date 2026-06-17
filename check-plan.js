const SUPABASE_URL = "https://ofbxybkshmbrdffcywyl.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnh5YmtzaG1icmRmZmN5d3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU5NzkxNiwiZXhwIjoyMDk3MTczOTE2fQ.NNVfyxZbxR2iqvNYOWucrc51K0WCNxkG2REbpn6HgqE";

async function checkPlan() {
  const userId = '5556336f-1b58-464f-ae42-310338f7c267';
  const weekStart = '2026-06-14';

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/weekly_plans?user_id=eq.${userId}&week_start=eq.${weekStart}`,
    {
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      }
    }
  );

  const data = await res.json();
  if (data[0]) {
    console.log('📊 Plan status:', data[0].generation_status);
    console.log('📅 Days:', data[0].plan_data.days.length);
    console.log('✅ Has meal data:', !!data[0].plan_data.days[0].meals);
  } else {
    console.log('❌ No plan found');
  }
}

checkPlan().catch(console.error);
