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
      app.prisma.setting.upsert({ where:{key}, update:{value}, create:{key,value} })
    ))
    return { ok: true }
  })

  // Upload logo: accetta file PNG/JPG e salva come base64
  app.post('/api/settings/logo', { preHandler: authenticate }, async (req, reply) => {
    const data = await req.file()
    if (!data) return reply.code(400).send({ error: 'Nessun file' })
    const chunks: Buffer[] = []
    for await (const chunk of data.file) chunks.push(chunk)
    const buf = Buffer.concat(chunks)
    const mime = data.mimetype || 'image/png'
    const b64 = `data:${mime};base64,${buf.toString('base64')}`
    await app.prisma.setting.upsert({
      where: { key: 'company_logo_base64' },
      update: { value: b64 },
      create: { key: 'company_logo_base64', value: b64 }
    })
    return { ok: true, size: buf.length }
  })
}
