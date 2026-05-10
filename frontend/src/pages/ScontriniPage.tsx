import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Box, Typography, Button, TextField, Chip, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, MenuItem, Select, FormControl, InputLabel,
  Alert, CircularProgress, Tooltip, InputAdornment,
  Autocomplete, Divider, List, ListItem, ListItemText,
  ListItemIcon, ListItemButton, Paper
} from '@mui/material'
import CloudDownloadOutlinedIcon from '@mui/icons-material/CloudDownloadOutlined'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import SearchIcon from '@mui/icons-material/Search'
import ReceiptOutlinedIcon from '@mui/icons-material/ReceiptOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import Layout from '../components/ui/Layout'
import { apiFetch } from '../api/client'
import { getToken } from '../api/client'

const PAYMENT_TYPES = [
  { value:'contanti', label:'Contanti' },
  { value:'carta',    label:'Carta/POS' },
]

function formatEur(n:number){ return n.toLocaleString('it-IT',{style:'currency',currency:'EUR'}) }
function formatDate(d:any){ return d ? new Date(d).toLocaleDateString('it-IT') : '' }
function formatBytes(b:number){ return b>1024*1024?`${(b/1024/1024).toFixed(1)}MB`:`${Math.round(b/1024)}KB` }

const EMPTY_FORM = {
  clientId:'', interventoId:'', preventivoId:'',
  date: new Date().toISOString().slice(0,10),
  amount:'', paymentType:'contanti',
  receiptNumber:'', fiscalCode:'',
  discrepancyNote:'', notes:'',
  driveFileId:'', driveUrl:'', filename:''
}

