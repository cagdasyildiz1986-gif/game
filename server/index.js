import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { router as gameRouter } from './routes/game.js';
import { router as authRouter } from './routes/auth.js';
import { router as siteRouter } from './routes/site.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

// Capacitor/WebView istemcisi farkli bir kaynaktan (capacitor://, http://localhost) gelir.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use('/api/auth', authRouter);
app.use('/api/site', siteRouter);
app.use('/api', gameRouter);
app.use('/api', (req, res) => res.status(404).json({ error: 'Bilinmeyen uç nokta.' }));
app.get('/healthz', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

app.use(
  express.static(publicDir, {
    setHeaders(res, filePath) {
      if (filePath.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache');
    }
  })
);

// SPA geri dusumu
app.get('*', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));

app.use((err, req, res, next) => {
  console.error('[hata]', err);
  res.status(500).json({ error: 'Sunucu hatası.' });
});

app.listen(config.port, config.host, () => {
  console.log(`🎰 Lucky Reels http://localhost:${config.port} adresinde çalışıyor`);
});
