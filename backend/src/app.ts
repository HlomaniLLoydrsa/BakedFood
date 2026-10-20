import express from 'express';
import cors from 'cors';
import path from 'path';
import 'express-async-errors';

import categoryRoutes from './routes/categories';
import productRoutes from './routes/products';
import dropRoutes from './routes/drops';
import orderRoutes from './routes/orders';
import settingsRoutes from './routes/settings';
import dashboardRoutes from './routes/dashboard';
import storeRoutes from './routes/store';
import pinRoutes from './routes/pin';
import reviewRoutes from './routes/reviews';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// CORS
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      // Allow configured origin, localhost, and any vercel.app subdomain
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.railway.app')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files (local dev only — production uses Cloudinary)
if (process.env.NODE_ENV !== 'production') {
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  app.use('/uploads', express.static(path.resolve(uploadDir)));
}

// API Routes
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/drops', dropRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/pin', pinRoutes);
app.use('/api/reviews', reviewRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler must be last
app.use(errorHandler);

export default app;
