'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  UtensilsCrossed,
  Sun,
  Moon,
  Cookie,
  Droplets,
  Scale,
  Calendar,
  Smile,
  Smartphone,
  Bell,
  Mail,
  MoonStar,
} from 'lucide-react'
import type { SettingsBundle } from '@/lib/app/settings-data'
import type { NotificationSettings } from '@/lib/settings/user-settings-types'
import { isNativeIOS, isWebPushSupported } from '@/lib/capacitor-native'
import { initializeFirebase, requestNotificationPermission, listenForPushMessages } from '@/lib/firebase'
import { createClient } from '@/lib/supabase/client'
import { useSettingsDirtyTracker, useSettingsSave } from '@/hooks/useSettingsForm'
import V2SettingsVisualShell from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualShell'
import V2SettingsVisualCard from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualCard'
import V2OverlayPortal from '@/components/betterbit-v2/settings/visual-v2/V2OverlayPortal'
import {
  V2VisualToggleRow,
  V2VisualPickerSheet,
  useVisualPicker,
} from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualPrimitives'
import { apiFetch } from '@/lib/api/client'
import { invalidateUserPreferencesCache } from '@/lib/settings/calorie-bank-user-prefs'
import {
  ensureLocalNotificationPermission,
  getLocalNotificationPermission,
  openIosNotificationSettings,
  reconcileLocalReminders,
  scheduleLocalReminderTest,
  type LocalNotificationPermission,
} from '@/lib/notifications/local-reminders'

const WEEKDAYS = [
  { value: '0', label: '週日' },
  { value: '1', label: '週一' },
  { value: '2', label: '週二' },
  { value: '3', label: '週三' },
  { value: '4', label: '週四' },
  { value: '5', label: '週五' },
  { value: '6', label: '週六' },
]

const WATER_INTERVALS = [
  { value: '1', label: '每 1 小時' },
  { value: '2', label: '每 2 小時' },
  { value: '3', label: '每 3 小時' },
  { value: '0', label: '關閉' },
]

const WEIGHT_FREQ = [
  { value: '7', label: '每天' },
  { value: '1', label: '每週一次' },
  { value: '2', label: '每週兩次' },
  { value: '0', label: '關閉' },
]

function formatTimeDisplay(t: string) {
  return t.replace(':', ':')
}

const LOCAL_REMINDER_KEYS = [
  'breakfast_enabled',
  'lunch_enabled',
  'dinner_enabled',
  'snack_enabled',
  'water_enabled',
  'weight_log_enabled',
  'weekly_review_enabled',
] as const

function hasEnabledLocalReminder(settings: NotificationSettings): boolean {
  return LOCAL_REMINDER_KEYS.some(key => settings[key])
}

function disableLocalReminders(settings: NotificationSettings): NotificationSettings {
  return LOCAL_REMINDER_KEYS.reduce(
    (next, key) => ({ ...next, [key]: false }),
    settings
  )
}

