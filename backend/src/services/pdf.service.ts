import puppeteer from 'puppeteer'

function esc(s: string | null | undefined): string {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}
function fDate(d: any): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric' })
}
function fEur(n: number | string | null | undefined): string {
  return new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(parseFloat(String(n||0)))
}
function outcomeLabel(v: string): string {
  const m: Record<string,string> = {
    risolto:'Risolto', parziale:'Parziale',
    da_riprogrammare:'Da riprogrammare', non_riparabile:'Non riparabile'
  }
  return m[v] || v
}

export function buildInterventiHtml(intervento: any, client: any, settings: Record<string,string>): string {
  const parts: any[] = Array.isArray(intervento.parts) ? intervento.parts : []
  const laborH = parseFloat(intervento.laborHours || 0)
  const laborR = parseFloat(intervento.laborRate || 0)
  const laborTot = laborH * laborR
  const total = parseFloat(intervento.totalAmount || 0)
  const stampDuty = intervento.stampDuty
  const partsRows = parts.map(p =>
    `<tr><td>${esc(p.description)}</td><td class="r">${p.qty}</td><td class="r">${fEur(p.unitPrice)}</td><td class="r">${fEur(p.qty*p.unitPrice)}</td></tr>`
  ).join('')
  const laborRow = (laborH && laborR) ?
    `<tr class="labor"><td>Manodopera (${laborH} ore &times; ${fEur(laborR)}/h)</td><td class="r">1</td><td class="r">${fEur(laborTot)}</td><td class="r">${fEur(laborTot)}</td></tr>` : ''
  const addrParts = [client.address, [client.zip, client.city, client.province ? '('+client.province+')' : ''].filter(Boolean).join(' ')].filter(Boolean)
  const compAddrLine = [settings.company_zip, settings.company_city, settings.company_province ? '('+settings.company_province+')' : ''].filter(Boolean).join(' ')

  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;font-size:9pt;color:#333}
.page{padding:12mm 15mm}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:7mm}
.logo{max-height:110px;max-width:280px;width:auto}
.client-box{width:47%;border:1px solid #bbb;padding:7px 10px;border-radius:3px}
.client-box .lbl{font-size:7pt;color:#888;font-weight:bold;text-transform:uppercase;margin-bottom:2px}
.client-box .cname{font-size:11pt;font-weight:bold;color:#2B4BA0}
.client-box .cdet{font-size:8pt;color:#444;margin-top:2px}
.company-name{font-size:13pt;font-weight:bold;color:#2B4BA0}
.company-det{font-size:8pt;color:#555;margin-top:1px}
.company{margin-bottom:5mm}
.doc-title{font-size:12pt;font-weight:bold;color:#2B4BA0;border-bottom:2.5px solid #2B4BA0;padding-bottom:3px;margin-bottom:4mm}
table.info{width:100%;border-collapse:collapse;margin-bottom:4mm}
table.info td{border:1px solid #ccc;padding:4px 8px;font-size:8pt}
.il{background:#f5f7ff;font-weight:bold;color:#555;font-size:7pt;text-transform:uppercase}
.iv{font-weight:bold;color:#2B4BA0}
.stitle{font-size:7.5pt;font-weight:bold;text-transform:uppercase;color:#555;background:#f5f7ff;border-left:3px solid #2B4BA0;padding:3px 8px;margin:3mm 0 2mm}
table.app{width:100%;border-collapse:collapse;margin-bottom:3mm}
table.app td{border:1px solid #ddd;padding:4px 8px;font-size:8pt}
.al{background:#f5f7ff;font-weight:bold;font-size:7pt;color:#555}
.descbox{border:1px solid #ddd;padding:7px 8px;font-size:8.5pt;line-height:1.5;min-height:18mm;margin-bottom:3mm;white-space:pre-wrap}
table.items{width:100%;border-collapse:collapse;margin-bottom:3mm}
table.items th{background:#2B4BA0;color:#fff;padding:5px 8px;font-size:7.5pt;text-align:left}
table.items th.r{text-align:right}
table.items td{border-bottom:1px solid #eee;padding:4px 8px;font-size:8.5pt}
table.items td.r{text-align:right}
table.items tr:nth-child(even) td{background:#fafbff}
.labor td{background:#f0f3ff!important;font-style:italic}
.totbox{display:flex;justify-content:flex-end;margin-bottom:4mm}
.totinner{width:52%;border:1px solid #ccc;border-radius:3px;overflow:hidden}
.totinner table{width:100%;border-collapse:collapse}
.totinner td{padding:4px 10px;font-size:8.5pt;border-bottom:1px solid #eee}
.tv{text-align:right;font-weight:500}
.gtot td{background:#2B4BA0!important;color:#fff;font-weight:bold;font-size:10pt}
.brow td{font-size:7.5pt;color:#888}
.regnote{font-size:7.5pt;color:#666;border:1px solid #ddd;padding:5px 8px;border-radius:2px;margin-bottom:4mm;line-height:1.4}
.sigrow{display:flex;gap:15mm;margin-top:7mm}
.sigbox{flex:1;border-top:1px solid #999;padding-top:3px}
.siglbl{font-size:7.5pt;color:#666}
.sigspace{height:16mm}
.footer{margin-top:5mm;border-top:1px solid #ddd;padding-top:3px;font-size:7pt;color:#888;display:flex;justify-content:space-between}
</style></head><body><div class="page">

<div class="header">
  <div style="width:48%">
    ${settings.company_logo_base64
      ? `<img src="${settings.company_logo_base64}" class="logo" alt="Logo">`
      : `<div class="company-name">${esc(settings.company_name)}</div>`}
  </div>
  <div class="client-box">
    <div class="lbl">Intestatario</div>
    <div class="cname">${esc(client.name)}</div>
    ${client.fiscalCode ? `<div class="cdet">C.F.: ${esc(client.fiscalCode)}</div>` : ''}
    ${client.vatNumber ? `<div class="cdet">P.IVA: ${esc(client.vatNumber)}</div>` : ''}
    ${addrParts.map(a => `<div class="cdet">${esc(a)}</div>`).join('')}
  </div>
</div>

<div class="company">
  <div class="company-name">${esc(settings.company_name)}</div>
  <div class="company-det">${esc(settings.company_address)} - ${esc(compAddrLine)}</div>
  <div class="company-det">P.IVA: ${esc(settings.company_vat)} &nbsp;|&nbsp; C.F.: ${esc(settings.company_fiscal_code)} &nbsp;|&nbsp; REA: ${esc(settings.company_rea)}</div>
  <div class="company-det">Tel: ${esc(settings.company_phone)} &nbsp;|&nbsp; Email: ${esc(settings.company_email)}</div>
</div>

<div class="doc-title">RAPPORTO DI INTERVENTO N.&nbsp;${esc(intervento.number)}&nbsp;&nbsp;del&nbsp;${fDate(intervento.date)}</div>

<table class="info">
  <tr>
    <td class="il">Data</td><td class="iv">${fDate(intervento.date)}</td>
    <td class="il">Tipo lavoro</td><td class="iv" style="text-transform:capitalize">${esc(intervento.workType)}</td>
    <td class="il">Esito</td><td class="iv">${outcomeLabel(intervento.outcome)}</td>
  </tr>
</table>

<div class="stitle">Dati Apparecchio</div>
<table class="app">
  <tr>
    <td class="al">Tipo</td><td>${esc(intervento.applianceType)}</td>
    <td class="al">Marca</td><td>${esc(intervento.brand||'—')}</td>
    <td class="al">Modello</td><td>${esc(intervento.model||'—')}</td>
    <td class="al">Matricola</td><td>${esc(intervento.serial||'—')}</td>
  </tr>
  ${intervento.addressOverride ? `<tr><td class="al">Indirizzo intervento</td><td colspan="7">${esc(intervento.addressOverride)}</td></tr>` : ''}
</table>

<div class="stitle">Lavoro Svolto</div>
<div class="descbox">${esc(intervento.description||'—')}</div>

${(parts.length > 0 || (laborH && laborR)) ? `
<div class="stitle">Ricambi e Manodopera</div>
<table class="items">
  <thead><tr>
    <th style="width:52%">Descrizione</th>
    <th class="r" style="width:9%">Qtà</th>
    <th class="r" style="width:16%">Prezzo</th>
    <th class="r" style="width:16%">Importo</th>
  </tr></thead>
  <tbody>${partsRows}${laborRow}</tbody>
</table>` : ''}

<div class="totbox"><div class="totinner"><table>
  <tr><td>Importo prestazioni</td><td class="tv">${fEur(total)}</td></tr>
  <tr><td>Totale imponibile</td><td class="tv">€ 0,00</td></tr>
  <tr><td>Totale non soggetto IVA (N2)</td><td class="tv">${fEur(total)}</td></tr>
  <tr><td>Totale IVA</td><td class="tv">€ 0,00</td></tr>
  ${stampDuty ? `<tr class="brow"><td>Imposta di bollo</td><td class="tv">€ 2,00</td></tr>` : ''}
  <tr class="gtot"><td>Totale documento</td><td style="text-align:right">${fEur(total+(stampDuty?2:0))}</td></tr>
</table></div></div>

<div class="regnote">
  <strong>Cod. IVA N2</strong> &mdash; ${esc(settings.tax_note||'')}
  ${stampDuty ? '<br>Imposta di bollo assolta in modo virtuale ai sensi dell\'art. 15 del D.P.R. 642/1972 e del DM 17/06/2014.' : ''}
</div>

<div class="sigrow">
  <div class="sigbox"><div class="siglbl">Data</div><div class="sigspace"></div></div>
  <div class="sigbox"><div class="siglbl">Firma per accettazione</div><div class="sigspace"></div></div>
  <div class="sigbox"><div class="siglbl">${esc(settings.company_name||'')}</div><div class="sigspace"></div></div>
</div>

<div class="footer">
  <span>${esc(settings.company_name||'')} &mdash; ${esc(settings.company_address||'')} &mdash; ${esc(compAddrLine)}</span>
  <span>${esc(settings.company_website||'')}</span>
</div>

</div></body></html>`
}

export async function generatePdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu'],
    headless: true
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top:'0', right:'0', bottom:'0', left:'0' },
      printBackground: true
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}

export function buildPreventivoHtml(preventivo: any, client: any, settings: Record<string,string>): string {
  const items: any[] = Array.isArray(preventivo.items) ? preventivo.items : []
  const total = parseFloat(preventivo.totalAmount || 0)
  const stampDuty = preventivo.stampDuty
  const compAddrLine = [settings.company_zip, settings.company_city,
    settings.company_province ? '('+settings.company_province+')' : ''].filter(Boolean).join(' ')
  const addrParts = [client?.address,
    [client?.zip, client?.city, client?.province ? '('+client.province+')' : ''].filter(Boolean).join(' ')
  ].filter(Boolean)

  const STATUS_LABELS: Record<string,string> = {
    bozza:'Bozza', inviato:'Inviato', accettato:'Accettato', rifiutato:'Rifiutato'
  }

  const itemRows = items.map((p: any) => {
    const disc = parseFloat(p.discount||0)
    const rowTotal = p.qty * p.unitPrice * (1 - disc/100)
    return `<tr>
      <td>${esc(p.description||'')}</td>
      <td class="r">${fEur(p.unitPrice)}</td>
      <td class="r">${p.qty}</td>
      <td class="r">${esc(p.unit||'pz')}</td>
      <td class="r">${disc > 0 ? disc+'%' : '—'}</td>
      <td class="r">${fEur(rowTotal)}</td>
      <td class="r">N2</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;font-size:9pt;color:#333}
.page{padding:12mm 15mm}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:7mm}
.logo{max-height:110px;max-width:280px;width:auto}
.client-box{width:47%;border:1px solid #bbb;padding:7px 10px;border-radius:3px}
.client-box .lbl{font-size:7pt;color:#888;font-weight:bold;text-transform:uppercase;margin-bottom:2px}
.client-box .cname{font-size:11pt;font-weight:bold;color:#2B4BA0}
.client-box .cdet{font-size:8pt;color:#444;margin-top:2px}
.company-name{font-size:13pt;font-weight:bold;color:#2B4BA0}
.company-det{font-size:8pt;color:#555;margin-top:1px}
.company{margin-bottom:5mm}
.doc-title{font-size:12pt;font-weight:bold;color:#2B4BA0;border-bottom:2.5px solid #2B4BA0;padding-bottom:3px;margin-bottom:4mm}
table.info{width:100%;border-collapse:collapse;margin-bottom:4mm}
table.info td{border:1px solid #ccc;padding:4px 8px;font-size:8pt}
.il{background:#f5f7ff;font-weight:bold;color:#555;font-size:7pt;text-transform:uppercase}
.iv{font-weight:bold;color:#2B4BA0}
table.items{width:100%;border-collapse:collapse;margin-bottom:4mm}
table.items th{background:#2B4BA0;color:#fff;padding:5px 8px;font-size:7.5pt;text-align:left}
table.items th.r{text-align:right}
table.items td{border-bottom:1px solid #eee;padding:4px 8px;font-size:8.5pt}
table.items td.r{text-align:right}
table.items tr:nth-child(even) td{background:#fafbff}
.totbox{display:flex;justify-content:flex-end;margin-bottom:4mm}
.totinner{width:52%;border:1px solid #ccc;border-radius:3px;overflow:hidden}
.totinner table{width:100%;border-collapse:collapse}
.totinner td{padding:4px 10px;font-size:8.5pt;border-bottom:1px solid #eee}
.tv{text-align:right;font-weight:500}
.gtot td{background:#2B4BA0!important;color:#fff;font-weight:bold;font-size:10.5pt}
.brow td{font-size:7.5pt;color:#888}
.regnote{font-size:7.5pt;color:#666;border:1px solid #ddd;padding:5px 8px;border-radius:2px;margin-bottom:4mm;line-height:1.4}
.sigrow{display:flex;gap:15mm;margin-top:7mm}
.sigbox{flex:1;border-top:1px solid #999;padding-top:3px}
.siglbl{font-size:7.5pt;color:#666}
.sigspace{height:18mm}
.footer{margin-top:5mm;border-top:1px solid #ddd;padding-top:3px;font-size:7pt;color:#888;display:flex;justify-content:space-between}
</style></head><body><div class="page">

<div class="header">
  <div style="width:48%">
    ${settings.company_logo_base64
      ? `<img src="${settings.company_logo_base64}" class="logo" alt="Logo">`
      : `<div class="company-name">${esc(settings.company_name)}</div>`}
  </div>
  <div class="client-box">
    <div class="lbl">Intestatario</div>
    <div class="cname">${esc(client?.name||'')}</div>
    ${client?.fiscalCode ? `<div class="cdet">C.F.: ${esc(client.fiscalCode)}</div>` : ''}
    ${client?.vatNumber ? `<div class="cdet">P.IVA: ${esc(client.vatNumber)}</div>` : ''}
    ${addrParts.map((a: string) => `<div class="cdet">${esc(a)}</div>`).join('')}
  </div>
</div>

<div class="company">
  <div class="company-name">${esc(settings.company_name||'')}</div>
  <div class="company-det">${esc(settings.company_address||'')} - ${esc(compAddrLine)}</div>
  <div class="company-det">P.IVA: ${esc(settings.company_vat||'')} &nbsp;|&nbsp; C.F.: ${esc(settings.company_fiscal_code||'')} &nbsp;|&nbsp; REA: ${esc(settings.company_rea||'')}</div>
  <div class="company-det">Tel: ${esc(settings.company_phone||'')} &nbsp;|&nbsp; Email: ${esc(settings.company_email||'')}</div>
</div>

<div class="doc-title">PREVENTIVO N.&nbsp;${esc(preventivo.number)}&nbsp;&nbsp;del&nbsp;${fDate(preventivo.date)}</div>

<table class="info">
  <tr>
    <td class="il">Data</td><td class="iv">${fDate(preventivo.date)}</td>
    <td class="il">Scadenza</td><td class="iv">${preventivo.expiryDate ? fDate(preventivo.expiryDate) : '—'}</td>
    <td class="il">Stato</td><td class="iv">${STATUS_LABELS[preventivo.status]||preventivo.status}</td>
  </tr>
</table>

<table class="items">
  <thead><tr>
    <th style="width:44%">Descrizione</th>
    <th class="r" style="width:12%">Prezzo</th>
    <th class="r" style="width:8%">Qtà</th>
    <th class="r" style="width:8%">UM</th>
    <th class="r" style="width:8%">Sconto</th>
    <th class="r" style="width:12%">Totale</th>
    <th class="r" style="width:8%">IVA</th>
  </tr></thead>
  <tbody>${itemRows}</tbody>
</table>

<div class="totbox"><div class="totinner"><table>
  <tr><td>Totale imponibile</td><td class="tv">${fEur(total)}</td></tr>
  <tr><td>Totale documento</td><td class="tv">${fEur(total)}</td></tr>
  ${stampDuty ? `<tr class="brow"><td>Imposta di bollo assolta in modo virtuale</td><td class="tv">${fEur(2)}</td></tr>` : ''}
  <tr class="gtot"><td>Totale da pagare</td><td style="text-align:right">${fEur(total+(stampDuty?2:0))}</td></tr>
</table></div></div>

<div class="regnote">
  <strong>Cod. IVA N2</strong> &mdash; ${esc(settings.tax_note||'')}
</div>

${preventivo.notes ? `<div style="font-size:8.5pt;margin-bottom:4mm;padding:6px 8px;border:1px solid #eee;border-radius:2px"><strong>Note:</strong> ${esc(preventivo.notes)}</div>` : ''}

<div class="sigrow">
  <div class="sigbox"><div class="siglbl">Data</div><div class="sigspace"></div></div>
  <div class="sigbox"><div class="siglbl">Firma per accettazione</div><div class="sigspace"></div></div>
  <div class="sigbox"><div class="siglbl">${esc(settings.company_name||'')}</div><div class="sigspace"></div></div>
</div>

<div class="footer">
  <span>${esc(settings.company_name||'')} &mdash; ${esc(settings.company_address||'')} &mdash; ${esc(compAddrLine)}</span>
  <span>${esc(settings.company_website||'')}</span>
</div>

</div></body></html>`
}
