import { create } from 'zustand'

interface User {
  id: string
  email: string
  name: string | null
  avatar: string | null
}

interface AppState {
  user: User | null
  isLoading: boolean
  currentGoalId: string | null
  currentTopicId: string | null
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setCurrentGoal: (goalId: string | null) => void
  setCurrentTopic: (topicId: string | null) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: 'light' | 'dark') => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isLoading: true,
  currentGoalId: null,
  currentTopicId: null,
  sidebarOpen: true,
  theme: 'dark',
  
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setCurrentGoal: (currentGoalId) => set({ currentGoalId }),
  setCurrentTopic: (currentTopicId) => set({ currentTopicId }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setTheme: (theme) => set({ theme }),
}))
