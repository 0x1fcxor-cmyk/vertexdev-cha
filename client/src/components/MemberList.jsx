import { Search, Crown, Shield, ShieldCheck, User } from 'lucide-react';
import { useState } from 'react';

const MemberList = ({ members, onMemberClick }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.username.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || member.role === filter;
    return matchesSearch && matchesFilter;
  });

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-red-500" />;
      case 'moderator':
        return <ShieldCheck className="w-4 h-4 text-blue-500" />;
      default:
        return <User className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'idle':
        return 'bg-yellow-500';
      case 'dnd':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {['all', 'online', 'owner', 'admin', 'moderator'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm capitalize transition-colors ${
              filter === f
                ? 'bg-green-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredMembers.map((member) => (
          <div
            key={member.id}
            onClick={() => onMemberClick?.(member)}
            className="flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                {member.avatar ? (
                  <img src={member.avatar} alt={member.username} className="w-full h-full rounded-full" />
                ) : (
                  <span className="text-sm font-bold text-white">{member.username[0]}</span>
                )}
              </div>
              <div className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(member.status)} rounded-full border-2 border-gray-900`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white truncate">{member.username}</span>
                {getRoleIcon(member.role)}
              </div>
              <p className="text-xs text-gray-400 capitalize">{member.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MemberList;
