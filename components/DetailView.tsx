import React, { useEffect, useState } from 'react';
import { ArrowLeft, Star, Calendar, Tv, Clock, Check, Plus, Loader2, PlayCircle } from 'lucide-react';
import { Anime, AnimeDetails } from '../types';
import { getAnimeDetails } from '../services/anilistService';

interface DetailViewProps {
  initialData: Anime;
  onBack: () => void;
  isInWatchlist: boolean;
  onToggleWatchlist: (anime: Anime) => void;
  onPlay: (anime: Anime) => void;
}

const DetailView: React.FC<DetailViewProps> = ({ initialData, onBack, isInWatchlist, onToggleWatchlist, onPlay }) => {
  const [details, setDetails] = useState<AnimeDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchDetails = async () => {
      setLoading(true);
      // Using ID instead of title for AniList lookup
      const data = await getAnimeDetails(initialData.id);
      if (isMounted && data) {
        setDetails(data);
      }
      if (isMounted) setLoading(false);
    };

    fetchDetails();
    return () => { isMounted = false; };
  }, [initialData.id]);

  const displayData = details || initialData;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300">
      <button 
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={20} />
        Back to Browse
      </button>

      {/* Hero Section */}
      <div className="relative rounded-2xl overflow-hidden bg-surface border border-white/5">
        <div className="absolute inset-0">
          <img 
            src={displayData.imageUrl} 
            alt={displayData.title} 
            className="w-full h-full object-cover opacity-20 blur-xl scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/80 to-transparent" />
        </div>

        <div className="relative p-6 md:p-10 flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <div className="w-full md:w-72 shrink-0">
            <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-white/10 relative group">
              <img 
                src={displayData.imageUrl} 
                alt={displayData.title} 
                className="w-full h-full object-cover"
              />
               <button 
                onClick={() => onToggleWatchlist(initialData)}
                className={`absolute top-4 right-4 p-3 rounded-full backdrop-blur-md shadow-lg border transition-all hover:scale-110 active:scale-95 z-20 ${isInWatchlist ? 'bg-secondary text-white border-secondary' : 'bg-black/50 text-white border-white/20 hover:bg-white/20'}`}
              >
                {isInWatchlist ? <Check size={24} /> : <Plus size={24} />}
              </button>

              {/* Quick Play Overlay on Poster */}
              <div 
                onClick={() => onPlay(initialData)}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-sm"
              >
                <PlayCircle size={64} className="text-white drop-shadow-xl" />
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                 <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">{displayData.title}</h1>
                 {displayData.japaneseTitle && (
                   <h2 className="text-xl text-gray-400 font-medium">{displayData.japaneseTitle}</h2>
                 )}
              </div>
              <div className="flex items-center gap-2 bg-yellow-500/10 text-yellow-500 px-4 py-2 rounded-lg border border-yellow-500/20">
                <Star className="fill-current" />
                <span className="text-2xl font-bold">{displayData.rating}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-300 mb-6">
               <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full">
                  <Calendar size={14} /> {displayData.year || 'N/A'}
               </span>
               {displayData.episodes && (
                 <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full">
                    <Tv size={14} /> {displayData.episodes} Eps
                 </span>
               )}
               {displayData.status && (
                 <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full">
                    <Clock size={14} /> {displayData.status}
                 </span>
               )}
            </div>

            <div className="flex flex-wrap gap-2 mb-8">
              {displayData.genres.map(g => (
                <span key={g} className="px-3 py-1 rounded-md bg-primary/20 text-primary border border-primary/20 text-sm font-medium">
                  {g}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 mb-8">
                <button 
                    onClick={() => onPlay(initialData)}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-full font-bold text-lg transition-all shadow-lg shadow-primary/25"
                >
                    <PlayCircle className="fill-white text-primary" />
                    Watch Now
                </button>
            </div>

            <p className="text-gray-300 text-lg leading-relaxed mb-8 max-w-3xl whitespace-pre-wrap">
              {displayData.synopsis}
            </p>

            {loading ? (
               <div className="flex items-center gap-2 text-primary animate-pulse">
                 <Loader2 className="animate-spin" />
                 <span>Fetching details from AniList...</span>
               </div>
            ) : details ? (
              <div className="grid md:grid-cols-2 gap-8">
                {details.characters.length > 0 && (
                <div>
                   <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                     <span className="w-1 h-6 bg-primary rounded-full" />
                     Main Characters
                   </h3>
                   <div className="space-y-4">
                      {details.characters.map((char, idx) => (
                        <div key={idx} className="flex gap-4 p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                           <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                             {char.name[0]}
                           </div>
                           <div className="overflow-hidden">
                             <div className="font-bold text-white">{char.name}</div>
                             <div className="text-xs text-primary mb-1">{char.role}</div>
                             <div className="text-xs text-gray-400 line-clamp-2">{char.description}</div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
                )}

                {details.watchOrder.length > 0 && (
                <div>
                   <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                     <span className="w-1 h-6 bg-secondary rounded-full" />
                     Recommendations
                   </h3>
                   <ol className="space-y-2 relative border-l border-white/10 ml-3">
                     {details.watchOrder.map((item, idx) => (
                       <li key={idx} className="pl-6 relative">
                         <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-surface border-2 border-secondary" />
                         <span className="text-gray-300">{item}</span>
                       </li>
                     ))}
                   </ol>
                </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailView;