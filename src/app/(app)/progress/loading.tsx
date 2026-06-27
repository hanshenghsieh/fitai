import { BB_V2 } from '@/lib/betterbit-v2'

export default function ProgressLoading() {
  return (
    <div
      className="max-w-lg mx-auto px-5 pt-4 pb-8 space-y-5 animate-pulse"
      style={{ backgroundColor: BB_V2.bg.canvas, fontFamily: BB_V2.font }}
    >
      <div className="h-10 w-full rounded-full" style={{ backgroundColor: BB_V2.bg.pill }} />
      <div className="h-44 rounded-[28px]" style={{ backgroundColor: BB_V2.bg.card }} />
      <div className="h-32 rounded-[28px]" style={{ backgroundColor: BB_V2.bg.card }} />
      <div className="h-48 rounded-[28px]" style={{ backgroundColor: BB_V2.bg.card }} />
    </div>
  )
}
