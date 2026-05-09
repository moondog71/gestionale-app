import { FastifyInstance } from 'fastify'
import { authenticate } from '../plugins/authenticate'

export default async function settingsRoutes(app: FastifyInstance) {
  app.get('/api/settings', { preHandler: authenticate }, async () => {
    const rows = await app.prisma.setting.findMany()
    return Object.fromEntries(rows.map(r => [r.key, r.value]))
  })

  app.put('/api/settings', { preHandler: authenticate }, async (req) => {
    const data = req.body as Record<string, string>
    await Promise.all(Object.entries(data).map(([key, value]) =>
      app.prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
    ))
    return { ok: true }
  })
}
