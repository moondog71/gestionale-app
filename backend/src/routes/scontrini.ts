import { FastifyInstance } from 'fastify'
import { authenticate } from '../plugins/authenticate'
import {
  listPdfFiles, downloadFileBuffer, moveFile,
  getOrCreateFolder, uploadFile, deleteFile
} from '../services/drive.service'
import { extractScontrino } from '../services/pdf.extract.service'

export default async function scontriniRoutes(app: FastifyInstance) {

  // Lista scontrini
  app.get('/api/scontrini', { preHandler: authenticate }, async (req) => {
    const { clientId, interventoId } = req.query as any
    const where: any = {}
    if (clientId) where.clientId = clientId
    if (interventoId) where.interventoId = interventoId
    return app.prisma.scontrino.findMany({
      where, orderBy: { date: 'desc' },
      include: {
        client: { select: { id:true, name:true } },
        intervento: { select: { id:true, number:true, totalAmount:true } },
        preventivo: { select: { id:true, number:true, totalAmount:true } }
      }
    })
  })

  // Lista PDF non ancora importati dalla cartella Drive
  app.get('/api/scontrini/drive-pending', { preHandler: authenticate }, async () => {
    const folderId = process.env.SCONTRINI_DRIVE_FOLDER_ID!
    const files = await listPdfFiles(folderId)
    // Escludi quelli già importati
    const imported = await app.prisma.scontrino.findMany({
      select: { driveFileId: true }
    })
    const importedIds = new Set(imported.map(s => s.driveFileId))
    return files.filter(f => !importedIds.has(f.id))
  })

  // Estrae dati da un PDF in Drive (anteprima prima di importare)
  app.get('/api/scontrini/drive-extract/:fileId', { preHandler: authenticate }, async (req) => {
    const { fileId } = req.params as { fileId: string }
    const buffer = await downloadFileBuffer(fileId)
    return extractScontrino(buffer)
  })

  // Importa da Drive: sposta file + salva scontrino
  app.post('/api/scontrini/import-drive', { preHandler: authenticate }, async (req, reply) => {
    const body = req.body as any
    const { fileId, filename, clientId, interventoId, preventivoId,
      date, amount, paymentType, receiptNumber, fiscalCode, discrepancyNote, notes } = body

    // Controlla discrepanza
    if (interventoId) {
      const intv = await app.prisma.intervento.findUnique({ where: { id: interventoId } })
      if (intv) {
        const diff = Math.abs(parseFloat(String(intv.totalAmount)) - parseFloat(String(amount)))
        if (diff > 0.01 && !discrepancyNote) {
          return reply.code(422).send({
            error: 'discrepancy',
            expected: intv.totalAmount,
            message: `Importo scontrino (${amount}€) diverso dal totale intervento (${intv.totalAmount}€). Inserire giustificazione.`
          })
        }
      }
    }

    // Sposta il file da Scontrini SumUp a Gestionale/Scontrini/ANNO/
    const year = new Date(date || Date.now()).getFullYear().toString()
    const rootFolderId = process.env.GESTIONALE_DRIVE_FOLDER_ID!
    const scontriniFolderId = await getOrCreateFolder('Scontrini', rootFolderId)
    const yearFolderId = await getOrCreateFolder(year, scontriniFolderId)
    const fromFolderId = process.env.SCONTRINI_DRIVE_FOLDER_ID!
    await moveFile(fileId, fromFolderId, yearFolderId)

    // Ottieni il link del file spostato
    const driveUrl = `https://drive.google.com/file/d/${fileId}/view`

    const scontrino = await app.prisma.scontrino.create({
      data: {
        date: date ? new Date(date) : new Date(),
        amount: parseFloat(String(amount)),
        paymentType: paymentType || 'contanti',
        clientId, interventoId,
        preventivoId: preventivoId || null,
        receiptNumber, fiscalCode, discrepancyNote, notes,
        driveFileId: fileId, driveUrl, filename: filename || 'scontrino.pdf'
      },
      include: {
        client: { select: { id:true, name:true } },
        intervento: { select: { id:true, number:true, totalAmount:true } },
        preventivo: { select: { id:true, number:true } }
      }
    })
    return reply.code(201).send(scontrino)
  })

  // Upload manuale
  app.post('/api/scontrini/upload', { preHandler: authenticate }, async (req, reply) => {
    const data = await req.file()
    if (!data) return reply.code(400).send({ error: 'Nessun file' })
    const chunks: Buffer[] = []
    for await (const chunk of data.file) chunks.push(chunk)
    const buf = Buffer.concat(chunks)

    // Estrai dati dal PDF
    const extracted = await extractScontrino(buf)

    // Carica su Drive Gestionale/Scontrini/ANNO/
    const year = new Date().getFullYear().toString()
    const rootFolderId = process.env.GESTIONALE_DRIVE_FOLDER_ID!
    const scontriniFolderId = await getOrCreateFolder('Scontrini', rootFolderId)
    const yearFolderId = await getOrCreateFolder(year, scontriniFolderId)
    const { fileId, webViewLink } = await uploadFile(buf, data.filename, 'application/pdf', yearFolderId)

    return {
      driveFileId: fileId, driveUrl: webViewLink,
      filename: data.filename,
      ...extracted
    }
  })

  // Salva scontrino manuale (dopo upload)
  app.post('/api/scontrini', { preHandler: authenticate }, async (req, reply) => {
    const body = req.body as any
    const { clientId, interventoId, preventivoId, amount, paymentType,
      date, receiptNumber, fiscalCode, discrepancyNote, notes,
      driveFileId, driveUrl, filename } = body

    // Controlla discrepanza
    if (interventoId) {
      const intv = await app.prisma.intervento.findUnique({ where: { id: interventoId } })
      if (intv) {
        const diff = Math.abs(parseFloat(String(intv.totalAmount)) - parseFloat(String(amount)))
        if (diff > 0.01 && !discrepancyNote) {
          return reply.code(422).send({
            error: 'discrepancy',
            expected: intv.totalAmount,
            message: `Importo scontrino (${amount}€) diverso dal totale intervento (${intv.totalAmount}€). Inserire giustificazione.`
          })
        }
      }
    }

    const scontrino = await app.prisma.scontrino.create({
      data: {
        date: date ? new Date(date) : new Date(),
        amount: parseFloat(String(amount)),
        paymentType: paymentType || 'contanti',
        clientId, interventoId,
        preventivoId: preventivoId || null,
        receiptNumber, fiscalCode, discrepancyNote, notes,
        driveFileId, driveUrl, filename: filename || 'scontrino.pdf'
      },
      include: {
        client: { select: { id:true, name:true } },
        intervento: { select: { id:true, number:true, totalAmount:true } },
        preventivo: { select: { id:true, number:true } }
      }
    })
    return reply.code(201).send(scontrino)
  })

  // Elimina
  app.delete('/api/scontrini/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const item = await app.prisma.scontrino.findUnique({ where: { id } })
    if (item?.driveFileId) await deleteFile(item.driveFileId).catch(() => {})
    await app.prisma.scontrino.delete({ where: { id } })
    return reply.code(204).send()
  })
}

