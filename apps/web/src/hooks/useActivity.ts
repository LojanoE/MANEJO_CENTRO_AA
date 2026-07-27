import { useCollection, newest } from './useCollection'
import type { ActivityEntry } from '../types/activity'

/** Live feed of activity entries, newest first. Consumer slices as needed. */
export function useActivity(limitCount = 20) {
  const { data, loading, error } = useCollection<ActivityEntry>('activityLog', newest('timestamp'))
  return { data: data.slice(0, limitCount), loading, error }
}