import { FastifyInstance } from 'fastify'
import { lookupCap } from '../services/geo.service'

export default async function geoRoutes(app: FastifyInstance) {
  app.get('/api/geo/cap/:cap', async (req, reply) => {
    const { cap } = req.params as { cap: string }
    if (!/^\d{5}$/.test(cap)) return reply.code(400).send({ error: 'CAP non valido' })
    const results = lookupCap(cap)
    if (results.length === 0) return reply.code(404).send({ error: 'CAP non trovato' })
    return results
  })
}
