import { useState, useEffect, useCallback } from 'react'
import {
  Box, Typography, Button, TextField, Chip, Stack, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, MenuItem, Select, FormControl, InputLabel,
  Alert, CircularProgress, Tooltip, InputAdornment, Divider
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import SearchIcon from '@mui/icons-material/Search'
import BusinessIcon from '@mui/icons-material/BusinessOutlined'
import PersonIcon from '@mui/icons-material/PersonOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import Layout from '../components/ui/Layout'
import { apiFetch } from '../api/client'
import { Client } from '../types'

const EMPTY: Partial<Client> = {
  type: 'privato', name: '', fiscalCode: '', vatNumber: '',
  sdi: '0000000', pec: '', address: '', city: '', zip: '',
  province: '', phone: '', email: '', notes: ''
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
}

function docCount(c: any) {
  const cnt = c._count
  if (!cnt) return 0
  return (cnt.preventivi || 0) + (cnt.interventi || 0) + (cnt.fatture || 0)
}

export default function ClientiPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('tutti')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState<Partial<Client>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [capLoading, setCapLoading] = useState(false)
  const [capFound, setCapFound] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (typeFilter !== 'tutti') params.set('type', typeFilter)
      const data = await apiFetch<any[]>(`/clients?${params}`)
      setClients(data)
    } catch { setError('Errore caricamento') }
    finally { setLoading(false) }
  }, [search, typeFilter])

  useEffect(() => { load() }, [load])

  // Autocomplete CAP via dataset ISTAT (backend)
  const lookupCap = useCallback(async (cap: string) => {
    if (cap.length !== 5 || !/^[0-9]{5}$/.test(cap)) { setCapFound(false); return }
    setCapLoading(true)
    setCapFound(false)
    try {
      const results = await apiFetch<{city:string,province:string}[]>(`/geo/cap/${cap}`)
      if (results && results.length > 0) {
        setForm(prev => ({ ...prev, city: results[0].city, province: results[0].province }))
        setCapFound(true)
      }
    } catch { setCapFound(false) }
    finally { setCapLoading(false) }
  }, [])

  const openCreate = () => {
    setSelected(null); setForm(EMPTY); setCapFound(false); setModalOpen(true)
  }
  const openEdit = (c: any) => {
    setSelected(c); setForm(c); setCapFound(false); setModalOpen(true)
  }
  const openDelete = (c: any) => { setSelected(c); setDeleteOpen(true) }

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      if (selected) {
        await apiFetch(`/clients/${selected.id}`, { method: 'PUT', body: JSON.stringify(form) })
      } else {
        await apiFetch('/clients', { method: 'POST', body: JSON.stringify(form) })
      }
      setModalOpen(false); load()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      await apiFetch(`/clients/${selected.id}`, { method: 'DELETE' })
      setDeleteOpen(false); load()
    } catch { setError('Errore eliminazione') }
  }

  const f = (k: keyof Client) => ({
    value: (form[k] as string) || '',
    onChange: (e: any) => setForm(p => ({ ...p, [k]: e.target.value }))
  })

  const privati = clients.filter(c => c.type === 'privato').length
  const aziende = clients.filter(c => c.type === 'azienda').length

  return (
    <Layout>
      <Box sx={{ px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 2,
        borderBottom: '0.5px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          Clienti
          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            ({clients.length})
          </Typography>
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
          sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}>
          Nuovo cliente
        </Button>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>
        <TextField placeholder="Cerca per nome, CF, P.IVA, città..." fullWidth size="small"
          value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ mb: 2 }} />

        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          {[
            { k: 'tutti', label: `Tutti (${clients.length})` },
            { k: 'privato', label: `Privati (${privati})` },
            { k: 'azienda', label: `Aziende (${aziende})` },
          ].map(({ k, label }) => (
            <Chip key={k} label={label} onClick={() => setTypeFilter(k)}
              variant={typeFilter === k ? 'filled' : 'outlined'}
              color={typeFilter === k ? 'primary' : 'default'}
              sx={{ fontWeight: typeFilter === k ? 600 : 400 }} />
          ))}
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
            <CircularProgress color="primary" />
          </Box>
        ) : clients.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 8, color: 'text.secondary' }}>
            <PersonIcon sx={{ fontSize: 56, mb: 1, opacity: 0.3 }} />
            <Typography>Nessun cliente trovato</Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {clients.map(c => {
              const docs = docCount(c)
              return (
                <Box key={c.id} sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  bgcolor: 'background.paper', borderRadius: 3, px: 2, py: 1.5,
                  border: '0.5px solid', borderColor: 'divider',
                  '&:hover': { borderColor: 'primary.main', boxShadow: '0 0 0 1px #2B4BA020' }
                }}>
                  <Avatar sx={{
                    bgcolor: c.type === 'azienda' ? '#F9D8FF' : '#D8E2FF',
                    color: c.type === 'azienda' ? '#30004B' : '#001258',
                    width: 40, height: 40, fontSize: 13, fontWeight: 600, flexShrink: 0
                  }}>
                    {c.type === 'azienda' ? <BusinessIcon fontSize="small" /> : initials(c.name)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={500} noWrap>{c.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {c.fiscalCode || c.vatNumber || '—'}
                      {c.city ? ` · ${c.city}${c.province ? ` (${c.province})` : ''}` : ''}
                    </Typography>
                  </Box>
                  <Chip size="small" label={c.type === 'azienda' ? 'Azienda' : 'Privato'}
                    sx={{
                      bgcolor: c.type === 'azienda' ? '#F9D8FF' : '#D8E2FF',
                      color: c.type === 'azienda' ? '#30004B' : '#001258',
                      fontWeight: 500, fontSize: 11
                    }} />
                  {docs > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40, textAlign: 'right' }}>
                      {docs} doc
                    </Typography>
                  )}
                  <Tooltip title="Modifica">
                    <IconButton size="small" onClick={() => openEdit(c)} sx={{ color: 'primary.main' }}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Elimina">
                    <IconButton size="small" onClick={() => openDelete(c)} sx={{ color: 'error.main' }}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )
            })}
          </Stack>
        )}
      </Box>

      {/* Modal crea/modifica */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selected ? 'Modifica cliente' : 'Nuovo cliente'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <FormControl fullWidth size="small" sx={{ mt: 1, mb: 2 }}>
            <InputLabel>Tipo</InputLabel>
            <Select value={form.type || 'privato'} label="Tipo"
              onChange={e => setForm(p => ({ ...p, type: e.target.value as any }))}>
              <MenuItem value="privato">Privato</MenuItem>
              <MenuItem value="azienda">Azienda</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Nome / Ragione sociale" fullWidth required sx={{ mb: 2 }} {...f('name')} />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
            <TextField label="Codice Fiscale" fullWidth {...f('fiscalCode')} />
            <TextField label="Partita IVA" fullWidth {...f('vatNumber')} />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
            <TextField label="Codice SDI" fullWidth {...f('sdi')} />
            <TextField label="PEC" fullWidth {...f('pec')} />
          </Box>
          <Divider sx={{ my: 1.5 }} />
          <TextField label="Indirizzo" fullWidth sx={{ mb: 2 }} {...f('address')} />

          {/* CAP con autocomplete */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 2, mb: 2 }}>
            <TextField
              label="CAP"
              value={form.zip || ''}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 5)
                setForm(p => ({ ...p, zip: val }))
                if (val.length === 5) lookupCap(val)
                else { setCapFound(false) }
              }}
              InputProps={{
                endAdornment: capLoading
                  ? <CircularProgress size={16} sx={{ mr: 1 }} />
                  : capFound
                  ? <CheckCircleOutlineIcon fontSize="small" color="success" sx={{ mr: 1 }} />
                  : null
              }}
              inputProps={{ maxLength: 5 }}
            />
            <TextField label="Città" {...f('city')} />
            <TextField label="Prov." {...f('province')}
              inputProps={{ maxLength: 2, style: { textTransform: 'uppercase' } }}
              onChange={e => setForm(p => ({ ...p, province: e.target.value.toUpperCase() }))}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
            <TextField label="Telefono" {...f('phone')} />
            <TextField label="Email" {...f('email')} />
          </Box>
          <TextField label="Note" fullWidth multiline rows={2} {...f('notes')} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setModalOpen(false)}>Annulla</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.name}>
            {saving ? <CircularProgress size={20} /> : 'Salva'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal elimina */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Elimina cliente</DialogTitle>
        <DialogContent>
          <Typography>Eliminare <strong>{selected?.name}</strong>?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            L'operazione è irreversibile.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Annulla</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Elimina</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
