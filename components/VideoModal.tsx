import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, SkipForward, SkipBack, Play, Pause, ChevronRight, ChevronLeft, List, Volume2, VolumeX, Maximize, Minimize, Settings, Captions, Check } from 'lucide-react';
import { Anime } from '../types';

interface VideoModalProps {
  anime: Anime;
  onClose: () => void;
}

interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

interface SubtitleTrack {
  id: string;
  label: string;
  content: string;
}

const SUBTITLE_TRACKS: SubtitleTrack[] = [
  {
    id: 'en',
    label: 'English',
    content: `WEBVTT

00:00:01.000 --> 00:00:04.000
[Wind blowing softly through the trees]

00:00:04.500 --> 00:00:08.500
In a world where algorithms rule...

00:00:09.000 --> 00:00:13.000
One developer stands against the bugs.

00:00:14.000 --> 00:00:17.000
(Hero): "I will refactor this legacy code!"

00:00:18.000 --> 00:00:22.000
(Villain): "You cannot defeat the Spaghetti Monster."

00:00:23.000 --> 00:00:26.000
[Intense keyboard typing sounds]

00:00:27.000 --> 00:00:30.000
This is a demo of the custom subtitle engine.
`
  },
  {
    id: 'es',
    label: 'Español',
    content: `WEBVTT

00:00:01.000 --> 00:00:04.000
[Viento soplando suavemente]

00:00:04.500 --> 00:00:08.500
En un mundo donde los algoritmos gobiernan...

00:00:09.000 --> 00:00:13.000
Un desarrollador lucha contra los errores.

00:00:14.000 --> 00:00:17.000
(Héroe): "¡Refactorizaré este código heredado!"

00:00:18.000 --> 00:00:22.000
(Villano): "No puedes derrotar al Monstruo de Espagueti."
`
  },
  {
    id: 'jp',
    label: '日本語',
    content: `WEBVTT

00:00:01.000 --> 00:00:04.000
[風が木々を通り抜ける音]

00:00:04.500 --> 00:00:08.500
アルゴリズムが支配する世界で...

00:00:09.000 --> 00:00:13.000
一人の開発者がバグに立ち向かう。

00:00:14.000 --> 00:00:17.000
(ヒーロー): 「このレガシーコードをリファクタリングしてやる！」

00:00:18.000 --> 00:00:22.000
(悪役): 「スパゲッティモンスターには勝てないぞ。」
`
  }
];

const parseTime = (timeStr: string): number => {
  // Expected format: HH:MM:SS.mmm or MM:SS.mmm
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
    // Look for timing line "00:00:00.000 --> 00:00:00.000"
    if (line.includes('-->')) {
      const [startStr, endStr] = line.split('-->').map(s => s.trim());
      const start = parseTime(startStr);
      const end = parseTime(endStr);
      
      let text = '';
      i++;
      // Capture text until empty line
      while (i < lines.length && lines[i].trim() !== '') {
        text += (text ? '\n' : '') + lines[i];
        i++;
      }
      
      if (text) {
        cues.push({ start, end, text: text.trim() });
      }
    } else {
      i++;
    }
  }
  return cues;
};

