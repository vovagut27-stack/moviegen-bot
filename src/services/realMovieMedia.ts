import type { GeneratedMovie } from '../types/movie.js';
import { config } from '../utils/env.js';

type TmdbSearchResponse = {
  results?: TmdbMovieResult[];
};

type TmdbMovieResult = {
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

export async function findRealMovieMedia(movie: GeneratedMovie): Promise<RealMovieMedia | undefined> {
  if (!config.tmdbApiKey) {
    return undefined;
  }

  const queries = [movie.title, `${movie.title} ${movie.year}`];
  const results = (await Promise.all(queries.map((query) => searchTmdb(query, movie)))).flat();
  const bestResult = results
    .filter((result) => result.poster_path || result.backdrop_path)
    .sort((left, right) => scoreResult(right, movie) - scoreResult(left, movie))[0];

  if (!bestResult) {
    return undefined;
  }

  if (bestResult.poster_path) {
    return {
      url: buildTmdbImageUrl(bestResult.poster_path, 'tmdb-poster'),
      source: 'tmdb-poster'
    };
  }

  if (bestResult.backdrop_path) {
    return {
      url: buildTmdbImageUrl(bestResult.backdrop_path, 'tmdb-backdrop'),
      source: 'tmdb-backdrop'
    };
  }

  return undefined;
}
