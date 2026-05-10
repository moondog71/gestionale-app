import pdfParse from 'pdf-parse'

export interface ScontriniExtracted {
  date: string | null
  amount: number | null
  paymentType: string
  receiptNumber: string | null
  fiscalCode: string | null
}

export async function extractScontrino(buffer: Buffer): Promise<ScontriniExtracted> {
  let text = ''
  try {
    const data = await pdfParse(buffer)
    text = data.text
  } catch { return { date:null, amount:null, paymentType:'contanti', receiptNumber:null, fiscalCode:null } }

  // N. ricevuta
  const receiptMatch = text.match(/N\.\s*ricevuta:\s*([A-Z0-9-]+)/i)
  const receiptNumber = receiptMatch ? receiptMatch[1].trim() : null

  // Data (formato: DD-MM-YYYY)
  const dateMatch = text.match(/Data:\s*(\d{2}-\d{2}-\d{4})/)
  let date: string | null = null
  if (dateMatch) {
    const [d, m, y] = dateMatch[1].split('-')
    date = `${y}-${m}-${d}` // ISO format
  }

  // Importo totale
  const amountMatch = text.match(/Totale\s+([\d.,]+)\s*€/)
  let amount: number | null = null
  if (amountMatch) {
    amount = parseFloat(amountMatch[1].replace('.','').replace(',','.'))
  }

  // Tipo pagamento
  const paymentMatch = text.match(/(Contanti|Carta|Carte|POS)/i)
  const paymentType = paymentMatch
    ? (paymentMatch[1].toLowerCase().startsWith('cont') ? 'contanti' : 'carta')
    : 'contanti'

  // Codice fiscale AE (formato: XXX0000/0000-0000)
  const fiscalMatch = text.match(/([A-Z]{3}\d{4}\/\d{4}-\d{4})/)
  const fiscalCode = fiscalMatch ? fiscalMatch[1] : null

  return { date, amount, paymentType, receiptNumber, fiscalCode }
}
