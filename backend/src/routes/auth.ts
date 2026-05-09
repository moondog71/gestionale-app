import { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'

const refreshTokens = new Set<string>()

export default async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/login', async (req, reply) => {
    const { username, password } = req.body as { username: string; password: string }
    if (username !== process.env.APP_USERNAME)
      return reply.code(401).send({ error: 'Credenziali non valide' })
    const valid = await bcrypt.compare(password, process.env.APP_PASSWORD_HASH!)
    if (!valid) return reply.code(401).send({ error: 'Credenziali non valide' })
    const token = app.jwt.sign({ username })
    const refreshToken = app.jwt.sign({ username, type: 'refresh' }, { expiresIn: '30d' })
    refreshTokens.add(refreshToken)
    return { token, refreshToken }
  })

  app.post('/api/auth/refresh', async (req, reply) => {
    const { refreshToken } = req.body as { refreshToken: string }
    if (!refreshTokens.has(refreshToken))
      return reply.code(401).send({ error: 'Refresh token non valido' })
    try {
      const decoded = app.jwt.verify(refreshToken) as { username: string }
      const token = app.jwt.sign({ username: decoded.username })
      return { token }
    } catch {
      refreshTokens.delete(refreshToken)
      return reply.code(401).send({ error: 'Refresh token scaduto' })
    }
  })

  app.post('/api/auth/logout', async (req) => {
    const { refreshToken } = req.body as { refreshToken: string }
    refreshTokens.delete(refreshToken)
    return { ok: true }
  })
}
