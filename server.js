import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.use((req, res, next) => {
  const blocked = ['/server.js', '/package.json', '/package-lock.json'];
  if (blocked.includes(req.path) || req.path.startsWith('/node_modules')) {
    return res.status(404).end();
  }
  next();
});

app.use(
  express.static(__dirname, {
    extensions: ['html'],
    index: 'index.html',
  })
);

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`HMG Global Business Solutions server running at http://${HOST}:${PORT}`);
});
