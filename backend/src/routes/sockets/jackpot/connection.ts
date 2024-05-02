// ===========================
// SECTION | IMPORTS
// ===========================
import { Server, WebSocket } from 'ws';
import { authSocket } from '../utils/auth';
import { Jackpot } from '@models/jackpot';
import { JackpotActions, handleJackpotActions } from './actions';
// =========================== !SECTION

// ===========================
// SECTION | JACKPOT - CONNECTION
// ===========================
export const handleJackpotConnection = async (
  wss: Server,
  socket: WebSocket,
) => {
  // -> Give client path
  // @ts-ignore
  socket.path = '/jackpot';

  // -> Get current jackpot game
  const jackpot = await Jackpot.findOne({
    endTime: { $exists: false },
  });

  // -> Send game to client
  socket.send(
    JSON.stringify({
      type: 'JACKPOT_GAME',
      payload: {
        jackpot,
      },
    }),
  );

  socket.on('message', async (message) => {
    try {
      const { action, payload, user } = await authSocket(
        message.toString(),
      );

      // -> Handle Actions
      handleJackpotActions(
        wss,
        socket,
        user,
        action as JackpotActions,
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
