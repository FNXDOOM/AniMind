import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { X, SkipForward, SkipBack, Play, Pause, ChevronRight, ChevronLeft, List, Volume2, VolumeX, Maximize, Minimize, Settings, Captions, Check, Globe, Youtube, AlertCircle } from 'lucide-react';
import { Anime } from '../types';
import { getProgress, saveProgress } from '../services/dbService';

interface VideoModalProps {
  anime: Anime;
  onClose: () => void;
  userId: string;
  mode?: 'episode' | 'trailer';
}

interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  content: string;
}

// Storage Keys
const STORAGE_KEY_VOLUME = 'animind_volume';
const STORAGE_KEY_SPEED = 'animind_playback_speed';
const STORAGE_KEY_SUBTITLE = 'animind_subtitle_pref';

// TODO: Replace with actual subtitle tracks from your API/backend
const SUBTITLE_TRACKS: SubtitleTrack[] = [
  {
    id: 'en',
    label: 'English',
    language: 'English',
    content: `WEBVTT

00:00:01.000 --> 00:00:04.000
[Wind blowing softly through the trees]

00:00:04.500 --> 00:00:08.500
In a world where algorithms rule...

00:00:09.000 --> 00:00:13.000
One developer stands against the bugs.

00:00:14.000 --> 00:00:18.000
"System failure imminent. Reboot required."
`
  },
  {
    id: 'jp',
    label: 'Japanese (日本語)',
    language: 'Japanese',
    content: `WEBVTT

00:00:01.000 --> 00:00:04.000
[風が木々を通り抜ける音]

00:00:04.500 --> 00:00:08.500
アルゴリズムが支配する世界で...

00:00:09.000 --> 00:00:13.000
一人の開発者がバグに立ち向かう。

00:00:14.000 --> 00:00:18.000
「システム障害が差し迫っています。再起動が必要です。」
`
  },
  {
    id: 'es',
    label: 'Spanish (Español)',
    language: 'Spanish',
    content: `WEBVTT

00:00:01.000 --> 00:00:04.000
[El viento sopla suavemente a través de los árboles]

00:00:04.500 --> 00:00:08.500
En un mundo donde los algoritmos gobiernan...

00:00:09.000 --> 00:00:13.000
Un desarrollador se enfrenta a los errores.

00:00:14.000 --> 00:00:18.000
"Falla del sistema inminente. Se requiere reiniciar."
`
  }
];

// Utility Functions
const parseTime = (timeStr: string): number => {
  const parts = timeStr.split(':');
  let seconds = 0;
  if (parts.length === 3) {
    const [h, m, s] = parts;
    seconds = parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s);
  } else if (parts.length === 2) {
    const [m, s] = parts;
    seconds = parseInt(m) * 60 + parseFloat(s);
  }
  return seconds;
};

const parseVTT = (content: string): SubtitleCue[] => {
  const lines = content.split('\n');
  const cues: SubtitleCue[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.includes('-->')) {
      const [startStr, endStr] = line.split('-->').map(s => s.trim());
      const start = parseTime(startStr);
      const end = parseTime(endStr);
      let text = '';
      i++;
      while (i < lines.length && lines[i].trim() !== '') {
        text += (text ? '\n' : '') + lines[i];
        i++;
      }
      if (text) cues.push({ start, end, text: text.trim() });
    } else {
      i++;
    }
  }
  return cues;
};

// Safe localStorage wrapper
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }
};

// Sanitize subtitle text to prevent XSS
const sanitizeSubtitleText = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

