import { useState, useEffect } from 'react';

const themes = {
  dark: {
    name: 'Dark',
    colors: {
      background: '#1e1e1e',
      darker: '#111111',
      light: '#2f3136',
      lighter: '#36393f',
      text: '#dcddde',
      muted: '#8e9297',
      accent: '#5865f2',
      accentHover: '#4752c4'
    }
  },
  midnight: {
    name: 'Midnight',
    colors: {
      background: '#0a0a0a',
      darker: '#050505',
      light: '#1a1a1a',
      lighter: '#1f1f1f',
      text: '#e0e0e0',
      muted: '#7a7a7a',
      accent: '#7289da',
      accentHover: '#5b6eae'
    }
  },
  light: {
    name: 'Light',
    colors: {
      background: '#ffffff',
      darker: '#f0f0f0',
      light: '#e0e0e0',
      lighter: '#f5f5f5',
      text: '#333333',
      muted: '#666666',
      accent: '#5865f2',
      accentHover: '#4752c4'
    }
  }
};

export default function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState('dark');

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setCurrentTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (themeName) => {
    const theme = themes[themeName];
    const root = document.documentElement;

    // Set CSS variables
    root.style.setProperty('--bg-primary', theme.colors.background);
    root.style.setProperty('--bg-secondary', theme.colors.darker);
    root.style.setProperty('--bg-tertiary', theme.colors.light);
    root.style.setProperty('--bg-floating', theme.colors.lighter);
    root.style.setProperty('--text-primary', theme.colors.text);
    root.style.setProperty('--text-secondary', theme.colors.muted);
    root.style.setProperty('--accent-primary', theme.colors.accent);
    root.style.setProperty('--accent-hover', theme.colors.accentHover);

    // Save to localStorage
    localStorage.setItem('theme', themeName);
  };

  const handleThemeChange = (themeName) => {
    setCurrentTheme(themeName);
    applyTheme(themeName);
  };

  return (
    <div className="relative">
      <button
        className="p-2 rounded-lg hover:bg-discord-light transition-colors"
        title="Change theme"
      >
        <svg className="w-5 h-5 text-discord-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      </button>

      <div className="absolute right-0 top-10 bg-discord-lighter rounded-lg shadow-xl p-2 w-48 z-50">
        {Object.entries(themes).map(([key, theme]) => (
          <button
            key={key}
            onClick={() => handleThemeChange(key)}
            className={`w-full text-left px-3 py-2 rounded transition-colors ${
              currentTheme === key ? 'bg-discord-accent text-white' : 'hover:bg-discord-light text-discord-text'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border-2 border-discord-muted"
                style={{ backgroundColor: theme.colors.background }}
              />
              <span>{theme.name}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
