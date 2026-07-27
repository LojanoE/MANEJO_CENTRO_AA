import { create } from 'zustand'
import type { UserProfile } from '../types/user'

interface AuthState {
  user: UserProfile | null
  loading: boolean
  error: string | null
  setUser: (user: UserProfile | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,
  setUser: (user) => set({ user, loading: false }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  clear: () => set({ user: null, error: null, loading: false }),
}))