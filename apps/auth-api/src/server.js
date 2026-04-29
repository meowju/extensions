import 'dotenv/config';
import app from './app.js';
import initDatabase from './db/init.js';

const PORT = process.env.PORT || 3000;

initDatabase();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});