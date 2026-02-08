import { Anime, AnimeDetails } from "../types";

const ANILIST_API_URL = 'https://graphql.anilist.co';

// Helper to strip HTML tags from AniList descriptions
const cleanDescription = (desc: string | null): string => {
  if (!desc) return "No description available.";
  return desc.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '');
};

const fetchGraphQL = async (query: string, variables: any = {}) => {
  const response = await fetch(ANILIST_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error('Network response was not ok');
  }

  return response.json();
};

const mapAnimeData = (media: any): Anime => ({
  id: media.id.toString(),
  title: media.title.english || media.title.romaji,
  japaneseTitle: media.title.native,
  synopsis: cleanDescription(media.description),
  rating: media.averageScore ? media.averageScore / 10 : 0,
  genres: media.genres || [],
  year: media.startDate?.year?.toString() || 'N/A',
  imageUrl: media.coverImage.extraLarge || media.coverImage.large,
  episodes: media.episodes,
  status: media.status,
  studio: media.studios?.nodes?.[0]?.name,
  reason: media.recommendationReason, // Custom field we might inject if needed, otherwise undefined
  trailer: media.trailer ? {
      id: media.trailer.id,
      site: media.trailer.site,
      thumbnail: media.trailer.thumbnail
  } : undefined
});

export const getTrendingAnime = async (page: number = 1): Promise<Anime[]> => {
  const query = `
    query ($page: Int) {
      Page(page: $page, perPage: 20) {
        media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
          id
          title { romaji english native }
          coverImage { extraLarge large }
          averageScore
          description
          genres
          startDate { year }
          episodes
          status
          trailer { id site thumbnail }
        }
      }
    }
  `;

  try {
    const data = await fetchGraphQL(query, { page });
    return data.data.Page.media.map(mapAnimeData);
  } catch (error) {
    console.error("Error fetching trending anime:", error);
    return [];
  }
};

export const getDiscoveryAnime = async (page: number = 1, genre?: string, year?: string, season?: string): Promise<Anime[]> => {
  const query = `
    query ($page: Int, $genre: String, $year: Int, $season: MediaSeason) {
      Page(page: $page, perPage: 20) {
        media(sort: POPULARITY_DESC, type: ANIME, isAdult: false, genre: $genre, seasonYear: $year, season: $season) {
          id
          title { romaji english native }
          coverImage { extraLarge large }
          averageScore
          description
          genres
          startDate { year }
          episodes
          status
          trailer { id site thumbnail }
        }
      }
    }
  `;

  try {
    const variables: any = { page };
    if (genre && genre !== 'Any') variables.genre = genre;
    if (year && year !== 'Any') variables.year = parseInt(year);
    if (season && season !== 'Any') variables.season = season.toUpperCase();

    const data = await fetchGraphQL(query, variables);
    return data.data.Page.media.map(mapAnimeData);
  } catch (error) {
    console.error("Error fetching discovery anime:", error);
    return [];
  }
};

export const searchAnime = async (query: string, page: number = 1): Promise<Anime[]> => {
  const gqlQuery = `
    query ($search: String, $page: Int) {
      Page(page: $page, perPage: 20) {
        media(search: $search, type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
          id
          title { romaji english native }
          coverImage { extraLarge large }
          averageScore
          description
          genres
          startDate { year }
          episodes
          status
          trailer { id site thumbnail }
        }
      }
    }
  `;

  try {
    const data = await fetchGraphQL(gqlQuery, { search: query, page });
    return data.data.Page.media.map(mapAnimeData);
  } catch (error) {
    console.error("Error searching anime:", error);
    return [];
  }
};

// Helper to get a single anime match (best for hydration)
export const getAnimeOne = async (query: string): Promise<Anime | null> => {
    const results = await searchAnime(query, 1);
    return results.length > 0 ? results[0] : null;
};

export const getSearchSuggestions = async (query: string): Promise<string[]> => {
  const gqlQuery = `
    query ($search: String) {
      Page(page: 1, perPage: 5) {
        media(search: $search, type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
          title { romaji english }
        }
      }
    }
  `;

  try {
    const data = await fetchGraphQL(gqlQuery, { search: query });
    return data.data.Page.media.map((m: any) => m.title.english || m.title.romaji);
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }
};

export const getAnimeDetails = async (id: string): Promise<AnimeDetails | null> => {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        title { romaji english native }
        coverImage { extraLarge large }
        bannerImage
        averageScore
        description
        genres
        startDate { year }
        episodes
        status
        trailer { id site thumbnail }
        studios(isMain: true) { nodes { name } }
        characters(sort: ROLE, perPage: 6) {
          edges {
            role
            node {
              name { full }
              image { large }
              description
            }
            voiceActors(language: JAPANESE, sort: RELEVANCE) {
              name { full }
              image { large }
            }
          }
        }
        recommendations(sort: RATING_DESC, perPage: 5) {
          nodes {
            mediaRecommendation {
              title { romaji }
              type
            }
          }
        }
      }
    }
  `;

  try {
    const data = await fetchGraphQL(query, { id: parseInt(id) });
    const media = data.data.Media;
    
    if (!media) return null;

    const baseData = mapAnimeData(media);

    return {
      ...baseData,
      characters: media.characters.edges.map((edge: any) => ({
        name: edge.node.name.full,
        role: edge.role,
        image: edge.node.image.large,
        description: cleanDescription(edge.node.description).slice(0, 150) + (edge.node.description?.length > 150 ? '...' : ''),
        voiceActor: edge.voiceActors && edge.voiceActors.length > 0 ? {
            name: edge.voiceActors[0].name.full,
            image: edge.voiceActors[0].image.large,
            language: 'Japanese'
        } : undefined
      })),
      themes: [], // AniList doesn't strictly have "themes" in the basic query, leaving empty
      watchOrder: media.recommendations?.nodes?.map((n: any) => n.mediaRecommendation?.title?.romaji).filter(Boolean) || []
    };

  } catch (error) {
    console.error("Error fetching details:", error);
    return null;
  }
};