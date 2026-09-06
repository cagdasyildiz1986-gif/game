/**
 * Ses efektleri Web Audio API ile sentezlenir - harici ses dosyasi yok,
 * bu sayede uygulama boyutu kucuk kalir ve offline calisir.
 */
let ctx = null;
let enabled = localStorage.getItem('lucky-reels-sound') !== 'off';

function context() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ freq = 440, type = 'sine', duration = 0.12, gain = 0.15, at = 0, sweep = null }) {
  if (!enabled) return;
  const ac = context();
  const t0 = ac.currentTime + at;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(1, sweep), t0 + duration);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(amp).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/**
 * Filtrelenmis gurultu.
 * @param {object} o
 * @param {number} o.duration saniye
 * @param {number} o.gain     tepe seviye
 * @param {string} o.type     biquad turu (bandpass / lowpass / highpass)
 * @param {number} o.freq     filtre kesim frekansi
 * @param {number} o.sweepTo  varsa filtre bu frekansa suzulur (gok gurultusu)
 * @param {number} o.q        filtre keskinligi
 * @param {number} o.at       gecikme
 * @param {number} o.attack   yukselis suresi (0 = ani vurus)
 */
function noise({
  duration = 0.3, gain = 0.06, type = 'bandpass', freq = 1200,
  sweepTo = null, q = 1, at = 0, attack = 0
}) {
  if (!enabled) return;
  const ac = context();
  const t0 = ac.currentTime + at;
  const frames = Math.max(1, Math.floor(ac.sampleRate * duration));
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;

  const src = ac.createBufferSource();
  const amp = ac.createGain();
  const filter = ac.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(freq, t0);
  if (sweepTo) filter.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), t0 + duration);
  filter.Q.value = q;

  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + Math.max(0.004, attack));
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  src.buffer = buffer;
  src.connect(filter).connect(amp).connect(ac.destination);
  src.start(t0);
  src.stop(t0 + duration + 0.02);
}

