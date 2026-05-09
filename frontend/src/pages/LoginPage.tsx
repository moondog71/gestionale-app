import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Card, TextField, Button, Typography, Alert, Avatar, CircularProgress } from '@mui/material'
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined'
import { apiLogin } from '../api/client'
import { useAuthStore } from '../store/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const checkAuth = useAuthStore(s => s.checkAuth)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await apiLogin(username, password)
      checkAuth()
      navigate('/')
    } catch {
      setError('Credenziali non valide')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{
      minHeight: '100vh', bgcolor: '#F6F8FF',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Card sx={{ p: 4, width: 360, borderRadius: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, mb: 2 }}>
            <BuildOutlinedIcon sx={{ fontSize: 28 }} />
          </Avatar>
          <Typography variant="h6" fontWeight={500}>Elettrodomestici Service</Typography>
          <Typography variant="body2" color="text.secondary">Gestionale interno</Typography>
        </Box>
        <form onSubmit={handleLogin}>
          <TextField fullWidth label="Username" value={username}
            onChange={e => setUsername(e.target.value)} sx={{ mb: 2 }} required />
          <TextField fullWidth label="Password" type="password" value={password}
            onChange={e => setPassword(e.target.value)} sx={{ mb: 2 }} required />
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
          <Button type="submit" variant="contained" fullWidth size="large"
            disabled={loading} sx={{ borderRadius: 3 }}>
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Accedi'}
          </Button>
        </form>
      </Card>
    </Box>
  )
}
