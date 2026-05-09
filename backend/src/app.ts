import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import prismaPlugin from './plugins/prisma'
import authRoutes from './routes/auth'
import settingsRoutes from './routes/settings'
import clientsRoutes from './routes/clients'

const app = Fastify({ logger: true })

async function main() {
  await app.register(cors, { origin: true, credentials: true })
  await app.register(jwt, { secret: process.env.JWT_SECRET! })
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } })
  await app.register(prismaPlugin)
  await app.register(authRoutes)
  await app.register(settingsRoutes)
  await app.register(clientsRoutes)
  app.get('/api/health', async () => ({ status: 'ok', app: 'gestionale' }))
  await app.listen({ port: 3000, host: '0.0.0.0' })
}

main().catch((err) => { console.error(err); process.exit(1) })
