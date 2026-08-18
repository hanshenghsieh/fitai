'use client'

import { useState } from 'react'
import { apiFetchJson } from '@/lib/api/client'

export interface ReleaseConfigFormValue {
  latest_version: string
  minimum_version: string
  title: string
  message: string
  update_url: string
  force_update: boolean
  enabled: boolean
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #ddd',
  fontSize: 14,
  marginTop: 4,
  marginBottom: 12,
}

const labelStyle: React.CSSProperties = { fontSize: 13, color: '#666', fontWeight: 500 }

/**
 * Minimal admin form for the 6 (well, 7 counting update_url) release-config
 * fields — deliberately not a general CMS, per the explicit "不要為了6個欄位
 * 做完整CMS" instruction. Writes via PATCH /api/app-release-config, gated
 * server-side by the same requireAdminUser check every other founder-
 * dashboard write path uses — this form has no elevated privilege of its
 * own, it's just a thin client for that endpoint.
 */
export default function ReleaseConfigEditor({ initial }: { initial: ReleaseConfigFormValue }) {
  const [value, setValue] = useState<ReleaseConfigFormValue>(initial)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSave() {
    setStatus('saving')
    setErrorMessage(null)
    try {
      await apiFetchJson('/api/app-release-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'ios', ...value }),
      })
      setStatus('saved')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : '儲存失敗')
    }
  }

  return (
    <div>
      <label style={labelStyle}>最新版本（latest_version）</label>
      <input
        style={inputStyle}
        value={value.latest_version}
        onChange={e => setValue(v => ({ ...v, latest_version: e.target.value }))}
        placeholder="1.1.0"
      />

      <label style={labelStyle}>最低版本（minimum_version，低於此版本強制更新）</label>
      <input
        style={inputStyle}
        value={value.minimum_version}
        onChange={e => setValue(v => ({ ...v, minimum_version: e.target.value }))}
        placeholder="1.0.0"
      />

      <label style={labelStyle}>標題</label>
      <input
        style={inputStyle}
        value={value.title}
        onChange={e => setValue(v => ({ ...v, title: e.target.value }))}
      />

      <label style={labelStyle}>內容</label>
      <textarea
        style={{ ...inputStyle, minHeight: 72 }}
        value={value.message}
        onChange={e => setValue(v => ({ ...v, message: e.target.value }))}
      />

      <label style={labelStyle}>App Store 連結（update_url）</label>
      <input
        style={inputStyle}
        value={value.update_url}
        onChange={e => setValue(v => ({ ...v, update_url: e.target.value }))}
        placeholder="https://apps.apple.com/app/id..."
      />

      <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={value.force_update}
          onChange={e => setValue(v => ({ ...v, force_update: e.target.checked }))}
        />
        強制更新（force_update）— 低於最低版本的使用者將無法略過
      </label>

      <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={e => setValue(v => ({ ...v, enabled: e.target.checked }))}
        />
        啟用（enabled）— 關閉時完全不顯示更新公告
      </label>

      <button
        type="button"
        onClick={handleSave}
        disabled={status === 'saving'}
        style={{
          padding: '10px 20px',
          borderRadius: 10,
          background: '#111',
          color: '#fff',
          fontWeight: 600,
          fontSize: 14,
          border: 'none',
        }}
      >
        {status === 'saving' ? '儲存中…' : '儲存'}
      </button>

      {status === 'saved' && <span style={{ marginLeft: 12, fontSize: 13, color: '#2e7d32' }}>已儲存</span>}
      {status === 'error' && (
        <span style={{ marginLeft: 12, fontSize: 13, color: '#c0392b' }}>儲存失敗：{errorMessage}</span>
      )}
    </div>
  )
}
