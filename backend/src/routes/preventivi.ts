import { FastifyInstance } from 'fastify'
import { authenticate } from '../plugins/authenticate'
import { getNextNumber } from '../services/counter.service'
import { buildPreventivoHtml, generatePdf } from '../services/pdf.service'
import { getOrCreateFolder, uploadFile, deleteFile } from '../services/drive.service'

export default async function preventiviRoutes(app: FastifyInstance) {

  app.get('/api/preventivi', { preHandler: authenticate }, async (req) => {
    const { search, clientId, status } = req.query as any
    const where: any = {}
    if (clientId) where.clientId = clientId
    if (status) where.status = status
    if (search) where.OR = [
      { number: { contains: search, mode: 'insensitive' } },
      { client: { name: { contains: search, mode: 'insensitive' } } },
      { notes: { contains: search, mode: 'insensitive' } },
    ]
    return app.prisma.preventivo.findMany({
      where, orderBy: { date: 'desc' },
      include: { client: { select: { id:true, name:true, city:true } } }
    })
  })

  app.get('/api/preventivi/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const item = await app.prisma.preventivo.findUnique({
      where: { id }, include: { client: true }
    })
    if (!item) return reply.code(404).send({ error: 'Non trovato' })
    return item
  })

  app.post('/api/preventivi', { preHandler: authenticate }, async (req, reply) => {
    const data = req.body as any
    const { number, sequence, year } = await getNextNumber(app.prisma, 'preventivo')
    const item = await app.prisma.preventivo.create({
      data: { ...data, number, sequence, year },
      include: { client: { select: { id:true, name:true, city:true } } }
    })
    return reply.code(201).send(item)
  })

  app.put('/api/preventivi/:id', { preHandler: authenticate }, async (req) => {
    const { id } = req.params as { id: string }
    const { number, sequence, year, client, interventi, fatture, ...data } = req.body as any
    return app.prisma.preventivo.update({
      where: { id }, data,
      include: { client: { select: { id:true, name:true, city:true } } }
    })
  })

  app.delete('/api/preventivi/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const item = await app.prisma.preventivo.findUnique({ where: { id } })
    if (item?.driveFileId) await deleteFile(item.driveFileId)
    await app.prisma.preventivo.delete({ where: { id } })
    return reply.code(204).send()
  })

  app.post('/api/preventivi/:id/pdf', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const preventivo = await app.prisma.preventivo.findUnique({
      where: { id }, include: { client: true }
    })
    if (!preventivo) return reply.code(404).send({ error: 'Non trovato' })
    if (preventivo.driveFileId) await deleteFile(preventivo.driveFileId)

    const settingsRows = await app.prisma.setting.findMany()
    const settings = Object.fromEntries(settingsRows.map(r => [r.key, r.value]))
    const html = buildPreventivoHtml(preventivo, preventivo.client, settings)
    const pdfBuffer = await generatePdf(html)

    const rootFolderId = process.env.GESTIONALE_DRIVE_FOLDER_ID!
    const subFolderId = await getOrCreateFolder('Preventivi', rootFolderId)
    const filename = `${preventivo.number}_${(preventivo.client as any)?.name?.replace(/[^a-zA-Z0-9]/g,'_')}.pdf`
    const { fileId, webViewLink } = await uploadFile(pdfBuffer, filename, 'application/pdf', subFolderId)

    await app.prisma.preventivo.update({
      where: { id }, data: { driveFileId: fileId, driveUrl: webViewLink }
    })
    return { driveUrl: webViewLink, driveFileId: fileId }
  })
}
