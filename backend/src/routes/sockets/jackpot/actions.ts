// =====================
// SECTION | IMPORTS
// =====================
import { IUser, IUserMethods } from '@models/users';
import type { Server, WebSocket } from 'ws';
import { HydratedDocument } from 'mongoose';
import { broadCast } from '@utils';
import { Jackpot } from '@models/jackpot';
// =====================!SECTION

// =====================
// SECTION | INIT
// =====================
export enum JackpotActions {
  Join = 'JOIN',
}
// =====================

// =====================
// SECTION | JACKPOT - ACTIONS
// =====================
export const handleJackpotActions = async (
  ws: Server,
  socket: WebSocket,
  user: HydratedDocument<IUser, IUserMethods>,
  action: JackpotActions,
  payload: object,
) => {
  switch (action) {
    case JackpotActions.Join: {
      // -> Parse payload
      const { amount } = payload as { amount: number };

      if (!amount) throw new Error('Invalid Payload');

      // -> Validate
      if (user.balance < amount)
        throw new Error(
          'Invalid Payload - You do not have enough balance',
        );

      await user.removeFromBalance(amount);

      // -> Join jackpot
      const jackpot = await Jackpot.joinOrCreateGame(user.id, amount);

      broadCast(
        ws,
        JSON.stringify({
          type: 'JACKPOT_UPDATE',
          payload: {
            jackpot,
          },
        }),
        '/jackpot',
      );

      // -> Notify the joiner
      socket.send(
        JSON.stringify({
          type: 'JACKPOT_JOINED',
          payload: {
            jackpot,
          },
        }),
      );

      break;
    }

    default:
      throw new Error('Invalid Action');
  }
};
// =====================!SECTION
