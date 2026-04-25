import { useState } from 'react';
import { apiRequest } from '../lib/api';

export default function AccessibilityPanel({ isOpen, onClose }) {
  const [settings, setSettings] = useState({
    theme: 'dark',
    fontSize: 'medium',
    highContrast: false,
    screenReader: false,
    reducedMotion: false,
    textToSpeech: false,
    closedCaptions: false
  });

  const updateSetting = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      await apiRequest('/api/accessibility/settings', 'PUT', newSettings);
      applySettings(newSettings);
    } catch (error) {
      console.error('Failed to update accessibility settings:', error);
    }
  };

  const applySettings = (newSettings) => {
    // Apply theme
    document.documentElement.setAttribute('data-theme', newSettings.theme);

    // Apply font size
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px',
      'extra-large': '20px'
    };
    document.documentElement.style.fontSize = fontSizeMap[newSettings.fontSize];

    // Apply high contrast
    if (newSettings.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }

    // Apply reduced motion
    if (newSettings.reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }

    // Apply screen reader attributes
    document.documentElement.setAttribute('aria-live', newSettings.screenReader ? 'polite' : 'off');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="accessibility-title">
      <div className="bg-discord-dark rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 id="accessibility-title" className="text-xl font-bold text-white">Accessibility Settings</h2>
          <button
            onClick={onClose}
            className="text-discord-muted hover:text-white transition-colors"
            aria-label="Close accessibility panel"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Theme Selection */}
          <div>
            <label className="block text-sm font-medium text-discord-text mb-2">Theme</label>
            <div className="grid grid-cols-2 gap-2">
              {['dark', 'midnight', 'light', 'high-contrast'].map((theme) => (
                <button
                  key={theme}
                  onClick={() => updateSetting('theme', theme)}
                  className={`px-4 py-2 rounded border transition-colors ${
                    settings.theme === theme
                      ? 'border-discord-accent bg-discord-accent/20 text-white'
                      : 'border-discord-light text-discord-muted hover:border-discord-accent'
                  }`}
                  aria-pressed={settings.theme === theme}
                >
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-discord-text mb-2">Font Size</label>
            <select
              value={settings.fontSize}
              onChange={(e) => updateSetting('fontSize', e.target.value)}
              className="w-full bg-discord-darker border border-discord-light rounded px-3 py-2 text-white"
              aria-label="Select font size"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="extra-large">Extra Large</option>
            </select>
          </div>

          {/* Toggle Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">High Contrast</div>
                <div className="text-xs text-discord-muted">Increase contrast for better visibility</div>
              </div>
              <button
                onClick={() => updateSetting('highContrast', !settings.highContrast)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.highContrast ? 'bg-discord-accent' : 'bg-discord-darker'
                }`}
                role="switch"
                aria-checked={settings.highContrast}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.highContrast ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">Screen Reader Support</div>
                <div className="text-xs text-discord-muted">Optimize for screen readers</div>
              </div>
              <button
                onClick={() => updateSetting('screenReader', !settings.screenReader)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.screenReader ? 'bg-discord-accent' : 'bg-discord-darker'
                }`}
                role="switch"
                aria-checked={settings.screenReader}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.screenReader ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">Reduced Motion</div>
                <div className="text-xs text-discord-muted">Minimize animations</div>
              </div>
              <button
                onClick={() => updateSetting('reducedMotion', !settings.reducedMotion)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.reducedMotion ? 'bg-discord-accent' : 'bg-discord-darker'
                }`}
                role="switch"
                aria-checked={settings.reducedMotion}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.reducedMotion ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">Text-to-Speech</div>
                <div className="text-xs text-discord-muted">Read messages aloud</div>
              </div>
              <button
                onClick={() => updateSetting('textToSpeech', !settings.textToSpeech)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.textToSpeech ? 'bg-discord-accent' : 'bg-discord-darker'
                }`}
                role="switch"
                aria-checked={settings.textToSpeech}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.textToSpeech ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">Closed Captions</div>
                <div className="text-xs text-discord-muted">Display captions for voice/video</div>
              </div>
              <button
                onClick={() => updateSetting('closedCaptions', !settings.closedCaptions)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.closedCaptions ? 'bg-discord-accent' : 'bg-discord-darker'
                }`}
                role="switch"
                aria-checked={settings.closedCaptions}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.closedCaptions ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
