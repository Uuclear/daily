import express from 'express';
import cors from 'cors';
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

// Routes
app.use('/api/tasks', tasksRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/persons', personsRouter);

export default app;
