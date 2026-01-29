import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from './components/Layout';
import AnimeCard from './components/AnimeCard';
import DetailView from './components/DetailView';
import VideoModal from './components/VideoModal';
import { searchAnime, getTrendingAnime, getSearchSuggestions as getAniListSuggestions } from './services/anilistService';
import { Anime, ViewState, WatchStatus } from './types';
import { Search, Sparkles, Loader2, HeartCrack, Heart, ArrowUpRight, Filter, SortAsc } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.HOME);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [playingAnime, setPlayingAnime] = useState<Anime | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Data States
  const [trendingAnime, setTrendingAnime] = useState<Anime[]>([]);
  const [searchResults, setSearchResults] = useState<Anime[]>([]);
  const [watchlist, setWatchlist] = useState<Anime[]>([]);

  // Watchlist UI State
  const [watchlistTab, setWatchlistTab] = useState<WatchStatus | 'All'>('All');
  const [watchlistSearch, setWatchlistSearch] = useState('');

  // Infinite Scroll State
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Initial Load
  useEffect(() => {
    const loadTrending = async () => {
      const trending = await getTrendingAnime(1);
      setTrendingAnime(trending);
    };
    loadTrending();

    // Load Watchlist from LocalStorage
    const saved = localStorage.getItem('animind_watchlist');
    if (saved) {
      setWatchlist(JSON.parse(saved));
    }
  }, []);

  // Watchlist Persistence
  useEffect(() => {
    localStorage.setItem('animind_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  // Search Suggestions Debounce (Standard AniList)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 2 && currentView === ViewState.SEARCH) {
        try {
          const newSuggestions = await getAniListSuggestions(searchQuery);
          setSuggestions(newSuggestions);
          if (newSuggestions.length > 0) {
            setShowSuggestions(true);
          }
        } catch (e) {
          console.error("Error fetching suggestions", e);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, currentView]);

  // Infinite Scroll Logic
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || (currentView !== ViewState.HOME && currentView !== ViewState.SEARCH)) return;
    
    setLoadingMore(true);
    
    try {
      if (currentView === ViewState.HOME) {
        const nextPage = page + 1;
        const newItems = await getTrendingAnime(nextPage);
        // Filter out duplicates just in case
        setTrendingAnime(prev => {
            const ids = new Set(prev.map(a => a.id));
            return [...prev, ...newItems.filter(a => !ids.has(a.id))];
        });
        setPage(nextPage);
      } else if (currentView === ViewState.SEARCH && searchQuery) {
        const nextPage = page + 1;
        const newItems = await searchAnime(searchQuery, nextPage);
        setSearchResults(prev => {
             const ids = new Set(prev.map(a => a.id));
             return [...prev, ...newItems.filter(a => !ids.has(a.id))];
        });
        setPage(nextPage);
      }
    } catch (error) {
      console.error("Failed to load more items", error);
    } finally {
      setLoadingMore(false);
    }
  }, [currentView, loadingMore, page, searchQuery]);

  // Setup Observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        handleLoadMore();
      }
    });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [handleLoadMore]);


  const toggleWatchlist = (e: React.MouseEvent | null, anime: Anime) => {
    if(e) e.stopPropagation();
    
    setWatchlist(prev => {
      const exists = prev.find(a => a.id === anime.id);
      if (exists) {
        return prev.filter(a => a.id !== anime.id);
      } else {
        // Default new items to 'Plan to Watch'
        return [...prev, { ...anime, userStatus: 'Plan to Watch' }];
      }
    });
  };

  const updateWatchlistStatus = (anime: Anime, status: WatchStatus) => {
    setWatchlist(prev => prev.map(a => 
        a.id === anime.id ? { ...a, userStatus: status } : a
    ));
  };

  const executeSearch = async (query: string) => {
    if (!query.trim()) return;

    setIsSearching(true);
    setSuggestions([]); // Clear suggestions
    setShowSuggestions(false);
    setCurrentView(ViewState.SEARCH);
    setPage(1); // Reset page for new search
    
    const results = await searchAnime(query, 1);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(searchQuery);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    executeSearch(suggestion);
  };

  const isInWatchlist = (anime: Anime) => watchlist.some(a => a.id === anime.id);

  // Render content based on state
  const renderContent = () => {
    if (selectedAnime) {
      return (
        <DetailView 
          initialData={selectedAnime} 
          onBack={() => setSelectedAnime(null)}
          isInWatchlist={isInWatchlist(selectedAnime)}
          onToggleWatchlist={(a) => toggleWatchlist(null, a)}
          onPlay={(a) => setPlayingAnime(a)}
        />
      );
    }

    switch (currentView) {
      case ViewState.HOME:
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Hero Banner Area */}
            <div className="relative rounded-2xl overflow-hidden min-h-[400px] flex items-end p-8 md:p-12 border border-white/10">
              <div className="absolute inset-0">
                <img 
                  src="https://s4.anilist.co/file/anilistcdn/media/anime/banner/154587-ivXNI2340jVN.jpg" 
                  className="w-full h-full object-cover"
                  alt="Hero"
                />
                 <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                 <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent" />
              </div>
              
              <div className="relative max-w-2xl">
                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/20 mb-4 backdrop-blur-md">
                    <Sparkles size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Top Rated</span>
                 </div>
                 <h2 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">
                    Explore the World of <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Anime</span>
                 </h2>
                 <p className="text-lg text-gray-300 mb-8 max-w-lg">
                    Discover thousands of anime, track your progress, and find your next obsession with AniList data.
                 </p>
                 <button 
                   onClick={() => setCurrentView(ViewState.SEARCH)}
                   className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
                 >
                    <Search size={20} />
                    Start Browsing
                 </button>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="w-2 h-8 bg-secondary rounded-full" />
                Trending Now
              </h3>
              {trendingAnime.length === 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className="aspect-[2/3] bg-white/5 rounded-xl animate-pulse" />
                    ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {trendingAnime.map(anime => (
                    <AnimeCard 
                      key={anime.id} 
                      anime={anime} 
                      onClick={setSelectedAnime}
                      isInWatchlist={isInWatchlist(anime)}
                      onToggleWatchlist={toggleWatchlist}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* Infinite Scroll Loader */}
            <div ref={loadMoreRef} className="py-8 flex justify-center">
                {loadingMore && <Loader2 className="animate-spin text-primary" />}
            </div>
          </div>
        );

      case ViewState.SEARCH:
        return (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-4 py-8 relative z-50">
              <h2 className="text-3xl md:text-4xl font-bold">Search Anime</h2>
              <p className="text-gray-400">Find your favorites by title or describe what you're looking for.</p>
              
              <div className="max-w-2xl mx-auto relative">
                <form onSubmit={handleSearchSubmit}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                        if (suggestions.length > 0) setShowSuggestions(true);
                    }}
                    onBlur={() => {
                        // Delay hiding to allow click event on suggestion to fire
                        setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    placeholder="Search e.g. 'Naruto' or 'Sad romance anime'"
                    className="w-full bg-surface border border-white/10 rounded-2xl px-6 py-4 pl-14 text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder-gray-500 transition-all focus:bg-surface/80 shadow-lg"
                    autoComplete="off"
                  />
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={24} />
                  <button 
                      type="submit" 
                      disabled={isSearching || !searchQuery}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-xl transition-colors"
                  >
                      {isSearching ? <Loader2 className="animate-spin" /> : <Search />}
                  </button>
                </form>

                {/* Auto-Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 text-left">
                        {suggestions.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => handleSuggestionClick(s)}
                                className="w-full px-6 py-3 hover:bg-white/5 cursor-pointer flex items-center justify-between text-gray-300 hover:text-white transition-colors group text-left border-b border-white/5 last:border-0"
                            >
                                <span className="flex items-center gap-3">
                                    <Search size={16} className="text-gray-500 group-hover:text-primary transition-colors" />
                                    {s}
                                </span>
                                <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500" />
                            </button>
                        ))}
                    </div>
                )}
              </div>
            </div>

            {isSearching ? (
                <div className="text-center py-20">
                    <div className="inline-block relative">
                         <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                         <div className="mt-4 text-primary font-medium animate-pulse">
                            Searching AniList...
                         </div>
                    </div>
                </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {searchResults.map(anime => (
                        <AnimeCard 
                          key={anime.id} 
                          anime={anime} 
                          onClick={setSelectedAnime}
                          isInWatchlist={isInWatchlist(anime)}
                          onToggleWatchlist={toggleWatchlist}
                        />
                    ))}
                  </div>
                  
                  {/* Infinite Scroll Loader for Search */}
                  <div ref={loadMoreRef} className="py-8 flex justify-center">
                    {loadingMore && <Loader2 className="animate-spin text-primary" />}
                  </div>
              </div>
            ) : searchQuery && !isSearching && (
                <div className="text-center text-gray-500 py-10">
                    <p className="text-xl mb-2">No results found.</p>
                    <p>Try checking the spelling or use broader terms.</p>
                </div>
            )}
          </div>
        );

      case ViewState.WATCHLIST:
        // Filter and Search Logic for Watchlist
        const filteredWatchlist = watchlist.filter(anime => {
            const matchesTab = watchlistTab === 'All' || (anime.userStatus || 'Plan to Watch') === watchlistTab;
            const matchesSearch = !watchlistSearch || anime.title.toLowerCase().includes(watchlistSearch.toLowerCase());
            return matchesTab && matchesSearch;
        });

        const tabs: (WatchStatus | 'All')[] = ['All', 'Watching', 'Completed', 'Plan to Watch', 'Dropped'];

        return (
          <div className="animate-in fade-in duration-300 min-h-[80vh]">
             
             {/* Header */}
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h2 className="text-3xl font-bold flex items-center gap-3 mb-2">
                        <Heart size={32} className="text-red-500 fill-current" />
                        My Library
                    </h2>
                    <p className="text-gray-400 text-sm">
                        {watchlist.length} items collected across all lists.
                    </p>
                </div>

                {/* Local Search */}
                <div className="relative w-full md:w-72">
                    <input 
                        type="text"
                        value={watchlistSearch}
                        onChange={(e) => setWatchlistSearch(e.target.value)}
                        placeholder="Filter your list..."
                        className="w-full bg-surface border border-white/10 rounded-lg px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                </div>
             </div>
             
             {/* Tabs */}
             <div className="flex overflow-x-auto gap-2 mb-8 pb-2 custom-scrollbar">
                {tabs.map(tab => {
                    const count = watchlist.filter(a => tab === 'All' || (a.userStatus || 'Plan to Watch') === tab).length;
                    return (
                        <button
                            key={tab}
                            onClick={() => setWatchlistTab(tab)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                                watchlistTab === tab 
                                ? 'bg-white text-black border-white' 
                                : 'bg-surface text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            {tab} <span className="ml-1 opacity-60 text-xs">({count})</span>
                        </button>
                    );
                })}
             </div>

             {/* Content */}
             {filteredWatchlist.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-20 text-gray-500 border border-dashed border-white/10 rounded-2xl bg-white/5">
                     <HeartCrack size={64} className="mb-4 opacity-50" />
                     <p className="text-xl font-medium">No anime found</p>
                     <p className="mb-6">
                         {watchlist.length === 0 
                            ? "Your library is empty. Go find some gems!" 
                            : `No items in "${watchlistTab}" matching your filter.`}
                     </p>
                     {watchlist.length === 0 && (
                        <button 
                            onClick={() => setCurrentView(ViewState.SEARCH)}
                            className="bg-primary text-white px-6 py-2 rounded-full hover:bg-primary/80"
                        >
                            Find Anime
                        </button>
                     )}
                 </div>
             ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {filteredWatchlist.map(anime => (
                    <AnimeCard 
                      key={anime.id} 
                      anime={anime} 
                      onClick={setSelectedAnime}
                      isInWatchlist={true}
                      onRemove={(e, a) => toggleWatchlist(e, a)}
                      onStatusChange={updateWatchlistStatus}
                    />
                  ))}
                </div>
             )}
          </div>
        );
        
      default:
        return <div>View not found</div>;
    }
  };

  return (
    <Layout currentView={currentView} onChangeView={(v) => {
        setCurrentView(v);
        setSelectedAnime(null);
        setPage(1); // Reset page when changing views
    }}>
      {renderContent()}
      
      {playingAnime && (
        <VideoModal 
          anime={playingAnime} 
          onClose={() => setPlayingAnime(null)} 
        />
      )}
    </Layout>
  );
};

export default App;