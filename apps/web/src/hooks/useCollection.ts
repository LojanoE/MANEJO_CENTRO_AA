import { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  doc,
  type QueryConstraint,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '../firebase/config'

interface UseCollectionResult<T> {
  data: T
  loading: boolean
  error: string | null
}

/**
 * Live subscription to a Firestore collection with optional constraints.
 * Returns parsed documents with their id injected.
 */
export function useCollection<T extends DocumentData>(
  name: string,
  ...constraints: QueryConstraint[]
): UseCollectionResult<(T & { id: string })[]> {
  const [data, setData] = useState<(T & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const q = constraints.length > 0 ? query(collection(db, name), ...constraints) : collection(db, name)
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }))
        setData(docs)
        setLoading(false)
        setError(null)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )
    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, JSON.stringify(constraints.map(serializeConstraint))])

  return { data, loading, error }
}

/** Live subscription to a subcollection, e.g. `medicalRecords/{id}/entries`. */
export function useSubcollection<T extends DocumentData>(
  parent: string,
  parentId: string,
  child: string,
  ...constraints: QueryConstraint[]
): UseCollectionResult<(T & { id: string })[]> {
  const key = `${parent}/${parentId}/${child}`
  const [data, setData] = useState<(T & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const colRef = collection(doc(db, parent, parentId), child)
    const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }))
        setData(docs)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )
    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, JSON.stringify(constraints.map(serializeConstraint))])

  return { data, loading, error }
}

/**
 * Serializes a QueryConstraint to a stable string for deps comparison.
 * Imperfect but sufficient for our use-cases.
 */
function serializeConstraint(c: QueryConstraint): string {
  if (c.type === 'orderBy') {
    // @ts-expect-error internal access
    return `orderBy:${c._field?.fieldPath}:${c._direction ?? 'asc'}`
  }
  if (c.type === 'where') {
    // @ts-expect-error internal access
    return `where:${c._field?.fieldPath}:${c._op}:${JSON.stringify(c._value)}`
  }
  if (c.type === 'limit') {
    // @ts-expect-error internal access
    return `limit:${c._limit}`
  }
  return c.type
}

export function byField(field: string, value: unknown) {
  return where(field, '==', value)
}

export function newest(field = 'createdAt') {
  return orderBy(field, 'desc')
}