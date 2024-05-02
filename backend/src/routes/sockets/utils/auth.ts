// ===========================
// SECTION | IMPORTS
// ===========================
import { IUser, IUserMethods } from '@models/users';
import { Auth } from '@services/Auth';
import { HydratedDocument } from 'mongoose';
// =========================== !SECTION

// ===========================
// SECTION | AUTH - SOCKET
// ===========================
export const authSocket = async (message: string) => {
  const data = JSON.parse(message);

  const { action, payload, token } = data as {
    action: string;
    payload: object;
    token: string;
  };

  // -> Handle Authentication
  let user: HydratedDocument<IUser, IUserMethods>;

  try {
    user = await Auth.verifyJWT(token);
  } catch (err) {
    throw new Error('Invalid token');
  }

  return {
    user,
    action,
    payload,
  };
};
// =========================== !SECTION
