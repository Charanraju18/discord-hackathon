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

export interface IMessage extends Document {
  content?: string;
  senderId: mongoose.Types.ObjectId;
  channelId: mongoose.Types.ObjectId;
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

const MessageSchema = new Schema<IMessage>(
  {
    content: {
      type: String,
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
  {
    timestamps: true,
  }
);

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
