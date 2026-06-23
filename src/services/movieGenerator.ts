import OpenAI from 'openai';
import { z } from 'zod';
import { movieDatabase } from './database.js';
import type { GeneratedMovie } from '../types/movie.js';
import { config } from '../utils/env.js';

const movieSchema = z.object({
  title: z.string().min(3),
  genres: z.array(z.string().min(2)).min(1).max(3),
  year: z.coerce.number().int().min(2026).max(2199),
  rating: z.coerce.number().min(1).max(10),
  director: z.string().min(3),
  actors: z.array(z.string().min(3)).min(3).max(5),
  synopsis: z.string().min(120).max(700),
  posterPrompt: z.string().min(80).max(900)
});

const openai = new OpenAI({
  apiKey: config.openAiApiKey
});

function buildSystemPrompt(): string {
  return [
    'Ты выдающийся русский кинодраматург, шоураннер и арт-директор.',
    'Твоя задача — придумывать уникальные вымышленные фильмы для Telegram-бота MovieGen Bot.',
    'Фильмы должны звучать правдоподобно, атмосферно и разнообразно: sci-fi, horror, драма, комедия, триллер, фэнтези, неонуар, приключения, мистерия.',
    'Не используй реальные фильмы, реальных режиссёров и реальных актёров.',
    'Название, жанры, синопсис, режиссёр и актёры должны быть на русском.',
    'Синопсис: 2–4 предложения, с ясным конфликтом, визуальным образом и эмоциональным крючком.',
    'posterPrompt пиши на английском: cinematic high quality movie poster, no text, detailed visual composition.',
    'Отвечай только валидным JSON без markdown.'
  ].join(' ');
}

function buildUserPrompt(existingTitles: string[], duplicateReason?: string): string {
  return JSON.stringify({
    task: 'Generate one original fictional movie.',
    outputShape: {
      title: 'string, Russian movie title without quotes',
      genres: ['1-3 Russian genres'],
      year: 'future or fictional release year, number',
      rating: 'IMDb-like rating from 6.5 to 9.4, number',
      director: 'fictional Russian full name',
      actors: ['3-5 fictional actor names'],
      synopsis: '2-4 Russian sentences',
      posterPrompt: 'English prompt for image generation, no text on poster'
    },
    avoidTitles: existingTitles,
    duplicateReason,
    creativityNotes: [
      'Prefer bold but believable concepts.',
      'Avoid generic titles like Тайна, Последний путь, Ночной город.',
      'Mix genres in unexpected ways while keeping the movie pitch coherent.'
    ]
  });
}

async function requestMovie(existingTitles: string[], duplicateReason?: string): Promise<GeneratedMovie> {
  const completion = await openai.chat.completions.create({
    model: config.openAiTextModel,
    temperature: 1.05,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(existingTitles, duplicateReason) }
    ]
  });

  const content = completion.choices[0]?.message.content;

  if (!content) {
    throw new Error('OpenAI returned an empty movie generation response.');
  }

  const parsedJson = JSON.parse(content) as unknown;
  return movieSchema.parse(parsedJson);
}

export async function generateUniqueMovie(maxAttempts = 5): Promise<GeneratedMovie> {
  const existingMovies = await movieDatabase.getMovies();
  const recentTitles = existingMovies.slice(-60).map((movie) => movie.title);
  let duplicateReason: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const movie = await requestMovie(recentTitles, duplicateReason);
    const duplicateCheck = await movieDatabase.findDuplicate(movie);

    if (!duplicateCheck.isDuplicate) {
      return movie;
    }

    duplicateReason = duplicateCheck.reason ?? 'Generated movie is too similar to an existing movie.';
  }

  throw new Error(`Could not generate a unique movie after ${maxAttempts} attempts.`);
}
