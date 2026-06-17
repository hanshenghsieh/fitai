const SUPABASE_URL = "https://ofbxybkshmbrdffcywyl.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnh5YmtzaG1icmRmZmN5d3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU5NzkxNiwiZXhwIjoyMDk3MTczOTE2fQ.NNVfyxZbxR2iqvNYOWucrc51K0WCNxkG2REbpn6HgqE";

async function debugDashboard() {
  const userId = '5556336f-1b58-464f-ae42-310338f7c267';
  
  // Simulate what Dashboard calculates for week_start
  const today = new Date('2026-06-17');
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toISOString().split('T')[0];
  
  console.log('Today:', today.toISOString().split('T')[0]);
  console.log('Calculated weekStart:', weekStartStr);
  
  // Query what Dashboard would query
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/weekly_plans?user_id=eq.${userId}&week_start=eq.${weekStartStr}`,
    {
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      }
    }
  );

  const data = await res.json();
  if (data[0]) {
    console.log('\n✅ Found plan:');
    console.log('  Status:', data[0].generation_status);
    console.log('  Days:', data[0].plan_data?.days?.length);
  } else {
    console.log('\n❌ No plan found for week_start =', weekStartStr);
    
    // List all plans for this user
    const allRes = await fetch(
      `${SUPABASE_URL}/rest/v1/weekly_plans?user_id=eq.${userId}`,
      {
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
        }
      }
    );
    const allPlans = await allRes.json();
    console.log('\nAll plans for user:');
    allPlans.forEach(p => {
      console.log(`  - ${p.week_start}: ${p.generation_status}`);
    });
  }
}

debugDashboard().catch(console.error);
