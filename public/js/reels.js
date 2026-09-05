import { symbolMarkup, SYMBOL_ORDER } from './symbols.js';
import { sfx } from './audio.js';

const ROWS = 3;
const REELS = 5;

function randomSymbol() {
  return SYMBOL_ORDER[Math.floor(Math.random() * SYMBOL_ORDER.length)];
}

function cellHtml(symbolId) {
  return `<div class="cell" data-symbol="${symbolId}">${symbolMarkup(symbolId)}</div>`;
}

export class ReelSet {
  /**
   * @param {HTMLElement} root .reels kapsayicisi
   */
  constructor(root) {
    this.root = root;
    this.grid = Array.from({ length: REELS }, () => Array.from({ length: ROWS }, randomSymbol));
    this.spinning = false;
    this.#build();
  }

  #build() {
    this.root.innerHTML = Array.from(
      { length: REELS },
      (_, r) => `<div class="reel" data-reel="${r}"><div class="strip"></div></div>`
    ).join('');
    this.reelEls = [...this.root.querySelectorAll('.reel')];
    this.stripEls = [...this.root.querySelectorAll('.strip')];
    this.setGrid(this.grid);
  }

  /** Animasyonsuz olarak grid'i yerlestirir. */
  setGrid(grid) {
    this.grid = grid;
    this.stripEls.forEach((strip, r) => {
      strip.style.transform = 'translateY(0)';
      strip.innerHTML = grid[r].map(cellHtml).join('');
    });
  }

  cellAt(reel, row) {
    return this.stripEls[reel].children[row];
  }

  clearEffects() {
    this.root.querySelectorAll('.cell').forEach((cell) => {
      cell.classList.remove('win', 'dim');
    });
    this.root.querySelectorAll('.reel').forEach((r) => r.classList.remove('anticipate'));
  }

  /** Kazanan hucreleri vurgular, digerlerini soluklastirir. */
  highlight(positions, { dimOthers = true } = {}) {
    const keys = new Set(positions.map(([reel, row]) => `${reel}:${row}`));
    this.root.querySelectorAll('.cell').forEach((cell) => cell.classList.remove('win', 'dim'));
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
   * Hedef grid'e dogru animasyonlu donus.
   * @param {string[][]} grid sunucudan gelen sonuc
   * @param {{turbo?: boolean, scatterSymbol?: string}} opts
   */
  async spinTo(grid, { turbo = false, scatterSymbol = 'DOLLAR' } = {}) {
    if (this.spinning) return;
    this.spinning = true;
    this.clearEffects();
    sfx.spin();

    const cellH = this.reelEls[0].clientHeight / ROWS;
    const baseDuration = turbo ? 320 : 750;
    const stagger = turbo ? 70 : 170;
    const fillerCount = turbo ? 8 : 16;

    let scattersSoFar = 0;
    const animations = [];

    for (let r = 0; r < REELS; r += 1) {
      const current = this.grid[r];
      const target = grid[r];
      const filler = Array.from({ length: fillerCount + r * 2 }, randomSymbol);
      const strip = this.stripEls[r];
      strip.innerHTML = [...target, ...filler, ...current].map(cellHtml).join('');

      const total = target.length + filler.length + current.length;
      const startY = -(total - ROWS) * cellH;

      // Beklenti efekti: ilk makaralarda 2+ scatter varsa son makaralar yavaslar.
      const anticipate = r >= 3 && scattersSoFar >= 2;
      const duration = baseDuration + r * stagger + (anticipate ? 900 : 0);
      if (anticipate) this.reelEls[r].classList.add('anticipate');

      strip.style.transform = `translateY(${startY}px)`;
      this.reelEls[r].classList.add('spinning');

      const animation = strip.animate(
        [{ transform: `translateY(${startY}px)` }, { transform: 'translateY(0px)' }],
        { duration, easing: 'cubic-bezier(.25,.85,.30,1.04)', fill: 'forwards' }
      );

      animations.push(
        animation.finished.then(() => {
          animation.cancel(); // fill:forwards birikmesin
          strip.style.transform = 'translateY(0px)';
          strip.innerHTML = target.map(cellHtml).join('');
          this.reelEls[r].classList.remove('spinning', 'anticipate');
          sfx.reelStop(r);
        })
      );

      scattersSoFar += target.filter((s) => s === scatterSymbol).length;
    }

    await Promise.all(animations);
    this.grid = grid;
    this.spinning = false;
  }
}

export { ROWS, REELS };
