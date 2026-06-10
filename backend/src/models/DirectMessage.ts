import mongoose, { Document, Schema } from 'mongoose';

export interface IAttachment {
  url: string;
  publicId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  resourceType: string;
  uploadedAt?: Date;
}

export interface IDirectMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content?: string;
  isEdited: boolean;
  editedAt?: Date;
  deleted: boolean;
  deletedAt?: Date;
  attachments: IAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true },
  resourceType: { type: String, required: true },
  uploadedAt: { type: Date }
}, { _id: false });

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
    attachments: {
      type: [AttachmentSchema],
      default: []
    }
  },
  { timestamps: true }
);

DirectMessageSchema.index({ conversationId: 1, createdAt: 1 });

export const DirectMessage = mongoose.model<IDirectMessage>('DirectMessage', DirectMessageSchema);
