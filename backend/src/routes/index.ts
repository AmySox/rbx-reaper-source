// ===========================
// SECTION | IMPORTS
// ===========================
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import root from '@routes/root';
import users from '@routes/users';
import { Server } from 'ws';
import socketsHandler from './sockets';
// =========================== !SECTION

// ===========================
// SECTION | INIT
// ===========================
const app = express();
const wss = new Server({ noServer: true });

app.use(helmet());
app.use(cors());
app.use(express.json());
// =========================== !SECTION

// ===========================
// SECTION | MAIN
// ===========================
// Root
app.use('/', root);

// Users
app.use('/users', users);

// Listen for requests
const server = app.listen(process.env.PORT || 4000, () =>
  console.log('API Status: Online'),
);

// Upgrade HTTP server to support WebSockets
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (socket) => {
    wss.emit('connection', socket, request);
  });
});

// Sockets
socketsHandler(wss);
// =========================== !SECTION
