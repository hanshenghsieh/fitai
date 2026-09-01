import type { SupabaseClient } from '@supabase/supabase-js'
import type { ExerciseLog } from '@/types'

export async function loadExerciseLogsForDate(
  supabase: SupabaseClient,
  userId: string,
  loggedDate: string
): Promise<ExerciseLog[]> {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('logged_date', loggedDate)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as ExerciseLog[]
}
