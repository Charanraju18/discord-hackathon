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

  const [dynamicPosition, setDynamicPosition] = React.useState(position);

  React.useLayoutEffect(() => {
    if (!pickerRef.current) return;
    const rect = pickerRef.current.getBoundingClientRect();
    let newPos = position;

    // Fix vertical overflow
    if ((position === 'top-right' || position === 'top-left') && rect.top < 0) {
      newPos = position.replace('top', 'bottom') as any;
    } else if ((position === 'bottom-right' || position === 'bottom-left') && rect.bottom > window.innerHeight) {
      newPos = position.replace('bottom', 'top') as any;
    }

    // Fix horizontal overflow
    const updatedRect = pickerRef.current.getBoundingClientRect();
    if (updatedRect.right > window.innerWidth) {
      newPos = newPos.replace('left', 'right') as any; // Switch to right-anchored
    } else if (updatedRect.left < 0) {
      newPos = newPos.replace('right', 'left') as any; // Switch to left-anchored
    }

    setDynamicPosition(newPos);
  }, [position]);

  let positionClasses = '';
  switch (dynamicPosition) {
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
