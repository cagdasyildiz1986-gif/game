import crypto from 'node:crypto';

/**
 * Rastgele sayi ureteci katmani.
 * - CryptoRng: uretim ortami (kriptografik guvenli)
 * - ProvablyFairRng: sunucu tohumu + istemci tohumu + nonce (dogrulanabilir adalet)
 * - SeededRng: hizli, deterministik (RTP simulasyonu icin)
 */

export class CryptoRng {
  /** [0, max) araliginda tamsayi. */
  int(max) {
    return crypto.randomInt(max);
  }
  /** [0, 1) araliginda ondalik. */
  float() {
    return crypto.randomInt(0, 2 ** 32) / 2 ** 32;
  }
}

export class SeededRng {
  constructor(seed = 1) {
    this.state = seed >>> 0;
  }
  float() {
    // mulberry32
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(max) {
    return Math.floor(this.float() * max);
  }
}

export class ProvablyFairRng {
  constructor(serverSeed, clientSeed, nonce) {
    this.serverSeed = serverSeed;
    this.clientSeed = clientSeed;
    this.nonce = nonce;
    this.cursor = 0;
    this.buffer = Buffer.alloc(0);
    this.offset = 0;
  }
  #refill() {
    this.buffer = crypto
      .createHmac('sha256', this.serverSeed)
      .update(`${this.clientSeed}:${this.nonce}:${this.cursor}`)
      .digest();
    this.cursor += 1;
    this.offset = 0;
  }
  float() {
    if (this.offset + 4 > this.buffer.length) this.#refill();
    const value = this.buffer.readUInt32BE(this.offset);
    this.offset += 4;
    return value / 2 ** 32;
  }
  int(max) {
    return Math.floor(this.float() * max);
  }
}

export function newServerSeed() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashSeed(seed) {
  return crypto.createHash('sha256').update(seed).digest('hex');
}
