import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'
import theme from './theme'
import { useAuthStore } from './store/auth'
import LoginPage from './pages/LoginPage'
import ClientiPage from './pages/ClientiPage'
import PreventiviPage from './pages/PreventiviPage'
import InterventiPage from './pages/InterventiPage'
import DdtPage from './pages/DdtPage'
import FatturePage from './pages/FatturePage'
import ScontriniPage from './pages/ScontriniPage'
import ImpostazioniPage from './pages/ImpostazioniPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/clienti" replace />} />
          <Route path="/clienti" element={<PrivateRoute><ClientiPage /></PrivateRoute>} />
          <Route path="/preventivi" element={<PrivateRoute><PreventiviPage /></PrivateRoute>} />
          <Route path="/interventi" element={<PrivateRoute><InterventiPage /></PrivateRoute>} />
          <Route path="/ddt" element={<PrivateRoute><DdtPage /></PrivateRoute>} />
          <Route path="/fatture" element={<PrivateRoute><FatturePage /></PrivateRoute>} />
          <Route path="/scontrini" element={<PrivateRoute><ScontriniPage /></PrivateRoute>} />
          <Route path="/impostazioni" element={<PrivateRoute><ImpostazioniPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/clienti" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
