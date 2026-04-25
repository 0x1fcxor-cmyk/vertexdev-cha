import { Settings, Globe, Shield, Users, Palette, Bell, Zap, Lock } from 'lucide-react';
import { useState } from 'react';

const ServerSettings = ({ server, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState(server.settings || {});

  const tabs = [
    { id: 'general', icon: Settings, label: 'General' },
    { id: 'roles', icon: Shield, label: 'Roles' },
    { id: 'members', icon: Users, label: 'Members' },
    { id: 'appearance', icon: Palette, label: 'Appearance' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'integrations', icon: Zap, label: 'Integrations' },
    { id: 'security', icon: Lock, label: 'Security' },
  ];

  const handleSave = () => {
    onUpdate?.(settings);
  };

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex border-b border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 transition-colors ${
              activeTab === tab.id
                ? 'text-green-500 border-b-2 border-green-500 bg-green-500/10'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Server Name</label>
              <input
                type="text"
                value={settings.name || server.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Description</label>
              <textarea
                value={settings.description || ''}
                onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                rows={4}
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Region</label>
              <select
                value={settings.region || 'us-east'}
                onChange={(e) => setSettings({ ...settings, region: e.target.value })}
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="us-east">US East</option>
                <option value="us-west">US West</option>
                <option value="eu-west">Europe West</option>
                <option value="asia">Asia</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Primary Color</label>
              <div className="flex gap-2">
                {['#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setSettings({ ...settings, primaryColor: color })}
                    className={`w-10 h-10 rounded-lg transition-transform hover:scale-110 ${
                      settings.primaryColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Banner Image</label>
              <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
                <Globe className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-400">Click to upload banner</p>
              </div>
            </div>
          </div>
        )}

        {activeTab !== 'general' && activeTab !== 'appearance' && (
          <div className="text-center py-12">
            <p className="text-gray-400">This tab is under development</p>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-gray-800 flex justify-end gap-3">
        <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors">
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default ServerSettings;
