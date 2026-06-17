const SUPABASE_URL = "https://ofbxybkshmbrdffcywyl.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnh5YmtzaG1icmRmZmN5d3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU5NzkxNiwiZXhwIjoyMDk3MTczOTE2fQ.NNVfyxZbxR2iqvNYOWucrc51K0WCNxkG2REbpn6HgqE";

async function fixPlanWeek() {
  const userId = '5556336f-1b58-464f-ae42-310338f7c267';
  const oldWeekStart = '2026-06-14';
  const newWeekStart = '2026-06-15';

  console.log('🔄 Migrating plan from', oldWeekStart, 'to', newWeekStart);

  // Get old plan
  const getRes = await fetch(
    `${SUPABASE_URL}/rest/v1/weekly_plans?user_id=eq.${userId}&week_start=eq.${oldWeekStart}`,
    {
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      }
    }
  );

  const plans = await getRes.json();
  if (!plans[0]) {
    console.log('❌ Old plan not found');
    return;
  }

  const oldPlan = plans[0];
  console.log('✅ Found old plan');

  // Delete old plan
  const deleteRes = await fetch(
    `${SUPABASE_URL}/rest/v1/weekly_plans?user_id=eq.${userId}&week_start=eq.${oldWeekStart}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      }
    }
  );

  console.log('🗑️  Deleted old plan');

  // Create new plan with updated week_start and dates
  const updatedDays = oldPlan.plan_data.days.map((day, i) => ({
    ...day,
    date: new Date(new Date(newWeekStart).getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  }));

  const newPlan = {
    ...oldPlan.plan_data,
    days: updatedDays,
  };

  const createRes = await fetch(`${SUPABASE_URL}/rest/v1/weekly_plans`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      week_start: newWeekStart,
      week_number: oldPlan.week_number,
      plan_data: newPlan,
      generation_status: 'completed',
      coach_note: oldPlan.coach_note,
    }),
  });

  if (createRes.ok) {
    console.log('✅ New plan created with correct week_start!');
    console.log('🔗 Refresh dashboard now');
  } else {
    console.log('❌ Failed:', await createRes.text());
  }
}

fixPlanWeek().catch(console.error);
