/**
 * GitHub Pages icin statik demo derlemesi.
 *
 * public/ klasorunu dist/ altina kopyalar, gercek oyun modullerini
 * server/game/ -> dist/engine/ olarak tasir ve env.js dosyasini
 * demo moduna alir. Boylece Pages surumu ile sunucu surumu
 * ayni oyun matematigini kullanir.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

fs.rmSync(dist, { recursive: true, force: true });
fs.cpSync(path.join(root, 'public'), dist, { recursive: true });
fs.cpSync(path.join(root, 'server', 'game'), path.join(dist, 'engine'), { recursive: true });
// Site modulleri (katalog, gorevler) demo arka ucu tarafindan da kullanilir.
fs.cpSync(path.join(root, 'server', 'site'), path.join(dist, 'engine', 'site'), { recursive: true });

// rng.js node:crypto kullanir; tarayici surumunde gerekmez.
fs.rmSync(path.join(dist, 'engine', 'rng.js'), { force: true });

const envFile = path.join(dist, 'js', 'env.js');
fs.writeFileSync(
  envFile,
  `/* GitHub Pages demo derlemesi - tools/build-demo.js tarafindan uretildi */
window.SLOT_API_BASE = '';
window.SLOT_DEMO = true;
`
);

// GitHub Pages Jekyll islemesini atla
fs.writeFileSync(path.join(dist, '.nojekyll'), '');

const files = fs.readdirSync(dist, { recursive: true }).filter((f) => typeof f === 'string');
console.log(`dist/ hazır — ${files.length} dosya`);
