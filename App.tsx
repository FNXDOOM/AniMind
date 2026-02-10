import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from './components/Layout';
import Login from './components/Login';
import AnimeCard from './components/AnimeCard';
import DetailView from './components/DetailView';
import VideoModal from './components/VideoModal';
import ConfirmationModal from './components/ConfirmationModal';
import AdminPanel from './components/AdminPanel';
import { searchAnime, getTrendingAnime, getDiscoveryAnime, getSearchSuggestions as getAniListSuggestions } from './services/anilistService';
import { getCurrentUser, signIn, signUp, signOut, deleteAccount, handleGoogleCallback } from './services/authService';
import { fetchWatchlist, addToWatchlist, removeFromWatchlist, updateWatchlistStatus } from './services/dbService';
import { Anime, ViewState, WatchStatus, User } from './types';
import { Search, Loader2, HeartCrack, ArrowUpRight, ChevronDown, RefreshCw, HardDrive, PlayCircle, Filter, Calendar, RotateCcw, Star, Check, Plus } from 'lucide-react';



const GENRES = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mecha", "Mystery", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller"];
const YEARS = ["2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015", "2010", "2005", "2000"];
const SEASONS = ["Winter", "Spring", "Summer", "Fall"];

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.HOME);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  
  // Player State
  const [playingAnime, setPlayingAnime] = useState<Anime | null>(null);
  const [videoMode, setVideoMode] = useState<'episode' | 'trailer'>('episode');
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Data States
  const [homeAnime, setHomeAnime] = useState<Anime[]>([]);
  
  // Filter State
  const [filters, setFilters] = useState({ genre: 'Any', year: 'Any', season: 'Any' });
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [searchResults, setSearchResults] = useState<Anime[]>([]);
  const [watchlist, setWatchlist] = useState<Anime[]>([]);
  
  // Shows / Cloud Library State
  const [libraryAnime, setLibraryAnime] = useState<Anime[]>([]);
  const [isScanning, setIsScanning] = useState(false);

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
            // Load Initial Trending
            const trending = await getTrendingAnime(1);
            setHomeAnime(trending);
        } catch (e) {
            console.error("Trending load failed:", e);
        }
        
        setAuthLoading(false);
    };
    init();
  }, []);

  
  // Handle Google OAuth Callback
  useEffect(() => {
    const processGoogleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const mode = urlParams.get('mode'); // 'signin' or 'signup'
      
      // Check if we're returning from Google OAuth
      if (mode && (mode === 'signin' || mode === 'signup')) {
        setAuthLoading(true);
        
        try {
          const result = await handleGoogleCallback();
          
          if (result.error) {
            // Show error to user
            alert(result.error.message || 'Google authentication failed');
          } else if (result.user) {
            // Success - set the user
            setUser(result.user);
          }
          
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error: any) {
          alert(error.message || 'Authentication failed');
          window.history.replaceState({}, document.title, window.location.pathname);
        } finally {
          setAuthLoading(false);
        }
      }
    };
    
    processGoogleCallback();
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
    // Note: We deliberately don't clear homeAnime to preserve the cache for next login
  };

  // Handle Delete Account Request
  const handleDeleteAccountRequest = () => {
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteAccount = async () => {
    await deleteAccount();
    setUser(null);
    setCurrentView(ViewState.HOME);
    setWatchlist([]);
    setIsDeleteModalOpen(false);
  };

  // Search Suggestions Debounce
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
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, currentView]);

  // Filter Logic
  const handleFilterChange = async (key: 'genre' | 'year' | 'season', value: string) => {
      if (loadingMore) return;
      
      const newFilters = { ...filters, [key]: value };
      setFilters(newFilters);
      setActiveDropdown(null);
      setPage(1);
      setHomeAnime([]); // Clear to show transition
      
      const isFiltered = newFilters.genre !== 'Any' || newFilters.year !== 'Any' || newFilters.season !== 'Any';

      try {
        let data: Anime[] = [];
        if (!isFiltered) {
            data = await getTrendingAnime(1);
        } else {
            data = await getDiscoveryAnime(1, newFilters.genre, newFilters.year, newFilters.season);
        }
        setHomeAnime(data);
      } catch (e) {
        console.error("Filter failed", e);
      }
  };

  const resetFilters = async () => {
      if (loadingMore) return;
      setFilters({ genre: 'Any', year: 'Any', season: 'Any' });
      setPage(1);
      setHomeAnime([]);
      try {
         const data = await getTrendingAnime(1);
         setHomeAnime(data);
      } catch (e) {
         console.error("Reset failed", e);
      }
  };

  // Infinite Scroll Logic
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || (currentView !== ViewState.HOME && currentView !== ViewState.SEARCH)) return;
    
    setLoadingMore(true);
    
    try {
      if (currentView === ViewState.HOME) {
        const nextPage = page + 1;
        let newItems: Anime[] = [];
        
        const isFiltered = filters.genre !== 'Any' || filters.year !== 'Any' || filters.season !== 'Any';

        if (!isFiltered) {
             newItems = await getTrendingAnime(nextPage);
        } else {
             newItems = await getDiscoveryAnime(nextPage, filters.genre, filters.year, filters.season);
        }

        setHomeAnime(prev => {
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
  }, [currentView, loadingMore, page, searchQuery, filters]);

  // Setup Observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    if (!loadMoreRef.current) return;

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        handleLoadMore();
      }
    });

    observerRef.current.observe(loadMoreRef.current);

    return () => observerRef.current?.disconnect();
  }, [handleLoadMore, user, currentView, selectedAnime, homeAnime]);


  // Watchlist Operations
  const toggleWatchlist = async (e: React.MouseEvent | null, anime: Anime) => {
    if(e) e.stopPropagation();
    if (!user) return;
    
    const exists = watchlist.find(a => a.id === anime.id);
    
    if (exists) {
        setWatchlist(prev => prev.filter(a => a.id !== anime.id));
        await removeFromWatchlist(user.id, anime.id);
    } else {
        const newItem = { ...anime, userStatus: 'Plan to Watch' as WatchStatus };
        setWatchlist(prev => [...prev, newItem]);
        await addToWatchlist(user.id, newItem, 'Plan to Watch');
    }
  };

  const updateStatus = async (anime: Anime, status: WatchStatus) => {
    if (!user) return;
    setWatchlist(prev => prev.map(a => 
        a.id === anime.id ? { ...a, userStatus: status } : a
    ));
    if (!watchlist.find(a => a.id === anime.id)) {
        await addToWatchlist(user.id, anime, status);
    } else {
        await updateWatchlistStatus(user.id, anime.id, status);
    }
  };

  const executeSearch = async (query: string) => {
    if (!query.trim()) return;

    setIsSearching(true);
    setSuggestions([]);
    setShowSuggestions(false);
    setCurrentView(ViewState.SEARCH);
    setPage(1);
    
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
    setIsScanning(true);
    try {
      const res = await fetch("http://raspberrypi-ip:3000/api/rescan", { method: "POST" });
      const updatedLibrary = await res.json();
      setLibraryAnime(updatedLibrary);
    } catch (e) {
      console.error("Failed to scan library", e);
      setTimeout(() => {
          const mockLibrary: Anime[] = [
              {
                  id: "101",
                  title: "Frieren: Beyond Journey's End",
                  imageUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-g412XF1q74zF.jpg",
                  rating: 9.1,
                  genres: ["Adventure", "Fantasy"],
                  synopsis: "The adventure is over but life goes on for an elf mage just beginning to learn what living is all about.",
                  episodes: 28,
                  year: "2023",
                  reason: "Local File Found"
              },
              {
                  id: "102",
                  title: "The Apothecary Diaries",
                  imageUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx161645-f9X1g0X2F5X5.jpg",
                  rating: 8.9,
                  genres: ["Drama", "Mystery"],
                  synopsis: "Maomao lived a peaceful life with her apothecary father. Until one day, she's sold as a lowly servant to the emperor's palace.",
                  episodes: 24,
                  year: "2023",
                  reason: "Local File Found"
              }
          ];
          setLibraryAnime(mockLibrary);
      }, 1500);
    } finally {
      setTimeout(() => setIsScanning(false), 1500);
    }
  };

  const isInWatchlist = (anime: Anime) => watchlist.some(a => a.id === anime.id);

  // Helper Component for Dropdown
  const FilterDropdown = ({ 
    label, 
    value, 
    options, 
    id,
    onSelect 
  }: { 
    label: string, 
    value: string, 
    options: string[], 
    id: string,
    onSelect: (val: string) => void 
  }) => (
      <div className={`relative min-w-[140px] ${activeDropdown === id ? 'z-50' : 'z-auto'}`}>
          <button
              onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdown(activeDropdown === id ? null : id);
              }}
              className="w-full bg-surface border border-white/10 rounded-lg px-3 py-3 flex items-center justify-between hover:border-white/20 transition-colors text-sm group"
          >
              <div className="flex flex-col items-start leading-none gap-1">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider group-hover:text-primary transition-colors">{label}</span>
                  <span className="font-bold text-white truncate max-w-[100px]">{value}</span>
              </div>
              <ChevronDown size={14} className={`text-gray-500 transition-transform ${activeDropdown === id ? 'rotate-180' : ''}`} />
          </button>

          {activeDropdown === id && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-white/10 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                  <button
                      onClick={() => onSelect('Any')}
                      className="w-full text-left px-4 py-2 hover:bg-white/5 text-gray-400 hover:text-white transition-colors text-sm"
                  >
                      Any
                  </button>
                  {options.map(opt => (
                      <button
                          key={opt}
                          onClick={() => onSelect(opt)}
                          className={`w-full text-left px-4 py-2 hover:bg-white/5 transition-colors text-sm ${value === opt ? 'text-primary font-bold' : 'text-gray-300'}`}
                      >
                          {opt}
                      </button>
                  ))}
              </div>
          )}
      </div>
  );

  // Render content based on state
  const renderContent = () => {
    if (selectedAnime) {
      return (
        <DetailView 
          initialData={selectedAnime} 
          onBack={() => setSelectedAnime(null)}
          isInWatchlist={isInWatchlist(selectedAnime)}
          onToggleWatchlist={(a) => toggleWatchlist(null, a)}
          onPlay={(a) => {
              setVideoMode('trailer');
              setPlayingAnime(a);
          }}
        />
      );
    }

    switch (currentView) {
      case ViewState.HOME:
        const isFiltered = filters.genre !== 'Any' || filters.year !== 'Any' || filters.season !== 'Any';
        const heroAnime = homeAnime[0];
        const gridAnime = homeAnime.slice(1);

        return (
          <div className="space-y-10 animate-in fade-in duration-500 pb-12" onClick={() => setActiveDropdown(null)}>
            
            {/* Featured Hero Section */}
            {!isFiltered && heroAnime ? (
                <div className="relative w-full h-[60vh] min-h-[500px] rounded-3xl overflow-hidden shadow-2xl group cursor-pointer border border-white/10" onClick={() => setSelectedAnime(heroAnime)}>
                    {/* Background Image with Blur/Overlay */}
                    <div className="absolute inset-0">
                        <img 
                            src={heroAnime.imageUrl} 
                            alt={heroAnime.title} 
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
                    </div>

                    {/* Hero Content */}
                    <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 lg:p-16 flex flex-col items-start gap-4 md:gap-6 z-20 max-w-3xl">
                        <div className="flex flex-wrap items-center gap-3 text-sm md:text-base font-bold text-primary uppercase tracking-wider">
                            <span className="bg-primary text-black px-3 py-1 rounded-full">Trending #1</span>
                            <span className="text-white">•</span>
                            <span>{heroAnime.genres[0]}</span>
                            <span className="text-white">•</span>
                            <span className="flex items-center gap-1"><Star size={16} className="fill-current" /> {heroAnime.rating}</span>
                        </div>
                        
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-[0.9] tracking-tight drop-shadow-xl line-clamp-2">
                            {heroAnime.title}
                        </h1>
                        
                        <p className="text-gray-200 text-lg md:text-xl line-clamp-3 font-medium max-w-2xl drop-shadow-md">
                            {heroAnime.synopsis}
                        </p>
                        
                        <div className="flex items-center gap-4 pt-4">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedAnime(heroAnime); }}
                                className="bg-white text-black px-8 py-3.5 rounded-xl font-bold text-lg hover:bg-primary transition-colors flex items-center gap-2"
                            >
                                <PlayCircle className="fill-current" /> Play Now
                            </button>
                            <button 
                                onClick={(e) => toggleWatchlist(e, heroAnime)}
                                className={`px-8 py-3.5 rounded-xl font-bold text-lg border transition-all flex items-center gap-2 backdrop-blur-md ${isInWatchlist(heroAnime) ? 'bg-primary/20 border-primary text-primary' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                            >
                                {isInWatchlist(heroAnime) ? <Check /> : <Plus />} My List
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Filters & Header */}
            <div id="discovery-filters" className="flex flex-col md:flex-row items-end md:items-center justify-between gap-6 py-6 border-b border-white/5 mb-8">
                <div>
                   <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      {isFiltered ? 'Search Results' : 'Discover'}
                      <span className="text-sm font-normal text-gray-500 bg-white/5 px-2 py-1 rounded-md border border-white/5 hidden md:inline-block">
                         {isFiltered ? `${homeAnime.length} Found` : 'Recommended for you'}
                      </span>
                   </h2>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <FilterDropdown 
                        label="Genre" 
                        value={filters.genre} 
                        options={GENRES} 
                        id="dropdown-genre"
                        onSelect={(val) => handleFilterChange('genre', val)} 
                    />
                     <FilterDropdown 
                        label="Year" 
                        value={filters.year} 
                        options={YEARS} 
                        id="dropdown-year"
                        onSelect={(val) => handleFilterChange('year', val)} 
                    />
                     <FilterDropdown 
                        label="Season" 
                        value={filters.season} 
                        options={SEASONS} 
                        id="dropdown-season"
                        onSelect={(val) => handleFilterChange('season', val)} 
                    />
                    
                    {isFiltered && (
                        <button 
                            onClick={resetFilters}
                            className="h-[48px] w-[48px] flex items-center justify-center rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors bg-surface"
                            title="Reset Filters"
                        >
                            <RotateCcw size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Content Grid */}
            {homeAnime.length === 0 ? (
                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
                    {[1,2,3,4,5,6,7,8,9,10].map(i => (
                        <div key={i} className="aspect-[2/3] bg-surface rounded-2xl animate-pulse border border-white/5" />
                    ))}
                 </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
                    {(isFiltered ? homeAnime : gridAnime).map((anime, idx) => (
                        <div key={anime.id} className="animate-in fade-in duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                            <AnimeCard 
                                anime={anime} 
                                onClick={setSelectedAnime}
                                isInWatchlist={isInWatchlist(anime)}
                                onToggleWatchlist={toggleWatchlist}
                            />
                        </div>
                    ))}
                </div>
            )}

            <div ref={loadMoreRef} className="py-12 flex justify-center">
                 {loadingMore && <Loader2 className="animate-spin text-primary w-8 h-8" />}
            </div>
          </div>
        );

      case ViewState.SHOWS:
        return (
            <div className="animate-in fade-in duration-300 min-h-[80vh]">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-6 border-b border-white/5">
                    <div>
                        <h2 className="text-4xl font-black flex items-center gap-3 mb-2">
                            My Cloud Shows
                            {libraryAnime.length > 0 && (
                                <span className="text-primary text-xl font-medium px-3 py-1 bg-surface rounded-full border border-white/10 align-middle">
                                    {libraryAnime.length}
                                </span>
                            )}
                        </h2>
                        <p className="text-gray-400">
                            Access anime stored on your private cloud.
                        </p>
                    </div>

                    <button 
                        onClick={rescanLibrary}
                        disabled={isScanning}
                        className="bg-surface text-white border border-white/10 px-6 py-3 rounded-xl font-bold hover:bg-white/5 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {isScanning ? <Loader2 size={20} className="animate-spin text-primary" /> : <RefreshCw size={20} />}
                        {isScanning ? 'Scanning...' : 'Scan Cloud Storage'}
                    </button>
                </div>

                {libraryAnime.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-gray-500 border border-dashed border-white/10 rounded-3xl bg-surface/30">
                        <HardDrive size={64} className="mb-6 opacity-30" />
                        <p className="text-2xl font-bold text-gray-400 mb-2">Library Not Scanned</p>
                        <p className="mb-8">
                            Click the scan button to sync your cloud storage.
                        </p>
                        <button 
                            onClick={rescanLibrary}
                            disabled={isScanning}
                            className="bg-primary text-black font-bold px-8 py-3 rounded-xl hover:bg-white transition-colors flex items-center gap-2"
                        >
                            {isScanning ? <Loader2 className="animate-spin" /> : <RefreshCw size={18} />}
                            Scan Now
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {libraryAnime.map(anime => (
                            <div key={anime.id} className="relative group">
                                <AnimeCard 
                                    anime={anime} 
                                    onClick={(a) => setSelectedAnime(a)}
                                    isInWatchlist={isInWatchlist(anime)}
                                    onToggleWatchlist={toggleWatchlist}
                                    showReason={true}
                                />
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setVideoMode('episode'); 
                                        setPlayingAnime(anime); 
                                    }}
                                    className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px] rounded-2xl cursor-pointer border border-white/10"
                                >
                                    <div className="flex flex-col items-center gap-2 transform scale-90 group-hover:scale-100 transition-transform duration-300">
                                        <PlayCircle size={48} className="text-primary fill-black" />
                                        <span className="font-bold text-white text-sm">Play File</span>
                                    </div>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );

      case ViewState.SEARCH:
        return (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[80vh]">
            <div className="text-center space-y-6 py-12 relative z-50">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight drop-shadow-lg">Search Anime</h2>
              <p className="text-gray-300 text-lg font-medium drop-shadow-md">Find your favorites by title.</p>
              
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
                    className="w-full bg-surface/90 backdrop-blur-md border border-white/10 rounded-xl px-6 py-5 pl-14 text-xl focus:outline-none focus:ring-0 text-white placeholder-gray-500 transition-all shadow-2xl"
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
        const filteredWatchlist = watchlist.filter(anime => {
            const matchesTab = watchlistTab === 'All' || (anime.userStatus || 'Plan to Watch') === watchlistTab;
            const matchesSearch = !watchlistSearch || anime.title.toLowerCase().includes(watchlistSearch.toLowerCase());
            return matchesTab && matchesSearch;
        });

        const tabs: (WatchStatus | 'All')[] = ['All', 'Watching', 'Completed', 'Plan to Watch', 'Dropped'];

        return (
          <div className="animate-in fade-in duration-300 min-h-[80vh]">
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

      case ViewState.ADMIN:
        return <AdminPanel />;
        
      default:
        return <div>View not found</div>;
    }
  };

  if (authLoading) {
      return (
          <div className="min-h-screen bg-transparent flex items-center justify-center">
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
          mode={videoMode}
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