import { limit } from 'firebase/firestore'
import { useCollection, newest } from './useCollection'
import type { ActivityEntry } from '../types/activity'

/** Live feed of activity entries, newest first — bounded server-side so the
 * dashboard doesn't download the whole (unboundedly growing) audit log on every visit. */
export function useActivity(limitCount = 20) {
  const { data, loading, error } = useCollection<ActivityEntry>(
    'activityLog',
    newest('timestamp'),
    limit(limitCount),
  )
  return { data, loading, error }
}