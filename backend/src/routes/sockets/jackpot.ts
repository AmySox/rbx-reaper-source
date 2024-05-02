// // =====================
// // SECTION | IMPORTS
// // =====================
// import { Server, WebSocket } from 'ws';
// import { HydratedDocument } from 'mongoose';
// import { IUser } from '@models/users';
// import { IJackpotGame, JackpotGame } from '@models/jackpot';
// // =====================!SECTION

// // =====================
// // SECTION | MAIN
// // =====================
// export const handleJackpotSocket = async (
//   ws: Server,
//   socket: WebSocket,
//   user: HydratedDocument<IUser>,
//   payload: unknown,
// ) => {
//   const { action, betAmount } = payload as {
//     action: 'join';
//     betAmount: number;
//   };

//   // -> Validate action
//   if (action !== 'join')
//     socket.send(
//       JSON.stringify({
//         type: 'ERROR',
//         payload: {
//           message: 'Invalid action',
//         },
//       }),
//     );

//   // -> Validate betAmount
//   if (!betAmount || betAmount <= 0)
//     socket.send(
//       JSON.stringify({
//         type: 'ERROR',
//         payload: {
//           message: 'Bet amount is required and should be greater than 0',
//         },
//       }),
//     );

//   // -> Find or create game
//   let game = await JackpotGame.findOne({
//     closed: false,
//   });

//   if (!game) {
//     game = await JackpotGame.createGame(user, betAmount);
//   }

//   // -> Join game
//   await game.joinGame(user, betAmount);

//   // -> Send game to all clients (including joiner)
//   ws.clients.forEach((client) => {
//     client.send(
//       JSON.stringify({
//         type: 'GAME_JOINED',
//         payload: {
//           game,
//         },
//       }),
//     );
//   });
// };
// // =====================!SECTION
