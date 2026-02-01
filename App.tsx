import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from './components/Layout';
import Login from './components/Login';
import AnimeCard from './components/AnimeCard';
import DetailView from './components/DetailView';
import VideoModal from './components/VideoModal';
import ConfirmationModal from './components/ConfirmationModal';
import { searchAnime, getTrendingAnime, getSearchSuggestions as getAniListSuggestions } from './services/anilistService';
import { getCurrentUser, signIn, signUp, signOut, deleteAccount } from './services/authService';
import { fetchWatchlist, addToWatchlist, removeFromWatchlist, updateWatchlistStatus } from './services/dbService';
import { Anime, ViewState, WatchStatus, User } from './types';
import { Search, Sparkles, Loader2, HeartCrack, Heart, ArrowUpRight, ChevronDown, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  
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

  // UI State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // 1. Initial Auth Check & Data Load
  useEffect(() => {
    const init = async () => {
        try {
            const currentUser = await getCurrentUser();
            setUser(currentUser);
        } catch (e) {
            console.error("Auth check failed:", e);
        }
        
        try {
            // Load Trending
            const trending = await getTrendingAnime(1);
            setTrendingAnime(trending);
        } catch (e) {
            console.error("Trending load failed:", e);
        }
        
        setAuthLoading(false);
    };
    init();
  }, []);

  // 2. Load Watchlist from DB when User changes
  useEffect(() => {
    if (user) {
      const loadWatchlist = async () => {
          try {
             const data = await fetchWatchlist(user.id);
             setWatchlist(data);
          } catch (e) {
             console.error("Watchlist load failed", e);
          }
      };
      loadWatchlist();
    } else {
        setWatchlist([]);
    }
  }, [user]);

  // Handle Login / Signup
  const handleAuth = async (email: string, pass: string, username?: string, isSignUp?: boolean) => {
    setLoginLoading(true);
    try {
        let result;
        if (isSignUp && username) {
            result = await signUp(email, pass, username);
        } else {
            result = await signIn(email, pass);
        }

        if (result.error) throw result.error;
        if (result.user) setUser(result.user);
    } catch (e) {
        throw e;
    } finally {
        setLoginLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setCurrentView(ViewState.HOME);
    setWatchlist([]);
  };

  // Handle Delete Account Request (Opens Modal)
  const handleDeleteAccountRequest = () => {
    setIsDeleteModalOpen(true);
  };

  // Handle Actual Deletion
  const handleConfirmDeleteAccount = async () => {
    await deleteAccount();
    setUser(null);
    setCurrentView(ViewState.HOME);
    setWatchlist([]);
    setIsDeleteModalOpen(false);
  };

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


  // Watchlist Operations (Updates local state + DB)
  const toggleWatchlist = async (e: React.MouseEvent | null, anime: Anime) => {
    if(e) e.stopPropagation();
    if (!user) return;
    
    const exists = watchlist.find(a => a.id === anime.id);
    
    if (exists) {
        // Optimistic Remove
        setWatchlist(prev => prev.filter(a => a.id !== anime.id));
        await removeFromWatchlist(user.id, anime.id);
    } else {
        // Optimistic Add
        const newItem = { ...anime, userStatus: 'Plan to Watch' as WatchStatus };
        setWatchlist(prev => [...prev, newItem]);
        await addToWatchlist(user.id, newItem, 'Plan to Watch');
    }
  };

  const updateStatus = async (anime: Anime, status: WatchStatus) => {
    if (!user) return;
    
    // Optimistic Update
    setWatchlist(prev => prev.map(a => 
        a.id === anime.id ? { ...a, userStatus: status } : a
    ));
    
    // DB Update
    // If it's not in watchlist yet but user changed status from card dropdown (edge case), add it
    if (!watchlist.find(a => a.id === anime.id)) {
        await addToWatchlist(user.id, anime, status);
    } else {
        await updateWatchlistStatus(user.id, anime.id, status);
    }
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

  const rescanLibrary = async () => {
    try {
      const res = await fetch("http://raspberrypi-ip:3000/api/rescan", {
        method: "POST"
      });
      const updatedLibrary = await res.json();
      setTrendingAnime(updatedLibrary);
    } catch (e) {
      console.error("Failed to scan library", e);
    }
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
          <div className="space-y-12 animate-in fade-in duration-500">
            {/* Portfolio-style Hero Section */}
            <div className="relative py-16 md:py-24 px-4 flex flex-col md:flex-row items-center gap-12 max-w-6xl mx-auto">
                <div className="flex-1 space-y-6 z-10 text-center md:text-left">
                     <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-white/10 mb-2">
                        <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                        <span className="text-sm font-medium text-gray-300">Ready to watch</span>
                     </div>
                     
                     <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.1] tracking-tight">
                        Anime Enthusiast.<br />
                        Web Explorer.<br />
                        <span className="text-gray-500">Binge Watcher.</span>
                     </h1>
                     
                     <p className="text-xl text-gray-400 font-light max-w-2xl leading-relaxed">
                        Turning free time into interactive experiences. Discover your next obsession with data powered by AniList.
                     </p>
                     
                     <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4">
                        <button 
                           onClick={() => setCurrentView(ViewState.SEARCH)}
                           className="bg-primary text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-white transition-all shadow-lg shadow-primary/20 flex items-center gap-2 group"
                        >
                            Start Discovery
                            <ArrowUpRight size={20} className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button 
                           onClick={rescanLibrary}
                           className="bg-surface text-white border border-white/10 px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/5 transition-all flex items-center gap-2"
                        >
                           <RefreshCw size={20} />
                           Scan Library
                        </button>
                        <button 
                           onClick={() => document.getElementById('trending-section')?.scrollIntoView({ behavior: 'smooth' })}
                           className="bg-surface text-white border border-white/10 px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/5 transition-all flex items-center gap-2"
                        >
                            Scroll Down
                            <ChevronDown size={20} />
                        </button>
                     </div>
                </div>

                {/* Hero Image / Graphic */}
                <div className="flex-1 relative w-full max-w-md md:max-w-full flex justify-center">
                    <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full scale-75" />
                    <img 
                        src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-g412XF1q74zF.jpg" 
                        className="relative z-10 w-72 md:w-96 rounded-3xl shadow-2xl border border-white/10 rotate-3 hover:rotate-0 transition-transform duration-500"
                        alt="Hero Anime"
                    />
                </div>
            </div>

            <div id="trending-section" className="pt-8">
              <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                  <h3 className="text-3xl font-black text-white">
                    Trending Now
                  </h3>
              </div>
              
              {trendingAnime.length === 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className="aspect-[2/3] bg-surface rounded-2xl animate-pulse border border-white/5" />
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
            <div ref={loadMoreRef} className="py-12 flex justify-center">
                {loadingMore && <Loader2 className="animate-spin text-primary w-8 h-8" />}
            </div>
          </div>
        );

      case ViewState.SEARCH:
        return (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[80vh]">
            <div className="text-center space-y-6 py-12 relative z-50">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight">Search Anime</h2>
              <p className="text-gray-400 text-lg">Find your favorites by title.</p>
              
              <div className="max-w-2xl mx-auto relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500" />
                <form onSubmit={handleSearchSubmit} className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                        if (suggestions.length > 0) setShowSuggestions(true);
                    }}
                    onBlur={() => {
                        setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    placeholder="Search e.g. 'Frieren'"
                    className="w-full bg-surface border border-white/10 rounded-xl px-6 py-5 pl-14 text-xl focus:outline-none focus:ring-0 text-white placeholder-gray-600 transition-all shadow-2xl"
                    autoComplete="off"
                  />
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={24} />
                  <button 
                      type="submit" 
                      disabled={isSearching || !searchQuery}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary hover:bg-white hover:text-black disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold p-3 rounded-lg transition-colors"
                  >
                      {isSearching ? <Loader2 className="animate-spin" /> : <Search />}
                  </button>
                </form>

                {/* Auto-Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 text-left">
                        {suggestions.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => handleSuggestionClick(s)}
                                className="w-full px-6 py-4 hover:bg-white/5 cursor-pointer flex items-center justify-between text-gray-300 hover:text-primary transition-colors group text-left border-b border-white/5 last:border-0 font-medium"
                            >
                                <span className="flex items-center gap-3">
                                    <Search size={16} className="text-gray-600 group-hover:text-primary transition-colors" />
                                    {s}
                                </span>
                                <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                            </button>
                        ))}
                    </div>
                )}
              </div>
            </div>

            {isSearching ? (
                <div className="text-center py-20">
                    <div className="inline-block relative">
                         <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
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
                <div className="text-center text-gray-500 py-10 border border-dashed border-white/10 rounded-2xl bg-surface/50">
                    <p className="text-xl mb-2 font-bold text-gray-400">No results found</p>
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
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-6 border-b border-white/5">
                <div>
                    <h2 className="text-4xl font-black flex items-center gap-3 mb-2">
                        My Library
                        <span className="text-primary text-xl font-medium px-3 py-1 bg-surface rounded-full border border-white/10 align-middle">
                            {watchlist.length}
                        </span>
                    </h2>
                    <p className="text-gray-400">
                        Manage your collection and track progress.
                    </p>
                </div>

                {/* Local Search */}
                <div className="relative w-full md:w-80">
                    <input 
                        type="text"
                        value={watchlistSearch}
                        onChange={(e) => setWatchlistSearch(e.target.value)}
                        placeholder="Filter your list..."
                        className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 pl-11 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-white"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                </div>
             </div>
             
             {/* Tabs */}
             <div className="flex overflow-x-auto gap-3 mb-10 pb-2 custom-scrollbar">
                {tabs.map(tab => {
                    const count = watchlist.filter(a => tab === 'All' || (a.userStatus || 'Plan to Watch') === tab).length;
                    return (
                        <button
                            key={tab}
                            onClick={() => setWatchlistTab(tab)}
                            className={`px-5 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all border ${
                                watchlistTab === tab 
                                ? 'bg-primary text-black border-primary' 
                                : 'bg-surface text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            {tab} <span className={`ml-1 text-xs ${watchlistTab === tab ? 'text-black/60' : 'opacity-40'}`}>({count})</span>
                        </button>
                    );
                })}
             </div>

             {/* Content */}
             {filteredWatchlist.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-24 text-gray-500 border border-dashed border-white/10 rounded-3xl bg-surface/30">
                     <HeartCrack size={64} className="mb-6 opacity-30" />
                     <p className="text-2xl font-bold text-gray-400 mb-2">It's empty here</p>
                     <p className="mb-8">
                         {watchlist.length === 0 
                            ? "Start adding anime to build your library." 
                            : `No items found in "${watchlistTab}".`}
                     </p>
                     {watchlist.length === 0 && (
                        <button 
                            onClick={() => setCurrentView(ViewState.SEARCH)}
                            className="bg-primary text-black font-bold px-8 py-3 rounded-xl hover:bg-white transition-colors"
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
                      onStatusChange={updateStatus}
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

  if (authLoading) {
      return (
          <div className="min-h-screen bg-background flex items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={48} />
          </div>
      );
  }

  if (!user) {
    return <Login onLogin={handleAuth} loading={loginLoading} />;
  }

  return (
    <Layout 
      currentView={currentView} 
      onChangeView={(v) => {
          setCurrentView(v);
          setSelectedAnime(null);
          setPage(1); // Reset page when changing views
      }}
      user={user}
      onLogout={handleLogout}
      onDeleteAccount={handleDeleteAccountRequest}
    >
      {renderContent()}
      
      {playingAnime && (
        <VideoModal 
          anime={playingAnime} 
          onClose={() => setPlayingAnime(null)} 
          userId={user.id}
        />
      )}
      
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDeleteAccount}
        title="Delete Account?"
        message="This action cannot be undone. All your watchlist data and viewing progress will be permanently lost."
      />
    </Layout>
  );
};

export default App;