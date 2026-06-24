# MovieGen Bot

Telegram-бот на Node.js + TypeScript, который подбирает реальные существующие фильмы и показывает реальные постеры, кадры и трейлеры к ним.

## Возможности

- `/start` с главным меню и кнопкой `🎥 Подобрать фильм`.
- Inline-кнопки `🎥 Ещё один фильм` и `🏠 В главное меню`.
- Подбор реального фильма с названием, жанрами, годом, рейтингом, режиссёром, актёрами и синопсисом через Groq, Gemini или OpenAI.
- Поиск реального постера, кадра и трейлера через TMDb.
- Хранение всех фильмов в локальном JSON-файле через LowDB.
- Проверка дублей по нормализованному названию и trigram-похожести.

## Установка

```bash
npm install
```

## Настройка

Создай `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Заполни:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
GROQ_API_KEY=your_groq_api_key
GROQ_TEXT_MODEL=llama-3.1-8b-instant
GEMINI_API_KEY=your_gemini_api_key
GEMINI_TEXT_MODEL=gemini-2.0-flash
TMDB_API_KEY=your_tmdb_v4_read_access_token_or_v3_api_key
OPENAI_API_KEY=your_openai_api_key_optional
OPENAI_TEXT_MODEL=gpt-4.1-mini
DATABASE_PATH=data/movies.json
```

`GROQ_API_KEY` можно создать в Groq Console: https://console.groq.com/keys.
`GEMINI_API_KEY` можно создать в Google AI Studio: https://aistudio.google.com/app/apikey.
`TMDB_API_KEY` можно создать в TMDb API settings: https://www.themoviedb.org/settings/api. Поддерживается v4 Read Access Token и короткий v3 API key.

## Запуск

```bash
npm run dev
```

Для production-сборки:

```bash
npm run build
npm start
```

## Где менять модели

Модели задаются в `.env`:

- `GROQ_TEXT_MODEL` — основная модель для сценарной генерации фильма, если задан `GROQ_API_KEY`.
- `GEMINI_TEXT_MODEL` — fallback-модель для сценарной генерации фильма, если задан `GEMINI_API_KEY`.
- `OPENAI_TEXT_MODEL` — fallback-модель для сценарной генерации фильма, если Groq и Gemini не заданы.
- `TMDB_API_KEY` — источник реальных постеров, кадров и трейлеров из фильмов.

Если захочешь заменить AI-провайдера, основная логика подбора фильмов изолирована в `src/services/movieGenerator.ts`, а реальные медиа берутся в `src/services/realMovieMedia.ts`.
