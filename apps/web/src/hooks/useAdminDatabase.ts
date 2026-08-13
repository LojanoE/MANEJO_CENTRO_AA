import { useCallback, useEffect, useState } from 'react'
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase/config'

export const ADMIN_COLLECTIONS = [
  'users',
  'patients',
  'professionals',
  'payments',
  'expenses',
  'visits',
  'medicalAuths',
  'medicalRecords',
  'tasks',
  'settings',
  'activityLog',
] as const

export type AdminCollection = (typeof ADMIN_COLLECTIONS)[number]

const PAGE_SIZE = 25

export interface AdminDoc {
  id: string
  data: DocumentData
}

export function useAdminDatabase(collectionName: AdminCollection) {
  const [docs, setDocs] = useState<AdminDoc[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [count, setCount] = useState<number | null>(null)

  const load = useCallback(
    async (after?: QueryDocumentSnapshot<DocumentData>) => {
      setLoading(true)
      setError(null)
      try {
        const base = collection(db, collectionName)
        const q = after
          ? query(base, orderBy('__name__', 'asc'), startAfter(after), limit(PAGE_SIZE))
          : query(base, orderBy('__name__', 'asc'), limit(PAGE_SIZE))
        const snap = await getDocs(q)
        const items = snap.docs.map((d) => ({ id: d.id, data: d.data() }))
        setDocs(items)
        setLastDoc(snap.docs[snap.docs.length - 1] ?? null)
        setHasMore(snap.docs.length === PAGE_SIZE)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar documentos')
      } finally {
        setLoading(false)
      }
    },
    [collectionName],
  )

  const next = useCallback(() => {
    if (lastDoc && hasMore) {
      return load(lastDoc)
    }
  }, [lastDoc, hasMore, load])

  const prev = useCallback(() => {
    // Navegación hacia atrás requiere mantener un historial de páginas.
    // Para simplificar, recargamos la primera página.
    return load()
  }, [load])

  const refresh = useCallback(() => load(), [load])

  const update = useCallback(
    async (id: string, data: DocumentData) => {
      await updateDoc(doc(db, collectionName, id), data)
    },
    [collectionName],
  )

  const remove = useCallback(
    async (id: string) => {
      await deleteDoc(doc(db, collectionName, id))
    },
    [collectionName],
  )

  useEffect(() => {
    setDocs([])
    setLastDoc(null)
    setHasMore(true)
    setCount(null)
    load()

    getCountFromServer(collection(db, collectionName))
      .then((snap) => setCount(snap.data().count))
      .catch(() => setCount(null))
  }, [collectionName, load])

  return {
    docs,
    loading,
    error,
    hasMore,
    count,
    load,
    next,
    prev,
    refresh,
    update,
    remove,
  }
}

export function matchesSearch(doc: AdminDoc, term: string): boolean {
  if (!term) return true
  const lower = term.toLowerCase()
  const values = [doc.id, ...Object.values(doc.data)]
  return values.some((v) => {
    if (v === null || v === undefined) return false
    return String(v).toLowerCase().includes(lower)
  })
}
