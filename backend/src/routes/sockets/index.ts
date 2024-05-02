// ===========================
// SECTION | IMPORTS
// ===========================
import { Server } from 'ws';
import { handleMessagesConnection } from './messages/connection';
import { handleCrashConnection } from './crash/connection';
import { handleCoinflipConnection } from './coinflip/connection';
import { handleCoinflipOnce } from './coinflip/once';
import { handleRouletteConnection } from './roulette/connection';
import { handleRouletteEmit } from './roulette/emit';
import { handleCrashEmit } from './crash/emit';
// =========================== !SECTION

// ===========================
// SECTION | MAIN
// ===========================
export default (wss: Server) => {
  wss.on('connection', async (socket, request) => {
    const url = request.url;

    if (url === '/messages') handleMessagesConnection(wss, socket);
    else if (url === '/crash') handleCrashConnection(wss, socket);
    else if (url === '/coinflip') handleCoinflipConnection(wss, socket);
    else if (url === '/roulette') handleRouletteConnection(wss, socket);
    else return socket.close();

    // -> Send heartbeat to client every 30 seconds
    setInterval(() => {
      socket.send(JSON.stringify({ type: 'HEARTBEAT' }));
    }, 30000);
  });

  // -> Handle Once
  handleCoinflipOnce(wss);

  // -> Handle Emits
  handleCrashEmit(wss);
  handleRouletteEmit(wss);
};
// =========================== !SECTION
