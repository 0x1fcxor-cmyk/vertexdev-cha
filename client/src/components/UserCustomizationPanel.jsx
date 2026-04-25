import { useState } from 'react';
import { apiRequest } from '../lib/api';

export default function UserCustomizationPanel({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('appearance');
  const [customization, setCustomization] = useState({
    theme: 'dark',
    fontSize: 'medium',
    profileTheme: 'default',
    avatarFrame: 'none',
    profileAnimation: 'none',
    customCss: ''
  });

  const tabs = [
    { id: 'appearance', name: 'Appearance' },
    { id: 'profile', name: 'Profile' },
    { id: 'emojis', name: 'Emojis' },
    { id: 'stickers', name: 'Stickers' },
    { id: 'badges', name: 'Badges' },
    { id: 'sounds', name: 'Sounds' },
    { id: 'themes', name: 'Themes' },
    { id: 'shortcuts', name: 'Shortcuts' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true">
      <div className="bg-discord-dark rounded-lg w-full max-w-4xl h-[90vh] flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-discord-darker p-4">
          <h2 className="text-lg font-bold text-white mb-4">Customization</h2>
          <div className="space-y-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-discord-accent text-white'
                    : 'text-discord-muted hover:bg-discord-light hover:text-white'
                }`}
              >
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-white">
              {tabs.find(t => t.id === activeTab)?.name}
            </h3>
            <button
              onClick={onClose}
              className="text-discord-muted hover:text-white text-2xl"
            >
              ✕
            </button>
          </div>

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-discord-text mb-2">Theme</label>
                <div className="grid grid-cols-4 gap-3">
                  {['dark', 'light', 'midnight', 'sunset', 'ocean', 'forest', 'cyberpunk', 'pastel'].map(theme => (
                    <button
                      key={theme}
                      onClick={() => setCustomization({ ...customization, theme })}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        customization.theme === theme
                          ? 'border-discord-accent bg-discord-accent/20'
                          : 'border-discord-light hover:border-discord-accent'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-discord-accent to-purple-500 mx-auto mb-2" />
                      <div className="text-xs text-white capitalize">{theme}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-discord-text mb-2">Profile Theme</label>
                <select
                  value={customization.profileTheme}
                  onChange={(e) => setCustomization({ ...customization, profileTheme: e.target.value })}
                  className="w-full bg-discord-darker border border-discord-light rounded px-3 py-2 text-white"
                >
                  <option value="default">Default</option>
                  <option value="gradient-blue">Blue Gradient</option>
                  <option value="gradient-purple">Purple Gradient</option>
                  <option value="gradient-sunset">Sunset Gradient</option>
                  <option value="animated-stars">Animated Stars</option>
                  <option value="animated-waves">Animated Waves</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-discord-text mb-2">Avatar Frame</label>
                <div className="flex gap-3">
                  {['none', 'gold', 'silver', 'rainbow', 'neon', 'glitch'].map(frame => (
                    <button
                      key={frame}
                      onClick={() => setCustomization({ ...customization, avatarFrame: frame })}
                      className={`w-16 h-16 rounded-full border-4 transition-all ${
                        customization.avatarFrame === frame
                          ? 'border-discord-accent scale-110'
                          : 'border-discord-light hover:border-discord-accent'
                      }`}
                    >
                      <div className="w-full h-full rounded-full bg-discord-accent/50" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-discord-text mb-2">Profile Animation</label>
                <select
                  value={customization.profileAnimation}
                  onChange={(e) => setCustomization({ ...customization, profileAnimation: e.target.value })}
                  className="w-full bg-discord-darker border border-discord-light rounded px-3 py-2 text-white"
                >
                  <option value="none">None</option>
                  <option value="bounce">Bounce</option>
                  <option value="pulse">Pulse</option>
                  <option value="spin">Spin</option>
                  <option value="float">Float</option>
                  <option value="glow">Glow</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-discord-text mb-2">Custom CSS</label>
                <textarea
                  value={customization.customCss}
                  onChange={(e) => setCustomization({ ...customization, customCss: e.target.value })}
                  placeholder="Enter custom CSS for your profile..."
                  className="w-full bg-discord-darker border border-discord-light rounded px-3 py-2 text-white font-mono text-sm h-32"
                />
              </div>

              <button
                onClick={() => apiRequest('/api/user-customization/appearance', 'PUT', customization)}
                className="w-full bg-discord-accent hover:bg-discord-accent/80 text-white font-medium py-3 rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          )}

          {activeTab === 'emojis' && (
            <div className="space-y-6">
              <div className="bg-discord-darker rounded-lg p-6 border-2 border-dashed border-discord-light">
                <div className="text-center">
                  <div className="w-16 h-16 bg-discord-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-discord-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <h4 className="text-white font-medium mb-2">Create Custom Emoji</h4>
                  <p className="text-discord-muted text-sm mb-4">Upload an image to create your own custom emoji</p>
                  <button className="bg-discord-accent hover:bg-discord-accent/80 text-white px-6 py-2 rounded-lg transition-colors">
                    Upload Emoji
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-4">Your Custom Emojis</h4>
                <div className="grid grid-cols-6 gap-4">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="aspect-square bg-discord-darker rounded-lg flex items-center justify-center cursor-pointer hover:bg-discord-light transition-colors">
                      <div className="text-discord-muted text-xs">Emoji {i}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stickers' && (
            <div className="space-y-6">
              <div className="bg-discord-darker rounded-lg p-6 border-2 border-dashed border-discord-light">
                <div className="text-center">
                  <div className="w-16 h-16 bg-discord-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-discord-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <h4 className="text-white font-medium mb-2">Create Custom Sticker</h4>
                  <p className="text-discord-muted text-sm mb-4">Upload an image to create your own custom sticker</p>
                  <button className="bg-discord-accent hover:bg-discord-accent/80 text-white px-6 py-2 rounded-lg transition-colors">
                    Upload Sticker
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-4">Your Custom Stickers</h4>
                <div className="grid grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="aspect-square bg-discord-darker rounded-lg flex items-center justify-center cursor-pointer hover:bg-discord-light transition-colors">
                      <div className="text-discord-muted text-xs">Sticker {i}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'badges' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-white font-medium mb-4">Available Badges</h4>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { id: 'early-adopter', name: 'Early Adopter' },
                    { id: 'premium', name: 'Premium' },
                    { id: 'moderator', name: 'Moderator' },
                    { id: 'developer', name: 'Developer' },
                    { id: 'artist', name: 'Artist' },
                    { id: 'musician', name: 'Musician' },
                    { id: 'gamer', name: 'Gamer' },
                    { id: 'custom', name: 'Custom' }
                  ].map(badge => (
                    <button
                      key={badge.id}
                      className="bg-discord-darker rounded-lg p-4 hover:bg-discord-light transition-colors"
                    >
                      <div className="w-8 h-8 bg-discord-accent/30 rounded-full flex items-center justify-center mx-auto mb-2">
                        <div className="w-4 h-4 bg-discord-accent rounded-full" />
                      </div>
                      <div className="text-xs text-white">{badge.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-4">Your Badges</h4>
                <div className="flex gap-3">
                  {['Early Adopter', 'Premium', 'Developer'].map((badge, i) => (
                    <div key={i} className="bg-discord-accent/20 px-3 py-1 rounded text-sm text-white">{badge}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sounds' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-white font-medium mb-4">Notification Sounds</h4>
                <div className="space-y-4">
                  {[
                    { id: 'message', name: 'Message Sound' },
                    { id: 'mention', name: 'Mention Sound' },
                    { id: 'call', name: 'Call Sound' },
                    { id: 'friend-request', name: 'Friend Request Sound' }
                  ].map(sound => (
                    <div key={sound.id} className="bg-discord-darker rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-white">{sound.name}</span>
                        <div className="flex gap-2">
                          <button className="bg-discord-accent hover:bg-discord-accent/80 text-white px-3 py-1 rounded text-sm">
                            Test
                          </button>
                          <button className="bg-discord-light hover:bg-discord-light/80 text-white px-3 py-1 rounded text-sm">
                            Change
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-discord-darker rounded-lg p-6 border-2 border-dashed border-discord-light">
                <div className="text-center">
                  <h4 className="text-white font-medium mb-2">Upload Custom Sound</h4>
                  <p className="text-discord-muted text-sm mb-4">Upload your own notification sounds</p>
                  <button className="bg-discord-accent hover:bg-discord-accent/80 text-white px-6 py-2 rounded-lg transition-colors">
                    Upload Sound
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'themes' && (
            <div className="space-y-6">
              <div className="bg-discord-darker rounded-lg p-6 border-2 border-dashed border-discord-light">
                <div className="text-center">
                  <div className="w-16 h-16 bg-discord-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-discord-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <h4 className="text-white font-medium mb-2">Create Custom Theme</h4>
                  <p className="text-discord-muted text-sm mb-4">Design your own theme with custom colors and fonts</p>
                  <button className="bg-discord-accent hover:bg-discord-accent/80 text-white px-6 py-2 rounded-lg transition-colors">
                    Create Theme
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-4">Your Custom Themes</h4>
                <div className="grid grid-cols-3 gap-4">
                  {['My Dark Theme', 'Ocean Blue', 'Neon Nights'].map((theme, i) => (
                    <div key={i} className="bg-discord-darker rounded-lg p-4 hover:bg-discord-light transition-colors cursor-pointer">
                      <div className="w-full h-20 rounded bg-gradient-to-br from-discord-accent to-purple-500 mb-3" />
                      <div className="text-white text-sm">{theme}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-white font-medium mb-4">Keyboard Shortcuts</h4>
                <div className="space-y-3">
                  {[
                    { action: 'Send Message', shortcut: 'Enter' },
                    { action: 'New Line', shortcut: 'Shift + Enter' },
                    { action: 'Focus Chat', shortcut: 'Ctrl + K' },
                    { action: 'Toggle Mute', shortcut: 'Ctrl + M' },
                    { action: 'Toggle Deafen', shortcut: 'Ctrl + D' },
                    { action: 'Settings', shortcut: 'Ctrl + ,' }
                  ].map((item, i) => (
                    <div key={i} className="bg-discord-darker rounded-lg p-4 flex justify-between items-center">
                      <span className="text-white">{item.action}</span>
                      <kbd className="bg-discord-light text-white px-3 py-1 rounded text-sm">{item.shortcut}</kbd>
                    </div>
                  ))}
                </div>
              </div>

              <button className="w-full bg-discord-accent hover:bg-discord-accent/80 text-white font-medium py-3 rounded-lg transition-colors">
                Customize Shortcuts
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
