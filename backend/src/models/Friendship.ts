import mongoose, { Document, Schema } from 'mongoose';

export interface IFriendship extends Document {
  userOneId: mongoose.Types.ObjectId;
  userTwoId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FriendshipSchema = new Schema<IFriendship>(
  {
    userOneId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userTwoId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure duplicate friendships cannot exist
FriendshipSchema.index({ userOneId: 1, userTwoId: 1 }, { unique: true });

export const Friendship = mongoose.model<IFriendship>('Friendship', FriendshipSchema);
