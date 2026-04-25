import React, { useState, useEffect, useRef } from 'react';

const Popup = ({
  trigger,
  content,
  position = 'bottom',
  offset = 8,
  closeOnClickOutside = true,
  closeOnEscape = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef(null);
  const triggerRef = useRef(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && triggerRef.current && popupRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const popupRect = popupRef.current.getBoundingClientRect();
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = triggerRect.top - popupRect.height - offset;
          left = triggerRect.left + (triggerRect.width - popupRect.width) / 2;
          break;
        case 'bottom':
          top = triggerRect.bottom + offset;
          left = triggerRect.left + (triggerRect.width - popupRect.width) / 2;
          break;
        case 'left':
          top = triggerRect.top + (triggerRect.height - popupRect.height) / 2;
          left = triggerRect.left - popupRect.width - offset;
          break;
        case 'right':
          top = triggerRect.top + (triggerRect.height - popupRect.height) / 2;
          left = triggerRect.right + offset;
          break;
        default:
          top = triggerRect.bottom + offset;
          left = triggerRect.left;
      }

      // Keep popup within screen bounds
      if (left < 10) left = 10;
      if (left + popupRect.width > screenWidth - 10) left = screenWidth - popupRect.width - 10;
      if (top < 10) top = 10;
      if (top + popupRect.height > screenHeight - 10) top = screenHeight - popupRect.height - 10;

      setPopupPosition({ top, left });
    }
  }, [isOpen, position, offset]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        closeOnClickOutside &&
        popupRef.current &&
        !popupRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (closeOnEscape && event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeOnClickOutside, closeOnEscape]);

  const togglePopup = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <div
        ref={triggerRef}
        onClick={togglePopup}
        className="popup-trigger"
      >
        {trigger}
      </div>
      {isOpen && (
        <div
          ref={popupRef}
          className="popup"
          style={{
            position: 'fixed',
            top: `${popupPosition.top}px`,
            left: `${popupPosition.left}px`,
            zIndex: 10000,
            animation: 'popupIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {typeof content === 'function' ? content(() => setIsOpen(false)) : content}
        </div>
      )}
    </>
  );
};

export default Popup;
