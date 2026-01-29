import React from 'react';
import { Star, Plus, Check, Trash2, ChevronDown } from 'lucide-react';
import { Anime, WatchStatus } from '../types';

interface AnimeCardProps {
  anime: Anime;
  onClick: (anime: Anime) => void;
  isInWatchlist?: boolean;
  onToggleWatchlist?: (e: React.MouseEvent, anime: Anime) => void;
  onRemove?: (e: React.MouseEvent, anime: Anime) => void;
  onStatusChange?: (anime: Anime, status: WatchStatus) => void;
  showReason?: boolean;
}

const AnimeCard: React.FC<AnimeCardProps> = ({ 
  anime, 
  onClick, 
  isInWatchlist = false, 
  onToggleWatchlist,
  onRemove,
  onStatusChange,
  showReason = false
}) => {
  const getStatusColor = (status?: WatchStatus) => {
    switch (status) {
      case 'Watching': return 'bg-secondary text-white';
      case 'Completed': return 'bg-blue-500 text-white';
      case 'Dropped': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div 
      className="group relative bg-surface rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border border-white/5"
      onClick={() => onClick(anime)}
    >
      {/* Image Container */}
      <div className="relative aspect-[2/3] overflow-hidden">
        <img 
          src={anime.imageUrl} 
          alt={anime.title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
        
        {/* Top Right Rating */}
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 text-amber-400 text-sm font-bold border border-white/10">
          <Star size={12} fill="currentColor" />
          {anime.rating.toFixed(1)}
        </div>

        {/* Watchlist/Remove Button */}
        {onRemove ? (
             <button 
                onClick={(e) => onRemove(e, anime)}
                className="absolute top-2 left-2 p-2 rounded-full backdrop-blur-md border border-red-500/30 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                title="Remove from Watchlist"
            >
                <Trash2 size={16} />
            </button>
        ) : onToggleWatchlist && (
            <button 
                onClick={(e) => onToggleWatchlist(e, anime)}
                className={`absolute top-2 left-2 p-2 rounded-full backdrop-blur-md border transition-colors ${isInWatchlist ? 'bg-secondary/20 border-secondary text-secondary' : 'bg-black/40 border-white/10 text-white hover:bg-white/20'}`}
            >
                {isInWatchlist ? <Check size={16} /> : <Plus size={16} />}
            </button>
        )}
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 w-full p-4">
        <h3 className="font-bold text-lg leading-tight text-white mb-1 line-clamp-2 group-hover:text-primary transition-colors">
          {anime.title}
        </h3>
        
        {/* Genres (Hidden if in watchlist mode to make room for dropdown) */}
        {!onStatusChange && (
            <div className="flex flex-wrap gap-1 mb-2">
                {anime.genres.slice(0, 3).map(g => (
                    <span key={g} className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-gray-300 border border-white/5">
                        {g}
                    </span>
                ))}
            </div>
        )}

        {/* Status Dropdown for Watchlist */}
        {onStatusChange && (
            <div 
                className="mt-2 relative"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative">
                    <select
                        value={anime.userStatus || 'Plan to Watch'}
                        onChange={(e) => onStatusChange(anime, e.target.value as WatchStatus)}
                        className={`w-full appearance-none pl-3 pr-8 py-1.5 text-xs font-bold rounded-lg border border-white/10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${getStatusColor(anime.userStatus || 'Plan to Watch')}`}
                    >
                        <option value="Watching" className="bg-surface text-gray-200">Watching</option>
                        <option value="Completed" className="bg-surface text-gray-200">Completed</option>
                        <option value="Plan to Watch" className="bg-surface text-gray-200">Plan to Watch</option>
                        <option value="Dropped" className="bg-surface text-gray-200">Dropped</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                </div>
            </div>
        )}

        {showReason && anime.reason && (
           <div className="mt-2 text-xs text-blue-200 italic line-clamp-2 bg-primary/10 p-2 rounded border border-primary/20">
             "{anime.reason}"
           </div>
        )}
      </div>
    </div>
  );
};

export default AnimeCard;