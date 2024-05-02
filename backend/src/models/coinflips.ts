// =====================
// SECTION | IMPORTS
// =====================
import { Schema, model, Model, HydratedDocument } from 'mongoose';
import { IUser, User } from './users';
// =====================!SECTION

// =====================
// SECTION | TYPES
// =====================
export enum CoinflipStatus {
  /** Waiting for joiner */
  WAITING = 'waiting',
  /** Ended */
  ENDED = 'ended',
}

export enum CoinflipSides {
  HEADS = 'heads',
  TAILS = 'tails',
}

export interface ICoinflip {
  /** Creator Id */
  creatorId: string;
  /** Joiner Id */
  joinerId?: string;
  /** Amount of money to bet */
  amount: number;
  /** Creator Side */
  creatorSide: CoinflipSides;
  /** Joiner Side */
  joinerSide?: CoinflipSides;
  /** Winner Side */
  winnerSide?: CoinflipSides;
  /** Coinflip Status */
  status: CoinflipStatus;
  /** Winning User ID */
  winnerId?: string;
  /** Created At */
  createdAt: Date;
  /** Ended At */
  endedAt?: Date;
  /** Random Number */
  randomNumber?: number;
}

export interface ICoinflipMethods {
  /**
   * Joins a coinflip
   *
   * @param joinerId - The ID of the joiner
   * @param joinerSide - The side of the joiner
   */
  join(
    this: HydratedDocument<ICoinflip, ICoinflipMethods>,
    joinerId: string,
    joinerSide: string,
  ): Promise<
    HydratedDocument<ICoinflip, ICoinflipMethods> & {
      creator: IUser;
      joiner?: IUser;
      winner?: IUser;
    }
  >;

  /**
   * Gets the game with users
   */
  getGameWithUsers(
    this: HydratedDocument<ICoinflip, ICoinflipMethods>,
  ): Promise<
    HydratedDocument<ICoinflip> & {
      creator: IUser;
      joiner?: IUser;
      winner?: IUser;
    }
  >;
}

interface CoinflipModel extends Model<ICoinflip, {}, ICoinflipMethods> {
  /**
   * Creates a coinflip
   *
   * @param creatorId - The ID of the creator
   * @param amount - The amount to bet
   * @param creatorSide - The side of the creator
   */
  createCoinflip(
    creatorId: string,
    amount: number,
    creatorSide: string,
  ): Promise<HydratedDocument<ICoinflip, ICoinflipMethods>>;

  /**
   * Fetches coinflip games
   *
   * @param opts - Options for fetching coinflip games
   * @param opts.status - The status of the coinflip games to fetch
   * @param opts.limit - The maximum number of coinflip games to fetch
   * @param opts.skip - The number of coinflip games to skip
   * @param opts.fetchUsers - Whether or not to fetch the users
   */
  fetchGames<T extends boolean>(opts?: {
    status?: CoinflipStatus;
    limit?: number;
    skip?: number;
    fetchUsers?: T;
  }): Promise<
    T extends true
      ? (HydratedDocument<ICoinflip> & {
          creator: IUser;
          joiner?: IUser;
          winner?: IUser;
        })[]
      : HydratedDocument<ICoinflip>[]
  >;
}
// =====================!SECTION

// =====================
// SECTION | SCHEMA
// =====================
const CoinflipSchema = new Schema<ICoinflip, CoinflipModel>({
  creatorId: {
    type: String,
    required: true,
  },
  joinerId: {
    type: String,
    required: false,
  },
  amount: {
    type: Number,
    required: true,
  },
  creatorSide: {
    type: String,
    enum: Object.values(CoinflipSides),
    required: true,
  },
  joinerSide: {
    type: String,
    enum: Object.values(CoinflipSides),
    required: false,
  },
  winnerSide: {
    type: String,
    enum: Object.values(CoinflipSides),
    required: false,
  },
  status: {
    type: String,
    required: true,
    default: CoinflipStatus.WAITING,
  },
  winnerId: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  endedAt: {
    type: Date,
    required: false,
  },
  randomNumber: {
    type: Number,
    required: false,
  },
});
// =====================!SECTION

// =====================
// SECTION | METHODS
// =====================
CoinflipSchema.methods.join = async function (
  this: HydratedDocument<ICoinflip, ICoinflipMethods>,
  joinerId: string,
  joinerSide: CoinflipSides,
) {
  const randomNumber = Math.random();
  const winnerSide =
    randomNumber > 0.5 ? this.creatorSide : this.joinerSide;
  const winnerId = randomNumber > 0.5 ? this.creatorId : joinerId;

  const updatedDoc = await Coinflip.findByIdAndUpdate(
    this.id,
    {
      $set: {
        joinerId: joinerId,
        joinerSide: joinerSide,
        status: CoinflipStatus.ENDED,
        endedAt: new Date(),
        randomNumber: randomNumber,
        winnerSide: winnerSide,
        winnerId: winnerId,
      },
    },
    { new: true },
  );

  return updatedDoc;
};

CoinflipSchema.methods.getGameWithUsers = async function (
  this: HydratedDocument<ICoinflip>,
) {
  const fIn = [this.creatorId];

  if (this.joinerId) fIn.push(this.joinerId);

  if (this.winnerId) fIn.push(this.winnerId);

  const users = await User.find({
    _id: {
      $in: fIn,
    },
  });

  const creator = users.find((user) => user.id === this.creatorId);
  const joiner = users.find((user) => user.id === this.joinerId);
  const winner = users.find((user) => user.id === this.winnerId);

  return {
    ...this.toObject(),
    _id: this.id,
    creator,
    joiner,
    winner,
  };
};
// =====================!SECTION

// =====================
// SECTION | STATICS
// =====================
CoinflipSchema.statics.createCoinflip = async function (
  creatorId: string,
  amount: number,
  creatorSide: CoinflipSides,
) {
  const coinflip = await this.create({
    creatorId,
    amount,
    creatorSide,
  });

  return coinflip;
};

CoinflipSchema.statics.fetchGames = async function (opts?: {
  status?: CoinflipStatus;
  limit?: number;
  skip?: number;
  fetchUsers?: boolean;
}) {
  const status = opts?.status || undefined;
  const limit = opts?.limit ?? 10;
  const skip = opts?.skip ?? 0;
  const fetchUsers = opts?.fetchUsers ?? false;

  const filter: {
    status?: CoinflipStatus;
  } = {};

  if (status) filter['status'] = status;

  console.info({ filter, limit, skip, fetchUsers });

  if (fetchUsers) {
    const coinflips = await this.aggregate([
      {
        $match: {
          ...filter,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);

    const hydratedCoinflips = await Promise.all(
      coinflips.map(async (coinflip) => {
        const hydratedCoinflip = await Coinflip.findById(coinflip._id);

        return hydratedCoinflip?.getGameWithUsers();
      }),
    );

    return hydratedCoinflips;
  }

  const coinflips = await this.aggregate([
    {
      $match: {
        ...filter,
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
  ]);

  return coinflips;
};
// =====================!SECTION

// =====================
// SECTION | MODEL
// =====================
export const Coinflip = model<ICoinflip, CoinflipModel>(
  'Coinflip',
  CoinflipSchema,
);
// =====================!SECTION
