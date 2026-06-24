# MovieGen Bot

Telegram-бот на Node.js + TypeScript, который генерирует уникальные вымышленные фильмы и постеры к ним.

## Возможности

- `/start` с главным меню и кнопкой `🎥 Новый фильм`.
- Inline-кнопки `🎥 Ещё один фильм` и `🏠 В главное меню`.
- Генерация названия, жанров, года, рейтинга, режиссёра, актёров и синопсиса через Groq, Gemini или OpenAI.
- Генерация постера через OpenAI Images API (`dall-e-3` по умолчанию), если есть OpenAI quota.
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
OPENAI_API_KEY=your_openai_api_key_optional
OPENAI_TEXT_MODEL=gpt-4.1-mini
OPENAI_IMAGE_MODEL=dall-e-3
OPENAI_IMAGE_SIZE=1024x1792
DATABASE_PATH=data/movies.json
```

`GROQ_API_KEY` можно создать в Groq Console: https://console.groq.com/keys.
`GEMINI_API_KEY` можно создать в Google AI Studio: https://aistudio.google.com/app/apikey.

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
- `OPENAI_IMAGE_MODEL` — модель для генерации постера. Если OpenAI недоступен или нет quota, бот всё равно отправит фильм текстом.

Если захочешь заменить провайдера на Grok, Flux или Ideogram, основной код изолирован в `src/services/movieGenerator.ts` и `src/services/imageGenerator.ts`.
