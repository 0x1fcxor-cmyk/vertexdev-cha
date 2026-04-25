import { Sparkles, Crown, Zap } from 'lucide-react';

const ServerBoost = ({ server, onBoost }) => {
  const boostLevels = [
    { level: 1, perks: ['Custom Icon', 'Banner', '2 Emoji Slots'], boosts: 2 },
    { level: 2, perks: ['All Level 1', '50MB Upload', '3 Emoji Slots', 'Audio Quality'], boosts: 7 },
    { level: 3, perks: ['All Level 2', '100MB Upload', '6 Emoji Slots', 'Invites'], boosts: 14 },
  ];

  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <div className="flex items-center gap-3 mb-4">
        <Crown className="w-6 h-6 text-yellow-500" />
        <h3 className="text-lg font-bold text-white">Server Boosting</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {boostLevels.map((level) => (
          <div
            key={level.level}
            className={`p-4 rounded-lg border-2 transition-all ${
              server.boostLevel >= level.level
                ? 'border-yellow-500 bg-yellow-500/10'
                : 'border-gray-700 bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <span className="font-bold text-white">Level {level.level}</span>
            </div>
            <p className="text-sm text-gray-400 mb-2">{level.boosts} Boosts Required</p>
            <ul className="text-xs text-gray-300 space-y-1">
              {level.perks.map((perk) => (
                <li key={perk} className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-green-500" />
                  {perk}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
        <div>
          <p className="text-sm text-gray-400">Current Boosts</p>
          <p className="text-2xl font-bold text-white">{server.boosts || 0}</p>
        </div>
        <button
          onClick={onBoost}
          className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all"
        >
          Boost Server
        </button>
      </div>
    </div>
  );
};

export default ServerBoost;
