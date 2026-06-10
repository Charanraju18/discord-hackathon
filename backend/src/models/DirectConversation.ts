import mongoose, { Document, Schema } from 'mongoose';

export interface IDirectConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  lastMessageId?: mongoose.Types.ObjectId;
  readStates: Map<string, Date>; // userId -> lastReadAt
  createdAt: Date;
  updatedAt: Date;
}

const DirectConversationSchema = new Schema<IDirectConversation>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessageId: {
      type: Schema.Types.ObjectId,
      ref: 'DirectMessage',
    },
    readStates: {
      type: Map,
      of: Date,
      default: () => new Map(),
    },
  },
  { timestamps: true }
);

// Ensure exact pairs are easy to query and maintain uniqueness.
// Mongoose doesn't support unique arrays natively ignoring order,
// but we will enforce ordering before insertion/querying in the controller.
DirectConversationSchema.index({ participants: 1 });

export const DirectConversation = mongoose.model<IDirectConversation>('DirectConversation', DirectConversationSchema);
