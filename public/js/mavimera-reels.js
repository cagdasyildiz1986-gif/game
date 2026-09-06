import { symbolMarkup, moneySprite } from './mavimera-symbols.js';
import { sfx } from './audio.js';

/**
 * MAVİ MERA makara seti (5x3).
 *
 * Para balıkları taşıdıkları tutarla BİRLİKTE üretilir: makara dururken
 * sonradan etiket eklenmez, oyuncu balığı gördüğü anda değerini de görür.
 */

export const REELS = 5;
export const ROWS = 3;

/** Dönerken görünen dolgu sembolleri — para, dümen ve balıkçı dolguya girmez. */
const FILLERS = ['KUTU', 'YEM', 'MAKARA', 'MARTI', 'FENER', 'CIPURA', 'LEVREK', 'KIRMIZI', 'LUFER'];
const randomFiller = () => FILLERS[Math.floor(Math.random() * FILLERS.length)];

/** [reel,row] -> para hücresi sözlüğü. */
function moneyMap(cells = []) {
  const map = new Map();
  for (const cell of cells) map.set(`${cell.reel}:${cell.row}`, cell);
  return map;
}

/** Bir hücrenin işaretlemesi. */
function cellHtml(symbolId, money = null, label = null) {
  if (symbolId === 'PARA' && money) {
    const text = label ? label(money) : '';
    const jp = money.jackpot ? ` data-jackpot="${money.jackpot}"` : '';
    return `<div class="cell money-cell" data-symbol="PARA" data-money="${money.id}"${jp}>
      ${symbolMarkup(moneySprite(money))}
      ${text ? `<span class="money-tag">${text}</span>` : ''}
    </div>`;
  }
  const extra = symbolId === 'BALIKCI' ? ' fisher-cell' : '';
  return `<div class="cell${extra}" data-symbol="${symbolId}">${symbolMarkup(symbolId)}</div>`;
}

export class MeraReels {
  constructor(root) {
    this.root = root;
    this.grid = Array.from({ length: REELS }, () =>
      Array.from({ length: ROWS }, randomFiller)
    );
    this.spinning = false;
    this.#build();
  }

  #build() {
    this.root.innerHTML = Array.from(
      { length: REELS },
      (_, r) => `<div class="reel" data-reel="${r}">
        <div class="strip"></div><div class="flames"></div>
      </div>`
    ).join('');
    this.reelEls = [...this.root.querySelectorAll('.reel')];
    this.stripEls = [...this.root.querySelectorAll('.strip')];
    this.setGrid(this.grid);
  }

  setGrid(grid, money = [], label = null) {
    this.grid = grid;
    const at = moneyMap(money);
    this.stripEls.forEach((strip, r) => {
      strip.style.transform = 'translateY(0)';
      strip.innerHTML = grid[r]
        .map((sym, row) => cellHtml(sym, at.get(`${r}:${row}`), label))
        .join('');
    });
  }

  cellAt(reel, row) {
    return this.stripEls[reel]?.children[row] || null;
  }

  clearEffects() {
    this.root.querySelectorAll('.cell').forEach((c) =>
      c.classList.remove('win', 'dim', 'collected', 'casting'));
    this.reelEls.forEach((r) => r.classList.remove('anticipate'));
  }

  highlight(positions, { dimOthers = true } = {}) {
    const keys = new Set(positions.map(([reel, row]) => `${reel}:${row}`));
    this.root.querySelectorAll('.cell').forEach((c) => c.classList.remove('win', 'dim'));
    for (let r = 0; r < REELS; r += 1) {
      for (let row = 0; row < ROWS; row += 1) {
        const cell = this.cellAt(r, row);
        if (!cell) continue;
        if (keys.has(`${r}:${row}`)) cell.classList.add('win');
        else if (dimOthers) cell.classList.add('dim');
      }
    }
  }

  /**
   * Hedef ızgaraya animasyonlu geçiş.
   * @param {string[][]} grid
   * @param {{turbo?:boolean, scatterSymbol?:string, money?:object[], moneyLabel?:Function}} opts
   */
  async spinTo(grid, {
    turbo = false, scatterSymbol = 'DUMEN', money = [], moneyLabel = null
  } = {}) {
    if (this.spinning) return;
    this.spinning = true;
    this.clearEffects();
    sfx.spin();

    const cellH = this.reelEls[0].clientHeight / ROWS;
    const baseDuration = turbo ? 320 : 700;
    const stagger = turbo ? 65 : 150;
    const fillerCount = turbo ? 8 : 14;

    let scattersSoFar = 0;
    let anticipationStarted = false;
    const animations = [];
    const at = moneyMap(money);
    const targetHtml = (r) =>
      grid[r].map((sym, row) => cellHtml(sym, at.get(`${r}:${row}`), moneyLabel)).join('');

    for (let r = 0; r < REELS; r += 1) {
      const target = grid[r];
      const current = this.grid[r];
      const filler = Array.from({ length: fillerCount + r * 2 }, randomFiller);
      const strip = this.stripEls[r];
      strip.innerHTML =
        targetHtml(r) + [...filler, ...current].map((sym) => cellHtml(sym)).join('');

      const total = target.length + filler.length + current.length;
      const startY = -(total - ROWS) * cellH;

      // Beklenti YALNIZCA dümen (scatter) içindir: önceki makaralarda 2+
      // dümen varsa kalan makaralar yavaşlar.
      const anticipate = r >= 2 && scattersSoFar >= 2;
      const extra = anticipate ? 1800 + (r - 2) * 620 : 0;
      const duration = baseDuration + r * stagger + extra;
      if (anticipate) {
        this.reelEls[r].classList.add('anticipate');
        if (!anticipationStarted) {
          anticipationStarted = true;
          sfx.anticipation(extra + baseDuration);
        }
      }

      strip.style.transform = `translateY(${startY}px)`;
      this.reelEls[r].classList.add('spinning');

      const animation = strip.animate(
        [{ transform: `translateY(${startY}px)` }, { transform: 'translateY(0px)' }],
        { duration, easing: 'cubic-bezier(.25,.85,.30,1.04)', fill: 'forwards' }
      );

      animations.push(
        animation.finished.then(() => {
          animation.cancel();
          strip.style.transform = 'translateY(0px)';
          strip.innerHTML = targetHtml(r);
          this.reelEls[r].classList.remove('spinning', 'anticipate');
          sfx.reelStop(r, anticipate);
        })
      );

      scattersSoFar += target.filter((s) => s === scatterSymbol).length;
    }

    await Promise.all(animations);
    this.grid = grid;
    this.spinning = false;
  }
}
