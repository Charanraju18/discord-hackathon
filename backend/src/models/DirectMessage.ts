import mongoose, { Document, Schema } from 'mongoose';

export interface IDirectMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content: string;
  isEdited: boolean;
  editedAt?: Date;
  deleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DirectMessageSchema = new Schema<IDirectMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'DirectConversation',
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

DirectMessageSchema.index({ conversationId: 1, createdAt: 1 });

export const DirectMessage = mongoose.model<IDirectMessage>('DirectMessage', DirectMessageSchema);
