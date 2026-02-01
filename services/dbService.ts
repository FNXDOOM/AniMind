import { supabase } from './supabase';
import { Anime, WatchStatus } from '../types';

const DEV_USER_ID = 'dev-user-id';
const LOCAL_WATCHLIST_KEY = 'animind_dev_watchlist';
const LOCAL_PROGRESS_KEY = 'animind_dev_progress';

// Helper to handle local storage mock DB
const getLocalWatchlist = (): any[] => {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_WATCHLIST_KEY) || '[]');
    } catch { return []; }
};

const setLocalWatchlist = (data: any[]) => {
    localStorage.setItem(LOCAL_WATCHLIST_KEY, JSON.stringify(data));
};

// --- Watchlist Operations ---

export const fetchWatchlist = async (userId: string): Promise<Anime[]> => {
  // Mock for Dev User
  if (userId === DEV_USER_ID) {
      const localData = getLocalWatchlist();
      return localData.map((item: any) => ({
          ...item.anime_data,
          userStatus: item.status
      }));
  }

  try {
    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching watchlist:', error);
      return [];
    }

    if (!data) return [];

    return data.map((item: any) => ({
      ...item.anime_data,
      userStatus: item.status
    }));
  } catch (error) {
    console.error("Fetch watchlist exception:", error);
    return [];
  }
};

export const addToWatchlist = async (userId: string, anime: Anime, status: WatchStatus = 'Plan to Watch') => {
  // Mock for Dev User
  if (userId === DEV_USER_ID) {
      const list = getLocalWatchlist();
      const animeDataToStore = { ...anime };
      delete animeDataToStore.userStatus;
      
      const existingIndex = list.findIndex(i => i.anime_id === anime.id);
      if (existingIndex >= 0) {
          list[existingIndex] = { ...list[existingIndex], status, anime_data: animeDataToStore };
      } else {
          list.push({ user_id: userId, anime_id: anime.id, anime_data: animeDataToStore, status });
      }
      setLocalWatchlist(list);
      return;
  }

  try {
    const animeDataToStore = { ...anime };
    delete animeDataToStore.userStatus; 

    const { error } = await supabase
      .from('watchlist')
      .upsert({ 
          user_id: userId, 
          anime_id: anime.id, 
          anime_data: animeDataToStore,
          status: status 
      }, { onConflict: 'user_id, anime_id' });

    if (error) console.error('Error adding to watchlist:', error);
  } catch (error) {
    console.error("Add to watchlist exception:", error);
  }
};

export const removeFromWatchlist = async (userId: string, animeId: string) => {
  // Mock for Dev User
  if (userId === DEV_USER_ID) {
      const list = getLocalWatchlist();
      const filtered = list.filter(i => i.anime_id !== animeId);
      setLocalWatchlist(filtered);
      return;
  }

  try {
    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('user_id', userId)
      .eq('anime_id', animeId);

    if (error) console.error('Error removing from watchlist:', error);
  } catch (error) {
    console.error("Remove from watchlist exception:", error);
  }
};

export const updateWatchlistStatus = async (userId: string, animeId: string, status: WatchStatus) => {
    // Mock for Dev User
    if (userId === DEV_USER_ID) {
        const list = getLocalWatchlist();
        const item = list.find(i => i.anime_id === animeId);
        if (item) {
            item.status = status;
            setLocalWatchlist(list);
        }
        return;
    }

    try {
      const { error } = await supabase
        .from('watchlist')
        .update({ status })
        .eq('user_id', userId)
        .eq('anime_id', animeId);

      if (error) console.error('Error updating status:', error);
    } catch (error) {
      console.error("Update status exception:", error);
    }
};

// --- Progress Operations ---

export const saveProgress = async (userId: string, animeId: string, episodeIndex: number, timestamp: number) => {
    // Mock for Dev User
    if (userId === DEV_USER_ID) {
        const progressKey = `${LOCAL_PROGRESS_KEY}_${animeId}_${episodeIndex}`;
        localStorage.setItem(progressKey, timestamp.toString());
        return;
    }

    try {
      const { error } = await supabase
          .from('progress')
          .upsert({
              user_id: userId,
              anime_id: animeId,
              episode_index: episodeIndex,
              timestamp: timestamp,
              updated_at: new Date().toISOString()
          }, { onConflict: 'user_id, anime_id, episode_index' });
      
      if (error) console.error('Error saving progress:', error);
    } catch (error) {
      console.error("Save progress exception:", error);
    }
};

export const getProgress = async (userId: string, animeId: string, episodeIndex: number): Promise<number> => {
    // Mock for Dev User
    if (userId === DEV_USER_ID) {
        const progressKey = `${LOCAL_PROGRESS_KEY}_${animeId}_${episodeIndex}`;
        const stored = localStorage.getItem(progressKey);
        return stored ? parseFloat(stored) : 0;
    }

    try {
      const { data, error } = await supabase
          .from('progress')
          .select('timestamp')
          .eq('user_id', userId)
          .eq('anime_id', animeId)
          .eq('episode_index', episodeIndex)
          .single();
      
      if (error || !data) return 0;
      return data.timestamp;
    } catch (error) {
      return 0;
    }
};