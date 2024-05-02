// ===========================
// SECTION | IMPORTS
// ===========================
import { Server } from 'ws';
import { broadCast } from '@utils';
import { redisUrl } from '@keys';
import Redis from 'ioredis';
import { User } from '@models/users';
import { CrashGame } from '@models/crash';
import { Crash } from '@services/Crash';
// =========================== !SECTION

// =====================
// SECTION | INIT
// =====================
const redis = new Redis(redisUrl);
// =====================!SECTION

// ===========================
// SECTION | EMIT - CRASH
// ===========================
export const handleCrashEmit = (wss: Server) => {
  // -> Generate crash point
  const crashPoint = Crash.generateCrashPoint();

  let currentCrashPoint = 1;

  // -> Send crash point to all clients every 100ms
  let interval: NodeJS.Timeout;
  interval = setInterval(async () => {
    // -> Increment current crash point by 0.01
    currentCrashPoint += 0.01;

    // -> Set in redis
    await redis.set('crash:current-crash-point', currentCrashPoint);

    broadCast(
      wss,
      JSON.stringify({
        type: 'CRASH_POINT',
        payload: {
          current: currentCrashPoint < crashPoint ? currentCrashPoint : -1,
        },
      }),
      '/crash',
    );

    // -> If current crash point is greater than or equal to the generated crash point, stop the interval
    if (currentCrashPoint >= crashPoint) {
      clearInterval(interval);

      // -> Start processing payouts
      handlePayouts(wss, crashPoint);

      // -> Wait 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));

      broadCast(
        wss,
        JSON.stringify({
          type: 'CRASH_POINT',
          payload: {
            current: 0,
          },
        }),
        '/crash',
      );

      // -> Send a timestamp for new round to all clients every 100ms
      let roundStartInterval: NodeJS.Timeout;
      let roundStartTimestamp = Date.now() + 60_000;

      roundStartInterval = setInterval(() => {
        broadCast(
          wss,
          JSON.stringify({
            type: 'CRASH_NEXT_ROUND',
            payload: {
              roundStartTimestamp,
            },
          }),
          '/crash',
        );
      }, 100);

      // -> When the interval is stopped, take a 60 second break and then generate a new crash point
      await new Promise((resolve) => setTimeout(resolve, 60_000));
      clearInterval(roundStartInterval);
      handleCrashEmit(wss);
    }
  }, 100);

  // -> Send all current bets to all clients
  let betInterval: NodeJS.Timeout;
  betInterval = setInterval(async () => {
    const betters = await redis.hgetall('crash:next-round-bets');

    broadCast(
      wss,
      JSON.stringify({
        type: 'CRASH_BETS',
        payload: {
          bets: Object.entries(betters).map(([_, bet]) => {
            const { username, betAmount, cashoutMultiplier } =
              JSON.parse(bet);

            return {
              username,
              betAmount,
              cashoutMultiplier,
            };
          }),
        },
      }),
      '/crash',
    );
  }, 1000);
};

const handlePayouts = async (wss: Server, crashPoint: number) => {
  // -> Get all bets
  const bettersRaw = await redis.hgetall('crash:next-round-bets');
  const betters = Object.entries(bettersRaw).map(([id, bet]) => {
    const { username, betAmount, cashoutMultiplier } = JSON.parse(bet);

    return {
      id,
      username,
      betAmount,
      cashoutMultiplier,
    } as {
      id: string;
      username: string;
      betAmount: number;
      cashoutMultiplier: number;
    };
  });

  // -> Clear all bets
  await redis.del('crash:next-round-bets');

  // -> Go through all bets and calculate payout
  for (const better of betters) {
    if (better.cashoutMultiplier >= crashPoint) continue;

    const payout = better.betAmount * better.cashoutMultiplier;

    // -> Add payout to user's balance
    await User.updateOne(
      {
        username: better.username,
      },
      {
        $inc: {
          balance: payout,
        },
      },
    );

    // -> Emit
    broadCast(
      wss,
      JSON.stringify({
        type: 'CRASH_BETS_HISTORY_APPEND',
        payload: {
          bet: {
            username: better.username,
            betAmount: better.betAmount,
            cashoutMultiplier: better.cashoutMultiplier,
            profit: payout,
            crashPoint,
          },
        },
      }),
      '/crash',
    );
  }

  // -> Store game in db
  await CrashGame.storeGame(
    crashPoint,
    betters.map((b) => ({
      user: b.id,
      betAmount: b.betAmount,
      cashOutMultiplier: b.cashoutMultiplier,
    })),
  );
};
// =========================== !SECTION
