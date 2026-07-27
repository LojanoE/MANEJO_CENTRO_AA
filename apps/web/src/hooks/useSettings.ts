import { useCallback } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'

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