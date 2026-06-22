'use client'

import SettingsSection from './SettingsSection'
import SettingsRow from './SettingsRow'
import { SUPPORT_EMAIL } from '@/lib/support'

export default function SettingsSupportSection() {
  return (
    <SettingsSection title="支援">
      <SettingsRow
        label="支援中心"
        detail="常見問題與聯絡方式。"
        onClick={() => { window.location.href = '/support' }}
      />
      <SettingsRow
        label="跟我們說"
        detail="有問題、有想法，直接寫信。我們會看。"
        onClick={() => {
          window.location.href = `mailto:${SUPPORT_EMAIL}?subject=BetterBit 支援`
        }}
        last
      />
    </SettingsSection>
  )
}
