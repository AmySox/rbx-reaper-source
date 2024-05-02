// ===========================
// SECTION | IMPORTS
// ===========================
import jwt from 'jsonwebtoken';
import { IUser, IUserMethods, User } from '@models/users';
import { secretToken } from '@keys';
import { HydratedDocument } from 'mongoose';
// =========================== !SECTION

// ===========================
// SECTION | Auth
// ===========================
export class Auth {
  /**
   * Generates a JWT token for the user
   *
   * @param user The user to generate a token for
   */
  static async generateToken(user: HydratedDocument<IUser, IUserMethods>) {
    return {
      token: jwt.sign(
        {
          userId: user.id,
        },
        secretToken,
        {
          expiresIn: '7d',
        },
      ),
    };
  }

  /**
   *
   */
  static async verifyJWT<T extends boolean>(
    token: string,
  ): Promise<HydratedDocument<IUser, IUserMethods>> {
    try {
      const decoded = jwt.verify(token, secretToken) as {
        userId: string;
      };

      const user = await User.findById(decoded.userId);

      if (!user) throw new Error('User not found');

      return user;
    } catch (err) {
      throw new Error('Invalid token');
    }
  }
}
// =========================== !SECTION
