// =====================
// SECTION | IMPORTS
// =====================
import { IUser, IUserMethods, User } from '@models/users';
import type { Server, WebSocket } from 'ws';
import { HydratedDocument } from 'mongoose';
import {
  Coinflip,
  CoinflipSides,
  CoinflipStatus,
} from '@models/coinflips';
import { broadCast } from '@utils';

// =====================!SECTION

// =====================
// SECTION | INIT
// =====================
export enum CoinflipActions {
  Create = 'CREATE',
  Join = 'JOIN',
}
// =====================

// =====================
// SECTION | COINFLIP - ACTIONS
// =====================
export const handleCoinflipActions = async (
  ws: Server,
  socket: WebSocket,
  user: HydratedDocument<IUser, IUserMethods>,
  action: CoinflipActions,
  payload: object,
) => {
  switch (action) {
    case CoinflipActions.Create: {
      // -> Parse payload
      const { amount, side } = payload as { amount: number; side: string };

      if (!amount || !side)
        throw new Error('Invalid Payload - missing `amount`');

      if (!Object.values(CoinflipSides).includes(side as CoinflipSides))
        throw new Error('Invalid Payload - invalid `side`');

      if (user.balance < amount)
        throw new Error('Invalid Payload - invalid `amount`');

      await user.removeFromBalance(amount);

      // -> Create coinflip game
      const game = await Coinflip.createCoinflip(
        user.id,
        amount,
        side as CoinflipSides,
      );

      // -> Start an 8 minutes timeout
      setTimeout(async () => {
        // -> Fetch game
        const g = await Coinflip.findById(game.id);

        if (!g) return;

        // -> Delete game
        await g.delete();

        // -> Send bet amount back to creator
        await user.addToBalance(g.amount);

        broadCast(
          ws,
          JSON.stringify({
            type: 'COINFLIP_GAME_DELETE',
            payload: {
              game: {
                id: g.id,
              },
            },
          }),
          '/coinflip',
        );
      }, 8 * 60 * 1000);

      // -> Send game to clients
      broadCast(
        ws,
        JSON.stringify({
          type: 'COINFLIP_GAME_APPEND',
          payload: {
            game: {
              id: game.id,
              creator: {
                username: user.username,
                avatar: user.avatar,
              },
              amount: game.amount,
              creatorSide: game.creatorSide,
              createdAt: game.createdAt,
            },
          },
        }),
        '/coinflip',
      );

      // -> Notify the creator
      socket.send(
        JSON.stringify({
          type: 'COINFLIP_GAME_CREATED',
          payload: {
            game: {
              id: game.id,
              creator: {
                username: user.username,
                avatar: user.avatar,
              },
              amount: game.amount,
              creatorSide: game.creatorSide,
              createdAt: game.createdAt,
            },
          },
        }),
      );

      break;
    }

    case CoinflipActions.Join: {
      // -> Parse payload
      const { id } = payload as { id: string };

      if (!id) throw new Error('Invalid Payload');

      // -> Fetch game
      const game = await Coinflip.findById(id);

      if (!game || game.status !== CoinflipStatus.WAITING)
        throw new Error('Invalid Payload - invalid `id`');

      if (user.balance < game.amount)
        throw new Error(
          'Invalid Payload - You do not have enough balance',
        );

      if (game.creatorId === user.id)
        throw new Error('Invalid Payload - You cannot join your own game');

      await user.removeFromBalance(game.amount);

      // -> Join game
      const ended = await game.join(
        user.id,
        game.creatorSide === CoinflipSides.HEADS
          ? CoinflipSides.TAILS
          : CoinflipSides.HEADS,
      );

      // -> Send winnings to winner
      const winner = await User.findById(ended.winnerId);
      if (winner) {
        await winner.addToBalance(ended.amount * 2);
        const coinflipsEnded = await Coinflip.fetchGames({
          status: CoinflipStatus.ENDED,
          limit: 1,
          fetchUsers: true,
        });
        console.log(winner.username);

        broadCast(
          ws,
          JSON.stringify({
            type: 'WINNER',
            payload: {
              winner: winner.username,
              amount: ended.amount * 2,
            },
          }),
          '/coinflip'
        );
        broadCast(
          ws,
          JSON.stringify({
            type: 'COINFLIP_GAMES',
            payload: {
              games: {
                ended: coinflipsEnded.reverse().map((game) => ({
                  _id: game._id,
                  creator: {
                    username: game.creator.username,
                    avatar: game.creator.avatar,
                  },
                  joiner: {
                    username: game.joiner?.username,
                    avatar: game.joiner?.avatar,
                  },
                  amount: game.amount,
                  creatorSide: game.creatorSide,
                  joinerSide: game.joinerSide,
                  winner: {
                    username: game.winner?.username,
                    avatar: game.winner?.avatar,
                  },
                  winnerSide: game.winnerSide,
                  randomNumber: game.randomNumber,
                  createdAt: game.createdAt,
                  endedAt: game.endedAt,
                })),
              },
            },
          }),
          '/coinflip'
        );
      }


      // -> Send game to clients
      const g = await game.getGameWithUsers();

      broadCast(
        ws,
        JSON.stringify({
          type: 'COINFLIP_GAME_UPDATE',
          payload: {
            game: g,
          },
        }),
        '/coinflip',
      );

      // -> Notify the joiner
      socket.send(
        JSON.stringify({
          type: 'COINFLIP_GAME_JOINED',
          payload: {
            game: g,
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
