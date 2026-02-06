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
      // Primary is Pink, readable with white or black text. Using white for consistency.
      case 'Watching': return 'bg-primary text-white font-bold';
      // Secondary is Red. White text is best.
      case 'Completed': return 'bg-secondary text-white font-bold border border-white/20'; 
      case 'Dropped': return 'bg-gray-700 text-gray-300 font-bold border border-white/10';
      default: return 'bg-surface text-gray-300 border border-white/10';
    }
  };

  return (
    <div 
      className="group relative bg-surface rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 cursor-pointer border border-white/5 hover:border-primary/50"
      onClick={() => onClick(anime)}
    >
      {/* Image Container */}
      <div className="relative aspect-[2/3] overflow-hidden bg-black">
        <img 
          src={anime.imageUrl} 
          alt={anime.title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-80" />
        
        {/* Top Right Rating */}
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1 text-white text-xs font-bold border border-white/10">
          <Star size={10} className="text-primary fill-primary" />
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
                className={`absolute top-2 left-2 p-2 rounded-full backdrop-blur-md border transition-colors ${isInWatchlist ? 'bg-primary text-white border-primary' : 'bg-black/40 border-white/10 text-white hover:bg-white/20 hover:text-primary'}`}
            >
                {isInWatchlist ? <Check size={16} /> : <Plus size={16} />}
            </button>
        )}
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 w-full p-4">
        <h3 className="font-bold text-base leading-tight text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {anime.title}
        </h3>
        
        {/* Genres */}
        {!onStatusChange && (
            <div className="flex flex-wrap gap-1 mb-1">
                {anime.genres.slice(0, 2).map(g => (
                    <span key={g} className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5">
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
                        className={`w-full appearance-none pl-3 pr-8 py-2 text-xs rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors ${getStatusColor(anime.userStatus || 'Plan to Watch')}`}
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
           <div className="mt-2 text-xs text-primary/80 italic line-clamp-2 bg-primary/5 p-2 rounded border border-primary/10">
             "{anime.reason}"
           </div>
        )}
      </div>
    </div>
  );
};

export default AnimeCard;