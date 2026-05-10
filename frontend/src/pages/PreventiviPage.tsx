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
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import Layout from '../components/ui/Layout'
import { apiFetch } from '../api/client'

const STATUSES = [
  { value:'bozza',     label:'Bozza',     color:'#757575', bg:'#F5F5F5' },
  { value:'inviato',   label:'Inviato',   color:'#1565c0', bg:'#E3F2FD' },
  { value:'accettato', label:'Accettato', color:'#2e7d32', bg:'#E8F5E9' },
  { value:'rifiutato', label:'Rifiutato', color:'#c62828', bg:'#FFEBEE' },
]
const UNITS = ['pz','ore','m','m²','kg','set','servizio']

interface Item { description:string; qty:number; unit:string; unitPrice:number; discount:number }

const EMPTY_FORM = {
  clientId:'', date: new Date().toISOString().slice(0,10),
  expiryDate:'', status:'bozza',
  items:[{ description:'', qty:1, unit:'pz', unitPrice:0, discount:0 }] as Item[],
  notes:''
}

function statusInfo(v:string){ return STATUSES.find(s=>s.value===v)||STATUSES[0] }
function calcTotal(items:Item[]){ return items.reduce((s,i)=>s+i.qty*i.unitPrice*(1-i.discount/100),0) }
function formatEur(n:number){ return n.toLocaleString('it-IT',{style:'currency',currency:'EUR'}) }

