import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { router as gameRouter } from './routes/game.js';
import { router as sevenhotRouter } from './routes/sevenhot.js';
import { router as yildirimRouter } from './routes/yildirim.js';
import { router as mavimeraRouter } from './routes/mavimera.js';
import { router as authRouter } from './routes/auth.js';
import { router as siteRouter } from './routes/site.js';
import { router as adminRouter } from './routes/admin.js';
import { attachLiveServer } from './live/ws.js';

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
app.use('/api/admin', adminRouter);
app.use('/api', sevenhotRouter);
app.use('/api', yildirimRouter);
app.use('/api', mavimeraRouter);
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

const server = app.listen(config.port, config.host, () => {
  console.log(`🎰 AURUM http://localhost:${config.port} adresinde çalışıyor`);
});

// Gercek zamanli masa oyunlari (WebSocket, /live)
const live = attachLiveServer(server);
app.set('live', live);
