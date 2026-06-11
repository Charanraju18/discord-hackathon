import React, { useEffect, useRef } from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';
interface EmojiPickerPopupProps {
  onEmojiSelect: (emoji: EmojiClickData) => void;
  onClose: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const EmojiPickerPopup: React.FC<EmojiPickerPopupProps> = ({
  onEmojiSelect,
  onClose,
  position = 'top-left'
}) => {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const path = event.composedPath();
      if (pickerRef.current && !path.includes(pickerRef.current)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  let positionClasses = '';
  switch (position) {
    case 'top-right':
      positionClasses = 'bottom-[calc(100%+8px)] right-0';
      break;
    case 'top-left':
      positionClasses = 'bottom-[calc(100%+8px)] left-0';
      break;
    case 'bottom-right':
      positionClasses = 'top-[calc(100%+8px)] right-0';
      break;
    case 'bottom-left':
      positionClasses = 'top-[calc(100%+8px)] left-0';
      break;
  }

  return (
    <div
      ref={pickerRef}
      className={`absolute z-50 ${positionClasses} shadow-lg rounded-lg overflow-hidden`}
      style={{ width: '350px', height: '450px' }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <EmojiPicker
        theme={Theme.DARK}
        onEmojiClick={(emojiData) => {
          onEmojiSelect(emojiData);
          onClose(); // Automatically close picker after selection
        }}
        lazyLoadEmojis={true}
        searchDisabled={false}
        skinTonesDisabled={true}
        width="100%"
        height="100%"
      />
    </div>
  );
};
