import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Toaster } from '@/components/ui/sonner'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/api/auth'

export const metadata: Metadata = {
  title: 'Growth AI · BetterBit',
}

export default async function GrowthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isAdminEmail(user?.email)) {
    redirect('/login')
  }

  return (
    <div className="min-h-dvh bg-background">
      {children}
      <Toaster />
    </div>
  )
}
