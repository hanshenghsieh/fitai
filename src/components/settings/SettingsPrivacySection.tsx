'use client'

import Link from 'next/link'
import SettingsSection from './SettingsSection'
import SettingsRow from './SettingsRow'

export default function SettingsPrivacySection() {
  return (
    <SettingsSection title="隱私">
      <SettingsRow
        label="你的資料"
        detail="只用來幫你吃、動、休息。不販售、不公開。"
      />
      <SettingsRow
        label="健康參考"
        detail="BetterBit 提供生活參考，不是醫療建議。不舒服先休息。"
      />
      <SettingsRow
        label="隱私權政策"
        detail="我們如何收集與保護你的資料。"
        onClick={() => { window.location.href = '/privacy' }}
      />
      <SettingsRow
        label="服務條款"
        onClick={() => { window.location.href = '/terms' }}
        last
      />
    </SettingsSection>
  )
}
