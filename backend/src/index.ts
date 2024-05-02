// =====================
// SECTION | IMPORTS
// =====================
import 'module-alias/register';
import { mongoUri } from '@keys';
import { connect, connection } from 'mongoose';
// =====================!SECTION

// =====================
// SECTION | MAIN
// =====================
// -> Connect with DB
connect(mongoUri);

// -> When connected to MongoDB
connection.once('open', async () =>
  console.log('Database Status: Online'),
);

// -> Load Routes
import './routes';
// =====================!SECTION
