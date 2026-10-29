import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Workspace, WorkspaceMember } from '../types/database'

interface AppState {
  user: User | null
  session: Session | null
  currentWorkspace: Workspace | null
  workspaces: Workspace[]
  members: WorkspaceMember[]
  loading: boolean
  initialized: boolean
  setUser: (user: User | null, session: Session | null) => void
  setCurrentWorkspace: (workspace: Workspace | null) => void
  fetchWorkspaces: () => Promise<void>
  createWorkspace: (data: Partial<Workspace>) => Promise<Workspace | null>
  updateWorkspace: (id: string, data: Partial<Workspace>) => Promise<Workspace | null>
  deleteWorkspace: (id: string) => Promise<boolean>
  initializeAuth: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  session: null,
  currentWorkspace: null,
  workspaces: [],
  members: [],
  loading: true,
  initialized: false,

  setUser: (user, session) => set({ user, session }),

  setCurrentWorkspace: (workspace) => {
    set({ currentWorkspace: workspace })
    if (workspace) {
      localStorage.setItem('active_workspace_id', workspace.id)
    } else {
      localStorage.removeItem('active_workspace_id')
    }
  },

  initializeAuth: async () => {
    if (!isSupabaseConfigured) {
      set({ loading: false, initialized: true })
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      set({ session, user: session?.user ?? null })

      if (session?.user) {
        await get().fetchWorkspaces()
      }
    } catch (err) {
      console.error('Failed to get session:', err)
    } finally {
      set({ loading: false, initialized: true })
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session, user: session?.user ?? null })
      if (session?.user) {
        await get().fetchWorkspaces()
      } else {
        set({ workspaces: [], currentWorkspace: null, members: [] })
      }
    })
  },

  fetchWorkspaces: async () => {
    if (!isSupabaseConfigured) return
    const user = get().user
    if (!user) return

    try {
      set({ loading: true })
      // Fetch workspaces where user has access
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching workspaces:', error)
        return
      }

      const workspaces = (data as Workspace[]) || []
      set({ workspaces })

      const savedWorkspaceId = localStorage.getItem('active_workspace_id')
      let active = workspaces.find((w) => w.id === savedWorkspaceId)

      if (!active && workspaces.length > 0) {
        active = workspaces[0]
      }

      set({ currentWorkspace: active || null })
    } catch (err) {
      console.error('Unexpected error fetching workspaces:', err)
    } finally {
      set({ loading: false })
    }
  },

  createWorkspace: async (workspaceData) => {
    const user = get().user
    if (!user || !isSupabaseConfigured) return null

    try {
      set({ loading: true })
      const { data, error } = await supabase
        .from('workspaces')
        .insert({
          bride_name: workspaceData.bride_name || 'Calon Mempelai Wanita',
          groom_name: workspaceData.groom_name || 'Calon Mempelai Pria',
          engagement_date: workspaceData.engagement_date || null,
          wedding_date: workspaceData.wedding_date || null,
          total_budget_target: workspaceData.total_budget_target || 0,
          savings_target: workspaceData.savings_target || 0,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating workspace:', error)
        throw error
      }

      const newWorkspace = data as Workspace
      const currentList = get().workspaces
      set({
        workspaces: [newWorkspace, ...currentList],
        currentWorkspace: newWorkspace,
      })
      localStorage.setItem('active_workspace_id', newWorkspace.id)
      return newWorkspace
    } catch (err) {
      console.error('Error:', err)
      return null
    } finally {
      set({ loading: false })
    }
  },

  updateWorkspace: async (id, workspaceData) => {
    if (!isSupabaseConfigured) return null
    try {
      set({ loading: true })
      const { data, error } = await supabase
        .from('workspaces')
        .update({
          bride_name: workspaceData.bride_name,
          groom_name: workspaceData.groom_name,
          engagement_date: workspaceData.engagement_date || null,
          wedding_date: workspaceData.wedding_date || null,
          total_budget_target: workspaceData.total_budget_target || 0,
          savings_target: workspaceData.savings_target || 0,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const updated = data as Workspace
      const updatedList = get().workspaces.map((w) => (w.id === id ? updated : w))
      const current = get().currentWorkspace

      set({
        workspaces: updatedList,
        currentWorkspace: current?.id === id ? updated : current,
      })

      return updated
    } catch (err) {
      console.error('Error updating workspace:', err)
      return null
    } finally {
      set({ loading: false })
    }
  },

  deleteWorkspace: async (id) => {
    if (!isSupabaseConfigured) return false
    try {
      set({ loading: true })
      const { error } = await supabase.from('workspaces').delete().eq('id', id)
      if (error) throw error

      const remaining = get().workspaces.filter((w) => w.id !== id)
      const nextActive = remaining.length > 0 ? remaining[0] : null

      set({
        workspaces: remaining,
        currentWorkspace: nextActive,
      })

      if (nextActive) {
        localStorage.setItem('active_workspace_id', nextActive.id)
      } else {
        localStorage.removeItem('active_workspace_id')
      }

      return true
    } catch (err) {
      console.error('Error deleting workspace:', err)
      return false
    } finally {
      set({ loading: false })
    }
  },

  signOut: async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut()
    }
    set({ user: null, session: null, currentWorkspace: null, workspaces: [] })
    localStorage.removeItem('active_workspace_id')
  },
}))
