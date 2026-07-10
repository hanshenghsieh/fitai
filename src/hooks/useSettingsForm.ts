'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  SETTINGS_SAVE_ERROR,
  SETTINGS_SAVE_SUCCESS,
} from '@/lib/settings/settings-form-messages'

function stableStringify(value: unknown): string {
  return JSON.stringify(value)
}

/** Tracks dirty state against an initial snapshot — re-renders when parent state changes. */
export function useSettingsDirtyTracker(snapshot: unknown) {
  const baselineRef = useRef(stableStringify(snapshot))
  const [savedVersion, setSavedVersion] = useState(0)

  const current = stableStringify(snapshot)
  const isDirty = current !== baselineRef.current

  const markSaved = useCallback(
    (override?: unknown) => {
      baselineRef.current = stableStringify(override ?? snapshot)
      setSavedVersion(v => v + 1)
    },
    [snapshot]
  )

  void savedVersion

  return { isDirty, markSaved }
}

export function useSettingsSave(options: {
  onSave: () => Promise<void>
  validate?: () => string | null
  onSuccess?: () => void
  successMessage?: string
}) {
  const [saving, setSaving] = useState(false)

  const save = useCallback(async () => {
    const validationError = options.validate?.()
    if (validationError) {
      toast.error(validationError)
      return
    }
    setSaving(true)
    try {
      await options.onSave()
      options.onSuccess?.()
      toast.success(options.successMessage ?? SETTINGS_SAVE_SUCCESS)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : SETTINGS_SAVE_ERROR)
    } finally {
      setSaving(false)
    }
  }, [options])

  return { saving, save }
}

export function useSettingsForm<T>(options: {
  initialValues: T
  onSave: (values: T) => Promise<void>
  validate?: (values: T) => string | null
  serialize?: (values: T) => string
}) {
  const serialize = options.serialize ?? stableStringify
  const baselineRef = useRef(serialize(options.initialValues))
  const [values, setValues] = useState<T>(options.initialValues)
  const [saving, setSaving] = useState(false)

  const isDirty = useMemo(() => serialize(values) !== baselineRef.current, [values, serialize])

  const save = useCallback(async () => {
    const validationError = options.validate?.(values)
    if (validationError) {
      toast.error(validationError)
      return
    }
    setSaving(true)
    try {
      await options.onSave(values)
      baselineRef.current = serialize(values)
      toast.success(SETTINGS_SAVE_SUCCESS)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : SETTINGS_SAVE_ERROR)
    } finally {
      setSaving(false)
    }
  }, [options, values, serialize])

  return { values, setValues, isDirty, saving, save }
}
