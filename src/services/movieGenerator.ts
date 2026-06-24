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

const curatedMovies: GeneratedMovie[] = [
  {
    title: 'Побег из Шоушенка',
    genres: ['Драма'],
    year: 1994,
    rating: 9.3,
    director: 'Фрэнк Дарабонт',
    actors: ['Тим Роббинс', 'Морган Фриман', 'Боб Гантон'],
    synopsis:
      'Банкир Энди Дюфрейн получает пожизненный срок за преступление, которого, как он утверждает, не совершал. В тюрьме Шоушенк он находит союзника в лице заключённого Реда и постепенно превращает надежду в форму сопротивления.',
    posterPrompt:
      'Alternative cinematic poster inspired by The Shawshank Redemption, prison walls, hope, dramatic light, no text, no logos, no actor likeness cloning.'
  },
  {
    title: 'Крёстный отец',
    genres: ['Криминал', 'Драма'],
    year: 1972,
    rating: 9.2,
    director: 'Фрэнсис Форд Коппола',
    actors: ['Марлон Брандо', 'Аль Пачино', 'Джеймс Каан'],
    synopsis:
      'Семья Корлеоне управляет криминальной империей, где власть держится на верности, страхе и традициях. Когда на клан совершают покушение, младший сын Майкл постепенно оказывается втянут в мир, от которого пытался держаться подальше.',
    posterPrompt:
      'Alternative cinematic poster inspired by The Godfather, mafia family drama, chiaroscuro lighting, no text, no logos, no actor likeness cloning.'
  },
  {
    title: 'Тёмный рыцарь',
    genres: ['Боевик', 'Триллер', 'Криминал'],
    year: 2008,
    rating: 9.0,
    director: 'Кристофер Нолан',
    actors: ['Кристиан Бэйл', 'Хит Леджер', 'Аарон Экхарт'],
    synopsis:
      'Бэтмен, комиссар Гордон и прокурор Харви Дент пытаются очистить Готэм от организованной преступности. Их план рушится, когда появляется Джокер, превращающий город в поле морального эксперимента.',
    posterPrompt:
      'Alternative cinematic poster inspired by The Dark Knight, burning city skyline, masked vigilante mood, no text, no logos, no actor likeness cloning.'
  },
  {
    title: 'Криминальное чтиво',
    genres: ['Криминал', 'Комедия', 'Драма'],
    year: 1994,
    rating: 8.9,
    director: 'Квентин Тарантино',
    actors: ['Джон Траволта', 'Сэмюэл Л. Джексон', 'Ума Турман'],
    synopsis:
      'Несколько историй из криминального Лос-Анджелеса переплетаются вокруг гангстеров, боксёра, загадочного чемодана и случайных решений. Фильм превращает жанровое кино в остроумную мозаику диалогов, насилия и поп-культуры.',
    posterPrompt:
      'Alternative cinematic poster inspired by Pulp Fiction, retro crime atmosphere, neon diner, no text, no logos, no actor likeness cloning.'
  },
  {
    title: 'Форрест Гамп',
    genres: ['Драма', 'Комедия', 'Мелодрама'],
    year: 1994,
    rating: 8.8,
    director: 'Роберт Земекис',
    actors: ['Том Хэнкс', 'Робин Райт', 'Гэри Синиз'],
    synopsis:
      'Форрест Гамп проходит через ключевые события американской истории, оставаясь удивительно искренним и прямодушным человеком. Его путь становится историей о любви, случайности и способности сохранять доброту.',
    posterPrompt:
      'Alternative cinematic poster inspired by Forrest Gump, park bench, feather, warm nostalgic light, no text, no logos, no actor likeness cloning.'
  },
  {
    title: 'Интерстеллар',
    genres: ['Научная фантастика', 'Драма', 'Приключения'],
    year: 2014,
    rating: 8.7,
    director: 'Кристофер Нолан',
    actors: ['Мэттью Макконахи', 'Энн Хэтэуэй', 'Джессика Честейн'],
    synopsis:
      'На умирающей Земле группа исследователей отправляется через червоточину в поисках нового дома для человечества. Личная история отца и дочери переплетается с масштабной драмой времени, памяти и выживания.',
    posterPrompt:
      'Alternative cinematic poster inspired by Interstellar, astronaut, wormhole, cosmic scale, no text, no logos, no actor likeness cloning.'
  },
  {
    title: 'Паразиты',
    genres: ['Триллер', 'Драма', 'Комедия'],
    year: 2019,
    rating: 8.5,
    director: 'Пон Джун-хо',
    actors: ['Сон Кан-хо', 'Чхве У-сик', 'Пак Со-дам'],
    synopsis:
      'Бедная семья Кимов постепенно внедряется в дом состоятельных Паков, превращая случайную возможность в рискованную схему. Социальная сатира незаметно перерастает в напряжённый триллер о неравенстве и скрытом насилии.',
    posterPrompt:
      'Alternative cinematic poster inspired by Parasite, modern house, class divide, unsettling symmetry, no text, no logos, no actor likeness cloning.'
  },
  {
    title: 'Унесённые призраками',
    genres: ['Анимация', 'Фэнтези', 'Приключения'],
    year: 2001,
    rating: 8.6,
    director: 'Хаяо Миядзаки',
    actors: ['Руми Хиираги', 'Мию Ирино', 'Мари Нацуки'],
    synopsis:
      'Девочка Тихиро попадает в волшебный мир духов, где её родители оказываются заколдованы. Чтобы спасти семью и вернуться домой, ей приходится работать в бане для сверхъестественных существ и взрослеть на глазах.',
    posterPrompt:
      'Alternative cinematic poster inspired by Spirited Away, magical bathhouse, spirits, warm fantasy atmosphere, no text, no logos, no actor likeness cloning.'
  },
  {
    title: 'Матрица',
    genres: ['Научная фантастика', 'Боевик'],
    year: 1999,
    rating: 8.7,
    director: 'Лана Вачовски, Лилли Вачовски',
    actors: ['Киану Ривз', 'Лоренс Фишбёрн', 'Кэрри-Энн Мосс'],
    synopsis:
      'Хакер Нео узнаёт, что привычная реальность может быть искусственной системой контроля. Выбор между удобной иллюзией и опасной правдой втягивает его в войну людей против машин.',
    posterPrompt:
      'Alternative cinematic poster inspired by The Matrix, green digital rain, cyberpunk rebellion, no text, no logos, no actor likeness cloning.'
  },
  {
    title: 'Сияние',
    genres: ['Ужасы', 'Триллер', 'Драма'],
    year: 1980,
    rating: 8.4,
    director: 'Стэнли Кубрик',
    actors: ['Джек Николсон', 'Шелли Дювалл', 'Дэнни Ллойд'],
    synopsis:
      'Писатель Джек Торранс приезжает с семьёй в изолированный отель, чтобы присматривать за ним зимой. Одиночество, прошлое здания и внутренние демоны постепенно превращают дом в ловушку.',
    posterPrompt:
      'Alternative cinematic poster inspired by The Shining, isolated hotel, snowy dread, psychological horror, no text, no logos, no actor likeness cloning.'
  }
];

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

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickCuratedMovie(existingTitles: string[]): GeneratedMovie {
  const existingTitleSet = new Set(existingTitles.map(normalizeTitle));
  const availableMovies = curatedMovies.filter((movie) => !existingTitleSet.has(normalizeTitle(movie.title)));
  const candidates = availableMovies.length > 0 ? availableMovies : curatedMovies;
  const index = Math.floor(Math.random() * candidates.length);
  const movie = candidates[index];

  if (!movie) {
    throw new Error('Curated movie fallback catalog is empty.');
  }

  return movie;
}

