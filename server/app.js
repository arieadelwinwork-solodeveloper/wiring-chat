import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import profileRoutes from './routes/profile.js';
import contactRoutes from './routes/contacts.js';
import roomRoutes from './routes/rooms.js';
import groupRoutes from './routes/groups.js';
import botRoutes from './routes/bots.js';
import chatRoutes from './routes/chat.js';

const app = express();

app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", 'https://*.supabase.co'],
    objectSrc: ["'none'"],
  },
}));

app.use(cors({
  origin: env.corsOrigin,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Terlalu banyak request, coba lagi nanti' },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Limit AI request tercapai' },
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/', limiter);
app.use('/api/chat', aiLimiter);

app.use('/api/profile', authMiddleware, profileRoutes);
app.use('/api/contacts', authMiddleware, contactRoutes);
app.use('/api/rooms', authMiddleware, roomRoutes);
app.use('/api/groups', authMiddleware, groupRoutes);
app.use('/api/bots', authMiddleware, botRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);

app.use(errorHandler);

export default app;
