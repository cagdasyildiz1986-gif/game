/**
 * Gorev ve puan sistemi.
 *
 * Puanlar SATILMAZ - yalnizca gorevlerle kazanilir. Her gorevin bir ilerleme
 * sayaci ve bir odulu vardir; hedefe ulasinca oyuncu odulu "topla" ile alir.
 *
 * Gunluk gorevler her gun sifirlanir, kilometre taslari kalicidir.
 */

export const TASK_DEFS = [
  // --- Gunluk ---
  {
    id: 'daily-login',
    period: 'daily',
    name: 'Günlük Giriş',
    description: 'Bugün siteye giriş yap.',
    icon: 'calendar',
    target: 1,
    reward: 500
  },
  {
    id: 'daily-spins',
    period: 'daily',
    name: 'Isınma Turu',
    description: 'Bugün 50 dönüş yap.',
    icon: 'reels',
    target: 50,
    reward: 1000
  },
  {
    id: 'daily-games',
    period: 'daily',
    name: 'Keşfet',
    description: 'Bugün 3 farklı oyun aç.',
    icon: 'compass',
    target: 3,
    reward: 750
  },
  {
    id: 'daily-win',
    period: 'daily',
    name: 'İyi Vuruş',
    description: 'Bugün bahsinin 20 katı kazanç yakala.',
    icon: 'trophy',
    target: 1,
    reward: 1500
  },

  // --- Kalici kilometre taslari ---
  {
    id: 'first-spin',
    period: 'once',
    name: 'İlk Adım',
    description: 'İlk dönüşünü yap.',
    icon: 'flag',
    target: 1,
    reward: 250
  },
  {
    id: 'register',
    period: 'once',
    name: 'Aramıza Katıl',
    description: 'Ücretsiz hesap oluştur.',
    icon: 'user',
    target: 1,
    reward: 2500
  },
  {
    id: 'free-spins',
    period: 'once',
    name: 'Bonus Avcısı',
    description: 'İlk bedava dönüş turunu tetikle.',
    icon: 'gift',
    target: 1,
    reward: 2000
  },
  {
    id: 'favorites',
    period: 'once',
    name: 'Koleksiyoncu',
    description: '5 oyunu favorilerine ekle.',
    icon: 'heart',
    target: 5,
    reward: 1000
  },
  {
    id: 'spins-1000',
    period: 'once',
    name: 'Maratoncu',
    description: 'Toplam 1.000 dönüş yap.',
    icon: 'bolt',
    target: 1000,
    reward: 10000
  },
  {
    id: 'jackpot',
    period: 'once',
    name: 'Şanslı Kart',
    description: 'Jackpot Cards bonusunu kazan.',
    icon: 'crown',
    target: 1,
    reward: 5000
  }
];

export const TASK_BY_ID = new Map(TASK_DEFS.map((t) => [t.id, t]));

export function initialTaskState() {
  const progress = {};
  for (const task of TASK_DEFS) progress[task.id] = { value: 0, claimed: false };
  return { progress, day: today() };
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Gun degistiyse gunluk gorevleri sifirlar. */
export function rollDaily(taskState) {
  const day = today();
  if (taskState.day === day) return false;
  taskState.day = day;
  for (const task of TASK_DEFS) {
    if (task.period === 'daily') taskState.progress[task.id] = { value: 0, claimed: false };
  }
  return true;
}

/** Eksik gorev anahtarlarini tamamlar (yeni gorev eklendiginde). */
function ensure(taskState, id) {
  if (!taskState.progress[id]) taskState.progress[id] = { value: 0, claimed: false };
  return taskState.progress[id];
}

/**
 * Gorev ilerlemesi ekler.
 * @param {'increment'|'set'} mode
 */
export function advance(taskState, id, amount = 1, mode = 'increment') {
  const def = TASK_BY_ID.get(id);
  if (!def) return;
  const entry = ensure(taskState, id);
  if (entry.claimed) return;
  entry.value = mode === 'set' ? amount : entry.value + amount;
  if (entry.value > def.target) entry.value = def.target;
}

/** Bir spinin gorevlere etkisi. */
export function applySpinToTasks(taskState, { spin, bet, totalSpins }) {
  rollDaily(taskState);
  advance(taskState, 'first-spin', 1);
  advance(taskState, 'daily-spins', 1);
  advance(taskState, 'spins-1000', totalSpins, 'set');
  if (spin.freeSpinsAwarded > 0) advance(taskState, 'free-spins', 1);
  if (spin.jackpot) advance(taskState, 'jackpot', 1);
  if (bet > 0 && spin.totalWin >= bet * 20) advance(taskState, 'daily-win', 1);
}

export function taskView(taskState) {
  rollDaily(taskState);
  return TASK_DEFS.map((def) => {
    const entry = ensure(taskState, def.id);
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      period: def.period,
      target: def.target,
      reward: def.reward,
      value: entry.value,
      claimed: entry.claimed,
      complete: entry.value >= def.target
    };
  });
}

/** Tamamlanmis gorevin odulunu verir. */
export function claim(taskState, id) {
  rollDaily(taskState);
  const def = TASK_BY_ID.get(id);
  if (!def) return { error: 'Görev bulunamadı.' };
  const entry = ensure(taskState, id);
  if (entry.value < def.target) return { error: 'Görev henüz tamamlanmadı.' };
  if (entry.claimed) return { error: 'Bu ödül zaten alındı.' };
  entry.claimed = true;
  return { reward: def.reward };
}
