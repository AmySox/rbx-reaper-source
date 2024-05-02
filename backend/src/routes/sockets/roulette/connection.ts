// ===========================
// SECTION | IMPORTS
// ===========================
import { Server, WebSocket } from 'ws';
import { authSocket } from '../utils/auth';
import { RouletteActions, handleRouletteActions } from './actions';
import { Roulette } from '@models/roulette';
// =========================== !SECTION

// ===========================
// SECTION | ROULETTE - CONNECTION
// ===========================
export const handleRouletteConnection = async (
  wss: Server,
  socket: WebSocket,
) => {
  // -> Give client path
  // @ts-ignore
  socket.path = '/roulette';

  // -> Get last 10 roulette results
  const roulettes = await Roulette.find({})
    .sort({ createdAt: -1 })
    .limit(7);

  // -> Send game to client
  socket.send(
    JSON.stringify({
      type: 'ROULETTE_GAMES',
      payload: {
        roulettes,
      },
    }),
  );

  socket.on('message', async (message) => {
    try {
      const { action, payload, user } = await authSocket(
        message.toString(),
      );

      // -> Handle Actions
      handleRouletteActions(
        wss,
        socket,
        user,
        action as RouletteActions,
        payload,
      );
    } catch (e) {
      socket.send(
        JSON.stringify({
          type: 'ERROR',
          payload: {
            message: (e as Error).message,
          },
        }),
      );

      socket.close();
    }
  });
};
// =========================== !SECTION
