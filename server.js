// =============================================================================
// server.js - Servidor Local HTTP + WebSocket para Multiplayer LAN do Block World
// =============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 8080;
const ROOT_DIR = __dirname;

// Tipos MIME para entrega de arquivos estáticos
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

// 1. Servidor HTTP Estático
const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(ROOT_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 - Arquivo não encontrado');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

// 2. Servidor WebSocket para Sessões LAN
const wss = new WebSocketServer({ server });

// Estado das sessões / salas
let currentRoom = {
  hostSocket: null,
  worldName: 'Mundo LAN',
  seed: 12345,
  gameMode: 'survival',
  modifiedBlocks: {},
  players: new Map() // id -> { id, name, socket }
};

let nextPlayerId = 1;

wss.on('connection', (ws) => {
  const playerId = 'p_' + (nextPlayerId++);
  let playerRoom = currentRoom;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'join') {
        const isHost = (msg.role === 'host') || (!playerRoom.hostSocket);

        if (isHost) {
          playerRoom.hostSocket = ws;
          playerRoom.worldName = msg.worldName || 'Mundo LAN';
          playerRoom.seed = msg.seed || 12345;
          playerRoom.gameMode = msg.gameMode || 'survival';
          playerRoom.modifiedBlocks = msg.modifiedBlocks || {};
        }

        const playerName = msg.name || (isHost ? 'Anfitrião' : `Jogador ${nextPlayerId - 1}`);

        playerRoom.players.set(playerId, {
          id: playerId,
          name: playerName,
          ws: ws
        });

        // Envia confirmação inicial com ID do jogador
        ws.send(JSON.stringify({
          type: 'init',
          yourId: playerId,
          isHost: isHost
        }));

        // Se for cliente, envia o estado do mundo do host
        if (!isHost) {
          ws.send(JSON.stringify({
            type: 'init_world',
            worldName: playerRoom.worldName,
            seed: playerRoom.seed,
            gameMode: playerRoom.gameMode,
            modifiedBlocks: playerRoom.modifiedBlocks
          }));
        }

        // Notifica todos na sala sobre o novo participante
        broadcastToRoom(playerRoom, {
          type: 'player_joined',
          id: playerId,
          name: playerName,
          position: { x: 96.5, y: 25.0, z: 96.5 }
        }, ws);

        // Notifica o novo participante sobre todos os jogadores existentes
        playerRoom.players.forEach((p, pid) => {
          if (pid !== playerId) {
            ws.send(JSON.stringify({
              type: 'player_joined',
              id: p.id,
              name: p.name,
              position: { x: 96.5, y: 25.0, z: 96.5 }
            }));
          }
        });

        console.log(`[LAN] ${playerName} (${playerId}) conectou como ${isHost ? 'HOST' : 'CLIENT'}. Total: ${playerRoom.players.size}`);
      } else if (msg.type === 'player_update') {
        // Retransmite atualização de posição para os outros jogadores
        msg.id = playerId;
        broadcastToRoom(playerRoom, msg, ws);
      } else if (msg.type === 'block_change') {
        // Registra alteração de bloco no estado do mundo compartilhado
        const key = `${msg.x},${msg.y},${msg.z}`;
        playerRoom.modifiedBlocks[key] = msg.blockType;
        broadcastToRoom(playerRoom, msg, ws);
      } else if (msg.type === 'door_toggle') {
        broadcastToRoom(playerRoom, msg, ws);
      } else if (msg.type === 'pvp_attack_request') {
        // Envia requisição de ataque para o Host validar
        if (playerRoom.hostSocket && playerRoom.hostSocket.readyState === WebSocket.OPEN) {
          msg.attackerId = playerId;
          playerRoom.hostSocket.send(JSON.stringify(msg));
        }
      } else if (msg.type === 'player_damaged') {
        // Host autorizou dano PvP -> envia a todos
        broadcastToRoom(playerRoom, msg, null);
      } else if (msg.type === 'health_update') {
        msg.id = playerId;
        broadcastToRoom(playerRoom, msg, ws);
      }
    } catch (e) {
      console.error('[LAN] Erro ao processar mensagem:', e);
    }
  });

  ws.on('close', () => {
    const p = playerRoom.players.get(playerId);
    const wasHost = (playerRoom.hostSocket === ws);

    playerRoom.players.delete(playerId);

    if (wasHost) {
      console.log(`[LAN] O anfitrião saiu da sessão.`);
      playerRoom.hostSocket = null;
      // Notifica todos os clientes que a sessão do host encerrou
      broadcastToRoom(playerRoom, { type: 'host_closed' }, null);
      playerRoom.modifiedBlocks = {};
    } else {
      console.log(`[LAN] ${p ? p.name : playerId} desconectou. Restam: ${playerRoom.players.size}`);
      broadcastToRoom(playerRoom, {
        type: 'player_left',
        id: playerId
      }, null);
    }
  });
});

function broadcastToRoom(room, msg, senderWs = null) {
  const json = JSON.stringify(msg);
  room.players.forEach((p) => {
    if (p.ws !== senderWs && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(json);
    }
  });
}

// 3. Inicialização e detecção de IPs locais na rede
server.listen(PORT, '0.0.0.0', () => {
  const interfaces = os.networkInterfaces();
  const localIps = [];

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        localIps.push(net.address);
      }
    }
  }

  console.log('\n=============================================================');
  console.log('   BLOCK WORLD - SERVIDOR LAN MULTIPLAYER INICIADO!');
  console.log('=============================================================');
  console.log(`\n  1. No computador anfitrião, acesse:`);
  console.log(`     -> http://localhost:${PORT}`);
  console.log(`\n  2. Em outros computadores na mesma rede LAN (Wi-Fi ou Cabo):`);
  if (localIps.length > 0) {
    localIps.forEach(ip => {
      console.log(`     -> http://${ip}:${PORT}`);
    });
  } else {
    console.log(`     -> http://<IP_DO_SEU_PC>:${PORT}`);
  }
  console.log(`\n  * Para saber o IP no Windows: digite "ipconfig" no CMD (procure IPv4).`);
  console.log(`  * Certifique-se de permitir o Node.js no Firewall caso solicitado.`);
  console.log('=============================================================\n');
});