export default function NotificationsSettingsView({ initial }: { initial: SettingsBundle }) {
  const { picker, openPicker, closePicker } = useVisualPicker()
  const pushSupported = isWebPushSupported()
  const onNativeIos = isNativeIOS()
  const [pushLoading, setPushLoading] = useState(false)
  const [permission, setPermission] = useState<LocalNotificationPermission>(
    onNativeIos ? 'prompt' : 'unsupported'
  )
  const [testScheduling, setTestScheduling] = useState(false)
  const savedSettingsRef = useRef<NotificationSettings | null>(null)
  const [timeEdit, setTimeEdit] = useState<{ key: keyof NotificationSettings; value: string } | null>(null)

  const [n, setN] = useState<NotificationSettings>({
    ...initial.preferences.notifications!,
    quiet_hours_enabled: initial.preferences.notifications?.quiet_hours_enabled ?? true,
    quiet_hours_start: initial.preferences.notifications?.quiet_hours_start ?? '22:30',
    quiet_hours_end: initial.preferences.notifications?.quiet_hours_end ?? '08:00',
  })

  useEffect(() => {
    if (!onNativeIos) return
    void getLocalNotificationPermission().then(setPermission).catch(() => setPermission('denied'))
  }, [onNativeIos])

  function patch<K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) {
    setN(prev => ({ ...prev, [key]: value }))
  }

  async function toggleLocalReminder(
    key: (typeof LOCAL_REMINDER_KEYS)[number],
    enabled: boolean
  ) {
    if (!onNativeIos) {
      patch(key, enabled)
      return
    }
    if (!enabled) {
      const next = { ...n, [key]: false }
      setN(next)
      if (permission === 'granted') await reconcileLocalReminders(next)
      return
    }
    const status = await ensureLocalNotificationPermission()
    setPermission(status)
    const next = { ...n, [key]: status === 'granted' }
    setN(next)
    if (status === 'granted') await reconcileLocalReminders(next)
    if (status === 'denied') toast.error('iOS 通知權限已關閉，請到系統設定允許 Betterbit 通知。')
  }

  function reminderChecked(value: boolean): boolean {
    return onNativeIos ? permission === 'granted' && value : value
  }

  const { isDirty, markSaved } = useSettingsDirtyTracker(n)

  async function handleEnablePush() {
    setPushLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      initializeFirebase()
      const token = await requestNotificationPermission(user.id)
      if (token) {
        listenForPushMessages()
        patch('push_enabled', true)
      }
    } finally {
      setPushLoading(false)
    }
  }

  const { saving, save: handleSave } = useSettingsSave({
    onSave: async () => {
      let settingsToSave = n
      if (onNativeIos) {
        const status = await reconcileLocalReminders(n, {
          requestPermission: hasEnabledLocalReminder(n),
        })
        setPermission(status)
        if (status === 'denied') {
          settingsToSave = disableLocalReminders(n)
          setN(settingsToSave)
          await reconcileLocalReminders(settingsToSave)
        }
      }
      settingsToSave = {
        ...settingsToSave,
        in_app_enabled: false,
        email_enabled: false,
        over_target_comfort_enabled: false,
      }
      setN(settingsToSave)
      const res = await apiFetch('/api/settings/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications: settingsToSave }),
      })
      const data = await res.json()
      if (!res.ok && res.status !== 503) throw new Error(data.error || '儲存失敗')
      savedSettingsRef.current = settingsToSave
      invalidateUserPreferencesCache()
    },
    onSuccess: () => markSaved(savedSettingsRef.current ?? n),
    successMessage: '通知設定已更新',
  })

  async function handleTestNotification() {
    setTestScheduling(true)
    try {
      const status = await scheduleLocalReminderTest(90)
      setPermission(status)
      if (status === 'granted') {
        toast.success('測試通知已排程，約 90 秒後出現。')
      } else if (status === 'denied') {
        toast.error('iOS 通知權限已關閉，無法建立測試通知。')
      }
    } finally {
      setTestScheduling(false)
    }
  }

  const weightLabel =
    n.weight_log_per_week === 0
      ? '關閉'
      : n.weight_log_per_week >= 7
        ? '每天'
        : n.weight_log_per_week === 1
          ? '每週一次'
          : '每週兩次'

  const weeklyDayLabel = WEEKDAYS.find(d => Number(d.value) === n.weekly_review_day)?.label ?? '週日'

  return (
    <>
      <V2SettingsVisualShell
        title="通知設定"
        subtitle="選擇你想收到的提醒，讓 Betterbit 在剛好的時間幫你一把。"
        saveLabel="儲存通知設定"
        onSave={handleSave}
        saving={saving}
        saveDisabled={!isDirty}
        isDirty={isDirty}
      >
        <V2SettingsVisualCard icon={<UtensilsCrossed className="h-4 w-4" />} title="餐點提醒" staggerIndex={0}>
          <V2VisualToggleRow
            icon={<Sun className="h-4 w-4" />}
            label="早餐提醒"
            checked={reminderChecked(n.breakfast_enabled)}
            onChange={v => void toggleLocalReminder('breakfast_enabled', v)}
            center={formatTimeDisplay(n.breakfast_time)}
            onCenterClick={() => setTimeEdit({ key: 'breakfast_time', value: n.breakfast_time })}
          />
          <V2VisualToggleRow
            icon={<Sun className="h-4 w-4" />}
            label="午餐提醒"
            checked={reminderChecked(n.lunch_enabled)}
            onChange={v => void toggleLocalReminder('lunch_enabled', v)}
            center={formatTimeDisplay(n.lunch_time)}
            onCenterClick={() => setTimeEdit({ key: 'lunch_time', value: n.lunch_time })}
          />
          <V2VisualToggleRow
            icon={<Moon className="h-4 w-4" />}
            label="晚餐提醒"
            checked={reminderChecked(n.dinner_enabled)}
            onChange={v => void toggleLocalReminder('dinner_enabled', v)}
            center={formatTimeDisplay(n.dinner_time)}
            onCenterClick={() => setTimeEdit({ key: 'dinner_time', value: n.dinner_time })}
          />
          <V2VisualToggleRow
            icon={<Cookie className="h-4 w-4" />}
            label="點心提醒"
            checked={reminderChecked(n.snack_enabled)}
            onChange={v => void toggleLocalReminder('snack_enabled', v)}
            center={formatTimeDisplay(n.snack_time)}
            onCenterClick={() => setTimeEdit({ key: 'snack_time', value: n.snack_time })}
          />
        </V2SettingsVisualCard>

        <V2SettingsVisualCard icon={<Scale className="h-4 w-4" />} title="健康提醒" staggerIndex={1}>
          <V2VisualToggleRow
            icon={<Droplets className="h-4 w-4" />}
            label="喝水提醒"
            checked={reminderChecked(n.water_enabled)}
            onChange={v => void toggleLocalReminder('water_enabled', v)}
            center={n.water_interval_hours ? `每 ${n.water_interval_hours} 小時` : '關閉'}
            onCenterClick={() =>
              openPicker({
                key: 'water',
                title: '喝水提醒間隔',
                options: WATER_INTERVALS,
                value: String(n.water_interval_hours),
                onSelect: v => {
                  patch('water_interval_hours', Number(v))
                  void toggleLocalReminder('water_enabled', Number(v) > 0)
                },
              })
            }
          />
          <V2VisualToggleRow
            icon={<Scale className="h-4 w-4" />}
            label="體重紀錄提醒"
            checked={reminderChecked(n.weight_log_enabled)}
            onChange={v => void toggleLocalReminder('weight_log_enabled', v)}
            center={weightLabel}
            onCenterClick={() =>
              openPicker({
                key: 'weight',
                title: '體重紀錄提醒',
                options: WEIGHT_FREQ,
                value: String(n.weight_log_per_week),
                onSelect: v => {
                  patch('weight_log_per_week', Number(v))
                  void toggleLocalReminder('weight_log_enabled', Number(v) > 0)
                },
              })
            }
          />
          <V2VisualToggleRow
            icon={<Calendar className="h-4 w-4" />}
            label="每週回顧提醒"
            checked={reminderChecked(n.weekly_review_enabled)}
            onChange={v => void toggleLocalReminder('weekly_review_enabled', v)}
            center={`${weeklyDayLabel} ${n.weekly_review_time}`}
            onCenterClick={() =>
              openPicker({
                key: 'weeklyday',
                title: '每週回顧日',
                options: WEEKDAYS,
                value: String(n.weekly_review_day),
                onSelect: v => patch('weekly_review_day', Number(v)),
              })
            }
          />
          <V2VisualToggleRow
            icon={<Smile className="h-4 w-4" />}
            label="超標安慰提醒"
            helper="即將推出"
            checked={false}
            disabled
            onChange={() => {}}
          />
        </V2SettingsVisualCard>

        <V2SettingsVisualCard icon={<Bell className="h-4 w-4" />} title="通知方式" staggerIndex={2}>
          <V2VisualToggleRow
            icon={<Smartphone className="h-4 w-4" />}
            label="App 內提醒"
            helper="即將推出；每日提醒目前使用 iPhone 本地通知。"
            checked={false}
            disabled
            onChange={() => {}}
          />
          <V2VisualToggleRow
            icon={<Bell className="h-4 w-4" />}
            label="推播通知"
            helper={onNativeIos ? '伺服器 Push 即將開放；每日提醒使用裝置本地通知。' : 'Web Push（需要瀏覽器與 Firebase 權限）'}
            checked={n.push_enabled}
            disabled={onNativeIos || !pushSupported || pushLoading}
            onChange={v => {
              if (onNativeIos || !pushSupported) return
              patch('push_enabled', v)
              if (v) void handleEnablePush()
            }}
          />
          <V2VisualToggleRow
            icon={<Mail className="h-4 w-4" />}
            label="Email 通知"
            helper="Email 通知即將開放，目前尚未連接 email service。"
            checked={n.email_enabled}
            disabled
            onChange={v => patch('email_enabled', v)}
          />
          <div className="px-1 pt-2 space-y-2">
            <p className="text-[12px] leading-relaxed" style={{ color: permission === 'denied' ? '#A53D2E' : '#537060' }}>
              {onNativeIos
                ? permission === 'granted'
                  ? 'iOS 系統權限：已允許。儲存後會取消舊排程並建立唯一的新排程。'
                  : permission === 'denied'
                    ? 'iOS 系統權限：已拒絕。提醒不會顯示。'
                    : 'iOS 系統權限：尚未詢問。開啟任一提醒時會要求權限。'
                : 'Windows Preview 可儲存提醒偏好；實際本地排程會在 iPhone App 開啟時同步。'}
            </p>
            {onNativeIos && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="v2-sv2-btn-secondary !min-h-[40px] !px-3 !py-2"
                  disabled={testScheduling}
                  onClick={() => void handleTestNotification()}
                >
                  {testScheduling ? '排程中…' : '90 秒測試通知'}
                </button>
                {permission === 'denied' && (
                  <button
                    type="button"
                    className="v2-sv2-btn-secondary !min-h-[40px] !px-3 !py-2"
                    onClick={openIosNotificationSettings}
                  >
                    前往 iOS 設定
                  </button>
                )}
              </div>
            )}
          </div>
        </V2SettingsVisualCard>

        <V2SettingsVisualCard icon={<MoonStar className="h-4 w-4" />} title="安靜時段" staggerIndex={3}>
          <V2VisualToggleRow
            icon={<MoonStar className="h-4 w-4" />}
            label="勿擾時間"
            checked={n.quiet_hours_enabled ?? false}
            onChange={v => patch('quiet_hours_enabled', v)}
            center={`${n.quiet_hours_start ?? '22:30'} - ${n.quiet_hours_end ?? '08:00'}`}
            onCenterClick={() => setTimeEdit({ key: 'quiet_hours_start', value: n.quiet_hours_start ?? '22:30' })}
          />
        </V2SettingsVisualCard>
      </V2SettingsVisualShell>

      {picker && (
        <V2VisualPickerSheet
          open
          title={picker.title}
          options={picker.options}
          value={picker.value}
          onSelect={picker.onSelect}
          onClose={closePicker}
        />
      )}

      {timeEdit && (
        <V2OverlayPortal open onClose={() => setTimeEdit(null)}>
          <div className="v2-sv2-picker-sheet" onClick={e => e.stopPropagation()}>
            <p className="text-[16px] font-bold mb-3" style={{ color: '#123d24' }}>
              選擇時間
            </p>
            <input
              type="time"
              value={timeEdit.value}
              onChange={e => {
                patch(timeEdit.key, e.target.value as NotificationSettings[typeof timeEdit.key])
                setTimeEdit(null)
              }}
              className="v2-sv2-input"
            />
          </div>
        </V2OverlayPortal>
      )}
    </>
  )
}
