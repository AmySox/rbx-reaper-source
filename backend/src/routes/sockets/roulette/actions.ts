// =====================
// SECTION | IMPORTS
// =====================
import { IUser, IUserMethods } from '@models/users';
import type { Server, WebSocket } from 'ws';
import { HydratedDocument } from 'mongoose';
import { broadCast } from '@utils';
import { Roulette as RouletteService } from '@services/Roulette';
import { Roulette } from '@models/roulette';
import { Redis } from 'ioredis';
import { redisUrl } from '@keys';
// =====================!SECTION

// =====================
// SECTION | INIT
// =====================
const redis = new Redis(redisUrl);
export enum RouletteActions {
  Bet = 'BET',
}
// =====================

// =====================
// SECTION | ROULETTE - ACTIONS
// =====================
export const handleRouletteActions = async (
  ws: Server,
  socket: WebSocket,
  user: HydratedDocument<IUser, IUserMethods>,
  action: RouletteActions,
  payload: object,
) => {
  switch (action) {
    case RouletteActions.Bet: {
      // -> Parse payload
      const { amount, color } = payload as { amount: number, color: 'black' | 'red' | 'green' };

      if (!amount || !color) throw new Error('Invalid Payload');

      // -> Validate
      if (!amount || amount <= 0)
        return socket.send(
          JSON.stringify({
            type: 'ERROR',
            payload: {
              message: 'Bet amount is required and should be greater than 0',
            },
          }),
        );

      if (amount > user.balance)
        return socket.send(
          JSON.stringify({
            type: 'ERROR',
            payload: {
              message: 'Bet amount is greater than your balance',
            },
          }),
        );

      if (!['black', 'red', 'green'].includes(color))
        return socket.send(
          JSON.stringify({
            type: 'ERROR',
            payload: {
              message: 'Invalid color',
            },
          }),
        );

      // -> Throw error if user is already in the next round
      const userInNextRound = await redis.hget(
        'roulette:next-round-bets',
        user._id.toString(),
      );

      if (userInNextRound)
        return socket.send(
          JSON.stringify({
            type: 'ERROR',
            payload: {
              message: 'You are already in the current round',
            },
          }),
        );

      // -> Add to redis for "next-round"
      redis.hset(
        'roulette:next-round-bets',
        user._id.toString(),
        JSON.stringify({
          username: user.username,
          amount,
          color,
        }),
      );

      const updatedUser = await user.removeFromBalance(amount);

      // -> Send updated user to client
      socket.send(
        JSON.stringify({
          type: 'ROULETTE_JOINED',
          payload: {
            user: updatedUser,
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
