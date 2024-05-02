// =====================
// SECTION | IMPORTS
// =====================
import { Schema, model, Model } from 'mongoose';
import { User } from './users';
// =====================!SECTION

// =====================
// SECTION | TYPES
// =====================
export interface IJackpotBet {
  user: string;
  betAmount: number;
}

export interface IJackpot {
  betters: Array<IJackpotBet>;
  randomNumber?: number;
  winner?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface IJackpotMethods {
  joinBet(userId: string, betAmount: number): Promise<void>;
  startGame(): Promise<void>;
  endGame(): Promise<void>;
}

interface JackpotModel extends Model<IJackpot, {}, IJackpotMethods> {
  joinOrCreateGame(userId: string, betAmount: number): Promise<IJackpot>;
}

// =====================!SECTION

// =====================
// SECTION | SCHEMA
// =====================
const JackpotSchema = new Schema<IJackpot, JackpotModel>({
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
      },
    ],
    required: true,
  },
  randomNumber: {
    type: Number,
  },
  winner: {
    type: String,
  },
  startTime: {
    type: Date,
  },
  endTime: {
    type: Date,
  },
});
// =====================!SECTION

// =====================
// SECTION | METHODS
// =====================
JackpotSchema.methods.joinBet = async function (
  userId: string,
  betAmount: number,
): Promise<void> {
  const game = await Jackpot.findByIdAndUpdate(
    this._id,
    {
      $push: {
        betters: { user: userId, betAmount },
      },
    },
    {
      new: true,
    },
  );

  if (game?.betters && game?.betters.length >= 8) await game.startGame();
};

JackpotSchema.methods.startGame = async function (): Promise<void> {
  const totalPot = this.betters.reduce(
    (total: number, bet: IJackpotBet) => total + bet.betAmount,
    0,
  );

  const randomNumber = Math.random() * totalPot;
  let accumulatedPercentage = 0;

  for (const bet of this.betters) {
    accumulatedPercentage += (bet.betAmount / totalPot) * 100;

    if (randomNumber <= accumulatedPercentage) {
      this.winner = bet.user;
      break;
    }
  }

  this.randomNumber = randomNumber;
  this.startTime = new Date();

  await this.updateOne(
    {},
    {
      $set: {
        randomNumber: this.randomNumber,
        winner: this.winner,
        startTime: this.startTime,
      },
    },
  );

  for (const bet of this.betters) {
    const user = await User.findById(bet.user);

    if (user) {
      await user.addToBalance(bet.betAmount);
    }
  }
};

JackpotSchema.methods.endGame = async function (): Promise<void> {
  for (const bet of this.betters) {
    const user = await User.findById(bet.user);

    if (user) {
      await user.addToBalance(bet.betAmount);
    }
  }

  this.endTime = new Date();

  await this.updateOne(
    {},
    {
      $set: {
        endTime: this.endTime,
      },
    },
  );

  await this.delete();
};
// =====================!SECTION

// =====================
// SECTION | STATICS
// =====================
JackpotSchema.statics.joinOrCreateGame = async function (
  userId: string,
  betAmount: number,
): Promise<IJackpot> {
  const ongoingGame = await this.findOne({ endTime: { $exists: false } });

  if (ongoingGame) {
    await ongoingGame.joinBet(userId, betAmount);
    return ongoingGame;
  }

  const newGame = await this.create({
    betters: [{ user: userId, betAmount }],
  });

  return newGame;
};
// =====================!SECTION

// =====================
// SECTION | MODEL
// =====================
export const Jackpot = model<IJackpot, JackpotModel>(
  'Jackpot',
  JackpotSchema,
);
// =====================!SECTION
