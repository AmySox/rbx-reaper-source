// =====================
// SECTION | IMPORTS
// =====================
import { Schema, model, Model, HydratedDocument } from 'mongoose';
import { compare, genSalt, hash } from 'bcrypt';
// =====================!SECTION

// =====================
// SECTION | TYPES
// =====================
export enum PermsTier {
  USER = 0,
  POWER_USER = 1,
  VIP = 2,
  MOD = 3,
  ADMIN = 5,
  BANNED = 6,
}

export enum Badge {
  ADMIN = 'admin',
  MOD = 'mod',
}

export interface IUser {
  email: string;
  username: string;
  hashedPassword: string;
  balance: number;
  isEmailVerified: boolean;
  badge?: string;
  avatar?: string;
  referredBy?: string;
  referralCode: string;
  permsTier: number;
  ltcAddress?: string;
  btcAddress?: string;
  ethAddress?: string;
}

export interface IUserMethods {
  addToBalance(
    amount: number,
  ): Promise<HydratedDocument<IUser, IUserMethods>>;
  removeFromBalance(
    amount: number,
  ): Promise<HydratedDocument<IUser, IUserMethods>>;
  updateReferralCode(
    referralCode: string,
  ): Promise<HydratedDocument<IUser, IUserMethods>>;
}

interface UserModel extends Model<IUser, {}, IUserMethods> {
  createUser(
    email: string,
    username: string,
    password: string,
    referralCode?: string,
  ): Promise<HydratedDocument<IUser, IUserMethods>>;
  login(
    emailOrUsername: string,
    password: string,
  ): Promise<HydratedDocument<IUser, IUserMethods>>;
}
// =====================!SECTION

// =====================
// SECTION | SCHEMA
// =====================
const UserSchema = new Schema<IUser, UserModel>({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  hashedPassword: {
    type: String,
    required: true,
  },
  balance: {
    type: Number,
    default: 0,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  badge: {
    type: String,
  },
  avatar: {
    type: String,
  },
  referredBy: {
    type: String,
  },
  referralCode: {
    type: String,
    required: true,
    unique: true,
  },
  permsTier: {
    type: Number,
    default: PermsTier.USER,
  },
  ltcAddress: {
    type: String,
    unique: true,
  },
  btcAddress: {
    type: String,
    unique: true,
  },
  ethAddress: {
    type: String,
    unique: true,
  },
});
/*
banned: {
  type: String,
  default: false,
},*/

// =====================!SECTION

// =====================
// SECTION | METHODS
// =====================
UserSchema.methods.addToBalance = function (amount: number) {
  return User.findByIdAndUpdate(this._id, {
    $inc: { balance: amount },
  });
};

UserSchema.methods.addBtcAddress = function (wallet: string) {
  return User.findByIdAndUpdate(
    this._id,
    {
      $inc: { btcAddress: wallet },
    },
    { new: true },
  );
};

UserSchema.methods.addEthAddress = function (wallet: string) {
  return User.findByIdAndUpdate(
    this._id,
    {
      $inc: { ethAddress: wallet },
    },
    { new: true },
  );
};

UserSchema.methods.addLtcAddress = function (wallet: string) {
  return User.findByIdAndUpdate(
    this._id,
    {
      $inc: { ltcAddress: wallet },
    },
    {
      new: true,
    },
  );
};

UserSchema.methods.removeFromBalance = function (amount: number) {
  return User.findByIdAndUpdate(
    this._id,
    {
      $inc: { balance: -amount },
    },
    {
      new: true,
    },
  );
};

UserSchema.methods.updateReferralCode = async function (
  referralCode: string,
) {
  // -> Referral code must be 3-12 characters
  if (referralCode.length < 3 || referralCode.length > 12)
    throw new Error('Referral code must be 3-12 characters');

  // -> Ensure referral code is unique
  const inUse = await User.findOne({ referralCode });

  if (inUse) throw new Error('Referral code already in use');

  return await User.findByIdAndUpdate(
    this._id,
    {
      $set: { referralCode },
    },
    {
      new: true,
    },
  );
};
// =====================!SECTION

// =====================
// SECTION | STATICS
// =====================
UserSchema.statics.createUser = async function (
  email: string,
  username: string,
  password: string,
  referralCode?: string,
) {
  // -> Ensure user does not exist
  const emailInUse = await this.findOne({ email });

  if (emailInUse) throw new Error('Email already in use');

  const usernameInUse = await this.findOne({ username });

  if (usernameInUse) throw new Error('Username already in use');

  const salt = await genSalt(10);
  const hashedPassword = await hash(password, salt);

  // -> Find the user that referred this user
  let referredBy: HydratedDocument<IUser, IUserMethods> | null = null;

  if (referralCode) {
    referredBy = await this.findOne({ referralCode });
  }

  return User.create({
    email,
    username,
    hashedPassword,
    balance: 100_000,
    referredBy: referredBy ? referredBy._id : undefined,
    referralCode: Math.random().toString(36).substring(2, 15),
  });
};

UserSchema.statics.login = async function (
  emailOrUsername: string,
  password: string,
) {
  const user = await this.findOne({
    $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
  });

  if (!user) {
    throw new Error('User not found');
  }

  const isMatch = await compare(password, user.hashedPassword);

  if (!isMatch) {
    throw new Error('Incorrect password');
  }

  return user;
};
// =====================!SECTION

// =====================
// SECTION | MODEL
// =====================
export const User = model<IUser, UserModel>('User', UserSchema);
// =====================!SECTION
