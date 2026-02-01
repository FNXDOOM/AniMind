import React from 'react';

export type WatchStatus = 'Watching' | 'Completed' | 'Plan to Watch' | 'Dropped';

export interface User {
  id: string;
  username: string;
  avatar?: string;
  email?: string;
}

export interface Anime {
  id: string; // usually title as id for simplicity in this demo
  title: string;
  japaneseTitle?: string;
  synopsis: string;
  rating: number; // 1-10
  genres: string[];
  episodes?: number | string;
  studio?: string;
  status?: string; // Airing, Completed
  year?: string;
  imageUrl?: string; // Generated or placeholder
  reason?: string; // Why it was recommended
  userStatus?: WatchStatus;
}

export interface Character {
  name: string;
  role: string; // Main, Supporting
  description: string;
}

export interface AnimeDetails extends Anime {
  characters: Character[];
  themes: string[];
  watchOrder: string[];
}

export enum ViewState {
  HOME = 'HOME',
  SEARCH = 'SEARCH',
  DETAILS = 'DETAILS',
  WATCHLIST = 'WATCHLIST'
}

export interface NavItem {
  id: ViewState;
  label: string;
  icon: React.ReactNode;
}