// =====================
// SECTION | IMPORTS
// =====================
import { Schema, model, Model, HydratedDocument } from 'mongoose';
import { IUser, User } from './users';
// =====================!SECTION

// =====================
// SECTION | TYPES
// =====================
export interface ICrashBet {
  user: string;
  betAmount: number;
  cashOutMultiplier?: number;
}

export interface ICrashGame {
  crashPoint: number; // The number at which the game crashed
  betters: Array<ICrashBet>;
  crashedAt?: Date;
}

export interface ICrashGameMethods {}

interface CrashGameModel extends Model<ICrashGame, {}, ICrashGameMethods> {
  storeGame(
    crashPoint: number,
    betters: Array<ICrashBet>,
  ): Promise<ICrashGame>;
}
// =====================!SECTION

// =====================
// SECTION | SCHEMA
// =====================
const CrashGameSchema = new Schema<ICrashGame, CrashGameModel>({
  crashPoint: {
    type: Number,
    required: true,
  },
  betters: {
    type: [
      {
        user: {
          type: String,
          required: true,
        },
        betAmount: {
          type: Number,
          required: true,
        },
        cashOutMultiplier: {
          type: Number,
          required: false,
        },
      },
    ],
    required: true,
  },
  crashedAt: {
    type: Date,
    default: Date.now,
  },
});
// =====================!SECTION

// =====================
// SECTION | METHODS
// =====================

// =====================!SECTION

// =====================
// SECTION | STATICS
// =====================
CrashGameSchema.statics.storeGame = async function (
  crashPoint: number,
  betters: Array<ICrashBet>,
): Promise<ICrashGame> {
  return this.create({
    crashPoint,
    betters,
  });
};
// =====================!SECTION

// =====================
// SECTION | MODEL
// =====================
export const CrashGame = model<ICrashGame, CrashGameModel>(
  'CrashGame',
  CrashGameSchema,
);
// =====================!SECTION
