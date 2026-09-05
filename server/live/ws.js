import { WebSocketServer } from 'ws';
import { getBySession, publicAccount, save } from '../store/memory.js';
import { TableManager } from './tables.js';

/**
 * Gercek zamanli masa sunucusu.
 *
 * Istemci mesajlari: { type, ...payload }
 * Sunucu mesajlari:  { type, ...payload }
 *
 * Kimlik dogrulama ilk mesajda (auth) yapilir; oturum belirteci REST ile aynidir.
 * Her istemci yalnizca kendi kartlarini gorur (engine.view(viewerId)).
 */

export function attachLiveServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/live' });

  /** tableId -> Set<ws> */
  const rooms = new Map();

  const manager = new TableManager((tableId) => broadcastTable(tableId));

  function roomOf(tableId) {
    if (!rooms.has(tableId)) rooms.set(tableId, new Set());
    return rooms.get(tableId);
  }

  function send(ws, message) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
  }

  function broadcastTable(tableId) {
    const table = manager.get(tableId);
    const room = rooms.get(tableId);
    if (!room) return;
    if (!table) {
      for (const ws of room) send(ws, { type: 'table-closed', tableId });
      rooms.delete(tableId);
      return;
    }
    for (const ws of room) {
      send(ws, {
        type: 'state',
        tableId,
        table: manager.summary(table),
        state: table.engine.view(ws.accountId),
        legal: table.engine.legalActions(ws.accountId),
        chat: table.chat.slice(-25),
        balance: ws.account ? ws.account.balance : null
      });
    }
  }

  function broadcastLobby() {
    for (const ws of wss.clients) {
      if (ws.readyState !== ws.OPEN || !ws.accountId) continue;
      send(ws, { type: 'lobby', tables: manager.list({ accountId: ws.accountId }) });
    }
  }

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => (ws.isAlive = true));

    ws.on('message', (raw) => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        return send(ws, { type: 'error', error: 'Geçersiz mesaj.' });
      }
      handleMessage(ws, message);
    });

    ws.on('close', () => {
      if (ws.tableId) {
        const room = rooms.get(ws.tableId);
        room?.delete(ws);
        const table = manager.get(ws.tableId);
        const seat = table?.engine.seats.find((s) => s && s.id === ws.accountId);
        // Baglanti kopmasi masadan atmaz; oyuncu geri donebilir.
        if (seat) seat.disconnected = true;
        broadcastTable(ws.tableId);
      }
    });
  });

  function handleMessage(ws, message) {
    const { type } = message;

    if (type === 'auth') {
      const account = getBySession(message.token);
      if (!account) return send(ws, { type: 'error', error: 'Oturum geçersiz.' });
      if (account.banned) return send(ws, { type: 'error', error: 'Hesap askıya alınmış.' });
      ws.accountId = account.id;
      ws.account = account;
      send(ws, {
        type: 'auth-ok',
        player: publicAccount(account),
        tables: manager.list({ accountId: account.id })
      });
      return;
    }

    if (!ws.accountId) return send(ws, { type: 'error', error: 'Önce giriş yapmalısın.' });
    const account = ws.account;

    switch (type) {
      case 'lobby': {
        send(ws, { type: 'lobby', tables: manager.list({ game: message.game, accountId: account.id }) });
        break;
      }

      case 'create': {
        const result = manager.createTable({
          game: message.game,
          name: message.name,
          stakeId: message.stakeId,
          ownerId: account.id,
          ownerName: account.username || account.name,
          isPrivate: message.isPrivate,
          botCount: Math.min(4, Number(message.botCount) || 0)
        });
        if (result.error) return send(ws, { type: 'error', error: result.error });
        send(ws, { type: 'created', table: result.table });
        broadcastLobby();
        break;
      }

      case 'join': {
        let tableId = message.tableId;
        if (!tableId && message.code) {
          const found = manager.findByCode(message.code);
          if (!found) return send(ws, { type: 'error', error: 'Masa kodu bulunamadı.' });
          tableId = found.id;
        }
        const result = manager.join(tableId, account, {
          buyIn: message.buyIn,
          seat: message.seat,
          code: message.code
        });
        if (result.error) return send(ws, { type: 'error', error: result.error });

        // Onceki odadan cik
        if (ws.tableId && ws.tableId !== tableId) rooms.get(ws.tableId)?.delete(ws);
        ws.tableId = tableId;
        roomOf(tableId).add(ws);
        const seat = manager.get(tableId).engine.seats.find((s) => s && s.id === account.id);
        if (seat) seat.disconnected = false;
        send(ws, { type: 'joined', tableId, seat: result.seat });
        broadcastTable(tableId);
        broadcastLobby();
        break;
      }

      case 'watch': {
        const table = manager.get(message.tableId);
        if (!table) return send(ws, { type: 'error', error: 'Masa bulunamadı.' });
        if (ws.tableId && ws.tableId !== message.tableId) rooms.get(ws.tableId)?.delete(ws);
        ws.tableId = message.tableId;
        roomOf(message.tableId).add(ws);
        broadcastTable(message.tableId);
        break;
      }

      case 'leave': {
        const tableId = ws.tableId;
        if (!tableId) return;
        const result = manager.leave(tableId, account);
        rooms.get(tableId)?.delete(ws);
        ws.tableId = null;
        send(ws, {
          type: 'left',
          chips: result.chips || 0,
          player: publicAccount(account),
          error: result.error
        });
        broadcastTable(tableId);
        broadcastLobby();
        break;
      }

      case 'action': {
        const table = manager.get(ws.tableId);
        if (!table) return send(ws, { type: 'error', error: 'Masada değilsin.' });
        const engine = table.engine;
        const result =
          table.game === 'holdem'
            ? engine.act(account.id, message.action, message.amount)
            : engine.act(account.id, message.action);
        if (result?.error) send(ws, { type: 'error', error: result.error });
        broadcastTable(ws.tableId);
        break;
      }

      case 'bet': {
        const table = manager.get(ws.tableId);
        if (!table || table.game !== 'blackjack') {
          return send(ws, { type: 'error', error: 'Bu masada bahis yapılamaz.' });
        }
        const result =
          message.clear === true
            ? table.engine.clearBet(account.id)
            : table.engine.placeBet(account.id, message.amount);
        if (result.error) send(ws, { type: 'error', error: result.error });
        broadcastTable(ws.tableId);
        break;
      }

      case 'chat': {
        const table = manager.get(ws.tableId);
        if (!table) return;
        const text = String(message.text || '').trim().slice(0, 160);
        if (!text) return;
        manager.pushChat(table, {
          name: account.username || account.name,
          avatar: account.avatar,
          text
        });
        broadcastTable(ws.tableId);
        break;
      }

      case 'invite': {
        const result = manager.invite(ws.tableId, account.id, message.userId);
        if (result.error) return send(ws, { type: 'error', error: result.error });
        send(ws, { type: 'invited', code: result.code });
        break;
      }

      case 'set-private': {
        const result = manager.setPrivate(ws.tableId, account.id, message.isPrivate);
        if (result.error) return send(ws, { type: 'error', error: result.error });
        send(ws, { type: 'privacy', isPrivate: result.isPrivate, code: result.code });
        broadcastTable(ws.tableId);
        broadcastLobby();
        break;
      }

      case 'add-bot': {
        const table = manager.get(ws.tableId);
        if (!table) return;
        if (table.ownerId !== account.id) {
          return send(ws, { type: 'error', error: 'Yalnızca masayı açan bot ekleyebilir.' });
        }
        manager.addBots(table, 1);
        broadcastTable(ws.tableId);
        break;
      }

      case 'sit-out': {
        const table = manager.get(ws.tableId);
        const seat = table?.engine.seats.find((s) => s && s.id === account.id);
        if (seat) seat.sittingOut = Boolean(message.sittingOut);
        broadcastTable(ws.tableId);
        break;
      }

      case 'ping':
        send(ws, { type: 'pong' });
        break;

      default:
        send(ws, { type: 'error', error: 'Bilinmeyen istek.' });
    }
    save();
  }

  // Olu baglantilari temizle
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30000);
  heartbeat.unref?.();

  return { wss, manager };
}
