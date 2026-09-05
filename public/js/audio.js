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

function noise({ duration = 0.3, gain = 0.06 }) {
  if (!enabled) return;
  const ac = context();
  const frames = Math.floor(ac.sampleRate * duration);
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  }
  const src = ac.createBufferSource();
  const amp = ac.createGain();
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1200;
  amp.gain.value = gain;
  src.buffer = buffer;
  src.connect(filter).connect(amp).connect(ac.destination);
  src.start();
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
  reelStop(index = 0) {
    tone({ freq: 260 + index * 25, type: 'square', duration: 0.06, gain: 0.09 });
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
  }
};
