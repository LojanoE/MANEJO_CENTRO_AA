import {
  collection,
  collectionGroup,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch,
  type DocumentData,
  type WithFieldValue,
  type PartialWithFieldValue,
} from 'firebase/firestore'
import { db } from './config'
import type { ActivityEntry } from '../types/activity'
import type { MspFormType, RecordEntry } from '../types/medicalRecord'
import { useAuthStore } from '../stores/authStore'

/** Generic save helper */
export async function saveDoc<T extends DocumentData>(
  name: string,
  data: T,
): Promise<string> {
  const ref = await addDoc(collection(db, name), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

/**
 * Save with a caller-chosen document id (overwrites if it already exists).
 *
 * Unlike `saveDoc`, which lets Firestore mint the id, this makes a write
 * idempotent when the id is derived from the data itself — e.g. a checklist mark
 * keyed by week+item+day, where a double click must not create two records.
 */
export async function saveDocWithId<T extends DocumentData>(
  name: string,
  id: string,
  data: T,
): Promise<string> {
  await setDoc(doc(db, name, id), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return id
}

// Firestore caps a batch at 500 operations; stay under that with margin to spare.
const BATCH_LIMIT = 450

/**
 * Save many documents to a collection atomically, in chunks of up to 450.
 * Each chunk either fully commits or fully fails — no more half-imported datasets
 * from a bulk import loop dying partway through.
 */
export async function saveDocsBatch<T extends DocumentData>(name: string, items: T[]): Promise<string[]> {
  const ids: string[] = []
  for (let i = 0; i < items.length; i += BATCH_LIMIT) {
    const chunk = items.slice(i, i + BATCH_LIMIT)
    const batch = writeBatch(db)
    const refs = chunk.map((item) => {
      const ref = doc(collection(db, name))
      batch.set(ref, { ...item, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      return ref
    })
    await batch.commit()
    ids.push(...refs.map((r) => r.id))
  }
  return ids
}

/** Save into a subcollection. */
export async function saveSubDoc<T extends DocumentData>(
  parent: string,
  parentId: string,
  child: string,
  data: T,
): Promise<string> {
  const ref = await addDoc(collection(doc(db, parent, parentId), child), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

/** Update a doc inside a subcollection. */
export async function updateSubDoc<T extends PartialWithFieldValue<DocumentData>>(
  parent: string,
  parentId: string,
  child: string,
  childId: string,
  data: T,
): Promise<void> {
  await updateDoc(doc(db, parent, parentId, child, childId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Entradas MSP (002/005) de todas las historias clínicas, en una lectura puntual.
 *
 * Collection group SIN `where` a propósito: filtrar un collection group por
 * `formType` exige un índice de campo único con scope COLLECTION_GROUP que
 * Firestore no crea solo, y sin él la consulta falla ("The query requires a
 * COLLECTION_GROUP_ASC index..."). El filtro se aplica en cliente.
 * `recordId` se toma de la ruta del documento si la entrada no lo tiene guardado.
 */
export async function fetchMspEntries(formType?: MspFormType): Promise<RecordEntry[]> {
  const snap = await getDocs(collectionGroup(db, 'entries'))
  return snap.docs
    .filter((d) => d.ref.parent.parent?.parent.id === 'medicalRecords')
    .map((d) => {
      const data = d.data() as RecordEntry
      return { ...data, id: d.id, recordId: data.recordId || d.ref.parent.parent!.id }
    })
    .filter((e) => (formType ? e.formType === formType : e.formType === '002' || e.formType === '005'))
}

/** Remove a doc inside a subcollection. */
export async function removeSubDoc(
  parent: string,
  parentId: string,
  child: string,
  childId: string,
): Promise<void> {
  await deleteDoc(doc(db, parent, parentId, child, childId))
}

export async function updateDocHelper<T extends PartialWithFieldValue<DocumentData>>(
  name: string,
  id: string,
  data: T,
): Promise<void> {
  await updateDoc(doc(db, name, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function removeDoc(name: string, id: string): Promise<void> {
  await deleteDoc(doc(db, name, id))
}

/** Append to activityLog */
export async function logActivity(
  entry: Omit<ActivityEntry, 'id' | 'timestamp' | 'userId' | 'userName'>,
): Promise<void> {
  const user = useAuthStore.getState().user
  await addDoc(collection(db, 'activityLog'), {
    ...entry,
    userId: user?.uid ?? null,
    userName: user?.name ?? null,
    timestamp: serverTimestamp(),
  } as WithFieldValue<ActivityEntry>)
}