import crypto from 'node:crypto';
import { HoldemTable } from './holdem.js';
import { BlackjackTable } from './blackjack.js';
import { makeBot, holdemBotAction, blackjackBotAction, blackjackBotBet } from './bots.js';
import { getSettings, getUserById, save, recordHistory, addXp, round2 } from '../store/memory.js';

/**
 * Masa yoneticisi.
 *
 * - Masa acma / katilma / ayrilma
 * - Ozel masa (6 haneli kod) ve arkadas daveti
 * - Buy-in: oyuncunun bakiyesinden cip alinir, ayrilirken kalan cip iade edilir
 * - Zamanlayici: aksiyon suresi, el baslatma, bot hamleleri
 *
 * Masa cipleri ile hesap bakiyesi ARASINDA tek gecis noktasi vardir:
 * join (bakiye -> cip) ve leave (cip -> bakiye). Boylece cip uretilemez.
 */

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class TableManager {
  constructor(broadcast) {
    this.tables = new Map();
    this.broadcast = broadcast;
    this.timer = setInterval(() => this.tick(), 1000);
    this.timer.unref?.();
  }

  /* ═══════════ Olusturma ═══════════ */

  createTable({ game, name, stakeId, ownerId, ownerName, isPrivate = false, botCount = 0 }) {
    const settings = getSettings();
    const id = crypto.randomBytes(6).toString('hex');

    let engine;
    let stake;
    if (game === 'holdem') {
      stake = settings.tables.stakes.find((s) => s.id === stakeId) || settings.tables.stakes[0];
      engine = new HoldemTable({
        smallBlind: stake.smallBlind,
        bigBlind: stake.bigBlind,
        maxSeats: settings.poker.maxSeats,
        actionSeconds: settings.poker.actionSeconds,
        rakePercent: settings.poker.rakePercent,
        rakeCapBigBlinds: settings.poker.rakeCapBigBlinds
      });
    } else if (game === 'blackjack') {
      stake = settings.tables.blackjackLimits.find((s) => s.id === stakeId) ||
        settings.tables.blackjackLimits[0];
      engine = new BlackjackTable({
        minBet: stake.min,
        maxBet: stake.max,
        maxSeats: settings.blackjack.maxSeats,
        actionSeconds: settings.blackjack.actionSeconds,
        dealerHitsSoft17: settings.blackjack.dealerHitsSoft17,
        blackjackPayout: settings.blackjack.blackjackPayout,
        deckCount: settings.blackjack.deckCount,
        insurance: settings.blackjack.insurance
      });
    } else {
      return { error: 'Bilinmeyen oyun türü.' };
    }

    const table = {
      id,
      game,
      name: String(name || '').trim().slice(0, 28) || defaultName(game, ownerName),
      stake,
      engine,
      ownerId,
      isPrivate: Boolean(isPrivate),
      code: isPrivate ? randomCode() : null,
      invited: new Set(),
      members: new Map(), // accountId -> { buyIn }
      chat: [],
      createdAt: Date.now(),
      lastActivity: Date.now(),
      nextHandAt: 0,
      botSeats: []
    };

    this.tables.set(id, table);

    const allowBots = settings.tables.allowBots;
    if (allowBots && botCount > 0) this.addBots(table, botCount);

    return { table: this.summary(table) };
  }

  addBots(table, count) {
    const stake = table.stake;
    const chips = table.game === 'holdem' ? stake.minBuyIn * 2 : stake.max * 20;
    for (let i = 0; i < count; i += 1) {
      const bot = makeBot(table.botSeats.length + i);
      const result = table.engine.seatPlayer({ ...bot, chips });
      if (!result.error) table.botSeats.push(bot.id);
    }
  }

  get(id) {
    return this.tables.get(id);
  }

  findByCode(code) {
    const upper = String(code || '').toUpperCase().trim();
    return [...this.tables.values()].find((t) => t.code === upper);
  }

  /* ═══════════ Katilma / ayrilma ═══════════ */

  join(tableId, account, { buyIn, seat = null, code = null }) {
    const table = this.tables.get(tableId);
    if (!table) return { error: 'Masa bulunamadı.' };

    if (table.isPrivate && table.ownerId !== account.id) {
      const invited = table.invited.has(account.id);
      const codeOk = code && String(code).toUpperCase() === table.code;
      if (!invited && !codeOk) return { error: 'Bu masa özel. Davet veya masa kodu gerekiyor.' };
    }

    const amount = Math.floor(Number(buyIn) || 0);
    const limits = this.buyInLimits(table);
    if (amount < limits.min || amount > limits.max) {
      return { error: `Masaya giriş ${limits.min} - ${limits.max} arasında olmalı.` };
    }
    if (account.balance < amount) return { error: 'Yetersiz bakiye.' };

    const result = table.engine.seatPlayer(
      {
        id: account.id,
        name: account.username || account.name,
        avatar: account.avatar || '🦊',
        chips: amount
      },
      seat
    );
    if (result.error) return result;

    // Bakiye -> cip
    account.balance = round2(account.balance - amount);
    table.members.set(account.id, { buyIn: amount, joinedAt: Date.now() });
    table.lastActivity = Date.now();
    this.pushChat(table, { system: true, text: `${account.username || account.name} masaya oturdu` });
    save();
    return { seat: result.seat };
  }

  leave(tableId, account) {
    const table = this.tables.get(tableId);
    if (!table) return { error: 'Masa bulunamadı.' };
    const result = table.engine.removePlayer(account.id);
    if (result.error) return result;

    // Cip -> bakiye
    const chips = Math.max(0, Math.floor(result.chips || 0));
    account.balance = round2(account.balance + chips);

    const member = table.members.get(account.id);
    if (member) {
      const net = chips - member.buyIn;
      if (net !== 0) {
        recordHistory(account, {
          type: 'table',
          game: table.game === 'holdem' ? "Texas Hold'em" : 'Blackjack',
          bet: member.buyIn,
          win: chips,
          net
        });
      }
      addXp(account, Math.max(1, Math.round(member.buyIn / 100)));
    }
    table.members.delete(account.id);
    table.lastActivity = Date.now();
    this.pushChat(table, { system: true, text: `${account.username || account.name} masadan kalktı` });
    save();
    return { chips };
  }

  buyInLimits(table) {
    if (table.game === 'holdem') {
      return { min: table.stake.minBuyIn, max: table.stake.maxBuyIn };
    }
    return { min: table.stake.min * 20, max: table.stake.max * 40 };
  }

  invite(tableId, ownerId, targetUserId) {
    const table = this.tables.get(tableId);
    if (!table) return { error: 'Masa bulunamadı.' };
    if (table.ownerId !== ownerId) return { error: 'Yalnızca masayı açan davet edebilir.' };
    const target = getUserById(targetUserId);
    if (!target) return { error: 'Kullanıcı bulunamadı.' };
    table.invited.add(targetUserId);
    return { ok: true, code: table.code };
  }

  setPrivate(tableId, ownerId, isPrivate) {
    const table = this.tables.get(tableId);
    if (!table) return { error: 'Masa bulunamadı.' };
    if (table.ownerId !== ownerId) return { error: 'Yalnızca masayı açan değiştirebilir.' };
    table.isPrivate = Boolean(isPrivate);
    if (table.isPrivate && !table.code) table.code = randomCode();
    return { ok: true, isPrivate: table.isPrivate, code: table.code };
  }

  pushChat(table, entry) {
    table.chat.push({ ...entry, at: Date.now() });
    if (table.chat.length > 60) table.chat.shift();
  }

  /* ═══════════ Listeleme ═══════════ */

  summary(table) {
    const seats = table.engine.seats;
    const occupied = seats.filter(Boolean).length;
    return {
      id: table.id,
      game: table.game,
      name: table.name,
      stake: table.stake,
      isPrivate: table.isPrivate,
      code: table.isPrivate ? table.code : null,
      players: occupied,
      humans: seats.filter((s) => s && !s.bot).length,
      bots: seats.filter((s) => s && s.bot).length,
      maxSeats: table.engine.maxSeats,
      phase: table.engine.phase,
      buyIn: this.buyInLimits(table),
      createdAt: table.createdAt
    };
  }

  list({ game = null, includePrivate = false, accountId = null } = {}) {
    return [...this.tables.values()]
      .filter((t) => !game || t.game === game)
      .filter(
        (t) =>
          includePrivate ||
          !t.isPrivate ||
          t.ownerId === accountId ||
          t.invited.has(accountId)
      )
      .sort((a, b) => b.engine.seats.filter(Boolean).length - a.engine.seats.filter(Boolean).length)
      .map((t) => this.summary(t));
  }

  /* ═══════════ Zamanlayici ═══════════ */

  tick() {
    const settings = getSettings();
    const now = Date.now();

    for (const table of [...this.tables.values()]) {
      const engine = table.engine;
      let changed = false;

      if (table.game === 'holdem') changed = this.tickHoldem(table, engine, now);
      else changed = this.tickBlackjack(table, engine, now);

      // Bos masa temizligi
      const humans = engine.seats.filter((s) => s && !s.bot).length;
      if (humans === 0) {
        const idle = now - table.lastActivity;
        if (idle > settings.tables.emptyTableTtlSeconds * 1000) {
          this.tables.delete(table.id);
          continue;
        }
      } else {
        table.lastActivity = now;
      }

      if (changed) this.broadcast(table.id);
    }
  }

  tickHoldem(table, engine, now) {
    let changed = false;

    if (engine.phase === 'payout') {
      if (!table.nextHandAt) table.nextHandAt = now + 4000;
      else if (now >= table.nextHandAt) {
        engine.settle();
        table.nextHandAt = 0;
        changed = true;
      }
      return changed;
    }

    if (engine.phase === 'waiting') {
      if (engine.canStart()) {
        if (!table.nextHandAt) table.nextHandAt = now + 2500;
        else if (now >= table.nextHandAt) {
          engine.startHand();
          table.nextHandAt = 0;
          changed = true;
        }
      } else {
        table.nextHandAt = 0;
      }
      return changed;
    }

    // Sira bir bottaysa kisa gecikmeyle oyna
    const acting = engine.seats[engine.actingSeat];
    if (acting?.bot) {
      if (!table.botThinkAt) table.botThinkAt = now + 900 + Math.random() * 900;
      else if (now >= table.botThinkAt) {
        const move = holdemBotAction(engine, acting);
        if (move) engine.act(acting.id, move.action, move.amount);
        table.botThinkAt = 0;
        changed = true;
      }
      return changed;
    }
    table.botThinkAt = 0;

    if (engine.actionDeadline && now > engine.actionDeadline) {
      engine.timeoutAct();
      changed = true;
    }
    return changed;
  }

  tickBlackjack(table, engine, now) {
    let changed = false;

    if (engine.phase === 'betting') {
      // Botlar bahsini koyar
      for (const seat of engine.seats) {
        if (seat?.bot && seat.pendingBet === 0 && seat.chips >= engine.minBet) {
          engine.placeBet(seat.id, blackjackBotBet(engine, seat));
          changed = true;
        }
      }
      if (now >= engine.deadline) {
        if (engine.readyToDeal()) {
          engine.deal();
          changed = true;
        } else {
          engine.deadline = now + 10000;
        }
      }
      return changed;
    }

    if (engine.phase === 'insurance' && now >= engine.deadline) {
      engine.finishInsurance();
      return true;
    }

    if (engine.phase === 'playing') {
      const acting = engine.seats[engine.actingSeat];
      if (acting?.bot) {
        if (!table.botThinkAt) table.botThinkAt = now + 700 + Math.random() * 600;
        else if (now >= table.botThinkAt) {
          const move = blackjackBotAction(engine, acting);
          if (move) engine.act(acting.id, move.action);
          table.botThinkAt = 0;
          changed = true;
        }
        return changed;
      }
      table.botThinkAt = 0;
      if (now >= engine.deadline) {
        engine.timeoutAct();
        changed = true;
      }
      return changed;
    }

    if (engine.phase === 'payout' && now >= engine.deadline) {
      engine.reset();
      return true;
    }
    return changed;
  }

  /** Bir hesabin masadaki cipini bakiyeye geri yazar (baglanti koptugunda degil,
   *  yalnizca masa kapanirken/kalkarken kullanilir). */
  cashOutAll(tableId) {
    const table = this.tables.get(tableId);
    if (!table) return;
    for (const [accountId] of table.members) {
      const account = getUserById(accountId);
      if (!account) continue;
      const seat = table.engine.seats.find((s) => s && s.id === accountId);
      if (seat) account.balance = round2(account.balance + Math.max(0, seat.chips));
    }
    table.members.clear();
    save();
  }
}

function randomCode() {
  let code = '';
  for (let i = 0; i < 6; i += 1) code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return code;
}

function defaultName(game, ownerName) {
  const label = game === 'holdem' ? "Hold'em" : 'Blackjack';
  return ownerName ? `${ownerName} · ${label}` : `${label} Masası`;
}
