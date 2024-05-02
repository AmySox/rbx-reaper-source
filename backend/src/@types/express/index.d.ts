import { IUser, IUserMethods } from "@models/users";
import { HydratedDocument } from "mongoose";

export { };

declare global {
  namespace Express {
    interface Request {
      user: HydratedDocument<IUser, IUserMethods>;
    }
  }
}