const VideoModal: React.FC<VideoModalProps> = ({ anime, onClose }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  
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
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // New State for Features
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  
  // Subtitle State
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [currentSubtitleTrackId, setCurrentSubtitleTrackId] = useState<string | null>(null);
  const [activeSubtitle, setActiveSubtitle] = useState<string>('');

  // Memoize cues based on selected track
  const subtitleCues = useMemo(() => {
    if (!currentSubtitleTrackId) return [];
    const track = SUBTITLE_TRACKS.find(t => t.id === currentSubtitleTrackId);
    return track ? parseVTT(track.content) : [];
  }, [currentSubtitleTrackId]);

  // Mock episodes for the sidebar
  const episodes = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    number: i + 1,
    title: `Episode ${i + 1}`,
    thumbnail: `https://picsum.photos/seed/${anime.title + i}/300/170`,
    duration: '24:00'
  })), [anime.title]);

  // Demo Video Source
  const videoSrc = "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  // --- PERSISTENCE LOGIC ---

  // 1. Initialize Global Preferences (Volume & Subtitles) from LocalStorage
  useEffect(() => {
    const savedVol = localStorage.getItem('animind_volume');
    if (savedVol !== null) {
        const volValue = parseFloat(savedVol);
        setVolume(volValue);
        setIsMuted(volValue === 0);
        if (videoRef.current) {
            videoRef.current.volume = volValue;
            videoRef.current.muted = (volValue === 0);
        }
    }

    const savedSubTrack = localStorage.getItem('animind_subtitle_track');
    if (savedSubTrack) {
        // Verify it exists in our list (simple validation)
        if (SUBTITLE_TRACKS.some(t => t.id === savedSubTrack)) {
            setCurrentSubtitleTrackId(savedSubTrack);
        }
    }
  }, []);

  // 2. Restore Playback Progress for Current Episode
  useEffect(() => {
      const key = `animind_progress_${anime.id}_${currentEpisodeIndex}`;
      const savedTime = localStorage.getItem(key);
      
      if (videoRef.current) {
          if (savedTime) {
              const time = parseFloat(savedTime);
              videoRef.current.currentTime = time;
              setCurrentTime(time);
          } else {
              videoRef.current.currentTime = 0;
              setCurrentTime(0);
          }
          // Attempt auto-play when switching episodes or opening
          videoRef.current.play()
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
      }
  }, [anime.id, currentEpisodeIndex]);

  // 3. Save Playback Progress (Interval + Cleanup)
  useEffect(() => {
    const saveProgress = () => {
        if (videoRef.current && !videoRef.current.paused) {
            const key = `animind_progress_${anime.id}_${currentEpisodeIndex}`;
            localStorage.setItem(key, videoRef.current.currentTime.toString());
        }
    };

    const interval = setInterval(saveProgress, 3000); // Save every 3 seconds
    
    return () => {
        clearInterval(interval);
        // Force save on unmount or episode change
        if (videoRef.current) {
             const key = `animind_progress_${anime.id}_${currentEpisodeIndex}`;
             localStorage.setItem(key, videoRef.current.currentTime.toString());
        }
    };
  }, [anime.id, currentEpisodeIndex]);


  // --- VIDEO EVENT LISTENERS ---

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      const currTime = video.currentTime;
      setCurrentTime(currTime);
      setProgress((currTime / video.duration) * 100);

      // Subtitle Logic
      if (currentSubtitleTrackId && subtitleCues.length > 0) {
          const currentCue = subtitleCues.find(cue => currTime >= cue.start && currTime <= cue.end);
          setActiveSubtitle(currentCue ? currentCue.text : '');
      } else {
          setActiveSubtitle('');
      }
    };

    const updateDuration = () => setDuration(video.duration);
    
    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      video.removeEventListener('timeupdate', updateProgress);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, [currentSubtitleTrackId, subtitleCues]);

  // --- HANDLERS ---

  const handleSpeedChange = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
      setShowSettingsMenu(false);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSettingsMenu && !showSubtitleMenu) setShowControls(false);
    }, 3000);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
      setShowSettingsMenu(false);
      setShowSubtitleMenu(false);
    }
  };

  const handleNextEpisode = () => {
    if (currentEpisodeIndex < episodes.length - 1) {
      handleEpisodeClick(currentEpisodeIndex + 1);
    }
  };

  const handlePrevEpisode = () => {
    if (currentEpisodeIndex > 0) {
      handleEpisodeClick(currentEpisodeIndex - 1);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = (parseFloat(e.target.value) / 100) * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setProgress(parseFloat(e.target.value));
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
    // Persist volume preference
    localStorage.setItem('animind_volume', val.toString());
  };

  const handleSubtitleTrackChange = (trackId: string | null) => {
      setCurrentSubtitleTrackId(trackId);
      setShowSubtitleMenu(false);
      setActiveSubtitle('');
      
      if (trackId) {
          localStorage.setItem('animind_subtitle_track', trackId);
      } else {
          localStorage.removeItem('animind_subtitle_track');
      }
  };

  const handleEpisodeClick = (index: number) => {
      // Switching episode updates the state, which triggers Effect #2 to load that episode's progress
      setCurrentEpisodeIndex(index);
      setIsPlaying(false);
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
  
  const handleSkipIntro = () => {
      if (videoRef.current) {
          videoRef.current.currentTime += 85; // Skip approx 1:25
      }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const speeds = [0.5, 1, 1.25, 1.5, 2];

  return (
    <div className="fixed inset-0 z-[100] bg-[#000000] text-white flex animate-in fade-in duration-300 font-sans overflow-hidden">
      
      {/* Main Player Area */}
      <div 
        ref={containerRef}
        className="flex-1 flex flex-col relative h-full bg-black group select-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          if (isPlaying && !showSettingsMenu && !showSubtitleMenu) setShowControls(false);
        }}
        onClick={() => {
            setShowSettingsMenu(false);
            setShowSubtitleMenu(false);
        }}
      >
        
        {/* Top Overlay Header (Always visible on hover) */}
        <div className={`absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/90 via-black/40 to-transparent z-20 flex items-start p-6 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-4 w-full">
             <button onClick={onClose} className="text-gray-300 hover:text-white transition-colors hover:bg-white/10 p-2 rounded-full">
                <X size={24} />
             </button>
             <div>
                <h1 className="text-xl font-bold text-white leading-tight drop-shadow-md">{anime.title}</h1>
                <p className="text-sm text-gray-300 font-medium drop-shadow-md">
                    Episode {currentEpisodeIndex + 1} <span className="mx-2">•</span> {currentSubtitleTrackId ? SUBTITLE_TRACKS.find(t => t.id === currentSubtitleTrackId)?.label : 'No'} Sub
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
            
            {/* Custom Subtitle Overlay */}
            {currentSubtitleTrackId && activeSubtitle && (
              <div className={`absolute left-0 right-0 text-center pointer-events-none transition-all duration-300 px-4 z-20 ${showControls ? 'bottom-24' : 'bottom-12'}`}>
                <span 
                  className="inline-block text-white text-lg md:text-xl font-medium leading-relaxed whitespace-pre-line [text-shadow:0_2px_4px_rgba(0,0,0,0.8)]"
                >
                  {activeSubtitle}
                </span>
              </div>
            )}

            {/* Play/Pause Center Animation */}
            {!isPlaying && showControls && !showSettingsMenu && !showSubtitleMenu && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                    <div className="bg-black/50 p-6 rounded-full backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                        <Play size={48} className="fill-white" />
                    </div>
                </div>
            )}

            {/* Skip Intro Button */}
            <div className={`absolute bottom-24 right-6 z-20 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                 <button 
                    onClick={(e) => { e.stopPropagation(); handleSkipIntro(); }}
                    className="bg-black/60 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white px-5 py-2 rounded-lg hover:scale-105 transition-all flex items-center gap-2 font-bold text-sm tracking-wide uppercase group-hover:border-primary/50"
                 >
                    Skip Intro <SkipForward size={16} className="fill-white" />
                 </button>
            </div>
        </div>

        {/* Bottom Controls Bar */}
        <div 
            className={`absolute bottom-0 left-0 right-0 px-4 pb-4 pt-12 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-30 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
            onClick={(e) => e.stopPropagation()}
        >
            
            {/* Progress Bar */}
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
               />
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    
                    {/* Previous Episode */}
                    <button 
                        onClick={handlePrevEpisode}
                        disabled={currentEpisodeIndex === 0}
                        className={`hover:text-primary transition-colors ${currentEpisodeIndex === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-white'}`}
                        title="Previous Episode"
                    >
                        <SkipBack size={20} className="fill-current" />
                    </button>

                    {/* Play/Pause */}
                    <button onClick={togglePlay} className="hover:text-primary transition-colors">
                        {isPlaying ? <Pause size={32} className="fill-current" /> : <Play size={32} className="fill-current" />}
                    </button>
                    
                    {/* Next Episode */}
                    <button 
                        onClick={handleNextEpisode}
                        disabled={currentEpisodeIndex === episodes.length - 1}
                        className={`hover:text-primary transition-colors ${currentEpisodeIndex === episodes.length - 1 ? 'text-gray-600 cursor-not-allowed' : 'text-white'}`}
                        title="Next Episode"
                    >
                        <SkipForward size={20} className="fill-current" />
                    </button>

                    {/* Volume Control */}
                    <div className="flex items-center gap-2 group/vol ml-2">
                        <button 
                            onClick={toggleMute} 
                            className="hover:text-primary transition-colors focus:outline-none focus:text-primary p-1 rounded-full hover:bg-white/10"
                            aria-label={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
                        </button>
                        <div className="w-0 overflow-hidden group-hover/vol:w-28 group-focus-within/vol:w-28 transition-all duration-300 ease-out flex items-center">
                           <input 
                             type="range" 
                             min="0" 
                             max="1" 
                             step="0.01" 
                             value={isMuted ? 0 : volume}
                             onChange={handleVolumeChange}
                             className="w-24 h-1.5 bg-white/20 rounded-lg accent-primary cursor-pointer hover:accent-primary/80 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                             aria-label="Volume"
                           />
                        </div>
                    </div>

                    <div className="text-sm font-medium text-gray-300">
                        {formatTime(currentTime)} <span className="mx-1 text-gray-500">/</span> {formatTime(duration)}
                    </div>
                </div>

                <div className="flex items-center gap-4 relative">
                     {/* Subtitles Button */}
                     <div className="relative">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowSubtitleMenu(!showSubtitleMenu);
                                setShowSettingsMenu(false);
                            }}
                            className={`transition-colors relative p-2 rounded-lg hover:bg-white/10 ${showSubtitleMenu || currentSubtitleTrackId ? 'text-primary' : 'text-white'}`}
                            title="Subtitles/CC"
                        >
                            <Captions size={24} />
                            {currentSubtitleTrackId && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-black" />}
                        </button>

                         {/* Subtitles Menu */}
                        {showSubtitleMenu && (
                            <div className="absolute bottom-14 right-0 w-48 bg-[#1a1a1a] rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in slide-in-from-bottom-2 backdrop-blur-lg">
                                <div className="p-3 border-b border-white/10 text-xs font-bold text-gray-400 uppercase tracking-wider bg-white/5">
                                    Subtitles
                                </div>
                                <div className="flex flex-col py-1">
                                    <button
                                        onClick={() => handleSubtitleTrackChange(null)}
                                        className={`flex items-center justify-between px-4 py-2 text-sm hover:bg-white/10 transition-colors ${currentSubtitleTrackId === null ? 'text-primary font-bold' : 'text-gray-200'}`}
                                    >
                                        <span>Off</span>
                                        {currentSubtitleTrackId === null && <Check size={16} />}
                                    </button>
                                    {SUBTITLE_TRACKS.map(track => (
                                        <button
                                            key={track.id}
                                            onClick={() => handleSubtitleTrackChange(track.id)}
                                            className={`flex items-center justify-between px-4 py-2 text-sm hover:bg-white/10 transition-colors ${currentSubtitleTrackId === track.id ? 'text-primary font-bold' : 'text-gray-200'}`}
                                        >
                                            <span>{track.label}</span>
                                            {currentSubtitleTrackId === track.id && <Check size={16} />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                     </div>

                     {/* Settings Menu */}
                     <div className="relative">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowSettingsMenu(!showSettingsMenu);
                                setShowSubtitleMenu(false);
                            }}
                            className={`hover:text-primary transition-colors p-2 rounded-lg hover:bg-white/10 ${showSettingsMenu ? 'text-primary' : 'text-white'}`}
                        >
                            <Settings size={24} />
                        </button>

                        {/* Settings Popup */}
                        {showSettingsMenu && (
                            <div className="absolute bottom-14 right-0 w-56 bg-[#1a1a1a] rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in slide-in-from-bottom-2 backdrop-blur-lg">
                                <div className="p-3 border-b border-white/10 text-xs font-bold text-gray-400 uppercase tracking-wider bg-white/5">
                                    Playback Settings
                                </div>
                                <div className="flex flex-col py-1">
                                    <div className="px-4 py-2 text-xs font-semibold text-gray-500">Speed</div>
                                    {speeds.map(speed => (
                                        <button
                                            key={speed}
                                            onClick={() => handleSpeedChange(speed)}
                                            className={`flex items-center justify-between px-4 py-2 text-sm hover:bg-white/10 transition-colors ${playbackSpeed === speed ? 'text-primary font-bold' : 'text-gray-200'}`}
                                        >
                                            <span>{speed === 1 ? 'Normal' : `${speed}x`}</span>
                                            {playbackSpeed === speed && <Check size={16} />}
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

      {/* Sidebar (Collapsible) */}
      <div className={`
        fixed inset-y-0 right-0 z-30 w-80 bg-[#141519] border-l border-white/10 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
        md:relative md:block md:translate-x-0
        ${!isSidebarOpen && 'md:!hidden'} 
        flex flex-col shadow-2xl
      `}>
         {/* Sidebar Header */}
         <div className="p-4 border-b border-white/5 bg-[#191b21] flex items-center justify-between">
             <h3 className="font-bold text-gray-100 uppercase tracking-wider text-sm">Up Next</h3>
             <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 text-gray-400">
                 <ChevronRight />
             </button>
         </div>
         
         {/* Episode List */}
         <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
             {episodes.map((ep, idx) => (
                 <div 
                    key={ep.number} 
                    onClick={() => handleEpisodeClick(idx)}
                    className={`flex gap-3 p-2 rounded-lg cursor-pointer transition-all group ${currentEpisodeIndex === idx ? 'bg-[#23252b] border-l-4 border-primary' : 'hover:bg-white/5 border-l-4 border-transparent'}`}
                 >
                     <div className="relative w-32 aspect-video rounded overflow-hidden bg-black shrink-0">
                        <img src={ep.thumbnail} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={ep.title} />
                        <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold">{ep.duration}</div>
                        {currentEpisodeIndex === idx && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                <Play size={16} className="text-primary fill-primary" />
                            </div>
                        )}
                     </div>
                     <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                         <div className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Episode {ep.number}</div>
                         <div className="text-sm font-medium text-gray-200 line-clamp-2 leading-tight group-hover:text-primary transition-colors">{ep.title}</div>
                     </div>
                 </div>
             ))}
         </div>
      </div>

      {/* Sidebar Toggle Button (when closed or on mobile) */}
      {!isSidebarOpen && (
        <button 
            onClick={() => setSidebarOpen(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-40 bg-[#141519] p-2 rounded-l-xl border-y border-l border-white/10 text-primary hover:text-white transition-colors shadow-xl hidden md:block"
        >
            <ChevronLeft />
        </button>
      )}

      {/* Mobile Toggle Button */}
      {!isSidebarOpen && (
          <button 
             onClick={() => setSidebarOpen(true)}
             className="absolute bottom-20 right-4 z-40 md:hidden bg-surface p-3 rounded-full shadow-lg border border-white/10"
          >
             <List />
          </button>
      )}

    </div>
  );
};

export default VideoModal;