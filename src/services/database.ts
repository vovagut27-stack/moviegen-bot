import { dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { JSONFilePreset } from 'lowdb/node';
import type { DuplicateCheckResult, GeneratedMovie, StoredMovie } from '../types/movie.js';
import { config } from '../utils/env.js';

type DatabaseSchema = {
  movies: StoredMovie[];
};

const defaultData: DatabaseSchema = {
  movies: []
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTrigrams(value: string): Set<string> {
  const normalized = `  ${normalizeText(value)}  `;
  const trigrams = new Set<string>();

  for (let index = 0; index <= normalized.length - 3; index += 1) {
    trigrams.add(normalized.slice(index, index + 3));
  }

  return trigrams;
}

function trigramSimilarity(left: string, right: string): number {
  const leftTrigrams = getTrigrams(left);
  const rightTrigrams = getTrigrams(right);

  if (leftTrigrams.size === 0 || rightTrigrams.size === 0) {
    return 0;
  }

  let intersection = 0;

  for (const trigram of leftTrigrams) {
    if (rightTrigrams.has(trigram)) {
      intersection += 1;
    }
  }

  return (2 * intersection) / (leftTrigrams.size + rightTrigrams.size);
}

export class MovieDatabase {
  private dbPromise = this.createDatabase();

  private async createDatabase() {
    await mkdir(dirname(config.databasePath), { recursive: true });
    return JSONFilePreset<DatabaseSchema>(config.databasePath, defaultData);
  }

  async getMovies(): Promise<StoredMovie[]> {
    const db = await this.dbPromise;
    await db.read();
    return db.data.movies;
  }

  async findDuplicate(movie: GeneratedMovie): Promise<DuplicateCheckResult> {
    const movies = await this.getMovies();
    const normalizedTitle = normalizeText(movie.title);

    for (const existingMovie of movies) {
      const existingTitle = normalizeText(existingMovie.title);
      const titleSimilarity = trigramSimilarity(movie.title, existingMovie.title);
      const synopsisSimilarity = trigramSimilarity(movie.synopsis, existingMovie.synopsis);

      if (existingTitle === normalizedTitle) {
        return { isDuplicate: true, reason: `title already exists: ${existingMovie.title}` };
      }

      if (titleSimilarity >= 0.82) {
        return { isDuplicate: true, reason: `title is too similar to: ${existingMovie.title}` };
      }

      if (titleSimilarity >= 0.62 && synopsisSimilarity >= 0.52) {
        return { isDuplicate: true, reason: `movie concept is too similar to: ${existingMovie.title}` };
      }
    }

    return { isDuplicate: false };
  }

  async saveMovie(movie: GeneratedMovie, posterUrl: string): Promise<StoredMovie> {
    const db = await this.dbPromise;
    const storedMovie: StoredMovie = {
      ...movie,
      id: crypto.randomUUID(),
      posterUrl,
      createdAt: new Date().toISOString()
    };

    db.data.movies.push(storedMovie);
    await db.write();

    return storedMovie;
  }
}

export const movieDatabase = new MovieDatabase();
