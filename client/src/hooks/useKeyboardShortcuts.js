import { useEffect, useCallback } from 'react';

const defaultShortcuts = {
  // Navigation
  'Ctrl+K': 'focusSearch',
  'Ctrl+1': 'switchToServer1',
  'Ctrl+2': 'switchToServer2',
  'Ctrl+3': 'switchToServer3',
  'Ctrl+4': 'switchToServer4',
  'Ctrl+5': 'switchToServer5',
  'Ctrl+Shift+Up': 'previousChannel',
  'Ctrl+Shift+Down': 'nextChannel',
  
  // Messaging
  'Ctrl+Enter': 'sendMessage',
  'Ctrl+Shift+Enter': 'newLine',
  'Ctrl+B': 'bold',
  'Ctrl+I': 'italic',
  'Ctrl+U': 'underline',
  'Ctrl+Shift+S': 'strikethrough',
  'Ctrl+E': 'toggleEmojiPicker',
  'Ctrl+Shift+E': 'toggleFormatting',
  
  // Actions
  'Escape': 'closeModal',
  'Ctrl+/': 'showShortcuts',
  'Ctrl+N': 'newDM',
  'Ctrl+Shift+N': 'newServer',
  'Ctrl+Comma': 'openSettings',
  'Ctrl+H': 'toggleMute',
  'Ctrl+Shift+H': 'toggleDeafen',
  
  // Moderation
  'Ctrl+Shift+K': 'kickUser',
  'Ctrl+Shift+B': 'banUser',
  'Ctrl+Shift+M': 'muteUser',
  
  // Other
  'F11': 'toggleFullscreen',
  'Ctrl+Shift+R': 'reload'
};

export function useKeyboardShortcuts(handlers = {}, customShortcuts = {}) {
  const shortcuts = { ...defaultShortcuts, ...customShortcuts };

  const handleKeyDown = useCallback((e) => {
    // Don't trigger shortcuts when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      // Allow some shortcuts in inputs
      if (e.key === 'Escape' || (e.ctrlKey && e.key === 'Enter')) {
        // Allow these
      } else {
        return;
      }
    }

    const keys = [];
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.shiftKey) keys.push('Shift');
    if (e.altKey) keys.push('Alt');
    if (e.metaKey) keys.push('Meta');
    if (e.key.length === 1) keys.push(e.key.toUpperCase());
    else keys.push(e.key);

    const shortcut = keys.join('+');
    const action = shortcuts[shortcut];

    if (action && handlers[action]) {
      e.preventDefault();
      handlers[action](e);
    }
  }, [shortcuts, handlers]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { shortcuts };
}

export default useKeyboardShortcuts;
