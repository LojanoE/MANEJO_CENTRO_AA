import { useCallback, useEffect, useState } from 'react'
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Settings } from '../types/professional'

const SETTINGS_DOC = 'main'

export function useSettings() {
  const get = useCallback(async () => {
    const snap = await getDoc(doc(db, 'settings', SETTINGS_DOC))
    return snap.exists() ? snap.data() : null
  }, [])

  const save = useCallback(async (data: Record<string, unknown>) => {
    await setDoc(
      doc(db, 'settings', SETTINGS_DOC),
      { ...data, updatedAt: serverTimestamp() },
      { merge: true },
    )
  }, [])

  return { get, save }
}

export const DEFAULT_SETTINGS: Settings = {
  centerName: 'Centro de Rehabilitación',
  monthlyFee: 150,
  taskCategories: [],
}

/** Live-subscribed settings with sensible defaults, for screens that just need to
 * read the configured center name / monthly fee (print headers, forms). */
export function useSettingsLive() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', SETTINGS_DOC),
      (snap) => {
        if (snap.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...(snap.data() as Partial<Settings>) })
        }
        setLoading(false)
      },
      () => setLoading(false),
    )
    return unsub
  }, [])

  return { settings, loading }
}