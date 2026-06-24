import OpenAI from 'openai';
import { z } from 'zod';
import { movieDatabase } from './database.js';
import type { GeneratedMovie } from '../types/movie.js';
import { config } from '../utils/env.js';

const movieSchema = z.object({
  title: z.string().min(3),
  genres: z.array(z.string().min(2)).min(1).max(3),
  year: z.coerce.number().int().min(1888).max(new Date().getFullYear()),
  rating: z.coerce.number().min(1).max(10),
  director: z.string().min(3),
  actors: z.array(z.string().min(3)).min(3).max(5),
  synopsis: z.string().min(120).max(700),
  posterPrompt: z.string().min(80).max(900)
});

function buildSystemPrompt(): string {
  return [
    'Ты кинокритик, куратор онлайн-кинотеатра и эксперт по истории кино.',
    'Твоя задача — подбирать только реальные фильмы, которые действительно существуют и были выпущены в прокат или на стримингах.',
    'Никогда не выдумывай название, год, режиссёра или актёров. Если не уверен в фактах, выбери другой известный реальный фильм.',
    'Подбирай разные фильмы по эпохам, странам и жанрам: sci-fi, horror, драма, комедия, триллер, фэнтези, неонуар, приключения, мистерия, артхаус, анимация.',
    'Название фильма дай на русском, если есть общепринятый русский прокатный перевод; иначе используй оригинальное название.',
    'Жанры, синопсис, режиссёра и актёров пиши на русском.',
    'Синопсис: 2–4 предложения, без спойлеров финала, с ясным конфликтом и причиной посмотреть фильм.',
    'rating — приблизительный IMDb-рейтинг реального фильма от 1 до 10.',
    'posterPrompt пиши на английском: cinematic high quality alternative movie poster inspired by the real film, no text, no logos, no actor likeness cloning.',
    'Отвечай только валидным JSON без markdown.'
  ].join(' ');
}

function buildUserPrompt(existingTitles: string[], duplicateReason?: string): string {
  return JSON.stringify({
    task: 'Pick one real existing movie and return verified-looking public facts about it.',
    outputShape: {
      title: 'string, Russian release title or original title without quotes',
      genres: ['1-3 Russian genres'],
      year: 'real release year, number',
      rating: 'approximate IMDb rating, number',
      director: 'real director name in Russian transliteration or common Russian form',
      actors: ['3-5 real lead actor names in Russian transliteration or common Russian form'],
      synopsis: '2-4 Russian sentences without ending spoilers',
      posterPrompt: 'English prompt for alternative poster generation, no text on poster'
    },
    avoidTitles: existingTitles,
    duplicateReason,
    selectionNotes: [
      'Do not pick any title from avoidTitles.',
      'Prefer well-known real movies, cult classics, festival hits, and high-quality genre films.',
      'Keep the facts internally consistent with the selected real movie.'
    ]
  });
}

function parseMovieJson(content: string): GeneratedMovie {
  const jsonContent = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const parsedJson = JSON.parse(jsonContent) as unknown;
  return movieSchema.parse(parsedJson);
}

async function requestMovieFromOpenAi(existingTitles: string[], duplicateReason?: string): Promise<GeneratedMovie> {
  if (!config.openAiApiKey) {
    throw new Error('No text AI provider is configured. Add GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY.');
  }

  const openai = new OpenAI({
    apiKey: config.openAiApiKey
  });

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

  return parseMovieJson(content);
}

async function requestMovieFromGroq(existingTitles: string[], duplicateReason?: string): Promise<GeneratedMovie> {
  const groq = new OpenAI({
    apiKey: config.groqApiKey,
    baseURL: 'https://api.groq.com/openai/v1'
  });

  const completion = await groq.chat.completions.create({
    model: config.groqTextModel,
    temperature: 1.05,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(existingTitles, duplicateReason) }
    ]
  });

  const content = completion.choices[0]?.message.content;

  if (!content) {
    throw new Error('Groq returned an empty movie generation response.');
  }

  return parseMovieJson(content);
}

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

async function requestMovieFromGemini(existingTitles: string[], duplicateReason?: string): Promise<GeneratedMovie> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiTextModel}:generateContent?key=${config.geminiApiKey}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildSystemPrompt() }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: buildUserPrompt(existingTitles, duplicateReason) }]
          }
        ],
        generationConfig: {
          temperature: 1.05,
          responseMimeType: 'application/json'
        }
      })
    }
  );

  const data = (await response.json()) as GeminiGenerateContentResponse;

  if (!response.ok) {
    throw new Error(`Gemini API error: ${data.error?.status ?? response.status} ${data.error?.message ?? ''}`.trim());
  }

  const content = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim();

  if (!content) {
    throw new Error('Gemini returned an empty movie generation response.');
  }

  return parseMovieJson(content);
}

async function requestMovie(existingTitles: string[], duplicateReason?: string): Promise<GeneratedMovie> {
  if (config.groqApiKey) {
    return requestMovieFromGroq(existingTitles, duplicateReason);
  }

  if (config.geminiApiKey) {
    return requestMovieFromGemini(existingTitles, duplicateReason);
  }

  return requestMovieFromOpenAi(existingTitles, duplicateReason);
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
