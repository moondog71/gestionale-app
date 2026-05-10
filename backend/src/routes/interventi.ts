import { FastifyInstance } from 'fastify'
import { authenticate } from '../plugins/authenticate'
import { getNextNumber } from '../services/counter.service'
import { buildInterventiHtml, generatePdf } from '../services/pdf.service'
import { getOrCreateFolder, uploadFile, deleteFile } from '../services/drive.service'

export default async function interventiRoutes(app: FastifyInstance) {

  app.get('/api/interventi', { preHandler: authenticate }, async (req) => {
    const { search, clientId, year, outcome } = req.query as any
    const where: any = {}
    if (clientId) where.clientId = clientId
    if (year) where.year = parseInt(year)
    if (outcome) where.outcome = outcome
    if (search) where.OR = [
      { number: { contains: search, mode: 'insensitive' } },
      { client: { name: { contains: search, mode: 'insensitive' } } },
      { brand: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
    return app.prisma.intervento.findMany({
      where, orderBy: { date: 'desc' },
      include: {
        client: { select: { id:true, name:true, city:true } },
        attachments: { select: { id:true, filename:true, driveUrl:true, mimeType:true, sizeBytes:true } }
      }
    })
  })

  app.get('/api/interventi/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const item = await app.prisma.intervento.findUnique({
      where: { id },
      include: {
        client: true,
        preventivo: { select: { id:true, number:true } },
        attachments: { select: { id:true, filename:true, driveUrl:true, mimeType:true, sizeBytes:true, createdAt:true } }
      }
    })
    if (!item) return reply.code(404).send({ error: 'Non trovato' })
    return item
  })

  app.post('/api/interventi', { preHandler: authenticate }, async (req, reply) => {
    const data = req.body as any
    const { number, sequence, year } = await getNextNumber(app.prisma, 'intervento')
    const item = await app.prisma.intervento.create({
      data: { ...data, number, sequence, year },
      include: { client: { select: { id:true, name:true, city:true } }, attachments: true }
    })
    return reply.code(201).send(item)
  })

  app.put('/api/interventi/:id', { preHandler: authenticate }, async (req) => {
    const { id } = req.params as { id: string }
    const { number, sequence, year, client, preventivo, attachments, ...data } = req.body as any
    return app.prisma.intervento.update({
      where: { id }, data,
      include: { client: { select: { id:true, name:true, city:true } }, attachments: true }
    })
  })

  // Elimina intervento + PDF su Drive + allegati su Drive
  app.delete('/api/interventi/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const item = await app.prisma.intervento.findUnique({
      where: { id },
      include: { attachments: true }
    })
    if (item) {
      if (item.driveFileId) await deleteFile(item.driveFileId)
      for (const att of item.attachments || []) {
        await deleteFile(att.driveFileId)
      }
    }
    await app.prisma.intervento.delete({ where: { id } })
    return reply.code(204).send()
  })

  // Genera PDF (cancella vecchio se esiste) + salva su Drive
  app.post('/api/interventi/:id/pdf', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const intervento = await app.prisma.intervento.findUnique({
      where: { id }, include: { client: true }
    })
    if (!intervento) return reply.code(404).send({ error: 'Non trovato' })

    // Cancella vecchio PDF se esiste
    if (intervento.driveFileId) await deleteFile(intervento.driveFileId)

    const settingsRows = await app.prisma.setting.findMany()
    const settings = Object.fromEntries(settingsRows.map(r => [r.key, r.value]))
    const html = buildInterventiHtml(intervento, intervento.client, settings)
    const pdfBuffer = await generatePdf(html)

    const rootFolderId = process.env.GESTIONALE_DRIVE_FOLDER_ID!
    const subFolderId = await getOrCreateFolder('Rapporti di Intervento', rootFolderId)
    const filename = `${intervento.number}_${(intervento.client as any)?.name?.replace(/[^a-zA-Z0-9]/g,'_')}.pdf`
    const { fileId, webViewLink } = await uploadFile(pdfBuffer, filename, 'application/pdf', subFolderId)

    await app.prisma.intervento.update({
      where: { id },
      data: { driveFileId: fileId, driveUrl: webViewLink }
    })
    return { driveUrl: webViewLink, driveFileId: fileId }
  })

  // Upload allegati immagini
  app.post('/api/interventi/:id/attachments', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const intervento = await app.prisma.intervento.findUnique({ where: { id } })
    if (!intervento) return reply.code(404).send({ error: 'Non trovato' })

    const data = await req.file()
    if (!data) return reply.code(400).send({ error: 'Nessun file' })

    const chunks: Buffer[] = []
    for await (const chunk of data.file) chunks.push(chunk)
    const buf = Buffer.concat(chunks)

    const rootFolderId = process.env.GESTIONALE_DRIVE_FOLDER_ID!
    const subFolderId = await getOrCreateFolder('Rapporti di Intervento', rootFolderId)
    const imgFolderId = await getOrCreateFolder(`${(intervento as any).number}_immagini`, subFolderId)

    const { fileId, webViewLink } = await uploadFile(buf, data.filename, data.mimetype, imgFolderId)

    const attachment = await app.prisma.interventoAttachment.create({
      data: {
        interventoId: id,
        filename: data.filename,
        driveFileId: fileId,
        driveUrl: webViewLink,
        mimeType: data.mimetype,
        sizeBytes: buf.length
      }
    })
    return reply.code(201).send(attachment)
  })

  // Elimina allegato
  app.delete('/api/attachments/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const att = await app.prisma.interventoAttachment.findUnique({ where: { id } })
    if (!att) return reply.code(404).send({ error: 'Non trovato' })
    await deleteFile(att.driveFileId)
    await app.prisma.interventoAttachment.delete({ where: { id } })
    return reply.code(204).send()
  })
}
