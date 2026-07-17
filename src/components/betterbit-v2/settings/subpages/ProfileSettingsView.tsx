'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Calendar,
  Ruler,
  MapPin,
  Globe,
  Briefcase,
  Activity,
  Dumbbell,
  Moon,
  Lock,
  HeartPulse,
  ShieldCheck,
} from 'lucide-react'
import type { SettingsBundle } from '@/lib/app/settings-data'
import { parseOptionalNumber, validateHeightCm } from '@/lib/settings/settings-validation'
import { useSettingsDirtyTracker, useSettingsSave } from '@/hooks/useSettingsForm'
import V2SettingsVisualShell from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualShell'
import V2SettingsVisualCard from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualCard'
import V2OverlayPortal from '@/components/betterbit-v2/settings/visual-v2/V2OverlayPortal'
import {
  V2VisualField,
  V2VisualInput,
  V2VisualSegment,
  V2VisualChevronRow,
  V2VisualPickerSheet,
  useVisualPicker,
} from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualPrimitives'
import SettingsDeleteAccountSection from '@/components/settings/SettingsDeleteAccountSection'
import { apiFetch } from '@/lib/api/client'

const GENDER_OPTIONS = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'other', label: '其他' },
]

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: '幾乎不動' },
  { value: 'light', label: '輕度活動' },
  { value: 'moderate', label: '中度活動' },
  { value: 'active', label: '高度活動' },
  { value: 'very_active', label: '非常活躍' },
]

const JOB_OPTIONS = [
  { value: 'desk', label: '久坐辦公' },
  { value: 'standing', label: '站立較多' },
  { value: 'walking', label: '走動較多' },
  { value: 'labor', label: '勞力工作' },
]

const SLEEP_OPTIONS = [
  { value: 'lt5', label: '少於 5 小時' },
  { value: '5-6', label: '5–6 小時' },
  { value: '6-7', label: '6–7 小時' },
  { value: '7+', label: '7 小時以上' },
]

const EXERCISE_FREQ = [
  { value: '0', label: '0 次' },
  { value: '1-2', label: '1–2 次' },
  { value: '3-4', label: '3–4 次' },
  { value: '5+', label: '5 次以上' },
]

const LOCATION_OPTIONS = [
  { value: 'TW', label: '台灣' },
  { value: 'other', label: '其他' },
]

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Taipei', label: 'Asia/Taipei' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo' },
  { value: 'UTC', label: 'UTC' },
]

function formatBirthDisplay(raw: string): string {
  if (!raw) return 'YYYY/MM/DD'
  const parts = raw.split('-')
  if (parts.length === 3) return `${parts[0]}/${parts[1]}/${parts[2]}`
  return raw
}

function initialBirthDraft(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  return `${new Date().getFullYear() - 30}-01-01`
}

