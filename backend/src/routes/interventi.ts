import { FastifyInstance } from 'fastify'
import { authenticate } from '../plugins/authenticate'
import { getNextNumber } from '../services/counter.service'

export default async function interventiRoutes(app: FastifyInstance) {

  // Lista con filtri
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
      include: { client: { select: { id: true, name: true, city: true } } }
    })
  })

  // Singolo
  app.get('/api/interventi/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const item = await app.prisma.intervento.findUnique({
      where: { id },
      include: { client: true, preventivo: { select: { id: true, number: true } } }
    })
    if (!item) return reply.code(404).send({ error: 'Non trovato' })
    return item
  })

  // Crea con numerazione automatica
  app.post('/api/interventi', { preHandler: authenticate }, async (req, reply) => {
    const data = req.body as any
    const { number, sequence, year } = await getNextNumber(app.prisma, 'intervento')
    const item = await app.prisma.intervento.create({
      data: { ...data, number, sequence, year },
      include: { client: { select: { id: true, name: true, city: true } } }
    })
    return reply.code(201).send(item)
  })

  // Modifica
  app.put('/api/interventi/:id', { preHandler: authenticate }, async (req) => {
    const { id } = req.params as { id: string }
    const { number, sequence, year, client, preventivo, ...data } = req.body as any
    return app.prisma.intervento.update({
      where: { id }, data,
      include: { client: { select: { id: true, name: true, city: true } } }
    })
  })

  // Elimina
  app.delete('/api/interventi/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    await app.prisma.intervento.delete({ where: { id } })
    return reply.code(204).send()
  })
}
