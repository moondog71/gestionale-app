import { FastifyInstance } from 'fastify'
import { authenticate } from '../plugins/authenticate'

export default async function clientsRoutes(app: FastifyInstance) {

  // Lista con ricerca e filtro
  app.get('/api/clients', { preHandler: authenticate }, async (req) => {
    const { search, type } = req.query as { search?: string; type?: string }
    const where: any = {}
    if (type && type !== 'tutti') where.type = type
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { fiscalCode: { contains: search, mode: 'insensitive' } },
      { vatNumber: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
    const clients = await app.prisma.client.findMany({
      where, orderBy: { name: 'asc' },
      include: {
        _count: { select: { preventivi: true, interventi: true, fatture: true } }
      }
    })
    return clients
  })

  // Singolo cliente
  app.get('/api/clients/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const client = await app.prisma.client.findUnique({ where: { id } })
    if (!client) return reply.code(404).send({ error: 'Non trovato' })
    return client
  })

  // Crea
  app.post('/api/clients', { preHandler: authenticate }, async (req, reply) => {
    const data = req.body as any
    const client = await app.prisma.client.create({ data })
    return reply.code(201).send(client)
  })

  // Modifica
  app.put('/api/clients/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const data = req.body as any
    const client = await app.prisma.client.update({ where: { id }, data })
    return client
  })

  // Elimina
  app.delete('/api/clients/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    await app.prisma.client.delete({ where: { id } })
    return reply.code(204).send()
  })
}