function updateBirthDraft(raw: string, part: 'year' | 'month' | 'day', value: number): string {
  const [rawYear, rawMonth, rawDay] = initialBirthDraft(raw).split('-').map(Number)
  const year = part === 'year' ? value : rawYear
  const month = part === 'month' ? value : rawMonth
  const maxDay = new Date(year, month, 0).getDate()
  const day = Math.min(part === 'day' ? value : rawDay, maxDay)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function labelOf(options: { value: string; label: string }[], value: string) {
  return options.find(o => o.value === value)?.label ?? value
}

export default function ProfileSettingsView({ initial }: { initial: SettingsBundle }) {
  const router = useRouter()
  const { picker, openPicker, closePicker } = useVisualPicker()

  const prefs = initial.preferences as typeof initial.preferences & { birth_date?: string }
  const [displayName, setDisplayName] = useState(initial.profile.display_name ?? '')
  const [gender, setGender] = useState(initial.profile.gender ?? 'male')
  const [birthDate, setBirthDate] = useState(prefs.birth_date ?? '')
  const [birthPickerOpen, setBirthPickerOpen] = useState(false)
  const [birthDraft, setBirthDraft] = useState(() => initialBirthDraft(prefs.birth_date ?? ''))
  const [height, setHeight] = useState(String(initial.profile.height_cm ?? ''))
  const [location, setLocation] = useState(initial.preferences.location ?? 'TW')
  const [timezone, setTimezone] = useState(initial.preferences.timezone ?? 'Asia/Taipei')
  const [jobLevel, setJobLevel] = useState(initial.preferences.job_activity_level ?? 'desk')
  const [dailyActivity, setDailyActivity] = useState(
    initial.preferences.daily_activity_level ?? initial.profile.activity_level ?? 'moderate'
  )
  const [exerciseFreq, setExerciseFreq] = useState(initial.preferences.weekly_exercise_frequency ?? '3-4')
  const [sleepLevel, setSleepLevel] = useState(initial.preferences.sleep_level ?? '6-7')

  const formSnapshot = {
    displayName,
    gender,
    birthDate,
    height,
    location,
    timezone,
    jobLevel,
    dailyActivity,
    exerciseFreq,
    sleepLevel,
  }

  const { isDirty, markSaved } = useSettingsDirtyTracker(formSnapshot)

  const { saving, save } = useSettingsSave({
    validate: () => {
      const heightErr = validateHeightCm(parseOptionalNumber(height))
      if (heightErr) return heightErr
      return null
    },
    onSave: async () => {
      let age: number | null = null
      if (birthDate) {
        const born = new Date(birthDate)
        const now = new Date()
        age = now.getFullYear() - born.getFullYear()
        const m = now.getMonth() - born.getMonth()
        if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age -= 1
      } else if (initial.profile.age) {
        age = initial.profile.age
      }

      const res = await apiFetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim() || null,
          gender: gender || null,
          age,
          height_cm: height ? Number(height) : null,
          activity_level: dailyActivity,
          preferences: {
            location,
            timezone,
            job_activity_level: jobLevel,
            daily_activity_level: dailyActivity,
            weekly_exercise_frequency: exerciseFreq,
            sleep_level: sleepLevel,
            birth_date: birthDate || null,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '儲存失敗')
    },
    onSuccess: markSaved,
  })

  return (
    <>
      <V2SettingsVisualShell
        title="個人資料"
        subtitle="這些資料會用來計算你的基礎代謝、每日熱量與減脂建議。"
        saveLabel="儲存個人資料"
        onSave={save}
        saving={saving}
        saveDisabled={!isDirty}
        isDirty={isDirty}
      >
        <V2SettingsVisualCard icon={<User className="h-4 w-4" />} title="基本資料" staggerIndex={0}>
          <V2VisualField label="暱稱" helper="用來顯示在 App 內">
            <V2VisualInput value={displayName} onChange={setDisplayName} placeholder="例如：Hanson" />
          </V2VisualField>
          <V2VisualField label="Email" helper="Email 為登入帳號，目前暫不支援直接更換。">
            <V2VisualInput value={initial.email ?? ''} readOnly disabled />
          </V2VisualField>
          <V2VisualField label="性別">
            <V2VisualSegment options={GENDER_OPTIONS} value={gender} onChange={setGender} />
          </V2VisualField>
          <V2VisualChevronRow
            icon={<Calendar className="h-4 w-4" />}
            label="生日"
            value={formatBirthDisplay(birthDate)}
            onClick={() => {
              setBirthDraft(initialBirthDraft(birthDate))
              setBirthPickerOpen(true)
            }}
          />
          <V2VisualChevronRow
            icon={<Ruler className="h-4 w-4" />}
            label="身高 (cm)"
            value={height || '—'}
            onClick={() => document.getElementById('height-inline')?.focus()}
          />
          <input
            id="height-inline"
            type="number"
            value={height}
            onChange={e => setHeight(e.target.value)}
            className="sr-only"
            min={100}
            max={230}
          />
          <V2VisualChevronRow
            icon={<MapPin className="h-4 w-4" />}
            label="所在地區"
            value={labelOf(LOCATION_OPTIONS, location)}
            onClick={() =>
              openPicker({
                key: 'location',
                title: '所在地區',
                options: LOCATION_OPTIONS,
                value: location,
                onSelect: setLocation,
              })
            }
          />
          <V2VisualChevronRow
            icon={<Globe className="h-4 w-4" />}
            label="時區"
            value={timezone}
            onClick={() =>
              openPicker({
                key: 'timezone',
                title: '時區',
                options: TIMEZONE_OPTIONS,
                value: timezone,
                onSelect: setTimezone,
              })
            }
          />
        </V2SettingsVisualCard>

        <V2SettingsVisualCard icon={<HeartPulse className="h-4 w-4" />} title="生活型態" staggerIndex={1}>
          <V2VisualChevronRow
            icon={<Briefcase className="h-4 w-4" />}
            label="工作型態"
            value={labelOf(JOB_OPTIONS, jobLevel)}
            onClick={() =>
              openPicker({
                key: 'job',
                title: '工作型態',
                options: JOB_OPTIONS,
                value: jobLevel,
                onSelect: setJobLevel,
              })
            }
          />
          <V2VisualChevronRow
            icon={<Activity className="h-4 w-4" />}
            label="平日活動量"
            value={labelOf(ACTIVITY_OPTIONS, dailyActivity)}
            onClick={() =>
              openPicker({
                key: 'activity',
                title: '平日活動量',
                options: ACTIVITY_OPTIONS,
                value: dailyActivity,
                onSelect: setDailyActivity,
              })
            }
          />
          <V2VisualChevronRow
            icon={<Dumbbell className="h-4 w-4" />}
            label="每週運動次數"
            value={labelOf(EXERCISE_FREQ, exerciseFreq)}
            onClick={() =>
              openPicker({
                key: 'exercise',
                title: '每週運動次數',
                options: EXERCISE_FREQ,
                value: exerciseFreq,
                onSelect: setExerciseFreq,
              })
            }
          />
          <V2VisualChevronRow
            icon={<Moon className="h-4 w-4" />}
            label="平均睡眠"
            value={labelOf(SLEEP_OPTIONS, sleepLevel)}
            onClick={() =>
              openPicker({
                key: 'sleep',
                title: '平均睡眠',
                options: SLEEP_OPTIONS,
                value: sleepLevel,
                onSelect: setSleepLevel,
              })
            }
          />
        </V2SettingsVisualCard>

        <V2SettingsVisualCard icon={<ShieldCheck className="h-4 w-4" />} title="帳號與安全" staggerIndex={2}>
          <V2VisualChevronRow
            icon={<Lock className="h-4 w-4" />}
            label="變更密碼"
            subtitle="更新你的登入密碼"
            onClick={() => router.push('/settings/password')}
          />
          <div className="py-2">
            <SettingsDeleteAccountSection compact />
          </div>
        </V2SettingsVisualCard>
      </V2SettingsVisualShell>

      {birthPickerOpen && (
        <V2OverlayPortal open onClose={() => setBirthPickerOpen(false)}>
          <div
            className="v2-sv2-picker-sheet"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="birth-picker-title"
          >
            <p id="birth-picker-title" className="text-[16px] font-bold mb-4" style={{ color: '#123d24' }}>
              選擇生日
            </p>
            <div className="grid grid-cols-3 gap-2" aria-label="生日年月日">
              <label className="space-y-1">
                <span className="text-[12px]" style={{ color: '#7a807a' }}>年</span>
                <select
                  aria-label="出生年份"
                  value={Number(birthDraft.slice(0, 4))}
                  onChange={e => setBirthDraft(current => updateBirthDraft(current, 'year', Number(e.target.value)))}
                  className="v2-sv2-input"
                >
                  {Array.from({ length: 101 }, (_, index) => new Date().getFullYear() - index).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[12px]" style={{ color: '#7a807a' }}>月</span>
                <select
                  aria-label="出生月份"
                  value={Number(birthDraft.slice(5, 7))}
                  onChange={e => setBirthDraft(current => updateBirthDraft(current, 'month', Number(e.target.value)))}
                  className="v2-sv2-input"
                >
                  {Array.from({ length: 12 }, (_, index) => index + 1).map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[12px]" style={{ color: '#7a807a' }}>日</span>
                <select
                  aria-label="出生日期"
                  value={Number(birthDraft.slice(8, 10))}
                  onChange={e => setBirthDraft(current => updateBirthDraft(current, 'day', Number(e.target.value)))}
                  className="v2-sv2-input"
                >
                  {Array.from(
                    { length: new Date(Number(birthDraft.slice(0, 4)), Number(birthDraft.slice(5, 7)), 0).getDate() },
                    (_, index) => index + 1
                  ).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                className="flex-1 py-3 rounded-xl text-[15px] font-semibold"
                style={{ backgroundColor: '#f2f4f1', color: '#123d24' }}
                onClick={() => setBirthPickerOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="flex-1 py-3 rounded-xl text-[15px] font-semibold"
                style={{ backgroundColor: '#2f8f35', color: '#fff' }}
                onClick={() => {
                  setBirthDate(birthDraft)
                  setBirthPickerOpen(false)
                }}
              >
                ✓ 完成
              </button>
            </div>
          </div>
        </V2OverlayPortal>
      )}
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
    </>
  )
}
