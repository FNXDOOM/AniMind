import { Anime } from "../types";

// Service completely disabled
export const getSmartRecommendations = async (query: string, exclude: string[] = []): Promise<Anime[]> => {
  return [];
};

export const getSearchSuggestions = async (query: string): Promise<string[]> => {
  return [];
};

export const getAnimeDetails = async (title: string): Promise<any | null> => {
  return null;
};

export const getTrendingAnime = async (exclude: string[] = []): Promise<Anime[]> => {
     return [];
}