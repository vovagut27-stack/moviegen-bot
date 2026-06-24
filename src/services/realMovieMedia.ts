import type { GeneratedMovie } from '../types/movie.js';
import { config } from '../utils/env.js';

type TmdbSearchResponse = {
  results?: TmdbMovieResult[];
};

type TmdbMovieResult = {
  id?: number;
  title?: string;
  original_title?: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_count?: number;
  popularity?: number;
};

export type RealMovieMedia = {
  url: string;
  source: 'tmdb-poster' | 'tmdb-backdrop';
};

export type RealMovieDetails = {
  media?: RealMovieMedia;
  trailerUrl?: string;
};

type TmdbVideosResponse = {
  results?: TmdbVideoResult[];
};

type TmdbVideoResult = {
  key?: string;
  name?: string;
  site?: string;
  type?: string;
  official?: boolean;
  published_at?: string;
};

function buildTmdbImageUrl(path: string, source: RealMovieMedia['source']): string {
  const size = source === 'tmdb-poster' ? 'w780' : 'w1280';
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

function scoreResult(result: TmdbMovieResult, movie: GeneratedMovie): number {
  const releaseYear = result.release_date ? Number(result.release_date.slice(0, 4)) : 0;
  const yearScore = releaseYear === movie.year ? 100 : Math.max(0, 30 - Math.abs(releaseYear - movie.year) * 10);
  const mediaScore = result.poster_path ? 40 : result.backdrop_path ? 20 : 0;
  const popularityScore = Math.min(result.popularity ?? 0, 50);
  const voteScore = Math.min((result.vote_count ?? 0) / 100, 30);

  return yearScore + mediaScore + popularityScore + voteScore;
}

async function searchTmdb(query: string, movie: GeneratedMovie): Promise<TmdbMovieResult[]> {
  const params = new URLSearchParams({
    query,
    year: String(movie.year),
    language: 'ru-RU',
    include_adult: 'false'
  });

  const response = await fetch(`https://api.themoviedb.org/3/search/movie?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${config.tmdbApiKey}`,
      accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`TMDb API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as TmdbSearchResponse;
  return data.results ?? [];
}

function pickMedia(result: TmdbMovieResult): RealMovieMedia | undefined {
  if (result.poster_path) {
    return {
      url: buildTmdbImageUrl(result.poster_path, 'tmdb-poster'),
      source: 'tmdb-poster'
    };
  }

  if (result.backdrop_path) {
    return {
      url: buildTmdbImageUrl(result.backdrop_path, 'tmdb-backdrop'),
      source: 'tmdb-backdrop'
    };
  }

  return undefined;
}

function scoreVideo(video: TmdbVideoResult): number {
  const type = video.type?.toLowerCase();
  const name = video.name?.toLowerCase() ?? '';
  const officialScore = video.official ? 50 : 0;
  const typeScore = type === 'trailer' ? 100 : type === 'teaser' ? 60 : 10;
  const nameScore = name.includes('official') || name.includes('trailer') || name.includes('трейлер') ? 30 : 0;

  return officialScore + typeScore + nameScore;
}

async function getMovieTrailerUrl(movieId: number): Promise<string | undefined> {
  const languages = ['ru-RU', 'en-US'];

  for (const language of languages) {
    const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/videos?language=${language}`, {
      headers: {
        Authorization: `Bearer ${config.tmdbApiKey}`,
        accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`TMDb videos API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as TmdbVideosResponse;
    const bestVideo = (data.results ?? [])
      .filter((video) => video.site?.toLowerCase() === 'youtube' && video.key)
      .sort((left, right) => scoreVideo(right) - scoreVideo(left))[0];

    if (bestVideo?.key) {
      return `https://www.youtube.com/watch?v=${bestVideo.key}`;
    }
  }

  return undefined;
}

export async function findRealMovieDetails(movie: GeneratedMovie): Promise<RealMovieDetails> {
  if (!config.tmdbApiKey) {
    return {};
  }

  const queries = [movie.title, `${movie.title} ${movie.year}`];
  const results = (await Promise.all(queries.map((query) => searchTmdb(query, movie)))).flat();
  const bestResult = results
    .filter((result) => result.id)
    .sort((left, right) => scoreResult(right, movie) - scoreResult(left, movie))[0];

  if (!bestResult) {
    return {};
  }

  const trailerUrl = bestResult.id ? await getMovieTrailerUrl(bestResult.id) : undefined;

  return {
    media: pickMedia(bestResult),
    trailerUrl
  };
}
