import { Copy, Check, Users, Clock } from 'lucide-react';
import { useState } from 'react';

const InviteCard = ({ invite, onCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(invite.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  const isExpired = new Date(invite.expiresAt) < new Date();

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-green-500" />
          <h4 className="font-bold text-white">Server Invite</h4>
        </div>
        {isExpired && (
          <span className="px-2 py-1 bg-red-500/20 text-red-500 text-xs rounded-full">
            Expired
          </span>
        )}
      </div>

      <div className="bg-gray-800 rounded-lg p-3 mb-4">
        <p className="text-sm text-gray-400 mb-1">Invite Link</p>
        <p className="text-white text-sm font-mono truncate">{invite.url}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <p className="text-gray-400">Uses</p>
          <p className="text-white font-medium">
            {invite.uses} / {invite.maxUses || '∞'}
          </p>
        </div>
        <div>
          <p className="text-gray-400">Expires</p>
          <p className="text-white font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(invite.expiresAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <button
        onClick={handleCopy}
        disabled={isExpired}
        className="w-full py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            Copy Invite
          </>
        )}
      </button>
    </div>
  );
};

export default InviteCard;
