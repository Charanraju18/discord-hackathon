import mongoose, { Document, Schema } from 'mongoose';

export interface IServerInvitation extends Document {
  serverId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'declined';
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ServerInvitationSchema = new Schema<IServerInvitation>(
  {
    serverId: {
      type: Schema.Types.ObjectId,
      ref: 'Server',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const ServerInvitation = mongoose.model<IServerInvitation>('ServerInvitation', ServerInvitationSchema);
