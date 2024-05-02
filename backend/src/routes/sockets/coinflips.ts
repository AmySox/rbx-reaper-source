// // =====================
// // SECTION | IMPORTS
// // =====================
// import { Server, WebSocket } from 'ws';
// import { HydratedDocument } from 'mongoose';
// import { IUser } from '@models/users';
// import { ICoinflipGame, CoinflipGame } from '@models/coinflips';
// // =====================!SECTION

// // =====================
// // SECTION | MAIN
// // =====================
// export const handleCoinflipSocket = async (
//   ws: Server,
//   socket: WebSocket,
//   user: HydratedDocument<IUser>,
//   payload: unknown,
// ) => {
//   const { action, betAmount, side, gameId } = payload as {
//     action: 'create' | 'join' | 'get';
//     side?: 'heads' | 'tails';
//     betAmount?: number;
//     gameId?: string;
//   };

//   // -> Validate action
//   if (!['create', 'join', 'get'].includes(action))
//     socket.send(
//       JSON.stringify({
//         type: 'ERROR',
//         payload: {
//           message: 'Invalid action',
//         },
//       }),
//     );

//   if (action === 'get') {
//     // -> Send coinflip games to client
//     const games = await CoinflipGame.fetchGames({
//       available: true,
//       fetchUsers: true,
//       count: 25,
//     });

//     const gameStats = await CoinflipGame.fetchStats();

//     console.info('Games', games);

//     socket.send(
//       JSON.stringify({
//         type: 'COINFLIP_GAMES',
//         payload: {
//           games,
//         },
//       }),
//     );

//     socket.send(
//       JSON.stringify({
//         type: 'COINFLIP_STATS',
//         payload: {
//           ...gameStats,
//         },
//       }),
//     );
//   } else if (action === 'create') {
//     // -> Validate betAmount
//     if (!betAmount || betAmount <= 0)
//       return socket.send(
//         JSON.stringify({
//           type: 'ERROR',
//           payload: {
//             message: 'Bet amount is required and should be greater than 0',
//           },
//         }),
//       );

//     // -> Validate side
//     if (!side || !['heads', 'tails'].includes(side))
//       return socket.send(
//         JSON.stringify({
//           type: 'ERROR',
//           payload: {
//             message: 'Side is required and should be heads or tails',
//           },
//         }),
//       );

//     // -> Create game
//     const game = await CoinflipGame.createGame(user, side, betAmount);

//     // -> Send game to all clients (including creator)
//     ws.clients.forEach((client) => {
//       client.send(
//         JSON.stringify({
//           type: 'GAME_CREATED',
//           payload: {
//             game,
//           },
//         }),
//       );
//     });
//   } else if (action === 'join') {
//     // -> Validate gameId
//     if (!gameId)
//       socket.send(
//         JSON.stringify({
//           type: 'ERROR',
//           payload: {
//             message: 'Game ID is required to join a game',
//           },
//         }),
//       );

//     // -> Join game
//     const game = await CoinflipGame.findById(gameId);
//     if (!game)
//       return socket.send(
//         JSON.stringify({
//           type: 'ERROR',
//           payload: {
//             message: 'Game not found',
//           },
//         }),
//       );

//     await game.joinGame(user);

//     // -> Send game to all clients (including joiner)
//     ws.clients.forEach((client) => {
//       client.send(
//         JSON.stringify({
//           type: 'GAME_JOINED',
//           payload: {
//             game,
//           },
//         }),
//       );
//     });
//   }
// };
// // =====================!SECTION
