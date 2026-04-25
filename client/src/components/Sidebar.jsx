import { useStore } from '../store/useStore';

export default function Sidebar({ onLogout }) {
  const { servers, currentServer, setCurrentServer, user } = useStore();

  return (
    <div className="w-18 bg-secondary flex flex-col items-center py-3 gap-2">
      {/* Home button */}
      <div className="w-12 h-12 bg-tertiary rounded-2xl flex items-center justify-center text-accent hover:bg-accent hover:text-white cursor-pointer transition-colors interactive">
        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.73 4.87l-15.46 6.27a.5.5 0 00.04.95l4.36 1.45 1.45 4.36a.5.5 0 00.95.04l6.27-15.46a.5.5 0 00-.61-.61z" />
        </svg>
      </div>

      <div className="w-8 h-0.5 bg-tertiary rounded my-1" />

      {/* Server list */}
      {servers.map((server) => (
        <div
          key={server.id}
          onClick={() => setCurrentServer(server)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer transition-colors interactive ${
            currentServer?.id === server.id
              ? 'bg-accent text-white'
              : 'bg-tertiary text-secondary hover:bg-hover'
          }`}
          title={server.name}
        >
          {server.name.charAt(0).toUpperCase()}
        </div>
      ))}

      {/* Add server button */}
      <div className="w-12 h-12 bg-tertiary rounded-2xl flex items-center justify-center text-secondary hover:bg-accent hover:text-white cursor-pointer transition-colors interactive">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>

      <div className="flex-1" />

      {/* User avatar */}
      <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-white font-bold cursor-pointer relative group interactive">
        {user?.username?.charAt(0).toUpperCase() || 'U'}
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-secondary" />
      </div>
    </div>
  );
}