export default function ScontriniPage() {
  const [items, setItems]           = useState<any[]>([])
  const [clients, setClients]       = useState<any[]>([])
  const [interventi, setInterventi] = useState<any[]>([])
  const [preventivi, setPreventivi] = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')

  // Modal import da Drive
  const [driveOpen, setDriveOpen]         = useState(false)
  const [drivePending, setDrivePending]   = useState<any[]>([])
  const [driveLoading, setDriveLoading]   = useState(false)
  const [extracting, setExtracting]       = useState<string|null>(null)

  // Modal form (manuale o dopo selezione Drive)
  const [formOpen, setFormOpen]     = useState(false)
  const [form, setForm]             = useState<any>(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [discrepancy, setDiscrepancy] = useState<{expected:number, actual:number}|null>(null)
  const [uploading, setUploading]   = useState(false)

  // Modal elimina
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected]     = useState<any>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await apiFetch<any[]>('/scontrini')) }
    catch { setError('Errore caricamento') }
    finally { setLoading(false) }
  }, [])

  useEffect(()=>{ load() },[load])
  useEffect(()=>{ apiFetch<any[]>('/clients').then(setClients).catch(()=>{}) },[])

  // Carica interventi filtrati per cliente
  useEffect(()=>{
    if (!form.clientId) { setInterventi([]); return }
    apiFetch<any[]>(`/interventi?clientId=${form.clientId}`)
      .then(setInterventi).catch(()=>{})
  },[form.clientId])

  // Carica preventivi filtrati per cliente
  useEffect(()=>{
    if (!form.clientId) { setPreventivi([]); return }
    apiFetch<any[]>(`/preventivi?clientId=${form.clientId}`)
      .then(setPreventivi).catch(()=>{})
  },[form.clientId])

  // Aggiorna discrepanza quando cambiano importo o intervento
  useEffect(()=>{
    if (!form.interventoId || !form.amount) { setDiscrepancy(null); return }
    const intv = interventi.find((i:any)=>i.id===form.interventoId)
    if (!intv) return
    const expected = parseFloat(intv.totalAmount||'0')
    const actual   = parseFloat(form.amount||'0')
    if (Math.abs(expected-actual) > 0.01) setDiscrepancy({expected, actual})
    else setDiscrepancy(null)
  },[form.interventoId, form.amount, interventi])

  // ── Import da Drive ──────────────────────────────────────
  const openDrive = async () => {
    setDriveOpen(true); setDriveLoading(true)
    try { setDrivePending(await apiFetch<any[]>('/scontrini/drive-pending')) }
    catch { setError('Errore lettura Drive') }
    finally { setDriveLoading(false) }
  }

  const selectDriveFile = async (file:any) => {
    setExtracting(file.id)
    try {
      const extracted = await apiFetch<any>(`/scontrini/drive-extract/${file.id}`)
      setForm({
        ...EMPTY_FORM,
        driveFileId: file.id,
        driveUrl: `https://drive.google.com/file/d/${file.id}/view`,
        filename: file.name,
        date:        extracted.date    || new Date().toISOString().slice(0,10),
        amount:      extracted.amount  ? String(extracted.amount) : '',
        paymentType: extracted.paymentType || 'contanti',
        receiptNumber: extracted.receiptNumber || '',
        fiscalCode:    extracted.fiscalCode    || '',
      })
      setDriveOpen(false)
      setError('')
      setFormOpen(true)
    } catch { setError('Errore estrazione PDF') }
    finally { setExtracting(null) }
  }

  // ── Caricamento manuale ──────────────────────────────────
  const openManual = () => {
    setForm(EMPTY_FORM); setDiscrepancy(null); setError('')
    setFormOpen(true)
  }

  const handleFileUpload = async (e:React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    setUploading(true); setError('')
    try {
      const fd = new FormData()
      fd.append('file', e.target.files[0])
      const token = getToken()
      const res = await fetch('/api/scontrini/upload', {
        method:'POST', headers:{'Authorization':`Bearer ${token}`}, body:fd
      })
      if (!res.ok) throw new Error('Upload fallito')
      const data = await res.json()
      setForm((f:any) => ({
        ...f,
        driveFileId: data.driveFileId, driveUrl: data.driveUrl, filename: data.filename,
        date:          data.date        || f.date,
        amount:        data.amount      ? String(data.amount) : f.amount,
        paymentType:   data.paymentType || f.paymentType,
        receiptNumber: data.receiptNumber || f.receiptNumber,
        fiscalCode:    data.fiscalCode    || f.fiscalCode,
      }))
    } catch(e:any){ setError('Errore upload: '+e.message) }
    finally { setUploading(false); if(fileInputRef.current) fileInputRef.current.value='' }
  }

  // ── Salva ────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.clientId)    { setError('Seleziona un cliente'); return }
    if (!form.interventoId){ setError('Seleziona un rapporto di intervento'); return }
    if (!form.amount)      { setError('Inserisci l\'importo'); return }
    if (!form.driveFileId) { setError('Carica prima il PDF dello scontrino'); return }
    if (discrepancy && !form.discrepancyNote) {
      setError('Importo diverso dall\'intervento: inserisci la giustificazione'); return
    }
    setSaving(true); setError('')
    try {
      const endpoint = form.filename && drivePending.some((f:any)=>f.id===form.driveFileId)
        ? '/scontrini/import-drive'
        : '/scontrini'
      await apiFetch(endpoint, { method:'POST', body: JSON.stringify({
        ...form,
        date: new Date(form.date).toISOString(),
        amount: parseFloat(form.amount),
        preventivoId: form.preventivoId || null,
      })})
      setFormOpen(false); load()
    } catch(e:any){
      if (e.message?.includes('discrepancy')) {
        setError('Importo diverso dall\'intervento: inserisci la giustificazione')
      } else { setError(e.message) }
    }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await apiFetch(`/scontrini/${selected.id}`,{method:'DELETE'}); setDeleteOpen(false); load() }
    catch { setError('Errore eliminazione') }
  }

  const selectedClient = clients.find(c=>c.id===form.clientId)||null
  const selectedIntervento = interventi.find(i=>i.id===form.interventoId)||null
  const selectedPreventivo = preventivi.find(p=>p.id===form.preventivoId)||null

  const isFromDrive = drivePending.some((f:any)=>f.id===form.driveFileId)

  return (
    <Layout>
      {/* Header */}
      <Box sx={{px:3,py:1.5,display:'flex',alignItems:'center',gap:2,
        borderBottom:'0.5px solid',borderColor:'divider',bgcolor:'background.paper'}}>
        <Typography variant="h6" sx={{flex:1}}>
          Scontrini
          <Typography component="span" variant="body2" color="text.secondary" sx={{ml:1}}>
            ({items.length})
          </Typography>
        </Typography>
        <Button variant="outlined" startIcon={<CloudDownloadOutlinedIcon/>} onClick={openDrive}
          sx={{borderColor:'primary.main',color:'primary.main'}}>
          Importa da Drive
        </Button>
        <Button variant="contained" startIcon={<UploadFileIcon/>} onClick={openManual}
          sx={{bgcolor:'secondary.main','&:hover':{bgcolor:'secondary.dark'}}}>
          Carica manuale
        </Button>
      </Box>

      {/* Lista */}
      <Box sx={{flex:1,overflow:'auto',p:2.5}}>
        <TextField placeholder="Cerca..." size="small" fullWidth sx={{mb:2}}
          value={search} onChange={e=>setSearch(e.target.value)}
          InputProps={{startAdornment:<InputAdornment position="start"><SearchIcon fontSize="small"/></InputAdornment>}}/>

        {loading ? <Box sx={{display:'flex',justifyContent:'center',pt:6}}><CircularProgress/></Box>
        : items.length===0 ? (
          <Box sx={{textAlign:'center',pt:8,color:'text.secondary'}}>
            <ReceiptOutlinedIcon sx={{fontSize:56,mb:1,opacity:0.3}}/>
            <Typography>Nessuno scontrino registrato</Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {items.filter(i=>
              !search ||
              i.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
              i.intervento?.number?.toLowerCase().includes(search.toLowerCase()) ||
              i.fiscalCode?.toLowerCase().includes(search.toLowerCase()) ||
              i.receiptNumber?.toLowerCase().includes(search.toLowerCase())
            ).map(item=>{
              const hasDisc = !!item.discrepancyNote
              return (
                <Box key={item.id} sx={{
                  display:'flex',alignItems:'center',gap:1.5,
                  bgcolor:'background.paper',borderRadius:3,px:2,py:1.5,
                  border:'0.5px solid',
                  borderColor: hasDisc ? 'warning.main' : 'divider',
                  '&:hover':{borderColor:'primary.main'}
                }}>
                  <ReceiptOutlinedIcon sx={{color:'text.secondary',flexShrink:0}}/>
                  <Box sx={{flex:1,minWidth:0}}>
                    <Box sx={{display:'flex',alignItems:'center',gap:1}}>
                      <Typography fontWeight={600} variant="body2">
                        {formatDate(item.date)}
                      </Typography>
                      <Chip size="small"
                        label={item.paymentType==='contanti'?'Contanti':'Carta'}
                        sx={{fontSize:10,height:18,
                          bgcolor:item.paymentType==='contanti'?'#F5F5F5':'#E3F2FD',
                          color:item.paymentType==='contanti'?'#555':'#1565c0'}}/>
                      {hasDisc && (
                        <Tooltip title={`Discrepanza: ${item.discrepancyNote}`}>
                          <WarningAmberIcon sx={{fontSize:16,color:'warning.main'}}/>
                        </Tooltip>
                      )}
                    </Box>
                    <Typography variant="body2" noWrap fontWeight={500}>
                      {item.client?.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.intervento?.number}
                      {item.preventivo && ` · ${item.preventivo.number}`}
                      {item.fiscalCode && ` · ${item.fiscalCode}`}
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight={700} color="primary.main">
                    {formatEur(parseFloat(item.amount))}
                  </Typography>
                  <Tooltip title="Apri PDF">
                    <IconButton size="small" onClick={()=>window.open(item.driveUrl,'_blank')} sx={{color:'success.main'}}>
                      <OpenInNewIcon fontSize="small"/>
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

      {/* ── Modal Import da Drive ─────────────────────────── */}
      <Dialog open={driveOpen} onClose={()=>setDriveOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{display:'flex',alignItems:'center',gap:1}}>
          <CloudDownloadOutlinedIcon/> Importa da Drive
        </DialogTitle>
        <DialogContent>
          {driveLoading
            ? <Box sx={{display:'flex',justifyContent:'center',py:4}}><CircularProgress/></Box>
            : drivePending.length===0
            ? <Box sx={{textAlign:'center',py:4,color:'text.secondary'}}>
                <CheckCircleOutlineIcon sx={{fontSize:40,mb:1,color:'success.main'}}/>
                <Typography>Nessun PDF in attesa nella cartella Drive</Typography>
                <Typography variant="caption">
                  Salva i PDF da SumUp in "Documenti Commerciali Scontrini"
                </Typography>
              </Box>
            : <List disablePadding>
                {drivePending.map(file=>(
                  <ListItemButton key={file.id}
                    onClick={()=>selectDriveFile(file)}
                    disabled={extracting===file.id}
                    sx={{borderRadius:2,mb:0.5,border:'0.5px solid',borderColor:'divider'}}>
                    <ListItemIcon>
                      {extracting===file.id
                        ? <CircularProgress size={20}/>
                        : <PictureAsPdfOutlinedIcon color="error"/>}
                    </ListItemIcon>
                    <ListItemText
                      primary={file.name}
                      secondary={file.createdTime
                        ? new Date(file.createdTime).toLocaleString('it-IT')
                        : ''}
                    />
                  </ListItemButton>
                ))}
              </List>
          }
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setDriveOpen(false)}>Chiudi</Button>
        </DialogActions>
      </Dialog>

      {/* ── Modal Form (manuale + Drive) ─────────────────── */}
      <Dialog open={formOpen} onClose={()=>setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {form.driveFileId && !isFromDrive ? 'Nuovo scontrino — caricamento manuale'
            : form.driveFileId ? `Importa: ${form.filename}`
            : 'Nuovo scontrino'}
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{mb:2}}>{error}</Alert>}

          {/* Upload file (solo modalità manuale senza file ancora caricato) */}
          {!form.driveFileId && (
            <Paper variant="outlined" sx={{p:2,mb:2,textAlign:'center',
              border:'2px dashed',borderColor:'primary.light',borderRadius:2,
              cursor:'pointer','&:hover':{bgcolor:'#F5F7FF'}}}
              onClick={()=>fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" accept=".pdf" style={{display:'none'}}
                onChange={handleFileUpload}/>
              {uploading
                ? <><CircularProgress size={24}/><Typography variant="body2" sx={{mt:1}}>Caricamento...</Typography></>
                : <><PictureAsPdfOutlinedIcon sx={{color:'error.main',fontSize:36}}/>
                    <Typography variant="body2" sx={{mt:0.5}}>Trascina o clicca per caricare il PDF SumUp</Typography>
                    <Typography variant="caption" color="text.secondary">I dati verranno estratti automaticamente</Typography></>}
            </Paper>
          )}

          {form.driveFileId && (
            <Alert severity="success" icon={<CheckCircleOutlineIcon/>} sx={{mb:2}}>
              PDF caricato: <strong>{form.filename}</strong>
              {' '}<a href={form.driveUrl} target="_blank" rel="noreferrer"
                style={{color:'inherit'}}>Apri ↗</a>
            </Alert>
          )}

          {/* Cliente → Intervento → Preventivo */}
          <Autocomplete options={clients} getOptionLabel={c=>c.name||''} value={selectedClient}
            onChange={(_,val)=>setForm((f:any)=>({...f,clientId:val?.id||'',interventoId:'',preventivoId:''}))}
            renderInput={p=><TextField {...p} label="Cliente *" size="small"/>}
            isOptionEqualToValue={(o,v)=>o.id===v?.id} sx={{mb:2}}/>

          <Autocomplete options={interventi} getOptionLabel={i=>`${i.number} — ${i.client?.name||''}`}
            value={selectedIntervento} disabled={!form.clientId}
            onChange={(_,val)=>setForm((f:any)=>({...f,interventoId:val?.id||''}))}
            renderInput={p=><TextField {...p} label="Rapporto di Intervento *" size="small"
              helperText={!form.clientId?'Seleziona prima un cliente':''}/>}
            isOptionEqualToValue={(o,v)=>o.id===v?.id} sx={{mb:2}}/>

          <Autocomplete options={preventivi} getOptionLabel={p=>`${p.number} — ${p.client?.name||''}`}
            value={selectedPreventivo} disabled={!form.clientId}
            onChange={(_,val)=>setForm((f:any)=>({...f,preventivoId:val?.id||''}))}
            renderInput={p=><TextField {...p} label="Preventivo (opzionale)" size="small"/>}
            isOptionEqualToValue={(o,v)=>o.id===v?.id} sx={{mb:2}}/>

          <Divider sx={{my:1.5}}><Typography variant="caption" color="text.secondary">DATI SCONTRINO</Typography></Divider>

          <Box sx={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:2,mb:2}}>
            <TextField label="Data" type="date" size="small" value={form.date}
              onChange={e=>setForm((f:any)=>({...f,date:e.target.value}))}
              InputLabelProps={{shrink:true}}/>
            <TextField label="Importo €" size="small" type="number" value={form.amount}
              inputProps={{min:0,step:0.01}}
              onChange={e=>setForm((f:any)=>({...f,amount:e.target.value}))}/>
          </Box>

          <Box sx={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:2,mb:2}}>
            <FormControl size="small">
              <InputLabel>Pagamento</InputLabel>
              <Select value={form.paymentType} label="Pagamento"
                onChange={e=>setForm((f:any)=>({...f,paymentType:e.target.value}))}>
                {PAYMENT_TYPES.map(p=><MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="N. ricevuta SumUp" size="small" value={form.receiptNumber}
              onChange={e=>setForm((f:any)=>({...f,receiptNumber:e.target.value}))}/>
          </Box>

          <TextField label="Codice AE (es. DCW2026/7691-4436)" fullWidth size="small" sx={{mb:2}}
            value={form.fiscalCode}
            onChange={e=>setForm((f:any)=>({...f,fiscalCode:e.target.value}))}/>

          {/* Avviso discrepanza */}
          {discrepancy && (
            <Alert severity="warning" icon={<WarningAmberIcon/>} sx={{mb:2}}>
              <Typography variant="body2" fontWeight={600}>
                Discrepanza importo!
              </Typography>
              <Typography variant="body2">
                Scontrino: <strong>{formatEur(discrepancy.actual)}</strong> —
                Intervento: <strong>{formatEur(discrepancy.expected)}</strong>
              </Typography>
              <TextField
                label="Giustificazione obbligatoria *" fullWidth multiline rows={2}
                size="small" sx={{mt:1,bgcolor:'background.paper'}}
                value={form.discrepancyNote}
                onChange={e=>setForm((f:any)=>({...f,discrepancyNote:e.target.value}))}
                placeholder="Es: sconto concordato, acconto, materiali esclusi..."/>
            </Alert>
          )}

          <TextField label="Note" fullWidth multiline rows={2} size="small" value={form.notes}
            onChange={e=>setForm((f:any)=>({...f,notes:e.target.value}))}/>
        </DialogContent>
        <DialogActions sx={{px:3,pb:2}}>
          <Button onClick={()=>setFormOpen(false)}>Annulla</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving?<CircularProgress size={20}/>:'Salva'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal elimina */}
      <Dialog open={deleteOpen} onClose={()=>setDeleteOpen(false)}>
        <DialogTitle>Elimina scontrino</DialogTitle>
        <DialogContent>
          <Typography>Eliminare lo scontrino del <strong>{formatDate(selected?.date)}</strong>?</Typography>
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
