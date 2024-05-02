// ===========================
// SECTION | IMPORTS
// ===========================
import { Server, WebSocket } from 'ws';
import { authSocket } from '../utils/auth';
import { Coinflip, CoinflipStatus } from '@models/coinflips';
import { CoinflipActions, handleCoinflipActions } from './actions';
// =========================== !SECTION

// ===========================
// SECTION | COINFLIP - CONNECTION
// ===========================
export const handleCoinflipConnection = async (
  wss: Server,
  socket: WebSocket,
) => {
  // -> Give client path
  // @ts-ignore
  socket.path = '/coinflip';

  // -> Get last 10 coinflip games that have ended + All ongoing games
  const coinflipsEnded = await Coinflip.fetchGames({
    status: CoinflipStatus.ENDED,
    limit: 10,
    fetchUsers: true,
  });

  const coinflipsOngoing = await Coinflip.fetchGames({
    status: CoinflipStatus.WAITING,
    fetchUsers: true,
  });

  // -> Send games to client
  socket.send(
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
          ongoing: coinflipsOngoing.map((game) => ({
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
  );

  socket.on('message', async (message) => {
    try {
      const { action, payload, user } = await authSocket(
        message.toString(),
      );

      // -> Handle Actions
      handleCoinflipActions(
        wss,
        socket,
        user,
        action as CoinflipActions,
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
