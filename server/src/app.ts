import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import tasksRouter from './routes/tasks';
import scheduleRouter from './routes/schedule';
import teamsRouter from './routes/teams';
import weatherRouter from './routes/weather';
import personsRouter from './routes/persons';
import { getDb } from './db/init';

const app = express();

app.use(cors());
app.use(express.json());

// Initialize database
getDb();

// API Routes
app.use('/api/tasks', tasksRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/persons', personsRouter);

// Serve production frontend static files
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback - serve index.html for non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

export default app;
