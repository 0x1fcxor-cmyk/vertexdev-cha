import { Search, Plus, Settings, Users, MessageSquare, Bell, Star, Archive } from 'lucide-react';

const QuickActions = ({ onAction }) => {
  const actions = [
    { icon: Search, label: 'Search', action: 'search' },
    { icon: Plus, label: 'New Server', action: 'new-server' },
    { icon: MessageSquare, label: 'New DM', action: 'new-dm' },
    { icon: Users, label: 'Add Friend', action: 'add-friend' },
    { icon: Bell, label: 'Notifications', action: 'notifications' },
    { icon: Star, label: 'Favorites', action: 'favorites' },
    { icon: Archive, label: 'Archived', action: 'archived' },
    { icon: Settings, label: 'Settings', action: 'settings' },
  ];

  return (
    <div className="flex flex-col gap-1 p-2">
      {actions.map((action) => (
        <button
          key={action.action}
          onClick={() => onAction?.(action.action)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 hover:text-white"
        >
          <action.icon className="w-5 h-5" />
          <span className="text-sm">{action.label}</span>
        </button>
      ))}
    </div>
  );
};

export default QuickActions;
