import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import prismaPlugin from './plugins/prisma'
import authRoutes from './routes/auth'
import settingsRoutes from './routes/settings'
import clientsRoutes from './routes/clients'
import interventiRoutes from './routes/interventi'
import preventiviRoutes from './routes/preventivi'
import scontriniRoutes from './routes/scontrini'
import geoRoutes from './routes/geo'
import { loadCapData } from './services/geo.service'

const app = Fastify({ logger: true })

async function main() {
  await app.register(cors, { origin: true, credentials: true })
  await app.register(jwt, { secret: process.env.JWT_SECRET! })
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } })
  await app.register(prismaPlugin)
  await app.register(authRoutes)
  await app.register(settingsRoutes)
  await app.register(clientsRoutes)
  await app.register(interventiRoutes)
  await app.register(preventiviRoutes)
  await app.register(scontriniRoutes)
  await app.register(geoRoutes)
  app.get('/api/health', async () => ({ status: 'ok', app: 'gestionale' }))
  loadCapData().catch(console.error)
  await app.listen({ port: 3000, host: '0.0.0.0' })
}

main().catch((err) => { console.error(err); process.exit(1) })
