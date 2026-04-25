import { useState } from 'react';
import { BarChart3, CheckCircle, Clock, Users } from 'lucide-react';

const PollWidget = ({ poll, onVote, onEndPoll }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);

  const totalVotes = poll.options?.reduce((sum, opt) => sum + opt.votes, 0) || 0;

  const handleVote = () => {
    if (selectedOption && !hasVoted) {
      onVote?.(poll.id, selectedOption);
      setHasVoted(true);
    }
  };

  const getPercentage = (votes) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  const isExpired = new Date(poll.expiresAt) < new Date();

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-green-500" />
          <h4 className="font-bold text-white">Poll</h4>
        </div>
        {isExpired ? (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <CheckCircle className="w-4 h-4" />
            Ended
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-4 h-4" />
            {new Date(poll.expiresAt).toLocaleString()}
          </span>
        )}
      </div>

      <p className="text-white mb-4">{poll.question}</p>

      <div className="space-y-2 mb-4">
        {poll.options?.map((option, index) => (
          <div
            key={index}
            onClick={() => !hasVoted && !isExpired && setSelectedOption(index)}
            className={`relative p-3 rounded-lg border-2 transition-all cursor-pointer ${
              selectedOption === index
                ? 'border-green-500 bg-green-500/10'
                : 'border-gray-700 hover:border-gray-600'
            } ${hasVoted || isExpired ? 'cursor-default' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white">{option.text}</span>
              <span className="text-sm text-gray-400">{option.votes} votes</span>
            </div>
            {(hasVoted || isExpired) && (
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${getPercentage(option.votes)}%` }}
                />
              </div>
            )}
            {(hasVoted || isExpired) && (
              <span className="text-xs text-gray-400 mt-1">{getPercentage(option.votes)}%</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-400">
        <span className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          {totalVotes} votes
        </span>
        {!hasVoted && !isExpired && (
          <button
            onClick={handleVote}
            disabled={!selectedOption}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Vote
          </button>
        )}
        {poll.authorId === 'currentUserId' && !isExpired && (
          <button
            onClick={() => onEndPoll?.(poll.id)}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            End Poll
          </button>
        )}
      </div>
    </div>
  );
};

export default PollWidget;
