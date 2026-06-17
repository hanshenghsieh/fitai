const SUPABASE_URL = "https://ofbxybkshmbrdffcywyl.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnh5YmtzaG1icmRmZmN5d3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU5NzkxNiwiZXhwIjoyMDk3MTczOTE2fQ.NNVfyxZbxR2iqvNYOWucrc51K0WCNxkG2REbpn6HgqE";

async function checkAllPlans() {
  const userId = '5556336f-1b58-464f-ae42-310338f7c267';

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
  console.log(`📊 Found ${plans.length} plans:`);
  plans.forEach((p, i) => {
    console.log(`\n  Plan ${i+1}:`);
    console.log(`    Week start: ${p.week_start}`);
    console.log(`    Status: ${p.generation_status}`);
    console.log(`    Days: ${p.plan_data?.days?.length || 0}`);
  });
}

checkAllPlans().catch(console.error);
