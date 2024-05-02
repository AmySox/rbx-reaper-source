// ===========================
// SECTION | IMPORTS
// ===========================
import { Message } from '@models/messages';
import { Server, WebSocket } from 'ws';
import { authSocket } from '../utils/auth';
import { MessageActions, handleMessagesActions } from './actions';
import { broadCast } from '@utils';
// =========================== !SECTION

// ===========================
// SECTION | MESSAGES - CONNECTION
// ===========================
export const handleMessagesConnection = async (
  wss: Server,
  socket: WebSocket,
) => {
  // -> Give client path
  // @ts-ignore
  socket.path = '/messages';

  // -> Get last 25 messages
  const messages = await Message.fetchMessages({
    limit: 25,
    fetchUsers: true,
  });

  // -> Send messages to client
  socket.send(
    JSON.stringify({
      type: 'MESSAGES',
      payload: {
        messages: messages.reverse().map((message) => ({
          message: message.content,
          timestamp: message.timestamp,
          sender: {
            username: message.user.username,
            avatar: message.user.avatar,
          },
        })),
      },
    }),
  );

  // -> Emit current user count to all clients
  broadCast(
    wss,
    JSON.stringify({
      type: 'USER_COUNT',
      payload: {
        count: wss.clients.size,
      },
    }),
    '/messages',
  );

  socket.on('message', async (message) => {
    try {
      const { action, payload, user } = await authSocket(
        message.toString(),
      );

      // -> Handle Actions
      handleMessagesActions(
        wss,
        socket,
        user,
        action as MessageActions,
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
