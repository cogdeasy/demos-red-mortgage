import express from 'express';
import cors from 'cors';
import { initDatabase } from './config/database';
import applicationRoutes from './routes/applications';
import documentRoutes from './routes/documents';
import noteRoutes from './routes/notes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'mortgage-api', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/applications', documentRoutes);
// Document verification uses a different base path
app.use('/api/v1/documents', documentRoutes);
// Notes routes
app.use('/api/v1/applications', noteRoutes);
app.use('/api/v1/notes', noteRoutes);

// Start server
async function start(): Promise<void> {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Mortgage API running on http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;
