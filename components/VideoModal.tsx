import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, SkipForward, SkipBack, Play, Pause, ChevronRight, ChevronLeft, List, Volume2, VolumeX, Maximize, Minimize, Settings, Captions, Check, Globe, Youtube, ExternalLink } from 'lucide-react';
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

// Mocking "Embedded" Subtitles found in the video file
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
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Feature State
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  
  // Subtitle State
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [currentSubtitleTrackId, setCurrentSubtitleTrackId] = useState<string | null>('en'); // Default to English
  const [activeSubtitle, setActiveSubtitle] = useState<string>('');

  // Playback Speed State
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const subtitleCues = useMemo(() => {
    if (!currentSubtitleTrackId) return [];
    const track = SUBTITLE_TRACKS.find(t => t.id === currentSubtitleTrackId);
    return track ? parseVTT(track.content) : [];
  }, [currentSubtitleTrackId]);

  const episodes = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    number: i + 1,
    title: `Episode ${i + 1}`,
    thumbnail: `https://picsum.photos/seed/${anime.title + i}/300/170`,
    duration: '24:00'
  })), [anime.title]);

  const videoSrc = "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  // --- TRAILER MODE RENDER ---
  if (mode === 'trailer') {
      const isYoutube = anime.trailer?.site?.toLowerCase() === 'youtube';
      const trailerId = anime.trailer?.id;
      
      // Construct robust YouTube URL
      // Use standard www.youtube.com for better Origin header handling with restricted videos
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const embedUrl = `https://www.youtube.com/embed/${trailerId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&origin=${encodeURIComponent(origin)}`;

      return (
          <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300 backdrop-blur-md">
              <button 
                onClick={onClose} 
                className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-3 rounded-full z-50"
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

  // --- PERSISTENCE INITIALIZATION ---
  useEffect(() => {
    // 1. Load Volume
    const savedVol = localStorage.getItem(STORAGE_KEY_VOLUME);
    if (savedVol !== null) {
        const volValue = parseFloat(savedVol);
        setVolume(volValue);
        setIsMuted(volValue === 0);
        if (videoRef.current) {
            videoRef.current.volume = volValue;
            videoRef.current.muted = (volValue === 0);
        }
    }

    // 2. Load Playback Speed
    const savedSpeed = localStorage.getItem(STORAGE_KEY_SPEED);
    if (savedSpeed !== null) {
        const speedValue = parseFloat(savedSpeed);
        setPlaybackRate(speedValue);
        if (videoRef.current) {
            videoRef.current.playbackRate = speedValue;
        }
    }

    // 3. Load Subtitle Preference
    const savedSub = localStorage.getItem(STORAGE_KEY_SUBTITLE);
    if (savedSub === 'off') {
        setCurrentSubtitleTrackId(null);
    } else if (savedSub) {
        // Verify track exists (in case data changed)
        const exists = SUBTITLE_TRACKS.find(t => t.id === savedSub);
        if (exists) setCurrentSubtitleTrackId(savedSub);
    }
  }, []);

  // --- PROGRESS LOADING (DB Service) ---
  useEffect(() => {
      if (mode !== 'episode') return;

      let isMounted = true;
      const loadProgress = async () => {
          // Pause playback before jumping to prevent glitching
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
               // Ensure playback rate is applied after source/time change
               videoRef.current.playbackRate = playbackRate;
               
               // Auto-play
               videoRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(() => setIsPlaying(false));
          }
      };
      loadProgress();
      return () => { isMounted = false; };
  }, [userId, anime.id, currentEpisodeIndex, mode]);

  // --- PROGRESS SAVING (DB Service) ---
  useEffect(() => {
    if (mode !== 'episode') return;

    const save = async () => {
        if (videoRef.current && !videoRef.current.paused) {
            await saveProgress(userId, anime.id, currentEpisodeIndex, videoRef.current.currentTime);
        }
    };
    const interval = setInterval(save, 5000); // Save every 5 seconds
    
    // Save on unmount or episode change
    return () => {
        clearInterval(interval);
        if (videoRef.current) {
             saveProgress(userId, anime.id, currentEpisodeIndex, videoRef.current.currentTime);
        }
    };
  }, [userId, anime.id, currentEpisodeIndex, mode]);

  // --- VIDEO EVENT LISTENERS ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      const currTime = video.currentTime;
      setCurrentTime(currTime);
      setProgress((currTime / video.duration) * 100);

      // Subtitle Sync Logic
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
    };

    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      video.removeEventListener('timeupdate', updateProgress);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, [currentSubtitleTrackId, subtitleCues, playbackRate]);

  // --- HANDLERS ---
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSettingsMenu && !showSubtitleMenu && !showSpeedMenu) setShowControls(false);
    }, 3000);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = (parseFloat(e.target.value) / 100) * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setProgress(parseFloat(e.target.value));
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
    localStorage.setItem(STORAGE_KEY_VOLUME, val.toString());
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
        videoRef.current.playbackRate = rate;
    }
    localStorage.setItem(STORAGE_KEY_SPEED, rate.toString());
    setShowSpeedMenu(false);
  };

  const handleSubtitleTrackChange = (trackId: string | null) => {
      setCurrentSubtitleTrackId(trackId);
      localStorage.setItem(STORAGE_KEY_SUBTITLE, trackId || 'off');
      setShowSubtitleMenu(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#000000] text-white flex animate-in fade-in duration-300 font-sans overflow-hidden">
      
      {/* Main Player Area */}
      <div 
        ref={containerRef}
        className="flex-1 flex flex-col relative h-full bg-black group select-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { if (isPlaying) setShowControls(false); setShowSubtitleMenu(false); setShowSpeedMenu(false); }}
        onClick={() => { setShowSubtitleMenu(false); setShowSpeedMenu(false); }}
      >
        {/* Header */}
        <div className={`absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/90 via-black/40 to-transparent z-20 flex items-start p-6 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-4 w-full">
             <button onClick={onClose} className="text-gray-300 hover:text-white transition-colors hover:bg-white/10 p-2 rounded-full">
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
        <div className="flex-1 relative flex items-center justify-center bg-black" onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
             <video
                ref={videoRef}
                src={videoSrc}
                className="w-full h-full object-contain"
                playsInline
                crossOrigin="anonymous"
            />
            {/* Styled Subtitle Overlay */}
            {currentSubtitleTrackId && activeSubtitle && (
              <div className={`absolute left-0 right-0 text-center pointer-events-none transition-all duration-300 px-8 md:px-20 z-20 ${showControls ? 'bottom-24' : 'bottom-12'}`}>
                <span className="inline-block bg-black/60 px-4 py-1 rounded-lg backdrop-blur-sm text-white text-lg md:text-2xl font-medium leading-relaxed whitespace-pre-line shadow-xl">
                    {activeSubtitle}
                </span>
              </div>
            )}
            {!isPlaying && showControls && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                    <div className="bg-black/50 p-6 rounded-full backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                        <Play size={48} className="fill-primary" />
                    </div>
                </div>
            )}
        </div>

        {/* Controls */}
        <div className={`absolute bottom-0 left-0 right-0 px-4 pb-4 pt-12 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-30 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`} onClick={(e) => e.stopPropagation()}>
            {/* Timeline */}
            <div className="relative group/progress h-1 hover:h-2 bg-white/20 rounded-full mb-4 cursor-pointer transition-all">
               <div className="absolute left-0 top-0 bottom-0 bg-primary rounded-full relative" style={{ width: `${progress}%` }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 group-hover/progress:scale-100 transition-transform shadow-md" />
               </div>
               <input type="range" min="0" max="100" value={progress} onChange={handleSeek} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </div>

            <div className="flex items-center justify-between">
                {/* Left Controls */}
                <div className="flex items-center gap-4">
                    <button onClick={() => currentEpisodeIndex > 0 && setCurrentEpisodeIndex(p => p - 1)} disabled={currentEpisodeIndex === 0} className={`hover:text-primary transition-colors ${currentEpisodeIndex === 0 ? 'text-gray-600' : 'text-white'}`}>
                        <SkipBack size={20} className="fill-current" />
                    </button>
                    <button onClick={togglePlay} className="hover:text-primary transition-colors">
                        {isPlaying ? <Pause size={32} className="fill-current" /> : <Play size={32} className="fill-current" />}
                    </button>
                    <button onClick={() => currentEpisodeIndex < episodes.length - 1 && setCurrentEpisodeIndex(p => p + 1)} disabled={currentEpisodeIndex === episodes.length - 1} className={`hover:text-primary transition-colors ${currentEpisodeIndex === episodes.length - 1 ? 'text-gray-600' : 'text-white'}`}>
                        <SkipForward size={20} className="fill-current" />
                    </button>

                    <div className="flex items-center gap-2 group/vol ml-2">
                         <button onClick={() => setIsMuted(!isMuted)}>
                            {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
                         </button>
                         <div className="w-0 overflow-hidden group-hover/vol:w-24 transition-all duration-300">
                             <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-24 h-1.5 bg-white/20 rounded-lg accent-primary cursor-pointer" />
                         </div>
                    </div>
                    <div className="text-sm font-medium text-gray-300 ml-2">
                        {formatTime(currentTime)} <span className="mx-1 text-gray-500">/</span> {formatTime(duration)}
                    </div>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-4 relative">
                     {/* Subtitle Button */}
                     <div className="relative">
                         <button 
                             onClick={() => { setShowSubtitleMenu(!showSubtitleMenu); setShowSpeedMenu(false); }} 
                             className={`hover:text-primary transition-colors p-2 rounded-lg hover:bg-white/10 ${showSubtitleMenu ? 'text-primary bg-white/10' : ''}`}
                             title="Subtitles / Captions"
                         >
                             <Captions size={24} />
                         </button>

                         {/* Subtitle Menu Popup */}
                         {showSubtitleMenu && (
                             <div className="absolute bottom-full right-0 mb-4 w-64 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-50">
                                 <div className="p-3 border-b border-white/5 flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-wider">
                                     <Globe size={14} /> Subtitle Tracks
                                 </div>
                                 <div className="max-h-60 overflow-y-auto py-1">
                                     <button
                                        onClick={() => handleSubtitleTrackChange(null)}
                                        className="w-full text-left px-4 py-3 hover:bg-white/10 flex items-center justify-between group transition-colors"
                                     >
                                         <span className={!currentSubtitleTrackId ? 'text-primary font-bold' : 'text-gray-300'}>Off</span>
                                         {!currentSubtitleTrackId && <Check size={16} className="text-primary" />}
                                     </button>
                                     
                                     {SUBTITLE_TRACKS.map(track => (
                                         <button
                                            key={track.id}
                                            onClick={() => handleSubtitleTrackChange(track.id)}
                                            className="w-full text-left px-4 py-3 hover:bg-white/10 flex items-center justify-between group transition-colors"
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
                             onClick={() => { setShowSpeedMenu(!showSpeedMenu); setShowSubtitleMenu(false); }} 
                             className={`hover:text-primary transition-colors p-2 rounded-lg hover:bg-white/10 ${showSpeedMenu ? 'text-primary bg-white/10' : ''}`}
                             title="Playback Speed"
                         >
                             <Settings size={24} />
                         </button>

                         {/* Speed Menu Popup */}
                         {showSpeedMenu && (
                             <div className="absolute bottom-full right-0 mb-4 w-48 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-50">
                                 <div className="p-3 border-b border-white/5 flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-wider">
                                     <Settings size={14} /> Playback Speed
                                 </div>
                                 <div className="py-1">
                                     {[0.5, 1, 1.25, 1.5, 2].map(rate => (
                                         <button
                                            key={rate}
                                            onClick={() => handleSpeedChange(rate)}
                                            className="w-full text-left px-4 py-3 hover:bg-white/10 flex items-center justify-between group transition-colors"
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

                     <button onClick={toggleFullscreen} className="hover:text-primary transition-colors p-2 rounded-lg hover:bg-white/10">
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
             <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 text-gray-400"><ChevronRight /></button>
         </div>
         <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
             {episodes.map((ep, idx) => (
                 <div key={ep.number} onClick={() => { setCurrentEpisodeIndex(idx); setIsPlaying(false); }} className={`flex gap-3 p-2 rounded-lg cursor-pointer transition-all group ${currentEpisodeIndex === idx ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-white/5 border-l-4 border-transparent'}`}>
                     <div className="relative w-32 aspect-video rounded overflow-hidden bg-black shrink-0">
                        <img src={ep.thumbnail} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={ep.title} />
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

      {!isSidebarOpen && <button onClick={() => setSidebarOpen(true)} className="absolute right-0 top-1/2 -translate-y-1/2 z-40 bg-surface p-2 rounded-l-xl border-y border-l border-white/10 text-primary hover:text-white transition-colors shadow-xl hidden md:block"><ChevronLeft /></button>}
      {!isSidebarOpen && <button onClick={() => setSidebarOpen(true)} className="absolute bottom-20 right-4 z-40 md:hidden bg-surface p-3 rounded-full shadow-lg border border-white/10"><List /></button>}
    </div>
  );
};

export default VideoModal;