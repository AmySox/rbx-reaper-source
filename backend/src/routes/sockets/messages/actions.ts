// =====================
// SECTION | IMPORTS
// =====================
import { Message } from '@models/messages';
import { IUser } from '@models/users';
import type { Server, WebSocket } from 'ws';
import { HydratedDocument } from 'mongoose';
import Filter from 'bad-words';
import { broadCast } from '@utils';
// =====================!SECTION

// =====================
// SECTION | INIT
// =====================
const chatLocked = false;

const filter = new Filter({
  // -> Allow some basic profanity like "hell", "damn", "fuck", etc.
  exclude: [
    'hell',
    'damn',
    'crap',
    'fuck',
    'shit',
    'bitch',
    'suck',
    'cunt',
    'fucker',
    'sucker',
    'simp',
  ],
});

export enum MessageActions {
  Message = 'MESSAGE',
}
// =====================

// =====================
// SECTION | ACTIONS - MESSAGE
// =====================
export const handleMessagesActions = async (
  ws: Server,
  socket: WebSocket,
  user: HydratedDocument<IUser>,
  action: MessageActions,
  payload: object,
) => {
  if (action !== MessageActions.Message) throw new Error('Invalid Action');

  const { content } = payload as {
    content: string;
  };

  // -> Validate content
  if (!content)
    socket.send(
      JSON.stringify({
        type: 'ERROR',
        payload: {
          message: 'Message is required',
        },
      }),
    );

  // -> Validate content length
  if (content.length > 512)
    socket.send(
      JSON.stringify({
        type: 'ERROR',
        payload: {
          message: 'Message must be less than 512 characters',
        },
      }),
    );

  // -> Create message
  const msg = await Message.createMessage(user.id, filter.clean(content));

  if (chatLocked) {
   return broadCast(
      ws,
      JSON.stringify({
        type: 'CHAT-LOCKDOWN',
        payload: {
          message: 'Chat is currently locked down',
        } 
      }),
      '/messages'
    );
  }

  
  // -> Send message to all clients unless permTier = 6 ( banned type shi)
  if(user.permsTier !== 6){
    broadCast(
      ws,
      JSON.stringify({
        type: 'MESSAGE',
        payload: {
          message: content,
          timestamp: msg.timestamp,
          sender: {
            username: user.username,
            avatar: user.avatar,
          },
        },
      }),
      '/messages',
    );
  }

};
// =====================!SECTION
