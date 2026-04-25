import { useState } from 'react';
import { Smile, Heart, ThumbsUp, ThumbsDown, Laugh, Fire, Star, Eye } from 'lucide-react';

const ReactionPicker = ({ onReactionSelect, existingReactions = [] }) => {
  const [isOpen, setIsOpen] = useState(false);

  const reactions = [
    { emoji: '👍', icon: ThumbsUp, label: 'Like' },
    { emoji: '❤️', icon: Heart, label: 'Love' },
    { emoji: '😂', icon: Laugh, label: 'Laugh' },
    { emoji: '🔥', icon: Fire, label: 'Fire' },
    { emoji: '⭐', icon: Star, label: 'Star' },
    { emoji: '👀', icon: Eye, label: 'Seen' },
    { emoji: '👎', icon: ThumbsDown, label: 'Dislike' },
  ];

  const handleReaction = (reaction) => {
    onReactionSelect?.(reaction.emoji);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
      >
        <Smile className="w-5 h-5 text-gray-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full left-0 mb-2 bg-gray-900 rounded-lg shadow-xl p-2 flex gap-1 z-20">
            {reactions.map((reaction) => {
              const Icon = reaction.icon;
              const count = existingReactions.find(r => r.emoji === reaction.emoji)?.count || 0;
              
              return (
                <button
                  key={reaction.emoji}
                  onClick={() => handleReaction(reaction)}
                  className="relative p-2 hover:bg-gray-800 rounded-lg transition-colors group"
                  title={reaction.label}
                >
                  <span className="text-xl">{reaction.emoji}</span>
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default ReactionPicker;
