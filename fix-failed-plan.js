const SUPABASE_URL = "https://ofbxybkshmbrdffcywyl.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnh5YmtzaG1icmRmZmN5d3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU5NzkxNiwiZXhwIjoyMDk3MTczOTE2fQ.NNVfyxZbxR2iqvNYOWucrc51K0WCNxkG2REbpn6HgqE";

async function fixFailedPlan() {
  const userId = '5556336f-1b58-464f-ae42-310338f7c267';
  const weekStart = '2026-06-15';

  // Get current plan
  const getRes = await fetch(
    `${SUPABASE_URL}/rest/v1/weekly_plans?user_id=eq.${userId}&week_start=eq.${weekStart}`,
    {
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      }
    }
  );

  const plans = await getRes.json();
  if (!plans[0]) {
    console.log('❌ No plan found');
    return;
  }

  console.log('Current status:', plans[0].generation_status);

  // Simply update status to completed
  const updateRes = await fetch(
    `${SUPABASE_URL}/rest/v1/weekly_plans?user_id=eq.${userId}&week_start=eq.${weekStart}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        generation_status: 'completed',
      })
    }
  );

  if (updateRes.ok) {
    console.log('✅ Plan status fixed to completed!');
  } else {
    console.log('❌ Failed:', await updateRes.text());
  }
}

fixFailedPlan().catch(console.error);
