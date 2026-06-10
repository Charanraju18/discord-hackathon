import mongoose, { Document, Schema } from 'mongoose';

export interface IChannel extends Document {
  name: string;
  serverId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ChannelSchema = new Schema<IChannel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    serverId: {
      type: Schema.Types.ObjectId,
      ref: 'Server',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Channel = mongoose.model<IChannel>('Channel', ChannelSchema);
