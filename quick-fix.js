const SUPABASE_URL = "https://ofbxybkshmbrdffcywyl.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnh5YmtzaG1icmRmZmN5d3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU5NzkxNiwiZXhwIjoyMDk3MTczOTE2fQ.NNVfyxZbxR2iqvNYOWucrc51K0WCNxkG2REbpn6HgqE";

async function quickFix() {
  const userId = "18e5282d-4902-49fe-9ec5-fa2b0915c3c6";
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  console.log("🔧 Fixing failed plan status...");

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/weekly_plans?user_id=eq.${userId}&week_start=eq.${weekStartStr}`,
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

  if (res.ok) {
    console.log('✅ Status fixed to completed');
  } else {
    console.log('Error:', await res.text());
  }
}

quickFix();
