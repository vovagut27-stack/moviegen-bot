export type GeneratedMovie = {
  title: string;
  genres: string[];
  year: number;
  rating: number;
  director: string;
  actors: string[];
  synopsis: string;
  posterPrompt: string;
};

export type StoredMovie = GeneratedMovie & {
  id: string;
  posterUrl: string;
  createdAt: string;
};

export type DuplicateCheckResult = {
  isDuplicate: boolean;
  reason?: string;
};
