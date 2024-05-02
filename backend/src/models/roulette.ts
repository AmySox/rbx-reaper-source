// =====================
// SECTION | IMPORTS
// =====================
import { Schema, model, Model, HydratedDocument } from 'mongoose';
// =====================!SECTION

// =====================
// SECTION | TYPES
// =====================

export interface IRouletteBet {
  user: string;
  amount: number;
  color: 'black' | 'red' | 'green';
}

export interface IRoulette {
  stopPoint: number;
  betters: Array<IRouletteBet>;
  createdAt: Date;
}

export interface IRouletteMethods {
}

interface RouletteModel extends Model<IRoulette, {}, IRouletteMethods> {
  /**
   * Store a roulette game
   * 
   * @param stopPoint - The stop point of the roulette game
   * @param betters - The betters of the roulette game
   */
  storeGame(
    stopPoint: number,
    betters: Array<IRouletteBet>,
  ): Promise<HydratedDocument<IRoulette, IRouletteMethods>>;
}
// =====================!SECTION

// =====================
// SECTION | SCHEMA
// =====================
const RouletteSchema = new Schema<IRoulette, RouletteModel>({
  stopPoint: {
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
        amount: {
          type: Number,
          required: true,
        },
        color: {
          type: String,
          required: true,
        },
      },
    ],
    required: true,
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
});
// =====================!SECTION

// =====================
// SECTION | STATICS
// =====================
RouletteSchema.statics.storeGame = async function (
  this: Model<IRoulette, {}, IRouletteMethods>,
  stopPoint: number,
  betters: Array<IRouletteBet>,
) {
  const roulette = await this.create({
    stopPoint,
    betters,
  });

  return roulette;
};
// =====================!SECTION

// =====================
// SECTION | MODEL
// =====================
export const Roulette = model<IRoulette, RouletteModel>(
  'Roulete',
  RouletteSchema,
);
// =====================!SECTION
