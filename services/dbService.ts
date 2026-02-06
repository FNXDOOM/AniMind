import { supabase } from './supabase';
import { Anime, WatchStatus } from '../types';

// --- Admin Operations ---

export const getAllUsers = async (): Promise<any[]> => {
  try {
    // SECURITY: This query depends on RLS policies allowing the current user to see other profiles
    // Ensure Supabase RLS policy restricts this to admin users only
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, is_admin, updated_at')
      .order('created_at', { ascending: false })
      .limit(50); // Limit to 50 for performance

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Get all users exception:", error);
    return [];
  }
};

// --- Watchlist Operations ---

export const fetchWatchlist = async (userId: string): Promise<Anime[]> => {
  try {
    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

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
  try {
    // Remove userStatus before storing to avoid data duplication
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

    if (error) {
      console.error('Error adding to watchlist:', error);
      throw error;
    }
  } catch (error) {
    console.error("Add to watchlist exception:", error);
    throw error;
  }
};

export const removeFromWatchlist = async (userId: string, animeId: string) => {
  try {
    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('user_id', userId)
      .eq('anime_id', animeId);

    if (error) {
      console.error('Error removing from watchlist:', error);
      throw error;
    }
  } catch (error) {
    console.error("Remove from watchlist exception:", error);
    throw error;
  }
};

export const updateWatchlistStatus = async (userId: string, animeId: string, status: WatchStatus) => {
  try {
    const { error } = await supabase
      .from('watchlist')
      .update({ status })
      .eq('user_id', userId)
      .eq('anime_id', animeId);

    if (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  } catch (error) {
    console.error("Update status exception:", error);
    throw error;
  }
};

// --- Progress Operations ---

export const saveProgress = async (userId: string, animeId: string, episodeIndex: number, timestamp: number) => {
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
    
    if (error) {
      console.error('Error saving progress:', error);
      throw error;
    }
  } catch (error) {
    console.error("Save progress exception:", error);
    throw error;
  }
};

export const getProgress = async (userId: string, animeId: string, episodeIndex: number): Promise<number> => {
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
