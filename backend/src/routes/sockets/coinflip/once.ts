// ===========================
// SECTION | IMPORTS
// ===========================
import { Server } from 'ws';
import { broadCast } from '@utils';
import { redisUrl } from '@keys';
import Redis from 'ioredis';
import { User } from '@models/users';
import { Coinflip } from '@models/coinflips';
import { startSession } from 'mongoose';
// =========================== !SECTION

// =====================
// SECTION | INIT
// =====================
const redis = new Redis(redisUrl);
// =====================!SECTION

// ===========================
// SECTION | ONCE - COINFLIP
// ===========================
export const handleCoinflipOnce = (wss: Server) => {
  clearCoinflipGames(wss);
};

const clearCoinflipGames = async (wss: Server) => {
  const session = await startSession();
  session.startTransaction();

  try {
    // -> Fetch all coinflip games that were created 10 minutes ago but have no joiner
    const games = await Coinflip.find({
      createdAt: { $lte: new Date(Date.now() - 10 * 60 * 1000) },
      joinerId: { $exists: false },
    }).session(session);

    // -> Go through every game
    for (const game of games) {
      // -> Ensure game still has no joiner
      const existingGame = await Coinflip.findById(game.id).session(
        session,
      );
      if (existingGame?.joinerId) continue;

      // -> Refund user
      await User.findByIdAndUpdate(game.creatorId, {
        $inc: { balance: game.amount },
      }).session(session);

      // -> Delete game
      await Coinflip.deleteOne({ _id: game.id }).session(session);

      // -> Send game to clients
      broadCast(
        wss,
        JSON.stringify({
          type: 'COINFLIP_GAME_DELETE',
          payload: {
            game: {
              id: game.id,
            },
          },
        }),
        '/coinflip',
      );
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
// =========================== !SECTION
