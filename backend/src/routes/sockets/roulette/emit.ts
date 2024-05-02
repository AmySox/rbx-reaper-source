// ===========================
// SECTION | IMPORTS
// ===========================
import { Server } from 'ws';
import { broadCast } from '@utils';
import { redisUrl } from '@keys';
import Redis from 'ioredis';
import { User } from '@models/users';
import { Roulette as RouleteModel } from '@models/roulette';
import { Roulette } from '@services/Roulette';
// =========================== !SECTION

// =====================
// SECTION | INIT
// =====================
const redis = new Redis(redisUrl);
// =====================!SECTION

// ===========================
// SECTION | EMIT - ROULETTE
// ===========================
/**
 * Flow:
 * -> 30 Seconds: Wait for bets
 * -> Roll roulette
 * -> 30 Seconds: Wait for next round
 * -> Repeat
 * 
 * In other words, each round is 1 minute long and has 3 phases:
 * - Preparation
 * - Betting
 * - Payout
 */
export const handleRouletteEmit = async (wss: Server) => {
  // -> Generate stop point
  const stopPoint = Roulette.generateRouletteStopPoint();
  const winningColor = stopPoint === 0 ? 'green' : stopPoint <= 7 ? 'red' : 'black';
  let roundStartTimestamp = Date.now() + 30_000;

  console.info('Starting roulette round - stop point:', stopPoint);

  // -> Send all current bets to all clients
  let betInterval: NodeJS.Timeout;
  betInterval = setInterval(async () => {
    const betters = await redis.hgetall('roulette:next-round-bets');

    broadCast(
      wss,
      JSON.stringify({
        type: 'ROULETTE_BETS',
        payload: {
          bets: Object.entries(betters).map(([_, bet]) => {
            const { username, amount, color } =
              JSON.parse(bet);

            return {
              username,
              amount,
              color,
            };
          }),
          timestamp: roundStartTimestamp,
        },
      }),
      '/roulette',
    );
  }, 1000);

  // -> Wait for 30 seconds
  await new Promise((resolve) => setTimeout(resolve, 30000));

  console.info('Stopping tst roulette round - stop point:', stopPoint);

  // -> Clear interval
  clearInterval(betInterval);

  // -> Send stop point to all clients
  broadCast(
    wss,
    JSON.stringify({
      type: 'ROULETTE_STOP_POINT',
      payload: {
        stopPoint,
        winningColor,
      },
    }),
    '/roulette',
  );

  // -> Handle payouts
  await handlePayouts(wss, stopPoint, winningColor);

  // -> Wait 5 seconds
  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.info('Starting next roulette round in 30s');

  // -> Send a timestamp for new round to all clients every 100ms
  let roundStartInterval: NodeJS.Timeout;
  roundStartTimestamp = Date.now() + 30_000;

  roundStartInterval = setInterval(() => {
    broadCast(
      wss,
      JSON.stringify({
        type: 'ROULETTE_NEXT_ROUND',
        payload: {
          roundStartTimestamp,
        },
      }),
      '/roulette',
    );
  }, 100);

  // -> Wait 30 seconds and then start a new round
  await new Promise((resolve) => setTimeout(resolve, 30000));
  clearInterval(roundStartInterval);

  handleRouletteEmit(wss);
};

const handlePayouts = async (wss: Server, stopPoint: number, winningColor: string) => {
  // -> Get all bets
  const bettersRaw = await redis.hgetall('roulette:next-round-bets');
  const betters = Object.entries(bettersRaw).map(([id, bet]) => {
    const { username, amount, color } = JSON.parse(bet);

    return {
      id,
      username,
      amount,
      color,
    } as {
      id: string;
      username: string;
      amount: number;
      color: string;
    };
  });

  // -> Clear all bets
  await redis.del('roulette:next-round-bets');

  // -> Go through all bets and calculate payout
  for (const better of betters) {
    if (better.color !== winningColor) continue;

    const payout = better.color === 'green' ? better.amount * 14 : better.amount * 2;

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
  }

  // -> Store game in db
  await RouleteModel.storeGame(
    stopPoint,
    betters.map((b) => ({
      user: b.id,
      amount: b.amount,
      color: b.color as 'red' | 'black' | 'green',
    })),
  );
};
// =========================== !SECTION
