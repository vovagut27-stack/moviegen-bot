import OpenAI from 'openai';
import type { GeneratedMovie } from '../types/movie.js';
import { config } from '../utils/env.js';

function buildImagePrompt(movie: GeneratedMovie): string {
  return [
    movie.posterPrompt,
    '',
    `Movie title concept: ${movie.title}.`,
    `Genres: ${movie.genres.join(', ')}.`,
    `Synopsis inspiration: ${movie.synopsis}`,
    '',
    'Create a premium vertical cinematic movie poster.',
    'High quality, atmospheric lighting, rich color grading, dramatic composition, professional film marketing artwork.',
    'No readable text, no logos, no watermarks, no real actor likenesses.'
  ].join('\n');
}

export async function generatePosterUrl(movie: GeneratedMovie): Promise<string> {
  if (!config.openAiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured; poster generation is disabled.');
  }

  const openai = new OpenAI({
    apiKey: config.openAiApiKey
  });

  const response = await openai.images.generate({
    model: config.openAiImageModel,
    prompt: buildImagePrompt(movie),
    size: config.openAiImageSize as '1024x1792',
    quality: 'hd',
    n: 1
  });

  const posterUrl = response.data?.[0]?.url;

  if (!posterUrl) {
    throw new Error('OpenAI returned an empty poster URL.');
  }

  return posterUrl;
}
