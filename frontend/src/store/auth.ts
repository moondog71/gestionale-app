import { create } from 'zustand'
import { getToken, clearTokens } from '../api/client'

interface AuthState {
  isAuthenticated: boolean
  checkAuth: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: !!getToken(),
  checkAuth: () => set({ isAuthenticated: !!getToken() }),
  logout: () => { clearTokens(); set({ isAuthenticated: false }) },
}))
