import { colors } from '@/lib/design-system'
import SettingsHeader from '@/components/settings/SettingsHeader'

export default function SettingsLoading() {
  return (
    <div className="max-w-lg mx-auto pb-6" style={{ backgroundColor: colors.bg.canvas }}>
      <SettingsHeader />
      <div className="px-4 space-y-3 animate-pulse">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="h-24 rounded-2xl"
            style={{ backgroundColor: colors.bg.muted, opacity: 0.55 }}
          />
        ))}
      </div>
    </div>
  )
}
