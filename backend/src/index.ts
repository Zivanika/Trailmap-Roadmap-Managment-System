import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import roadmapsRouter from './routes/roadmaps'
import publicRouter from './routes/public'
import exploreRouter from './routes/explore'
import progressRouter from './routes/progress'
import aiRouter from './routes/ai'
import uploadsRouter from './routes/uploads'
import youtubeRouter from './routes/youtube'
import authRouter from './routes/auth'
import { errorHandler } from './middleware/error'
import { apiLimit, publicReadLimit, youtubeLimit } from './middleware/limits'

const app = express()

// Railway puts one proxy in front of the app; trust exactly that hop so
// req.ip is the caller's address, not the proxy's (and can't be spoofed further).
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1))

// CORS: allow the frontend origin to send the Authorization header.
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000'
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  }),
)

app.use(express.json({ limit: '2mb' }))

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api', apiLimit)
app.use('/api/roadmaps', roadmapsRouter)
app.use('/api/r', publicReadLimit, publicRouter)
app.use('/api/explore', publicReadLimit, exploreRouter)
app.use('/api/auth', authRouter)
app.use('/api/progress', progressRouter)
app.use('/api/ai', aiRouter)
app.use('/api/uploads', uploadsRouter)
app.use('/api/youtube', youtubeLimit, youtubeRouter)

app.use(errorHandler)

const PORT = Number(process.env.PORT ?? 8080)
app.listen(PORT, () => {
  console.log(`[trailmap-backend] listening on http://localhost:${PORT}`)
})