export const sfx = {
  get enabled() {
    return enabled;
  },
  toggle() {
    enabled = !enabled;
    localStorage.setItem('lucky-reels-sound', enabled ? 'on' : 'off');
    if (enabled) tone({ freq: 660, duration: 0.08, gain: 0.1 });
    return enabled;
  },
  unlock() {
    if (enabled) context();
  },
  spin() {
    noise({ duration: 0.35, gain: 0.05 });
    tone({ freq: 180, type: 'triangle', duration: 0.25, gain: 0.08, sweep: 90 });
  },
  reelStop(index = 0, heavy = false) {
    tone({ freq: 260 + index * 25, type: 'square', duration: 0.06, gain: 0.09 });
    if (heavy) {
      // Beklentiden sonra duran makara icin tok bir "cat" sesi
      tone({ freq: 110, type: 'sawtooth', duration: 0.22, gain: 0.14, sweep: 55 });
      noise({ duration: 0.18, gain: 0.08 });
    }
  },
  /** Scatter beklentisi: yukselen, hizlanan gerilim sesi. */
  anticipation(durationMs = 2000) {
    if (!enabled) return;
    const seconds = durationMs / 1000;
    let t = 0;
    let step = 0;
    while (t < seconds) {
      const progress = t / seconds;
      tone({
        freq: 300 + progress * 700,
        type: 'square',
        duration: 0.07,
        gain: 0.05 + progress * 0.06,
        at: t
      });
      // Vurus araligi giderek kisalir -> nabiz hizlanir
      t += Math.max(0.07, 0.24 - progress * 0.17);
      step += 1;
    }
    // Alt katmanda yukselen ugultu
    tone({ freq: 90, type: 'sawtooth', duration: seconds, gain: 0.05, sweep: 320 });
  },
  win(level = 1) {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    const count = Math.min(notes.length, 2 + level);
    for (let i = 0; i < count; i += 1) {
      tone({ freq: notes[i], type: 'triangle', duration: 0.16, gain: 0.12, at: i * 0.08 });
    }
  },
  bigWin() {
    const seq = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5];
    seq.forEach((freq, i) =>
      tone({ freq, type: 'sawtooth', duration: 0.2, gain: 0.1, at: i * 0.12 })
    );
  },
  coin(i = 0) {
    tone({ freq: 900 + (i % 5) * 60, type: 'square', duration: 0.05, gain: 0.05 });
  },
  jackpot() {
    for (let i = 0; i < 12; i += 1) {
      tone({
        freq: 400 + i * 90,
        type: 'sawtooth',
        duration: 0.18,
        gain: 0.09,
        at: i * 0.09
      });
    }
  },
  click() {
    tone({ freq: 520, type: 'square', duration: 0.04, gain: 0.06 });
  },

  /* ═══════════ Fırtına paleti (YILDIRIM) ═══════════ */

  /**
   * GÖK GÜRÜLTÜSÜ — çarpan indiğinde duyulan ana efekt.
   * Üç katman: keskin çatırtı (tiz), gövde (süzülen uğultu) ve derin sub.
   * `big` verildiğinde sesin tamamı öne çıkar; oyunun en yüksek efektidir.
   */
  thunder({ big = false, at = 0 } = {}) {
    if (!enabled) return;
    const k = big ? 1 : 0.55;
    // 1) Çatırtı — yıldırımın çarptığı an
    noise({ duration: 0.09, gain: 0.30 * k, type: 'highpass', freq: 2600, at });
    noise({ duration: 0.05, gain: 0.22 * k, type: 'bandpass', freq: 5200, q: 0.8, at });
    // 2) Gövde — açılıp dağılan uğultu
    noise({
      duration: big ? 1.5 : 0.8,
      gain: 0.24 * k,
      type: 'lowpass',
      freq: 900,
      sweepTo: 70,
      at: at + 0.03,
      attack: 0.02
    });
    // 3) Derin sub — göğüste hissedilen kısım
    tone({
      freq: big ? 62 : 78, type: 'sine',
      duration: big ? 1.1 : 0.6,
      gain: 0.30 * k, sweep: big ? 32 : 46, at: at + 0.02
    });
    if (big) tone({ freq: 140, type: 'triangle', duration: 0.35, gain: 0.12, sweep: 60, at: at + 0.02 });
  },

  /** Elektrik çıtırtısı — küre belirirken. */
  zap(at = 0) {
    noise({ duration: 0.07, gain: 0.16, type: 'bandpass', freq: 3400, q: 4, at });
    tone({ freq: 1900, type: 'square', duration: 0.08, gain: 0.10, sweep: 320, at });
  },

  /** Taş kırılması — kazanan semboller patlarken. */
  gemBreak(count = 1) {
    const base = [1500, 2050, 2700];
    base.forEach((f, i) =>
      tone({ freq: f * (0.94 + Math.random() * 0.12), type: 'triangle',
        duration: 0.07, gain: 0.09, at: i * 0.018 })
    );
    noise({ duration: 0.12, gain: 0.09 + Math.min(0.06, count * 0.006),
      type: 'highpass', freq: 2200 });
  },

  /** Taşın yuvaya oturması. */
  gemLand(index = 0) {
    tone({ freq: 220 + index * 18, type: 'triangle', duration: 0.07, gain: 0.08, sweep: 120 });
    noise({ duration: 0.05, gain: 0.05, type: 'lowpass', freq: 900 });
  },

  /** Fırtına çevirmesi — rüzgâr + uzak gürleme. */
  stormSpin() {
    noise({ duration: 0.5, gain: 0.07, type: 'lowpass', freq: 700, sweepTo: 240, attack: 0.08 });
    tone({ freq: 120, type: 'sine', duration: 0.4, gain: 0.09, sweep: 65 });
  },

  /** Çarpanlar toplanırken yükselen şarj sesi. */
  charge(step = 0) {
    tone({ freq: 320 + step * 110, type: 'square', duration: 0.1, gain: 0.09, sweep: 1600 });
    noise({ duration: 0.06, gain: 0.05, type: 'bandpass', freq: 2600, q: 3 });
  },

  /* ═══════════ MAVİ MERA · deniz paleti ═══════════ */

  /** Oltanın savrulması: kısa bir vınlama + suya çarpma. */
  cast() {
    noise({ duration: 0.22, gain: 0.05, type: 'bandpass', freq: 900, sweepTo: 2600, q: 2 });
    tone({ freq: 520, type: 'triangle', duration: 0.1, gain: 0.06, sweep: 260, at: 0.12 });
  },

  /**
   * Balığın sarılıp çekilmesi: makara tıkırtısı + su şapırtısı.
   * `weight` büyüdükçe ses kalınlaşır (jackpot balığı daha tok duyulur).
   */
  reelIn(weight = 1) {
    const base = 380 + weight * 90;
    tone({ freq: base, type: 'square', duration: 0.05, gain: 0.05, sweep: base * 1.6 });
    tone({ freq: base * 1.5, type: 'sine', duration: 0.12, gain: 0.07, sweep: base * 2.4, at: 0.04 });
    noise({ duration: 0.14, gain: 0.05 + weight * 0.01, type: 'lowpass', freq: 1400, sweepTo: 400, at: 0.03 });
  },

  /** Büyük av: derin bir su patlaması + yükselen üçlü akor. */
  bigCatch() {
    noise({ duration: 0.45, gain: 0.1, type: 'lowpass', freq: 2200, sweepTo: 260 });
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, type: 'triangle', duration: 0.3, gain: 0.1, at: i * 0.075 }));
    tone({ freq: 130, type: 'sine', duration: 0.5, gain: 0.09, sweep: 80, at: 0.05 });
  },

  /** Seviye atlama: dört basamaklı yükselen fanfar. */
  levelUp() {
    [392, 523, 659, 880, 1175].forEach((f, i) =>
      tone({ freq: f, type: 'square', duration: 0.16, gain: 0.075, at: i * 0.09 }));
    noise({ duration: 0.3, gain: 0.05, type: 'bandpass', freq: 1800, sweepTo: 4200, q: 2, at: 0.1 });
  }
};
