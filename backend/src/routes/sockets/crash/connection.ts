// ===========================
// SECTION | IMPORTS
// ===========================
import { CrashGame, ICrashBet } from '@models/crash';
import { User } from '@models/users';
import { handleError } from '@utils';
import { Server, WebSocket } from 'ws';
import { authSocket } from '../utils/auth';
import { CrashActions, handleCrashActions } from './actions';
// =========================== !SECTION

// ===========================
// SECTION | CRASH - CONNECTION
// ===========================
export const handleCrashConnection = async (
  wss: Server,
  socket: WebSocket,
) => {
  // -> Give client path
  // @ts-ignore
  socket.path = '/crash';

  // -> Send last 7 crash points
  const crashPoints = await CrashGame.find({})
    .sort({ crashedAt: -1 })
    .limit(7);

  socket.send(
    JSON.stringify({
      type: 'CRASH_POINTS',
      payload: {
        crashPoints: crashPoints.map((crashPoint) => ({
          crashPoint: crashPoint.crashPoint,
          crashedAt: crashPoint.crashedAt?.getTime(),
        })),
      },
    }),
  );

  // -> Send bets of last 3 games
  const crashGames = await CrashGame.find({
    betters: { $exists: true, $ne: [] },
  })
    .sort({ crashedAt: -1 })
    .limit(3);

  // -> Extract betters
  try {
    // TODO: Use redis cache here later
    const bettersRaw = crashGames
      .map((crashGame) => ({ ...crashGame.betters, crashPoint: crashGame.crashPoint }))
      .flat() as Array<ICrashBet & { crashPoint: number }>;

    const betters = await Promise.all(
      bettersRaw.map((b) => User.findById(b.user)),
    );

    const bets = betters.map((better, index) => ({
      username: better?.username,
      betAmount: bettersRaw[index].betAmount,
      cashoutMultiplier: bettersRaw[index].cashOutMultiplier,
      profit:
        (bettersRaw[index].cashOutMultiplier || 1) *
        bettersRaw[index].betAmount,
      crashPoint: bettersRaw[index].crashPoint,
    }));

    socket.send(
      JSON.stringify({
        type: 'CRASH_BETS_HISTORY',
        payload: {
          bets,
        },
      }),
    );
  } catch (e) {
    handleError(e);
  }

  socket.on('message', async (message) => {
    try {
      const { action, payload, user } = await authSocket(
        message.toString(),
      );

      // -> Handle Actions
      handleCrashActions(
        wss,
        socket,
        user,
        action as CrashActions,
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
