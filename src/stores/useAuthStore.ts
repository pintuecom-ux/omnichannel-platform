import { create } from 'zustand'
import type { Profile } from '@/types'

interface AuthState {
  profile: Profile | null
  workspaceId: string | null
  setProfile: (profile: Profile | null) => void
  setWorkspaceId: (id: string | null) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  workspaceId: null,
  setProfile: (profile) => set({ profile, workspaceId: profile?.workspace_id ?? null }),
  setWorkspaceId: (workspaceId) => set({ workspaceId }),
  clear: () => set({ profile: null, workspaceId: null }),
}))