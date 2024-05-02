// =====================
// SECTION | IMPORTS
// =====================
import { Server } from 'ws';
// =====================!SECTION

// =====================
// SECTION | SOCKET UTILS
// =====================
export const broadCast = (wss: Server, data: string, url: string) => {
  wss.clients.forEach(
    // @ts-ignore
    (client) => client.path === url && client.send(data),
  );
};
// =====================!SECTION
