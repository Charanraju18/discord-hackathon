import React from 'react';
import { Download, File, FileText, Image as ImageIcon, Video } from 'lucide-react';

interface Attachment {
  url: string;
  publicId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  resourceType: string;
}

interface AttachmentRendererProps {
  attachments: Attachment[];
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const AttachmentRenderer: React.FC<AttachmentRendererProps> = ({ attachments }) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex flex-col space-y-2 mt-2">
      {attachments.map((attachment) => {
        const { url, publicId, fileName, fileSize, resourceType } = attachment;

        // Image Renderer
        if (resourceType === 'image') {
          return (
            <div key={publicId} className="max-w-sm rounded overflow-hidden shadow-sm">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <img
                  src={url}
                  alt={fileName}
                  className="max-h-80 w-auto object-contain bg-[#2b2d31] rounded cursor-pointer hover:opacity-90 transition-opacity"
                  loading="lazy"
                />
              </a>
            </div>
          );
        }

        // Video Renderer
        if (resourceType === 'video') {
          return (
            <div key={publicId} className="max-w-md rounded overflow-hidden shadow-sm bg-[#2b2d31]">
              <video
                src={url}
                controls
                preload="metadata"
                className="max-h-80 w-full object-contain"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          );
        }

        // Generic File Renderer (PDF, Documents, Archives, etc)
        return (
          <div key={publicId} className="flex items-center p-3 bg-[#2b2d31] border border-divider rounded max-w-sm">
            <div className="w-10 h-10 bg-[#1e1f22] rounded flex items-center justify-center mr-3 shrink-0">
              <File size={24} className="text-text-muted" />
            </div>
            <div className="flex flex-col flex-1 min-w-0 mr-4">
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-interactive-active hover:underline truncate font-medium text-sm"
              >
                {fileName}
              </a>
              <span className="text-xs text-text-muted">{formatBytes(fileSize)}</span>
            </div>
            <a 
              href={url} 
              download 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-text-muted hover:text-white transition-colors"
              title="Download"
            >
              <Download size={20} />
            </a>
          </div>
        );
      })}
    </div>
  );
};
