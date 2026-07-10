export default function AnalysisV2Skeleton() {
  return (
    <div className="v2-analysis-page animate-pulse">
      <div className="h-14 mx-4 mt-2 rounded-2xl bg-white/60" />
      <div className="v2-analysis-inner space-y-4">
        <div className="h-16 mx-auto w-[220px] rounded-2xl bg-white/70" />
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-[18px] bg-white/70" />
          ))}
        </div>
        <div className="h-52 rounded-[22px] bg-white/70" />
        <div className="h-52 rounded-[22px] bg-white/70" />
        <div className="h-48 rounded-[22px] bg-white/70" />
        <div className="h-36 rounded-[22px] bg-white/70" />
      </div>
    </div>
  )
}
