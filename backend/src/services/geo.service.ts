import https from 'https'

interface CapResult { city: string; province: string }

let capMap = new Map<string, CapResult[]>()

async function fetchComuni(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    https.get(
      'https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json',
      (res) => {
        let data = ''
        res.on('data', (chunk) => data += chunk)
        res.on('end', () => { try { resolve(JSON.parse(data)) } catch(e) { reject(e) } })
        res.on('error', reject)
      }
    ).on('error', reject)
  })
}

export async function loadCapData(): Promise<void> {
  try {
    const comuni = await fetchComuni()
    const map = new Map<string, CapResult[]>()
    for (const c of comuni) {
      if (!c.sigla) continue
      const caps: string[] = Array.isArray(c.cap) ? c.cap : [c.cap]
      for (const cap of caps) {
        if (!cap || cap === '00000') continue
        if (!map.has(cap)) map.set(cap, [])
        map.get(cap)!.push({ city: c.nome, province: c.sigla })
      }
    }
    capMap = map
    console.log(`[GEO] CAP database caricato: ${map.size} CAP, ${comuni.length} comuni`)
  } catch (e) {
    console.error('[GEO] Errore caricamento comuni-json:', e)
  }
}

export function lookupCap(cap: string): CapResult[] {
  return capMap.get(cap) || []
}
