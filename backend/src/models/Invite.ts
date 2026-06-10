import mongoose, { Document, Schema } from 'mongoose';

export interface IInvite extends Document {
  code: string;
  serverId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const InviteSchema = new Schema<IInvite>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    serverId: {
      type: Schema.Types.ObjectId,
      ref: 'Server',
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

export const Invite = mongoose.model<IInvite>('Invite', InviteSchema);
