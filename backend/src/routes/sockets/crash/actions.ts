// =====================
// SECTION | IMPORTS
// =====================
import { Server, WebSocket } from 'ws';
import { HydratedDocument } from 'mongoose';
import { IUser, IUserMethods } from '@models/users';
import Redis from 'ioredis';
import { redisUrl } from '@keys';
// =====================!SECTION

// =====================
// SECTION | INIT
// =====================
const redis = new Redis(redisUrl);
export enum CrashActions {
  Join = 'JOIN',
  Cashout = 'CASHOUT',
}
// =====================!SECTION

// =====================
// SECTION | MAIN
// =====================
export const handleCrashActions = async (
  ws: Server,
  socket: WebSocket,
  user: HydratedDocument<IUser, IUserMethods>,
  action: CrashActions,
  payload: unknown,
) => {
  switch (action) {
    case CrashActions.Join: {
      const { betAmount, cashoutMultiplier } = payload as {
        betAmount: number;
        cashoutMultiplier: number;
      };

      // -> Validate betAmount
      if (!betAmount || betAmount <= 0)
        return socket.send(
          JSON.stringify({
            type: 'ERROR',
            payload: {
              message: 'Bet amount is required and should be greater than 0',
            },
          }),
        );

      if (betAmount > user.balance)
        return socket.send(
          JSON.stringify({
            type: 'ERROR',
            payload: {
              message: 'Bet amount is greater than your balance',
            },
          }),
        );

      // -> Validate cashoutMultiplier
      if (!cashoutMultiplier || cashoutMultiplier <= 1)
        return socket.send(
          JSON.stringify({
            type: 'ERROR',
            payload: {
              message:
                'Cash out multiplier is required and should be greater than 1',
            },
          }),
        );

      // -> Throw error if user is already in the next round
      const userInNextRound = await redis.hget(
        'crash:next-round-bets',
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
        'crash:next-round-bets',
        user._id.toString(),
        JSON.stringify({
          username: user.username,
          betAmount,
          cashoutMultiplier,
        }),
      );

      // -> Deduct bet amount from user's balance
      const updatedUser = await user.removeFromBalance(betAmount);

      // -> Send updated user to client
      socket.send(
        JSON.stringify({
          type: 'CRASH_JOINED',
          payload: {
            user: updatedUser,
          },
        }),
      );
    }

    case CrashActions.Cashout: {
      // -> Get user's bet from redis
      const userBet = await redis.hget(
        'crash:next-round-bets',
        user._id.toString(),
      );

      // -> Throw error if user is not in the next round
      if (!userBet)
        return socket.send(
          JSON.stringify({
            type: 'ERROR',
            payload: {
              message: 'You are not in the current round',
            },
          }),
        );

      // -> Ignore if user has already cashed out
      const userCashedOut = await redis.hget(
        'crash:next-round-cashed-out',
        user._id.toString(),
      );

      if (userCashedOut)
        return socket.send(
          JSON.stringify({
            type: 'ERROR',
            payload: {
              message: 'You have already cashed out',
            },
          }),
        );

      // -> Set user's cashout multiplier to current crash point
      const currentCrashPoint = await redis.get('crash:current-crash-point');

      if (!currentCrashPoint)
        return socket.send(
          JSON.stringify({
            type: 'ERROR',
            payload: {
              message: 'Crash has not started yet',
            },
          }),
        );

      await redis.hset(
        'crash:next-round-bets',
        user._id.toString(),
        JSON.stringify({
          ...JSON.parse(userBet),
          cashoutMultiplier: Number(currentCrashPoint),
        }),
      );

      // -> Mark user as cashed out
      await redis.hset(
        'crash:next-round-cashed-out',
        user._id.toString(),
        'true',
      );

      // -> Let client know that user has cashed out
      socket.send(
        JSON.stringify({
          type: 'CRASH_CASHED_OUT',
        }),
      );
    }
  }
};
// =====================!SECTION
