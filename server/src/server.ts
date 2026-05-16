import app from './app';
import { closeDb } from './db/init';

const PORT = parseInt(process.env.PORT || '3001', 10);

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  closeDb();
  server.close();
  process.exit(0);
});
