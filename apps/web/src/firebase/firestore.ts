import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  type DocumentData,
  type WithFieldValue,
  type PartialWithFieldValue,
} from 'firebase/firestore'
import { db } from './config'
import type { ActivityEntry } from '../types/activity'
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