const VideoModal: React.FC<VideoModalProps> = ({ anime, onClose, userId, mode = 'episode' }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(mode === 'episode');
  
  // Episode State
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);

  // Video State
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [previousVolume, setPreviousVolume] = useState(1); // For mute toggle
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Feature State
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  
  // Subtitle State
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [currentSubtitleTrackId, setCurrentSubtitleTrackId] = useState<string | null>('en');
  const [activeSubtitle, setActiveSubtitle] = useState<string>('');

  // Playback Speed State
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Parse subtitle cues
  const subtitleCues = useMemo(() => {
    if (!currentSubtitleTrackId) return [];
    const track = SUBTITLE_TRACKS.find(t => t.id === currentSubtitleTrackId);
    return track ? parseVTT(track.content) : [];
  }, [currentSubtitleTrackId]);

  // Generate episodes (TODO: Replace with actual data from API)
  const episodes = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    number: i + 1,
    title: `Episode ${i + 1}`,
    thumbnail: `https://picsum.photos/seed/${anime.title + i}/300/170`,
    duration: '24:00'
  })), [anime.title]);

  // TODO: Replace with actual video source from your API
  const videoSrc = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  // --- TRAILER MODE RENDER ---
  if (mode === 'trailer') {
      const isYoutube = anime.trailer?.site?.toLowerCase() === 'youtube';
      const trailerId = anime.trailer?.id;
      
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const embedUrl = `https://www.youtube.com/embed/${trailerId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&origin=${encodeURIComponent(origin)}`;

      return (
          <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300 backdrop-blur-md">
              <button 
                onClick={onClose} 
                className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-3 rounded-full z-50"
                aria-label="Close trailer"
              >
                  <X size={32} />
              </button>
              
              <div className="w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl relative border border-white/10">
                 {isYoutube && trailerId ? (
                    <iframe 
                        width="100%" 
                        height="100%" 
                        src={embedUrl}
                        title={`${anime.title} Trailer`}
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                        className="w-full h-full"
                    />
                 ) : (
                     <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
                         <Youtube size={64} className="opacity-20" />
                         <p className="text-xl font-medium">Trailer not available for this anime.</p>
                     </div>
                 )}
              </div>
              
              <div className="mt-8 flex flex-col items-center gap-4 text-center max-w-2xl">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">{anime.title}</h2>
                    <p className="text-primary font-medium tracking-wide">Official Trailer</p>
                  </div>
              </div>
          </div>
      );
  }

  // --- EPISODE PLAYER LOGIC BELOW ---

  // --- CLEANUP ON UNMOUNT ---
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // --- PERSISTENCE INITIALIZATION ---
  useEffect(() => {
    // 1. Load Volume
    const savedVol = safeLocalStorage.getItem(STORAGE_KEY_VOLUME);
    if (savedVol !== null) {
        const volValue = parseFloat(savedVol);
        if (!isNaN(volValue) && volValue >= 0 && volValue <= 1) {
            setVolume(volValue);
            setPreviousVolume(volValue > 0 ? volValue : 1);
            setIsMuted(volValue === 0);
            if (videoRef.current) {
                videoRef.current.volume = volValue;
                videoRef.current.muted = (volValue === 0);
            }
        }
    }

    // 2. Load Playback Speed
    const savedSpeed = safeLocalStorage.getItem(STORAGE_KEY_SPEED);
    if (savedSpeed !== null) {
        const speedValue = parseFloat(savedSpeed);
        if (!isNaN(speedValue) && speedValue > 0 && speedValue <= 2) {
            setPlaybackRate(speedValue);
            if (videoRef.current) {
                videoRef.current.playbackRate = speedValue;
            }
        }
    }

    // 3. Load Subtitle Preference
    const savedSub = safeLocalStorage.getItem(STORAGE_KEY_SUBTITLE);
    if (savedSub === 'off') {
        setCurrentSubtitleTrackId(null);
    } else if (savedSub) {
        const exists = SUBTITLE_TRACKS.find(t => t.id === savedSub);
        if (exists) setCurrentSubtitleTrackId(savedSub);
    }
  }, []);

  // --- PROGRESS LOADING (DB Service) ---
  useEffect(() => {
      if (mode !== 'episode') return;

      let isMounted = true;
      const loadProgress = async () => {
          try {
              if (videoRef.current) videoRef.current.pause();

              const timestamp = await getProgress(userId, anime.id, currentEpisodeIndex);
              
              if (isMounted && videoRef.current) {
                   if (timestamp > 0) {
                       videoRef.current.currentTime = timestamp;
                       setCurrentTime(timestamp);
                   } else {
                       videoRef.current.currentTime = 0;
                       setCurrentTime(0);
                   }
                   videoRef.current.playbackRate = playbackRate;
                   
                   // Auto-play
                   videoRef.current.play()
                    .then(() => setIsPlaying(true))
                    .catch(() => setIsPlaying(false));
              }
          } catch (error) {
              console.error('Failed to load progress:', error);
              // Continue playback from beginning on error
              if (isMounted && videoRef.current) {
                  videoRef.current.currentTime = 0;
              }
          }
      };
      loadProgress();
      return () => { isMounted = false; };
  }, [userId, anime.id, currentEpisodeIndex, mode, playbackRate]);

  // --- PROGRESS SAVING (DB Service) ---
  useEffect(() => {
    if (mode !== 'episode') return;

    const save = async () => {
        try {
            if (videoRef.current && !videoRef.current.paused) {
                await saveProgress(userId, anime.id, currentEpisodeIndex, videoRef.current.currentTime);
            }
        } catch (error) {
            console.error('Failed to save progress:', error);
        }
    };
    
    const interval = setInterval(save, 5000);
    
    return () => {
        clearInterval(interval);
        if (videoRef.current) {
             saveProgress(userId, anime.id, currentEpisodeIndex, videoRef.current.currentTime)
                .catch(error => console.error('Failed to save progress on cleanup:', error));
        }
    };
  }, [userId, anime.id, currentEpisodeIndex, mode]);

  // --- FULLSCREEN CHANGE LISTENER ---
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // --- VIDEO EVENT LISTENERS ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      const currTime = video.currentTime;
      setCurrentTime(currTime);
      setProgress((currTime / video.duration) * 100);

      // Optimized Subtitle Sync Logic - Binary search would be better for large subtitle sets
      if (currentSubtitleTrackId && subtitleCues.length > 0) {
          const currentCue = subtitleCues.find(cue => currTime >= cue.start && currTime <= cue.end);
          setActiveSubtitle(currentCue ? currentCue.text : '');
      } else {
          setActiveSubtitle('');
      }
    };

    const updateDuration = () => setDuration(video.duration);
    
    const handleLoadedData = () => {
        video.playbackRate = playbackRate;
        setIsLoading(false);
        setVideoError(null);
    };

    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    
    const handleEnded = () => {
        setIsPlaying(false);
        // Auto-advance to next episode if available
        if (currentEpisodeIndex < episodes.length - 1) {
            setTimeout(() => setCurrentEpisodeIndex(prev => prev + 1), 1000);
        }
    };

    const handleError = () => {
        setVideoError('Failed to load video. Please try again.');
        setIsLoading(false);
        setIsPlaying(false);
    };

    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', updateProgress);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [currentSubtitleTrackId, subtitleCues, playbackRate, currentEpisodeIndex, episodes.length]);

  // --- KEYBOARD CONTROLS ---
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch(e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange({ target: { value: Math.min(1, volume + 0.1).toString() } } as any);
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange({ target: { value: Math.max(0, volume - 0.1).toString() } } as any);
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'c':
          e.preventDefault();
          setShowSubtitleMenu(prev => !prev);
          break;
        case 'Escape':
          if (showSubtitleMenu || showSpeedMenu || showSettingsMenu) {
            setShowSubtitleMenu(false);
            setShowSpeedMenu(false);
            setShowSettingsMenu(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [volume, duration, showSubtitleMenu, showSpeedMenu, showSettingsMenu]);

  // --- HANDLERS ---
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSettingsMenu && !showSubtitleMenu && !showSpeedMenu) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying, showSettingsMenu, showSubtitleMenu, showSpeedMenu]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play()
        .catch(error => console.error('Playback failed:', error));
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = (parseFloat(e.target.value) / 100) * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setProgress(parseFloat(e.target.value));
    }
  }, [duration]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(0, Math.min(1, parseFloat(e.target.value)));
    setVolume(val);
    if (val > 0) {
      setPreviousVolume(val);
    }
    setIsMuted(val === 0);
    
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    safeLocalStorage.setItem(STORAGE_KEY_VOLUME, val.toString());
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;

    if (isMuted) {
      const newVolume = previousVolume;
      setVolume(newVolume);
      setIsMuted(false);
      videoRef.current.volume = newVolume;
      videoRef.current.muted = false;
      safeLocalStorage.setItem(STORAGE_KEY_VOLUME, newVolume.toString());
    } else {
      setPreviousVolume(volume);
      setVolume(0);
      setIsMuted(true);
      videoRef.current.volume = 0;
      videoRef.current.muted = true;
      safeLocalStorage.setItem(STORAGE_KEY_VOLUME, '0');
    }
  }, [isMuted, volume, previousVolume]);

  const handleSpeedChange = useCallback((rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
        videoRef.current.playbackRate = rate;
    }
    safeLocalStorage.setItem(STORAGE_KEY_SPEED, rate.toString());
    setShowSpeedMenu(false);
  }, []);

  const handleSubtitleTrackChange = useCallback((trackId: string | null) => {
      setCurrentSubtitleTrackId(trackId);
      safeLocalStorage.setItem(STORAGE_KEY_SUBTITLE, trackId || 'off');
      setShowSubtitleMenu(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
        .catch(err => console.error('Failed to enter fullscreen:', err));
    } else {
      document.exitFullscreen()
        .catch(err => console.error('Failed to exit fullscreen:', err));
    }
  }, []);

  const formatTime = useCallback((time: number) => {
    if (!isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, []);

  return (
    <div 
      className="fixed inset-0 z-[200] bg-[#000000] text-white flex animate-in fade-in duration-300 font-sans overflow-hidden"
      role="dialog"
      aria-label="Video player"
    >
      
      {/* Main Player Area */}
      <div 
        ref={containerRef}
        className="flex-1 flex flex-col relative h-full bg-black group select-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { 
          if (isPlaying) setShowControls(false); 
          setShowSubtitleMenu(false); 
          setShowSpeedMenu(false); 
        }}
        onClick={() => { 
          setShowSubtitleMenu(false); 
          setShowSpeedMenu(false); 
        }}
      >
        {/* Header */}
        <div className={`absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/90 via-black/40 to-transparent z-20 flex items-start p-6 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-4 w-full">
             <button 
               onClick={onClose} 
               className="text-gray-300 hover:text-white transition-colors hover:bg-white/10 p-2 rounded-full"
               aria-label="Close player"
             >
                <X size={24} />
             </button>
             <div>
                <h1 className="text-xl font-bold text-white leading-tight drop-shadow-md">{anime.title}</h1>
                <p className="text-sm text-gray-300 font-medium drop-shadow-md">
                    Episode {currentEpisodeIndex + 1}
                </p>
             </div>
          </div>
        </div>

        {/* Video Element */}
        <div 
          className="flex-1 relative flex items-center justify-center bg-black" 
          onClick={(e) => { 
            e.stopPropagation(); 
            togglePlay(); 
          }}
        >
             <video
                ref={videoRef}
                src={videoSrc}
                className="w-full h-full object-contain"
                playsInline
                crossOrigin="anonymous"
                aria-label={`${anime.title} - Episode ${currentEpisodeIndex + 1}`}
            />
            
            {/* Loading Spinner */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Error Message */}
            {videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 pointer-events-none">
                <div className="flex flex-col items-center gap-4 text-center px-4">
                  <AlertCircle size={48} className="text-red-500" />
                  <p className="text-xl font-medium">{videoError}</p>
                  <button 
                    onClick={() => {
                      setVideoError(null);
                      if (videoRef.current) {
                        videoRef.current.load();
                      }
                    }}
                    className="px-6 py-2 bg-primary rounded-lg hover:bg-primary/80 transition-colors pointer-events-auto"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Styled Subtitle Overlay */}
            {currentSubtitleTrackId && activeSubtitle && (
              <div 
                className={`absolute left-0 right-0 text-center pointer-events-none transition-all duration-300 px-8 md:px-20 z-20 ${showControls ? 'bottom-24' : 'bottom-12'}`}
                dangerouslySetInnerHTML={{ __html: sanitizeSubtitleText(activeSubtitle) }}
                style={{
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8)'
                }}
              />
            )}
            
            {/* Play Button Overlay */}
            {!isPlaying && showControls && !isLoading && !videoError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                    <div className="bg-black/50 p-6 rounded-full backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                        <Play size={48} className="fill-primary text-primary" />
                    </div>
                </div>
            )}
        </div>

        {/* Controls */}
        <div 
          className={`absolute bottom-0 left-0 right-0 px-4 pb-4 pt-12 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-30 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`} 
          onClick={(e) => e.stopPropagation()}
        >
            {/* Timeline */}
            <div className="relative group/progress h-1 hover:h-2 bg-white/20 rounded-full mb-4 cursor-pointer transition-all">
               <div 
                 className="absolute left-0 top-0 bottom-0 bg-primary rounded-full relative" 
                 style={{ width: `${progress}%` }}
               >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 group-hover/progress:scale-100 transition-transform shadow-md" />
               </div>
               <input 
                 type="range" 
                 min="0" 
                 max="100" 
                 value={progress} 
                 onChange={handleSeek} 
                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                 aria-label="Seek video"
               />
            </div>

            <div className="flex items-center justify-between">
                {/* Left Controls */}
                <div className="flex items-center gap-4">
                    <button 
                      onClick={() => currentEpisodeIndex > 0 && setCurrentEpisodeIndex(p => p - 1)} 
                      disabled={currentEpisodeIndex === 0} 
                      className={`hover:text-primary transition-colors ${currentEpisodeIndex === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-white'}`}
                      aria-label="Previous episode"
                    >
                        <SkipBack size={20} className="fill-current" />
                    </button>
                    <button 
                      onClick={togglePlay} 
                      className="hover:text-primary transition-colors"
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                        {isPlaying ? <Pause size={32} className="fill-current" /> : <Play size={32} className="fill-current" />}
                    </button>
                    <button 
                      onClick={() => currentEpisodeIndex < episodes.length - 1 && setCurrentEpisodeIndex(p => p + 1)} 
                      disabled={currentEpisodeIndex === episodes.length - 1} 
                      className={`hover:text-primary transition-colors ${currentEpisodeIndex === episodes.length - 1 ? 'text-gray-600 cursor-not-allowed' : 'text-white'}`}
                      aria-label="Next episode"
                    >
                        <SkipForward size={20} className="fill-current" />
                    </button>

                    <div className="flex items-center gap-2 group/vol ml-2">
                         <button 
                           onClick={toggleMute}
                           aria-label={isMuted ? 'Unmute' : 'Mute'}
                         >
                            {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
                         </button>
                         <div className="w-0 overflow-hidden group-hover/vol:w-24 transition-all duration-300">
                             <input 
                               type="range" 
                               min="0" 
                               max="1" 
                               step="0.01" 
                               value={isMuted ? 0 : volume} 
                               onChange={handleVolumeChange} 
                               className="w-24 h-1.5 bg-white/20 rounded-lg accent-primary cursor-pointer"
                               aria-label="Volume"
                             />
                         </div>
                    </div>
                    <div className="text-sm font-medium text-gray-300 ml-2" aria-live="polite">
                        {formatTime(currentTime)} <span className="mx-1 text-gray-500">/</span> {formatTime(duration)}
                    </div>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-4 relative">
                     {/* Subtitle Button */}
                     <div className="relative">
                         <button 
                             onClick={(e) => { 
                               e.stopPropagation();
                               setShowSubtitleMenu(!showSubtitleMenu); 
                               setShowSpeedMenu(false); 
                             }} 
                             className={`hover:text-primary transition-colors p-2 rounded-lg hover:bg-white/10 ${showSubtitleMenu ? 'text-primary bg-white/10' : ''}`}
                             title="Subtitles / Captions (C)"
                             aria-label="Subtitles menu"
                             aria-expanded={showSubtitleMenu}
                         >
                             <Captions size={24} />
                         </button>

                         {/* Subtitle Menu Popup */}
                         {showSubtitleMenu && (
                             <div 
                               className="absolute bottom-full right-0 mb-4 w-64 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-50"
                               onClick={(e) => e.stopPropagation()}
                               role="menu"
                             >
                                 <div className="p-3 border-b border-white/5 flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-wider">
                                     <Globe size={14} /> Subtitle Tracks
                                 </div>
                                 <div className="max-h-60 overflow-y-auto py-1">
                                     <button
                                        onClick={() => handleSubtitleTrackChange(null)}
                                        className="w-full text-left px-4 py-3 hover:bg-white/10 flex items-center justify-between group transition-colors"
                                        role="menuitem"
                                     >
                                         <span className={!currentSubtitleTrackId ? 'text-primary font-bold' : 'text-gray-300'}>Off</span>
                                         {!currentSubtitleTrackId && <Check size={16} className="text-primary" />}
                                     </button>
                                     
                                     {SUBTITLE_TRACKS.map(track => (
                                         <button
                                            key={track.id}
                                            onClick={() => handleSubtitleTrackChange(track.id)}
                                            className="w-full text-left px-4 py-3 hover:bg-white/10 flex items-center justify-between group transition-colors"
                                            role="menuitem"
                                         >
                                             <div className="flex flex-col">
                                                 <span className={currentSubtitleTrackId === track.id ? 'text-primary font-bold' : 'text-gray-200'}>{track.label}</span>
                                             </div>
                                             {currentSubtitleTrackId === track.id && <Check size={16} className="text-primary" />}
                                         </button>
                                     ))}
                                 </div>
                             </div>
                         )}
                     </div>

                     {/* Speed Button */}
                     <div className="relative">
                         <button 
                             onClick={(e) => { 
                               e.stopPropagation();
                               setShowSpeedMenu(!showSpeedMenu); 
                               setShowSubtitleMenu(false); 
                             }} 
                             className={`hover:text-primary transition-colors p-2 rounded-lg hover:bg-white/10 ${showSpeedMenu ? 'text-primary bg-white/10' : ''}`}
                             title="Playback Speed"
                             aria-label="Playback speed menu"
                             aria-expanded={showSpeedMenu}
                         >
                             <Settings size={24} />
                         </button>

                         {/* Speed Menu Popup */}
                         {showSpeedMenu && (
                             <div 
                               className="absolute bottom-full right-0 mb-4 w-48 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-50"
                               onClick={(e) => e.stopPropagation()}
                               role="menu"
                             >
                                 <div className="p-3 border-b border-white/5 flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-wider">
                                     <Settings size={14} /> Playback Speed
                                 </div>
                                 <div className="py-1">
                                     {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
                                         <button
                                            key={rate}
                                            onClick={() => handleSpeedChange(rate)}
                                            className="w-full text-left px-4 py-3 hover:bg-white/10 flex items-center justify-between group transition-colors"
                                            role="menuitem"
                                         >
                                             <span className={playbackRate === rate ? 'text-primary font-bold' : 'text-gray-200'}>
                                                 {rate === 1 ? 'Normal' : `${rate}x`}
                                             </span>
                                             {playbackRate === rate && <Check size={16} className="text-primary" />}
                                         </button>
                                     ))}
                                 </div>
                             </div>
                         )}
                     </div>

                     <button 
                       onClick={toggleFullscreen} 
                       className="hover:text-primary transition-colors p-2 rounded-lg hover:bg-white/10"
                       aria-label={isFullscreen ? 'Exit fullscreen (F)' : 'Enter fullscreen (F)'}
                     >
                         {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                     </button>
                </div>
            </div>
        </div>
      </div>

      {/* Sidebar - Only shown if sidebar is open */}
      <div className={`fixed inset-y-0 right-0 z-30 w-80 bg-surface border-l border-white/10 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:relative md:block md:translate-x-0 ${!isSidebarOpen && 'md:!hidden'} flex flex-col shadow-2xl`}>
         <div className="p-4 border-b border-white/5 bg-black/20 flex items-center justify-between">
             <h3 className="font-bold text-gray-100 uppercase tracking-wider text-sm">Up Next</h3>
             <button 
               onClick={() => setSidebarOpen(false)} 
               className="md:hidden p-2 text-gray-400"
               aria-label="Close episode list"
             >
               <ChevronRight />
             </button>
         </div>
         <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
             {episodes.map((ep, idx) => (
                 <div 
                   key={ep.number} 
                   onClick={() => { 
                     setCurrentEpisodeIndex(idx); 
                     setIsPlaying(false); 
                   }} 
                   className={`flex gap-3 p-2 rounded-lg cursor-pointer transition-all group ${currentEpisodeIndex === idx ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-white/5 border-l-4 border-transparent'}`}
                   role="button"
                   tabIndex={0}
                   aria-label={`Play ${ep.title}`}
                   onKeyPress={(e) => {
                     if (e.key === 'Enter' || e.key === ' ') {
                       setCurrentEpisodeIndex(idx);
                       setIsPlaying(false);
                     }
                   }}
                 >
                     <div className="relative w-32 aspect-video rounded overflow-hidden bg-black shrink-0">
                        <img 
                          src={ep.thumbnail} 
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                          alt={ep.title} 
                          loading="lazy"
                        />
                        <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold">{ep.duration}</div>
                     </div>
                     <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                         <div className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Episode {ep.number}</div>
                         <div className="text-sm font-medium text-gray-200 line-clamp-2 leading-tight group-hover:text-primary transition-colors">{ep.title}</div>
                     </div>
                 </div>
             ))}
         </div>
      </div>

      {/* Sidebar Toggle Buttons */}
      {!isSidebarOpen && (
        <>
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="absolute right-0 top-1/2 -translate-y-1/2 z-40 bg-surface p-2 rounded-l-xl border-y border-l border-white/10 text-primary hover:text-white transition-colors shadow-xl hidden md:block"
            aria-label="Show episode list"
          >
            <ChevronLeft />
          </button>
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="absolute bottom-20 right-4 z-40 md:hidden bg-surface p-3 rounded-full shadow-lg border border-white/10"
            aria-label="Show episode list"
          >
            <List />
          </button>
        </>
      )}
    </div>
  );
};

export default VideoModal;