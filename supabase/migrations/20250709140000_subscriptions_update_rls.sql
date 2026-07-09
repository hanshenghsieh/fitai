-- subscriptions upsert needs UPDATE; Apple IAP sync uses service role, but user routes need this too.
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.subscriptions;

CREATE POLICY "Users can update their own subscriptions" ON public.subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
