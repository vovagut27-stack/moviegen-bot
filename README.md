# MovieGen Bot

Telegram-бот на Node.js + TypeScript, который генерирует уникальные вымышленные фильмы и постеры к ним.

## Возможности

- `/start` с главным меню и кнопкой `🎥 Новый фильм`.
- Inline-кнопки `🎥 Ещё один фильм` и `🏠 В главное меню`.
- Генерация названия, жанров, года, рейтинга, режиссёра, актёров и синопсиса.
- Генерация постера через OpenAI Images API (`dall-e-3` по умолчанию).
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
OPENAI_API_KEY=your_openai_api_key
OPENAI_TEXT_MODEL=gpt-4.1-mini
OPENAI_IMAGE_MODEL=dall-e-3
OPENAI_IMAGE_SIZE=1024x1792
DATABASE_PATH=data/movies.json
```

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

- `OPENAI_TEXT_MODEL` — модель для сценарной генерации фильма.
- `OPENAI_IMAGE_MODEL` — модель для генерации постера.

Если захочешь заменить OpenAI на Grok, Flux или Ideogram, основной код изолирован в `src/services/movieGenerator.ts` и `src/services/imageGenerator.ts`.
