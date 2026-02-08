import React, { useEffect, useState } from 'react';
import { ArrowLeft, Star, Calendar, Tv, Clock, Check, Plus, Loader2, PlayCircle, Mic } from 'lucide-react';
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
        className="mb-6 flex items-center gap-2 text-gray-400 hover:text-primary transition-colors font-medium"
      >
        <ArrowLeft size={20} />
        Back to Browse
      </button>

      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden bg-surface border border-white/5 shadow-2xl">
        <div className="absolute inset-0">
          <img 
            src={displayData.imageUrl} 
            alt={displayData.title} 
            className="w-full h-full object-cover opacity-10 blur-2xl scale-110 grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/90 to-transparent" />
        </div>

        <div className="relative p-6 md:p-12 flex flex-col md:flex-row gap-10">
          {/* Poster */}
          <div className="w-full md:w-80 shrink-0">
            <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative group">
              <img 
                src={displayData.imageUrl} 
                alt={displayData.title} 
                className="w-full h-full object-cover"
              />
               <button 
                onClick={() => onToggleWatchlist(initialData)}
                className={`absolute top-4 right-4 p-3 rounded-xl backdrop-blur-md shadow-lg border transition-all hover:scale-105 active:scale-95 z-20 ${isInWatchlist ? 'bg-primary text-black border-primary' : 'bg-black/60 text-white border-white/20 hover:bg-white/20 hover:text-primary'}`}
              >
                {isInWatchlist ? <Check size={24} /> : <Plus size={24} />}
              </button>

              {/* Quick Play Overlay on Poster */}
              <div 
                onClick={() => onPlay(initialData)}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-sm"
              >
                <PlayCircle size={64} className="text-primary fill-black drop-shadow-xl" />
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                 <h1 className="text-4xl md:text-6xl font-black text-white mb-2 tracking-tight leading-none">{displayData.title}</h1>
                 {displayData.japaneseTitle && (
                   <h2 className="text-xl text-gray-400 font-medium">{displayData.japaneseTitle}</h2>
                 )}
              </div>
              <div className="flex items-center gap-2 bg-surface text-primary px-4 py-2 rounded-lg border border-primary/20 shadow-lg shadow-primary/5">
                <Star className="fill-current" />
                <span className="text-2xl font-bold">{displayData.rating}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-300 mb-8 font-medium">
               <span className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg border border-white/5">
                  <Calendar size={16} className="text-primary" /> {displayData.year || 'N/A'}
               </span>
               {displayData.episodes && (
                 <span className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg border border-white/5">
                    <Tv size={16} className="text-primary" /> {displayData.episodes} Eps
                 </span>
               )}
               {displayData.status && (
                 <span className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg border border-white/5">
                    <Clock size={16} className="text-primary" /> {displayData.status}
                 </span>
               )}
            </div>

            <div className="flex flex-wrap gap-2 mb-8">
              {displayData.genres.map(g => (
                <span key={g} className="px-3 py-1.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider">
                  {g}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 mb-8">
                <button 
                    onClick={() => onPlay(initialData)}
                    className="flex items-center gap-3 bg-primary hover:bg-white hover:text-black text-black px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-primary/20 hover:shadow-white/20"
                >
                    <PlayCircle className="fill-current" />
                    Watch Now
                </button>
            </div>

            <p className="text-gray-300 text-lg leading-relaxed mb-10 max-w-3xl whitespace-pre-wrap font-light">
              {displayData.synopsis}
            </p>

            {loading ? (
               <div className="flex items-center gap-3 text-primary animate-pulse">
                 <Loader2 className="animate-spin" />
                 <span className="font-medium">Fetching details from AniList...</span>
               </div>
            ) : details ? (
              <div className="grid lg:grid-cols-[2fr_1fr] gap-10">
                {details.characters.length > 0 && (
                <div>
                   <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                     <span className="w-1.5 h-6 bg-primary rounded-full" />
                     Main Characters
                   </h3>
                   <div className="grid grid-cols-1 gap-4">
                      {details.characters.map((char, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 hover:border-primary/30 transition-colors group">
                           {/* Left: Character Info */}
                           <div className="flex items-center gap-4">
                             <div className="w-14 h-14 rounded-lg overflow-hidden bg-surface shrink-0 border border-white/10">
                               {char.image ? (
                                   <img src={char.image} alt={char.name} className="w-full h-full object-cover" />
                               ) : (
                                   <div className="w-full h-full flex items-center justify-center text-primary font-bold text-xl bg-surface">
                                       {char.name[0]}
                                   </div>
                               )}
                             </div>
                             <div>
                                 <div className="font-bold text-white group-hover:text-primary transition-colors text-base">{char.name}</div>
                                 <div className="text-xs font-bold text-primary uppercase tracking-wider">{char.role}</div>
                                 <div className="text-xs text-gray-500 mt-1 line-clamp-1 max-w-[200px]">{char.description}</div>
                             </div>
                           </div>

                           {/* Right: VA Info */}
                           {char.voiceActor && (
                               <div className="flex items-center gap-4 text-right">
                                   <div className="hidden sm:block">
                                       <div className="font-bold text-white text-sm">{char.voiceActor.name}</div>
                                       <div className="text-xs text-gray-500 flex items-center justify-end gap-1">
                                            <Mic size={10} />
                                            JAPANESE
                                       </div>
                                   </div>
                                   <div className="w-12 h-12 rounded-full overflow-hidden bg-surface shrink-0 border border-white/10">
                                       <img src={char.voiceActor.image} alt={char.voiceActor.name} className="w-full h-full object-cover" />
                                   </div>
                               </div>
                           )}
                        </div>
                      ))}
                   </div>
                </div>
                )}

                {details.watchOrder.length > 0 && (
                <div>
                   <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                     <span className="w-1.5 h-6 bg-secondary rounded-full" />
                     Recommendations
                   </h3>
                   <div className="relative border-l-2 border-white/10 ml-3 space-y-6 py-2">
                     {details.watchOrder.map((item, idx) => (
                       <div key={idx} className="pl-6 relative group cursor-pointer">
                         <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-surface border-2 border-secondary group-hover:scale-125 transition-transform shadow-[0_0_10px_rgba(250,204,21,0.3)]" />
                         <span className="text-gray-300 font-medium hover:text-white transition-colors block text-base leading-tight group-hover:translate-x-1 duration-200">
                             {item}
                         </span>
                       </div>
                     ))}
                   </div>
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