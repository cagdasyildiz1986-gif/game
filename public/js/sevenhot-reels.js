import { symbolMarkup, bellSprite } from './sevenhot-symbols.js';
import { sfx } from './audio.js';

/**
 * 7 HOT makara seti.
 *
 * Lucky Reels'in ReelSet'inden iki noktada ayrılır:
 *  - 5x4 ızgara (3 değil)
 *  - makara TUTMA desteği: scatter respin'de scatter'lı makaralar dönmez
 *
 * Ayrıca çan hücreleri, taşıdıkları ödülü hücrenin üstünde bir etiketle
 * gösterir; Çan Zinciri turunda ızgara "kilitli tahta" moduna geçer.
 */

export const REELS = 5;
export const ROWS = 4;

/** Dönerken görünen dolgu sembolleri — çan ve scatter dolguya girmez. */
const FILLERS = ['CHERRY', 'LEMON', 'PLUM', 'ORANGE', 'GRAPE', 'MELON', 'BAR', 'SEVEN'];
const randomFiller = () => FILLERS[Math.floor(Math.random() * FILLERS.length)];

function cellHtml(symbolId) {
  return `<div class="cell" data-symbol="${symbolId}">${symbolMarkup(symbolId)}</div>`;
}

export class HotReels {
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
        <div class="hold-tag" hidden>TUTULDU</div>
      </div>`
    ).join('');
    this.reelEls = [...this.root.querySelectorAll('.reel')];
    this.stripEls = [...this.root.querySelectorAll('.strip')];
    this.holdEls = [...this.root.querySelectorAll('.hold-tag')];
    this.setGrid(this.grid);
  }

  setGrid(grid) {
    this.grid = grid;
    this.stripEls.forEach((strip, r) => {
      strip.style.transform = 'translateY(0)';
      strip.innerHTML = grid[r].map(cellHtml).join('');
    });
  }

  cellAt(reel, row) {
    return this.stripEls[reel]?.children[row] || null;
  }

  clearEffects() {
    this.root.querySelectorAll('.cell').forEach((c) => c.classList.remove('win', 'dim'));
    this.reelEls.forEach((r) => r.classList.remove('anticipate'));
  }

  /** Tutulan makaraları görsel olarak işaretler. */
  markHeld(held = []) {
    this.reelEls.forEach((el, r) => {
      const on = held.includes(r);
      el.classList.toggle('held', on);
      this.holdEls[r].hidden = !on;
    });
  }

  clearHeld() {
    this.reelEls.forEach((el) => el.classList.remove('held'));
    this.holdEls.forEach((el) => (el.hidden = true));
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
   * @param {{turbo?:boolean, held?:number[], scatterSymbol?:string, bellSymbol?:string}} opts
   */
  async spinTo(grid, { turbo = false, held = [], scatterSymbol = 'SCATTER', bellSymbol = 'BELL' } = {}) {
    if (this.spinning) return;
    this.spinning = true;
    this.clearEffects();
    sfx.spin();

    const cellH = this.reelEls[0].clientHeight / ROWS;
    const baseDuration = turbo ? 320 : 720;
    const stagger = turbo ? 65 : 155;
    const fillerCount = turbo ? 8 : 15;

    let scattersSoFar = 0;
    let bellsSoFar = 0;
    let anticipationStarted = false;
    const animations = [];

    for (let r = 0; r < REELS; r += 1) {
      const target = grid[r];

      if (held.includes(r)) {
        // Tutulan makara dönmez; sembolleri olduğu gibi kalır.
        this.stripEls[r].innerHTML = target.map(cellHtml).join('');
        scattersSoFar += target.filter((s) => s === scatterSymbol).length;
        bellsSoFar += target.filter((s) => s === bellSymbol).length;
        continue;
      }

      const current = this.grid[r];
      const filler = Array.from({ length: fillerCount + r * 2 }, randomFiller);
      const strip = this.stripEls[r];
      strip.innerHTML = [...target, ...filler, ...current].map(cellHtml).join('');

      const total = target.length + filler.length + current.length;
      const startY = -(total - ROWS) * cellH;

      // Beklenti: önceki makaralarda 2+ scatter ya da 3+ çan varsa gerilim başlar.
      const anticipate = r >= 2 && (scattersSoFar >= 2 || bellsSoFar >= 3);
      const extra = anticipate ? 1900 + (r - 2) * 650 : 0;
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
          strip.innerHTML = target.map(cellHtml).join('');
          this.reelEls[r].classList.remove('spinning', 'anticipate');
          sfx.reelStop(r, anticipate);
        })
      );

      scattersSoFar += target.filter((s) => s === scatterSymbol).length;
      bellsSoFar += target.filter((s) => s === bellSymbol).length;
    }

    await Promise.all(animations);
    this.grid = grid;
    this.spinning = false;
  }

  /* ═══════════ Çan Zinciri tahtası ═══════════ */

  /**
   * Izgarayı kilitli tahta moduna geçirir: her hücre ya bir çan ya da boş.
   * @param {(object|null)[][]} board [reel][row] -> çan hücresi veya null
   * @param {(cell:object)=>string} label hücre etiketini üreten işlev
   */
  renderBoard(board, label) {
    this.root.classList.add('hold-board');
    this.clearHeld();
    for (let r = 0; r < REELS; r += 1) {
      this.stripEls[r].style.transform = 'translateY(0)';
      this.stripEls[r].innerHTML = board[r]
        .map((cell) => (cell ? this.#bellCellHtml(cell, label) : '<div class="cell hole"></div>'))
        .join('');
    }
  }

  #bellCellHtml(cell, label, extra = '') {
    const sprite = bellSprite(cell);
    const text = label(cell);
    return `<div class="cell bell-cell ${extra}" data-bell="${cell.id}">
      ${symbolMarkup(sprite)}
      ${text ? `<span class="bell-tag">${text}</span>` : ''}
    </div>`;
  }

  /** Tek bir hücreye çan düşürür (Çan Zinciri respin'i). */
  dropBell(cell, label) {
    const el = this.cellAt(cell.reel, cell.row);
    if (!el) return;
    el.outerHTML = this.#bellCellHtml(cell, label, 'landing');
  }

  /** Boş hücreleri kısa süre titretir — respin hissi verir. */
  async flickerEmpty(ms = 380) {
    const empties = [...this.root.querySelectorAll('.cell.hole')];
    empties.forEach((e) => e.classList.add('rolling'));
    sfx.spin();
    await new Promise((r) => setTimeout(r, ms));
    empties.forEach((e) => e.classList.remove('rolling'));
  }

  exitBoard() {
    this.root.classList.remove('hold-board');
  }
}
