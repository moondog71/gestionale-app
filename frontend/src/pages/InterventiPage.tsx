import { useState, useEffect, useCallback } from 'react'
import {
  Box, Typography, Button, TextField, Chip, Stack, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, MenuItem, Select, FormControl, InputLabel,
  Alert, CircularProgress, Tooltip, InputAdornment, Divider,
  Autocomplete, Table, TableBody, TableCell, TableHead, TableRow, Paper
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import SearchIcon from '@mui/icons-material/Search'
import BuildIcon from '@mui/icons-material/BuildOutlined'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import Layout from '../components/ui/Layout'
import { apiFetch } from '../api/client'

const APPLIANCE_TYPES = ['Lavatrice','Lavasciuga','Lavastoviglie','Asciugatrice','Forno','Cappa','Frigorifero','Altro']
const WORK_TYPES = ['riparazione','manutenzione','installazione']
const OUTCOMES = [
  { value: 'risolto', label: 'Risolto', color: '#2e7d32', bg: '#e8f5e9' },
  { value: 'parziale', label: 'Parziale', color: '#e65100', bg: '#fff3e0' },
  { value: 'da_riprogrammare', label: 'Da riprogrammare', color: '#1565c0', bg: '#e3f2fd' },
  { value: 'non_riparabile', label: 'Non riparabile', color: '#c62828', bg: '#ffebee' },
]

interface Part { description: string; qty: number; unitPrice: number }

const CALL_FEE_PART: Part = { description: 'Diritto di chiamata', qty: 1, unitPrice: 0 }

const EMPTY_FORM = {
  clientId: '', date: new Date().toISOString().slice(0,10),
  addressOverride: '', applianceType: 'Lavatrice', brand: '', model: '', serial: '',
  workType: 'riparazione', description: '', parts: [{ ...CALL_FEE_PART }] as Part[],
  laborHours: '', laborRate: '', outcome: 'risolto', notes: ''
}

function outcomeInfo(val: string) {
  return OUTCOMES.find(o => o.value === val) || OUTCOMES[0]
}

function calcTotal(parts: Part[], hours: string, rate: string) {
  const partsTotal = parts.reduce((s, p) => s + p.qty * p.unitPrice, 0)
  const laborTotal = parseFloat(hours||'0') * parseFloat(rate||'0')
  return partsTotal + laborTotal
}

function formatEur(n: number) {
  return n.toLocaleString('it-IT', { style:'currency', currency:'EUR' })
}

export default function InterventiPage() {
  const [items, setItems] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterOutcome, setFilterOutcome] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState<any>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pdfLoading, setPdfLoading] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterOutcome) params.set('outcome', filterOutcome)
      const data = await apiFetch<any[]>(`/interventi?${params}`)
      setItems(data)
    } catch { setError('Errore caricamento') }
    finally { setLoading(false) }
  }, [search, filterOutcome])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    apiFetch<any[]>('/clients').then(setClients).catch(() => {})
  }, [])

  const openCreate = () => {
    setSelected(null)
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0,10) })
    setModalOpen(true)
  }

  const openEdit = (item: any) => {
    setSelected(item)
    setForm({
      clientId: item.clientId || '',
      date: item.date?.slice(0,10) || '',
      addressOverride: item.addressOverride || '',
      applianceType: item.applianceType || 'Lavatrice',
      brand: item.brand || '', model: item.model || '', serial: item.serial || '',
      workType: item.workType || 'riparazione',
      description: item.description || '',
      parts: Array.isArray(item.parts) ? item.parts : [],
      laborHours: item.laborHours || '', laborRate: item.laborRate || '',
      outcome: item.outcome || 'risolto', notes: item.notes || ''
    })
    setModalOpen(true)
  }

  const addPart = () => setForm((f: any) => ({
    ...f, parts: [...f.parts, { description: '', qty: 1, unitPrice: 0 }]
  }))

  const removePart = (i: number) => setForm((f: any) => ({
    ...f, parts: f.parts.filter((_: any, idx: number) => idx !== i)
  }))

  const updatePart = (i: number, field: string, value: any) => setForm((f: any) => ({
    ...f, parts: f.parts.map((p: Part, idx: number) =>
      idx === i ? { ...p, [field]: field === 'description' ? value : parseFloat(value)||0 } : p
    )
  }))

  const total = calcTotal(form.parts, form.laborHours, form.laborRate)

  const handleSave = async () => {
    if (!form.clientId) { setError('Seleziona un cliente'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        ...form,
        date: new Date(form.date).toISOString(),
        laborHours: form.laborHours ? parseFloat(form.laborHours) : null,
        laborRate: form.laborRate ? parseFloat(form.laborRate) : null,
        totalAmount: total,
        stampDuty: total > 77.47,
      }
      if (selected) {
        await apiFetch(`/interventi/${selected.id}`, { method:'PUT', body:JSON.stringify(payload) })
      } else {
        await apiFetch('/interventi', { method:'POST', body:JSON.stringify(payload) })
      }
      setModalOpen(false); load()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      await apiFetch(`/interventi/${selected.id}`, { method:'DELETE' })
      setDeleteOpen(false); load()
    } catch { setError('Errore eliminazione') }
  }

  const handlePdf = async (item: any) => {
    setPdfLoading(item.id)
    try {
      const res = await apiFetch<{driveUrl:string}>(`/interventi/${item.id}/pdf`, { method:'POST', body:'{}' })
      window.open(res.driveUrl, '_blank')
      load()
    } catch (e: any) { setError('Errore generazione PDF: ' + e.message) }
    finally { setPdfLoading(null) }
  }

  const selectedClient = clients.find(c => c.id === form.clientId) || null

  return (
    <Layout>
      {/* Top bar */}
      <Box sx={{ px:3, py:1.5, display:'flex', alignItems:'center', gap:2,
        borderBottom:'0.5px solid', borderColor:'divider', bgcolor:'background.paper' }}>
        <Typography variant="h6" sx={{ flex:1 }}>
          Rapporti di Intervento
          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml:1 }}>
            ({items.length})
          </Typography>
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
          sx={{ bgcolor:'secondary.main', '&:hover':{ bgcolor:'secondary.dark' } }}>
          Nuovo intervento
        </Button>
      </Box>

      <Box sx={{ flex:1, overflow:'auto', p:2.5 }}>
        {/* Filtri */}
        <Box sx={{ display:'flex', gap:2, mb:2 }}>
          <TextField placeholder="Cerca per numero, cliente, marca, modello..." size="small"
            value={search} onChange={e => setSearch(e.target.value)} sx={{ flex:1 }}
            InputProps={{ startAdornment:<InputAdornment position="start"><SearchIcon fontSize="small"/></InputAdornment> }} />
          <FormControl size="small" sx={{ minWidth:180 }}>
            <InputLabel>Esito</InputLabel>
            <Select value={filterOutcome} label="Esito" onChange={e => setFilterOutcome(e.target.value)}>
              <MenuItem value="">Tutti</MenuItem>
              {OUTCOMES.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        {/* Lista */}
        {loading ? (
          <Box sx={{ display:'flex', justifyContent:'center', pt:6 }}><CircularProgress /></Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign:'center', pt:8, color:'text.secondary' }}>
            <BuildIcon sx={{ fontSize:56, mb:1, opacity:0.3 }} />
            <Typography>Nessun intervento trovato</Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {items.map(item => {
              const oc = outcomeInfo(item.outcome)
              const tot = typeof item.totalAmount === 'number' ? item.totalAmount : parseFloat(item.totalAmount||'0')
              return (
                <Box key={item.id} sx={{
                  display:'flex', alignItems:'center', gap:1.5,
                  bgcolor:'background.paper', borderRadius:3, px:2, py:1.5,
                  border:'0.5px solid', borderColor:'divider',
                  '&:hover':{ borderColor:'primary.main' }
                }}>
                  <Avatar sx={{ bgcolor:'#D8E2FF', color:'#001258', width:40, height:40, fontSize:11, fontWeight:700, flexShrink:0 }}>
                    {item.number?.split('-')[2] || '?'}
                  </Avatar>
                  <Box sx={{ flex:1, minWidth:0 }}>
                    <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                      <Typography fontWeight={600} variant="body2">{item.number}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.date ? new Date(item.date).toLocaleDateString('it-IT') : ''}
                      </Typography>
                    </Box>
                    <Typography variant="body2" noWrap fontWeight={500}>{item.client?.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.applianceType}{item.brand ? ` · ${item.brand}` : ''}{item.model ? ` ${item.model}` : ''}
                      {' · '}{item.workType}
                    </Typography>
                  </Box>
                  <Chip size="small" label={oc.label}
                    sx={{ bgcolor:oc.bg, color:oc.color, fontWeight:600, fontSize:11, border:`1px solid ${oc.color}33` }} />
                  <Typography variant="body2" fontWeight={600} sx={{ minWidth:70, textAlign:'right', color:'primary.main' }}>
                    {formatEur(tot)}
                  </Typography>
                  {item.driveUrl ? (
                    <Tooltip title="Apri PDF">
                      <IconButton size="small" onClick={() => window.open(item.driveUrl,'_blank')} sx={{ color:'success.main' }}>
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                  <Tooltip title="Genera PDF">
                    <span>
                      <IconButton size="small"
                        onClick={() => handlePdf(item)}
                        disabled={pdfLoading === item.id}
                        sx={{ color: pdfLoading === item.id ? 'text.disabled' : '#c62828' }}>
                        {pdfLoading === item.id
                          ? <CircularProgress size={16} />
                          : <PictureAsPdfOutlinedIcon fontSize="small" />}
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Modifica">
                    <IconButton size="small" onClick={() => openEdit(item)} sx={{ color:'primary.main' }}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Elimina">
                    <IconButton size="small" onClick={() => { setSelected(item); setDeleteOpen(true) }} sx={{ color:'error.main' }}>
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
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selected ? `Modifica ${selected.number}` : 'Nuovo rapporto di intervento'}
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb:2 }}>{error}</Alert>}

          {/* Cliente + Data */}
          <Box sx={{ display:'grid', gridTemplateColumns:'1fr auto', gap:2, mt:1, mb:2 }}>
            <Autocomplete
              options={clients} getOptionLabel={c => c.name || ''}
              value={selectedClient}
              onChange={(_, val) => setForm((f: any) => ({ ...f, clientId: val?.id || '' }))}
              renderInput={params => <TextField {...params} label="Cliente *" size="small" />}
              isOptionEqualToValue={(o, v) => o.id === v?.id}
            />
            <TextField label="Data" type="date" size="small" value={form.date}
              onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))}
              InputLabelProps={{ shrink: true }} sx={{ width:160 }} />
          </Box>

          <TextField label="Indirizzo intervento (se diverso da anagrafica)" fullWidth size="small"
            sx={{ mb:2 }} value={form.addressOverride}
            onChange={e => setForm((f: any) => ({ ...f, addressOverride: e.target.value }))} />

          <Divider sx={{ my:1.5 }}><Typography variant="caption" color="text.secondary">APPARECCHIO</Typography></Divider>

          <Box sx={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:2, mb:2 }}>
            <FormControl size="small">
              <InputLabel>Tipo</InputLabel>
              <Select value={form.applianceType} label="Tipo"
                onChange={e => setForm((f: any) => ({ ...f, applianceType: e.target.value }))}>
                {APPLIANCE_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Marca" size="small" value={form.brand}
              onChange={e => setForm((f: any) => ({ ...f, brand: e.target.value }))} />
            <TextField label="Modello" size="small" value={form.model}
              onChange={e => setForm((f: any) => ({ ...f, model: e.target.value }))} />
          </Box>
          <Box sx={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:2, mb:2 }}>
            <TextField label="Matricola / N. serie" size="small" value={form.serial}
              onChange={e => setForm((f: any) => ({ ...f, serial: e.target.value }))} />
            <FormControl size="small">
              <InputLabel>Tipo lavoro</InputLabel>
              <Select value={form.workType} label="Tipo lavoro"
                onChange={e => setForm((f: any) => ({ ...f, workType: e.target.value }))}>
                {WORK_TYPES.map(t => <MenuItem key={t} value={t} sx={{ textTransform:'capitalize' }}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          <TextField label="Descrizione lavoro svolto" fullWidth multiline rows={3} size="small"
            sx={{ mb:2 }} value={form.description}
            onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} />

          <Divider sx={{ my:1.5 }}><Typography variant="caption" color="text.secondary">RICAMBI UTILIZZATI</Typography></Divider>

          {form.parts.length > 0 && (
            <Paper variant="outlined" sx={{ mb:1.5, borderRadius:2, overflow:'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor:'#F6F8FF' }}>
                    <TableCell>Descrizione</TableCell>
                    <TableCell align="center" sx={{ width:70 }}>Qtà</TableCell>
                    <TableCell align="right" sx={{ width:110 }}>Prezzo €</TableCell>
                    <TableCell align="right" sx={{ width:100 }}>Totale</TableCell>
                    <TableCell sx={{ width:40 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {form.parts.map((p: Part, i: number) => (
                    <TableRow key={i}>
                      <TableCell>
                        <TextField variant="standard" value={p.description} size="small" fullWidth
                          onChange={e => updatePart(i, 'description', e.target.value)}
                          placeholder="Descrizione ricambio" />
                      </TableCell>
                      <TableCell align="center">
                        <TextField variant="standard" value={p.qty} type="number" size="small"
                          inputProps={{ min:1, style:{textAlign:'center'} }} sx={{ width:50 }}
                          onChange={e => updatePart(i, 'qty', e.target.value)} />
                      </TableCell>
                      <TableCell align="right">
                        <TextField variant="standard" value={p.unitPrice} type="number" size="small"
                          inputProps={{ min:0, step:0.01, style:{textAlign:'right'} }} sx={{ width:90 }}
                          onChange={e => updatePart(i, 'unitPrice', e.target.value)} />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={500}>
                          {formatEur(p.qty * p.unitPrice)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" color="error" onClick={() => removePart(i)}>
                          <RemoveCircleOutlineIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
          <Button startIcon={<AddCircleOutlineIcon />} size="small" onClick={addPart} sx={{ mb:2 }}>
            Aggiungi ricambio
          </Button>

          <Divider sx={{ my:1.5 }}><Typography variant="caption" color="text.secondary">MANODOPERA</Typography></Divider>

          <Box sx={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:2, mb:2 }}>
            <TextField label="Ore lavoro" size="small" type="number" value={form.laborHours}
              inputProps={{ min:0, step:0.5 }}
              onChange={e => setForm((f: any) => ({ ...f, laborHours: e.target.value }))} />
            <TextField label="Tariffa oraria €" size="small" type="number" value={form.laborRate}
              inputProps={{ min:0, step:0.5 }}
              onChange={e => setForm((f: any) => ({ ...f, laborRate: e.target.value }))} />
            <Box sx={{ display:'flex', alignItems:'center', justifyContent:'flex-end' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mr:1 }}>Manodopera:</Typography>
              <Typography fontWeight={600}>
                {formatEur(parseFloat(form.laborHours||'0') * parseFloat(form.laborRate||'0'))}
              </Typography>
            </Box>
          </Box>

          {/* Totale + Esito */}
          <Box sx={{ display:'flex', alignItems:'center', gap:2, mb:2,
            bgcolor:'#F6F8FF', borderRadius:2, px:2, py:1.5 }}>
            <FormControl size="small" sx={{ minWidth:200 }}>
              <InputLabel>Esito</InputLabel>
              <Select value={form.outcome} label="Esito"
                onChange={e => setForm((f: any) => ({ ...f, outcome: e.target.value }))}>
                {OUTCOMES.map(o => (
                  <MenuItem key={o.value} value={o.value}>
                    <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                      <Box sx={{ width:10, height:10, borderRadius:'50%', bgcolor:o.color }} />
                      {o.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ flex:1 }} />
            <Box sx={{ textAlign:'right' }}>
              <Typography variant="caption" color="text.secondary">TOTALE INTERVENTO</Typography>
              <Typography variant="h6" fontWeight={700} color="primary.main">{formatEur(total)}</Typography>
              {total > 77.47 && (
                <Typography variant="caption" color="text.secondary">+ €2,00 bollo virtuale</Typography>
              )}
            </Box>
          </Box>

          <TextField label="Note" fullWidth multiline rows={2} size="small" value={form.notes}
            onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} />
        </DialogContent>
        <DialogActions sx={{ px:3, pb:2 }}>
          <Button onClick={() => setModalOpen(false)}>Annulla</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Salva'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal elimina */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Elimina intervento</DialogTitle>
        <DialogContent>
          <Typography>Eliminare <strong>{selected?.number}</strong>?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Annulla</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Elimina</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
