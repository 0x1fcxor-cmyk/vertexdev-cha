import { useEffect, useState } from 'react';

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    setIsElectron(typeof window !== 'undefined' && window.electronAPI !== undefined);
  }, []);

  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.minimizeWindow();
    }
  };

  const handleMaximize = async () => {
    if (window.electronAPI) {
      await window.electronAPI.maximizeWindow();
      setIsMaximized(!isMaximized);
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.closeWindow();
    }
  };

  if (!isElectron) {
    return null;
  }

  return (
    <div className="h-8 bg-discord-darker flex items-center justify-between select-none drag">
      <div className="flex items-center px-4">
        <span className="text-sm font-medium text-discord-muted">LightChat</span>
      </div>
      
      <div className="flex no-drag">
        <button
          onClick={handleMinimize}
          className="w-11 h-8 flex items-center justify-center text-discord-muted hover:bg-discord-light hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 13H5v-2h14v2z" />
          </svg>
        </button>
        
        <button
          onClick={handleMaximize}
          className="w-11 h-8 flex items-center justify-center text-discord-muted hover:bg-discord-light hover:text-white transition-colors"
        >
          {isMaximized ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 5h4v4H5V5zm10 0h4v4h-4V5zM5 15h4v4H5v-4zm10 0h4v4h-4v-4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 4h16v16H4V4zm2 2v12h12V6H6z" />
            </svg>
          )}
        </button>
        
        <button
          onClick={handleClose}
          className="w-11 h-8 flex items-center justify-center text-discord-muted hover:bg-red-600 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
