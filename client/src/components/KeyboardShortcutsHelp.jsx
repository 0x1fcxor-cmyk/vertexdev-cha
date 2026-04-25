import { useState } from 'react';

const shortcutGroups = [
  {
    name: 'Navigation',
    shortcuts: [
      { keys: 'Ctrl+K', description: 'Focus search' },
      { keys: 'Ctrl+1-5', description: 'Switch to server 1-5' },
      { keys: 'Ctrl+Shift+↑', description: 'Previous channel' },
      { keys: 'Ctrl+Shift+↓', description: 'Next channel' }
    ]
  },
  {
    name: 'Messaging',
    shortcuts: [
      { keys: 'Ctrl+Enter', description: 'Send message' },
      { keys: 'Ctrl+Shift+Enter', description: 'New line' },
      { keys: 'Ctrl+B', description: 'Bold text' },
      { keys: 'Ctrl+I', description: 'Italic text' },
      { keys: 'Ctrl+U', description: 'Underline' },
      { keys: 'Ctrl+Shift+S', description: 'Strikethrough' },
      { keys: 'Ctrl+E', description: 'Toggle emoji picker' },
      { keys: 'Ctrl+Shift+E', description: 'Toggle formatting' }
    ]
  },
  {
    name: 'Actions',
    shortcuts: [
      { keys: 'Escape', description: 'Close modal' },
      { keys: 'Ctrl+/', description: 'Show keyboard shortcuts' },
      { keys: 'Ctrl+N', description: 'New DM' },
      { keys: 'Ctrl+Shift+N', description: 'New server' },
      { keys: 'Ctrl+,', description: 'Open settings' },
      { keys: 'Ctrl+H', description: 'Toggle mute' },
      { keys: 'Ctrl+Shift+H', description: 'Toggle deafen' }
    ]
  },
  {
    name: 'Moderation',
    shortcuts: [
      { keys: 'Ctrl+Shift+K', description: 'Kick user' },
      { keys: 'Ctrl+Shift+B', description: 'Ban user' },
      { keys: 'Ctrl+Shift+M', description: 'Mute user' }
    ]
  },
  {
    name: 'Other',
    shortcuts: [
      { keys: 'F11', description: 'Toggle fullscreen' },
      { keys: 'Ctrl+Shift+R', description: 'Reload' }
    ]
  }
];

export default function KeyboardShortcutsHelp({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-discord-lighter rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Keyboard Shortcuts</h2>
            <button
              onClick={onClose}
              className="text-discord-muted hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {shortcutGroups.map((group) => (
            <div key={group.name} className="mb-6">
              <h3 className="text-lg font-semibold text-discord-accent mb-3">{group.name}</h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut) => (
                  <div key={shortcut.keys} className="flex items-center justify-between py-2 border-b border-discord-light">
                    <span className="text-discord-text">{shortcut.description}</span>
                    <kbd className="px-3 py-1 bg-discord-darker rounded text-sm text-discord-muted font-mono">
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-6 pt-4 border-t border-discord-light text-center text-sm text-discord-muted">
            Press <kbd className="px-2 py-1 bg-discord-darker rounded font-mono">Escape</kbd> to close
          </div>
        </div>
      </div>
    </div>
  );
}