export async function generateUniqueMovie(maxAttempts = 5): Promise<GeneratedMovie> {
  const existingMovies = await movieDatabase.getMovies();
  const existingTitles = existingMovies.map((movie) => movie.title);
  const recentTitles = existingMovies.slice(-60).map((movie) => movie.title);
  let duplicateReason: string | undefined;
  let lastProviderError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let movie: GeneratedMovie;

    try {
      movie = await requestMovie(recentTitles, duplicateReason);
    } catch (error) {
      lastProviderError = error;
      console.error(`[moviegen] text provider failed on attempt ${attempt}:`, error);
      break;
    }

    const duplicateCheck = await movieDatabase.findDuplicate(movie);

    if (!duplicateCheck.isDuplicate) {
      return movie;
    }

    duplicateReason = duplicateCheck.reason ?? 'Generated movie is too similar to an existing movie.';
  }

  const fallbackMovie = pickCuratedMovie(existingTitles);
  const fallbackDuplicateCheck = await movieDatabase.findDuplicate(fallbackMovie);

  if (!fallbackDuplicateCheck.isDuplicate) {
    console.warn('[moviegen] using curated movie fallback because AI provider did not return a unique valid movie.', {
      lastProviderError
    });
    return fallbackMovie;
  }

  console.warn('[moviegen] curated fallback is duplicated, returning it anyway to keep bot responsive.', {
    duplicateReason: fallbackDuplicateCheck.reason,
    lastProviderError
  });
  return fallbackMovie;
}
