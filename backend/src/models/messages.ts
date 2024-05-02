// =====================
// SECTION | IMPORTS
// =====================
import { Schema, model, Model, HydratedDocument } from 'mongoose';
import { IUser } from './users';
// =====================!SECTION

// =====================
// SECTION | TYPES
// =====================
export interface IMessage {
  /** User ID of user that sent this message */
  userId: string;
  /** Content of the message */
  content: string;
  /** Timestamp of when the message was sent */
  timestamp: number;
}

export interface IMessageMethods {}

interface MessageModel extends Model<IMessage, {}, IMessageMethods> {
  /**
   * Creates a message
   *
   * @param userId - The user id of the user
   * @param content - The content of the message
   */
  createMessage(
    userId: string,
    content: string,
  ): Promise<HydratedDocument<IMessage>>;

  /**
   * Fetches messages
   *
   * @param opts - Options for fetching messages
   * @param opts.userId - The user id of the user
   * @param opts.limit - The maximum number of messages to fetch
   * @param opts.skip - The number of messages to skip
   * @param opts.fetchUsers - Whether or not to fetch the users
   */
  fetchMessages<T extends boolean>(opts?: {
    userId?: string;
    limit?: number;
    skip?: number;
    fetchUsers?: T;
  }): Promise<
    T extends true ? (IMessage & { user: IUser })[] : IMessage[]
  >;

  /**
   * Deletes messages by user id
   *
   * @param userId - The user id of the user
   * @param opts - Options for deleting messages
   * @param opts.timestamp - The timestamp of the message to delete
   * @param opts.limit - The maximum number of messages to delete
   * @param opts.skip - The number of messages to skip
   */
  deleteMessagesByPublicKey(
    userId: string,
    opts?: {
      timestamp?: number;
      limit?: number;
      skip?: number;
    },
  ): Promise<number>;
}
// =====================!SECTION

// =====================
// SECTION | SCHEMA
// =====================
const MessageSchema = new Schema<IMessage, MessageModel>({
  userId: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 1024,
  },
  timestamp: {
    type: Number,
    required: true,
  },
});
// =====================!SECTION

// =====================
// SECTION | STATICS
// =====================
MessageSchema.statics.createMessage = async function (
  userId: string,
  content: string,
) {
  const timestamp = Date.now();
  const message = await this.create({
    userId,
    content,
    timestamp,
  });

  return message;
};

MessageSchema.statics.fetchMessages = async function (opts?: {
  userId?: string;
  limit?: number;
  skip?: number;
  fetchUsers?: boolean;
}) {
  const limit = opts?.limit ?? 10;
  const skip = opts?.skip ?? 0;
  const fetchUsers = opts?.fetchUsers ?? false;
  const userId = opts?.userId;

  const filter: {
    userId?: string;
  } = {};

  if (userId) filter['userId'] = userId;

  if (fetchUsers) {
    const messages = await this.aggregate([
      {
        $match: {
          ...filter,
        },
      },
      {
        $sort: {
          timestamp: -1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: 'users',
          let: { user_id: '$userId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toString: '$_id' }, '$$user_id'],
                },
              },
            },
          ],
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          publicKey: 1,
          content: 1,
          timestamp: 1,
          user: {
            username: 1,
            avatar: 1,
          },
        },
      },
    ]);

    return messages;
  } else {
    const messages = await this.find(filter)
      .sort({
        timestamp: -1,
      })
      .skip(skip)
      .limit(limit);

    return messages;
  }
};

MessageSchema.statics.deleteMessagesByUserId = async function (
  userId: string,
  opts?: {
    limit?: number;
    skip?: number;
    afterTimestamp?: number;
    beforeTimestamp?: number;
  },
) {
  const limit = opts?.limit ?? Infinity;
  const skip = opts?.skip ?? 0;

  const afterTimestamp = opts?.afterTimestamp ?? 0;
  const beforeTimestamp = opts?.beforeTimestamp ?? Infinity;

  const deleted = await this.deleteMany(
    {
      userId: userId,
      timestamp: {
        $gte: afterTimestamp,
        $lte: beforeTimestamp,
      },
    },
    {
      limit,
      skip,
    },
  );

  return deleted.deletedCount ?? 0;
};
// =====================!SECTION

// =====================
// SECTION | MODEL
// =====================
export const Message = model<IMessage, MessageModel>(
  'Message',
  MessageSchema,
);
// =====================!SECTION
