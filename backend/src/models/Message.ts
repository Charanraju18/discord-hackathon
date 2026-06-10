import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  content: string;
  senderId: mongoose.Types.ObjectId;
  channelId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    channelId: {
      type: Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