export default function PreventiviPage() {
  const [items, setItems] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState<any>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pdfLoading, setPdfLoading] = useState<string|null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (search) p.set('search', search)
      if (filterStatus) p.set('status', filterStatus)
      setItems(await apiFetch<any[]>(`/preventivi?${p}`))
    } catch { setError('Errore caricamento') }
    finally { setLoading(false) }
  }, [search, filterStatus])

  useEffect(()=>{ load() },[load])
  useEffect(()=>{ apiFetch<any[]>('/clients').then(setClients).catch(()=>{}) },[])

  const openCreate = () => {
    setSelected(null)
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0,10) })
    setModalOpen(true)
  }
  const openEdit = (item:any) => {
    setSelected(item)
    setForm({
      clientId: item.clientId||'', date: item.date?.slice(0,10)||'',
      expiryDate: item.expiryDate?.slice(0,10)||'', status: item.status||'bozza',
      items: Array.isArray(item.items) && item.items.length > 0
        ? item.items
        : [{ description:'', qty:1, unit:'pz', unitPrice:0, discount:0 }],
      notes: item.notes||''
    })
    setModalOpen(true)
  }

  const addItem = () => setForm((f:any) => ({
    ...f, items:[...f.items,{description:'',qty:1,unit:'pz',unitPrice:0,discount:0}]
  }))
  const removeItem = (i:number) => setForm((f:any) => ({
    ...f, items: f.items.filter((_:any,idx:number)=>idx!==i)
  }))
  const updateItem = (i:number, field:string, value:any) => setForm((f:any) => ({
    ...f, items: f.items.map((p:Item,idx:number) =>
      idx===i ? {...p,[field]: field==='description'||field==='unit' ? value : parseFloat(value)||0} : p
    )
  }))

  const total = calcTotal(form.items)

  const handleSave = async () => {
    if (!form.clientId){ setError('Seleziona un cliente'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        ...form,
        date: new Date(form.date).toISOString(),
        expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
        totalAmount: total,
        stampDuty: total > 77.47,
      }
      if (selected) await apiFetch(`/preventivi/${selected.id}`,{method:'PUT',body:JSON.stringify(payload)})
      else await apiFetch('/preventivi',{method:'POST',body:JSON.stringify(payload)})
      setModalOpen(false); load()
    } catch(e:any){ setError(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try{ await apiFetch(`/preventivi/${selected.id}`,{method:'DELETE'}); setDeleteOpen(false); load() }
    catch{ setError('Errore eliminazione') }
  }

  const handlePdf = async (item:any) => {
    setPdfLoading(item.id)
    try{
      const res = await apiFetch<{driveUrl:string}>(`/preventivi/${item.id}/pdf`,{method:'POST',body:'{}'})
      window.open(res.driveUrl,'_blank'); load()
    } catch(e:any){ setError('Errore PDF: '+e.message) }
    finally{ setPdfLoading(null) }
  }

  const selectedClient = clients.find(c=>c.id===form.clientId)||null

  return (
    <Layout>
      <Box sx={{ px:3,py:1.5,display:'flex',alignItems:'center',gap:2,
        borderBottom:'0.5px solid',borderColor:'divider',bgcolor:'background.paper' }}>
        <Typography variant="h6" sx={{ flex:1 }}>
          Preventivi
          <Typography component="span" variant="body2" color="text.secondary" sx={{ml:1}}>({items.length})</Typography>
        </Typography>
        <Button variant="contained" startIcon={<AddIcon/>} onClick={openCreate}
          sx={{ bgcolor:'secondary.main','&:hover':{bgcolor:'secondary.dark'} }}>
          Nuovo preventivo
        </Button>
      </Box>

      <Box sx={{ flex:1,overflow:'auto',p:2.5 }}>
        <Box sx={{ display:'flex',gap:2,mb:2 }}>
          <TextField placeholder="Cerca per numero, cliente..." size="small" value={search}
            onChange={e=>setSearch(e.target.value)} sx={{ flex:1 }}
            InputProps={{ startAdornment:<InputAdornment position="start"><SearchIcon fontSize="small"/></InputAdornment> }} />
          <FormControl size="small" sx={{ minWidth:160 }}>
            <InputLabel>Stato</InputLabel>
            <Select value={filterStatus} label="Stato" onChange={e=>setFilterStatus(e.target.value)}>
              <MenuItem value="">Tutti</MenuItem>
              {STATUSES.map(s=><MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        {loading ? <Box sx={{display:'flex',justifyContent:'center',pt:6}}><CircularProgress/></Box>
        : items.length===0 ? (
          <Box sx={{textAlign:'center',pt:8,color:'text.secondary'}}>
            <DescriptionOutlinedIcon sx={{fontSize:56,mb:1,opacity:0.3}}/>
            <Typography>Nessun preventivo trovato</Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {items.map(item=>{
              const st = statusInfo(item.status)
              const tot = parseFloat(item.totalAmount||'0')
              return (
                <Box key={item.id} sx={{
                  display:'flex',alignItems:'center',gap:1.5,
                  bgcolor:'background.paper',borderRadius:3,px:2,py:1.5,
                  border:'0.5px solid',borderColor:'divider',
                  '&:hover':{borderColor:'primary.main'}
                }}>
                  <Avatar sx={{bgcolor:'#D8E2FF',color:'#001258',width:40,height:40,fontSize:11,fontWeight:700,flexShrink:0}}>
                    {item.number?.split('-')[2]||'?'}
                  </Avatar>
                  <Box sx={{flex:1,minWidth:0}}>
                    <Box sx={{display:'flex',alignItems:'center',gap:1}}>
                      <Typography fontWeight={600} variant="body2">{item.number}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.date ? new Date(item.date).toLocaleDateString('it-IT') : ''}
                      </Typography>
                      {item.expiryDate && (
                        <Typography variant="caption" color="text.secondary">
                          → {new Date(item.expiryDate).toLocaleDateString('it-IT')}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="body2" noWrap fontWeight={500}>{item.client?.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {Array.isArray(item.items) ? item.items.length : 0} voci
                    </Typography>
                  </Box>
                  <Chip size="small" label={st.label}
                    sx={{bgcolor:st.bg,color:st.color,fontWeight:600,fontSize:11,border:`1px solid ${st.color}33`}}/>
                  <Typography variant="body2" fontWeight={600} sx={{minWidth:70,textAlign:'right',color:'primary.main'}}>
                    {formatEur(tot)}
                  </Typography>
                  {item.driveUrl && (
                    <Tooltip title="Apri PDF">
                      <IconButton size="small" onClick={()=>window.open(item.driveUrl,'_blank')} sx={{color:'success.main'}}>
                        <OpenInNewIcon fontSize="small"/>
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Genera PDF">
                    <span>
                      <IconButton size="small" onClick={()=>handlePdf(item)} disabled={pdfLoading===item.id}
                        sx={{color:pdfLoading===item.id?'text.disabled':'#c62828'}}>
                        {pdfLoading===item.id?<CircularProgress size={16}/>:<PictureAsPdfOutlinedIcon fontSize="small"/>}
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Modifica">
                    <IconButton size="small" onClick={()=>openEdit(item)} sx={{color:'primary.main'}}>
                      <EditOutlinedIcon fontSize="small"/>
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Elimina">
                    <IconButton size="small" onClick={()=>{setSelected(item);setDeleteOpen(true)}} sx={{color:'error.main'}}>
                      <DeleteOutlineIcon fontSize="small"/>
                    </IconButton>
                  </Tooltip>
                </Box>
              )
            })}
          </Stack>
        )}
      </Box>

      {/* Modal */}
      <Dialog open={modalOpen} onClose={()=>setModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selected?`Modifica ${selected.number}`:'Nuovo preventivo'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{mb:2}}>{error}</Alert>}

          <Box sx={{display:'grid',gridTemplateColumns:'1fr auto auto',gap:2,mt:1,mb:2}}>
            <Autocomplete options={clients} getOptionLabel={c=>c.name||''} value={selectedClient}
              onChange={(_,val)=>setForm((f:any)=>({...f,clientId:val?.id||''}))}
              renderInput={params=><TextField {...params} label="Cliente *" size="small"/>}
              isOptionEqualToValue={(o,v)=>o.id===v?.id}/>
            <TextField label="Data" type="date" size="small" value={form.date}
              onChange={e=>setForm((f:any)=>({...f,date:e.target.value}))}
              InputLabelProps={{shrink:true}} sx={{width:150}}/>
            <TextField label="Scadenza" type="date" size="small" value={form.expiryDate}
              onChange={e=>setForm((f:any)=>({...f,expiryDate:e.target.value}))}
              InputLabelProps={{shrink:true}} sx={{width:150}}/>
          </Box>

          <FormControl size="small" sx={{mb:2,minWidth:180}}>
            <InputLabel>Stato</InputLabel>
            <Select value={form.status} label="Stato" onChange={e=>setForm((f:any)=>({...f,status:e.target.value}))}>
              {STATUSES.map(s=>(
                <MenuItem key={s.value} value={s.value}>
                  <Box sx={{display:'flex',alignItems:'center',gap:1}}>
                    <Box sx={{width:10,height:10,borderRadius:'50%',bgcolor:s.color}}/>{s.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider sx={{my:1.5}}><Typography variant="caption" color="text.secondary">VOCI</Typography></Divider>

          <Paper variant="outlined" sx={{mb:1.5,borderRadius:2,overflow:'hidden'}}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{bgcolor:'#F6F8FF'}}>
                  <TableCell>Descrizione</TableCell>
                  <TableCell align="right" sx={{width:80}}>Prezzo €</TableCell>
                  <TableCell align="center" sx={{width:60}}>Qtà</TableCell>
                  <TableCell align="center" sx={{width:70}}>UM</TableCell>
                  <TableCell align="center" sx={{width:70}}>Sconto%</TableCell>
                  <TableCell align="right" sx={{width:90}}>Totale</TableCell>
                  <TableCell sx={{width:36}}/>
                </TableRow>
              </TableHead>
              <TableBody>
                {form.items.map((p:Item,i:number)=>(
                  <TableRow key={i}>
                    <TableCell>
                      <TextField variant="standard" value={p.description} size="small" fullWidth
                        onChange={e=>updateItem(i,'description',e.target.value)} placeholder="Descrizione voce"/>
                    </TableCell>
                    <TableCell align="right">
                      <TextField variant="standard" value={p.unitPrice} type="number" size="small"
                        inputProps={{min:0,step:0.01,style:{textAlign:'right'}}} sx={{width:80}}
                        onChange={e=>updateItem(i,'unitPrice',e.target.value)}/>
                    </TableCell>
                    <TableCell align="center">
                      <TextField variant="standard" value={p.qty} type="number" size="small"
                        inputProps={{min:1,style:{textAlign:'center'}}} sx={{width:50}}
                        onChange={e=>updateItem(i,'qty',e.target.value)}/>
                    </TableCell>
                    <TableCell align="center">
                      <Select variant="standard" value={p.unit||'pz'} size="small" sx={{width:60}}
                        onChange={e=>updateItem(i,'unit',e.target.value)}>
                        {UNITS.map(u=><MenuItem key={u} value={u}>{u}</MenuItem>)}
                      </Select>
                    </TableCell>
                    <TableCell align="center">
                      <TextField variant="standard" value={p.discount} type="number" size="small"
                        inputProps={{min:0,max:100,style:{textAlign:'center'}}} sx={{width:50}}
                        onChange={e=>updateItem(i,'discount',e.target.value)}/>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={500}>
                        {formatEur(p.qty*p.unitPrice*(1-p.discount/100))}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" color="error" onClick={()=>removeItem(i)}
                        disabled={form.items.length===1}>
                        <RemoveCircleOutlineIcon fontSize="small"/>
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          <Button startIcon={<AddCircleOutlineIcon/>} size="small" onClick={addItem} sx={{mb:2}}>
            Aggiungi voce
          </Button>

          <Box sx={{display:'flex',alignItems:'center',gap:2,mb:2,
            bgcolor:'#F6F8FF',borderRadius:2,px:2,py:1.5}}>
            <Box sx={{flex:1}}/>
            <Box sx={{textAlign:'right'}}>
              <Typography variant="caption" color="text.secondary">TOTALE PREVENTIVO</Typography>
              <Typography variant="h6" fontWeight={700} color="primary.main">{formatEur(total)}</Typography>
              {total>77.47 && <Typography variant="caption" color="text.secondary">+ €2,00 bollo virtuale</Typography>}
            </Box>
          </Box>

          <TextField label="Note / Condizioni" fullWidth multiline rows={2} size="small" value={form.notes}
            onChange={e=>setForm((f:any)=>({...f,notes:e.target.value}))}/>
        </DialogContent>
        <DialogActions sx={{px:3,pb:2}}>
          <Button onClick={()=>setModalOpen(false)}>Annulla</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving?<CircularProgress size={20}/>:'Salva'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={()=>setDeleteOpen(false)}>
        <DialogTitle>Elimina preventivo</DialogTitle>
        <DialogContent>
          <Typography>Eliminare <strong>{selected?.number}</strong>?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{mt:1}}>
            Il PDF su Drive verrà eliminato.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setDeleteOpen(false)}>Annulla</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Elimina</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
