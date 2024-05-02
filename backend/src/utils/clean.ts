// =====================
// SECTION | IMPORTS
// =====================
import { IUser, IUserMethods } from '@models/users';
import { HydratedDocument } from 'mongoose';
// =====================!SECTION

// =====================
// SECTION | CLEANING UTILS
// =====================
export const cleanUser = (user: HydratedDocument<IUser, IUserMethods>) => {
  const { hashedPassword, ...cleanedUser } = user.toObject();
  return cleanedUser;
};
// =====================!SECTION
