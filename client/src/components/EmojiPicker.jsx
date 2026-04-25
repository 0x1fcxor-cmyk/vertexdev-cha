import { useState } from 'react';
import { Smile, Search, Clock } from 'lucide-react';

const EmojiPicker = ({ onEmojiSelect }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('recent');

  const categories = [
    { id: 'recent', name: 'Recent', icon: Clock },
    { id: 'smileys', name: 'Smileys', icon: Smile },
    { id: 'people', name: 'People', icon: Smile },
    { id: 'animals', name: 'Animals', icon: Smile },
    { id: 'food', name: 'Food', icon: Smile },
    { id: 'activities', name: 'Activities', icon: Smile },
    { id: 'objects', name: 'Objects', icon: Smile },
    { id: 'symbols', name: 'Symbols', icon: Smile },
  ];

  const emojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
    '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
    '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
    '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓',
    '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺',
    '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣',
    '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '👍',
    '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆',
    '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '🙏', '💪',
  ];

  const filteredEmojis = emojis.filter(emoji => 
    emoji.includes(search) || search === ''
  );

  return (
    <div className="bg-gray-900 rounded-lg shadow-xl w-80 max-h-96 flex flex-col">
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search emoji..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-white text-sm outline-none flex-1"
          />
        </div>
      </div>

      <div className="flex border-b border-gray-700 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`flex items-center gap-1 px-3 py-2 text-sm whitespace-nowrap transition-colors ${
              category === cat.id
                ? 'text-green-500 border-b-2 border-green-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <cat.icon className="w-4 h-4" />
            {cat.name}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-8 gap-1">
          {filteredEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onEmojiSelect?.(emoji)}
              className="w-8 h-8 flex items-center justify-center text-2xl hover:bg-gray-800 rounded transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmojiPicker;
