import { useState } from 'react';
import { Mic, MicOff, Headphones, Settings, Users, Phone, PhoneOff } from 'lucide-react';

const VoiceChannel = ({ channel, onJoin, onLeave, isConnected }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h4 className="font-bold text-white">{channel.name}</h4>
            <p className="text-xs text-gray-400">{channel.users?.length || 0} users</p>
          </div>
        </div>
        {isConnected ? (
          <button
            onClick={onLeave}
            className="p-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
          >
            <PhoneOff className="w-5 h-5 text-white" />
          </button>
        ) : (
          <button
            onClick={onJoin}
            className="p-2 bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
          >
            <Phone className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      {isConnected && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3 rounded-lg transition-colors ${
              isMuted ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
          </button>
          <button
            onClick={() => setIsDeafened(!isDeafened)}
            className={`p-3 rounded-lg transition-colors ${
              isDeafened ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <Headphones className="w-5 h-5 text-white" />
          </button>
          <button className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
            <Settings className="w-5 h-5 text-white" />
          </button>
        </div>
      )}

      {channel.users && channel.users.length > 0 && (
        <div className="mt-4 space-y-2">
          {channel.users.map((user) => (
            <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-800">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.username} className="w-full h-full rounded-full" />
                ) : (
                  <span className="text-sm font-bold text-white">{user.username[0]}</span>
                )}
              </div>
              <span className="text-sm text-white">{user.username}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VoiceChannel;
