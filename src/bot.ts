import { pathToFileURL } from 'node:url';
import { Markup, Telegraf, type Context } from 'telegraf';
import { generatePosterUrl } from './services/imageGenerator.js';
import { generateUniqueMovie } from './services/movieGenerator.js';
import { findRealMovieDetails } from './services/realMovieMedia.js';
import { movieDatabase } from './services/database.js';
import { config } from './utils/env.js';
import { formatMovieCaption } from './utils/formatMovie.js';

const NEW_MOVIE_ACTION = 'movie:new';
const MAIN_MENU_ACTION = 'menu:main';

type BotOptions = {
  scheduleTask?: (task: Promise<void>) => void;
};

function mainMenuKeyboard() {
  return Markup.inlineKeyboard([
    Markup.button.callback('🎥 Подобрать фильм', NEW_MOVIE_ACTION)
  ]);
}

function movieActionsKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🎥 Ещё один фильм', NEW_MOVIE_ACTION)],
    [Markup.button.callback('🏠 В главное меню', MAIN_MENU_ACTION)]
  ]);
}

export async function sendMainMenu(ctx: Context): Promise<void> {
  await ctx.reply(
    [
      'Привет! Я <b>MovieGen Bot</b>.',
      '',
      'Нажми кнопку ниже, и я подберу реальный фильм с жанрами, рейтингом, режиссёром, актёрами, постером или кадром и трейлером.'
    ].join('\n'),
    {
      parse_mode: 'HTML',
      ...mainMenuKeyboard()
    }
  );
}

export async function generateAndSendMovie(ctx: Context): Promise<void> {
  const updateId = ctx.update.update_id;
  console.log(`[moviegen] generation started for update ${updateId}`);

  await ctx.replyWithChatAction('typing');
  await ctx.reply('Подбираю реальный фильм, ищу постер или кадр и трейлер. Это может занять немного времени...');

  const movie = await generateUniqueMovie();
  console.log(`[moviegen] movie generated for update ${updateId}: ${movie.title}`);

  await ctx.replyWithChatAction('upload_photo');
  let posterUrl: string | undefined;
  let trailerUrl: string | undefined;
  let mediaSource = 'none';

  try {
    const realMovieDetails = await findRealMovieDetails(movie);

    trailerUrl = realMovieDetails.trailerUrl;

    if (realMovieDetails.media) {
      posterUrl = realMovieDetails.media.url;
      mediaSource = realMovieDetails.media.source;
      console.log(`[moviegen] real media found for update ${updateId}: ${realMovieDetails.media.source}`);
    }

    if (trailerUrl) {
      console.log(`[moviegen] trailer found for update ${updateId}`);
    }
  } catch (error) {
    console.error(`[moviegen] real media/trailer lookup failed for update ${updateId}:`, error);
  }

  if (!posterUrl) {
    try {
      posterUrl = await generatePosterUrl(movie);
      mediaSource = 'ai-poster';
      console.log(`[moviegen] AI poster generated for update ${updateId}`);
    } catch (error) {
      console.error(`[moviegen] AI poster generation failed for update ${updateId}:`, error);
    }
  }

  await movieDatabase.saveMovie(movie, posterUrl ?? '');
  console.log(`[moviegen] movie saved for update ${updateId} with media source: ${mediaSource}`);

  const trailerLine = trailerUrl ? `\n\n<b>Трейлер:</b> ${trailerUrl}` : '';
  const caption = `${formatMovieCaption(movie)}${trailerLine}`;

  if (!posterUrl) {
    await ctx.reply(
      `${caption}\n\nПостер или кадр не удалось найти, но фильм уже готов.`,
      {
        parse_mode: 'HTML',
        ...movieActionsKeyboard()
      }
    );
  } else {
    try {
      await ctx.replyWithPhoto(posterUrl, {
        caption,
        parse_mode: 'HTML',
        ...movieActionsKeyboard()
      });
    } catch (error) {
      console.error(`[moviegen] failed to send poster image for update ${updateId}:`, error);
      await ctx.reply(
        `${caption}\n\nПостер: ${posterUrl}`,
        {
          parse_mode: 'HTML',
          ...movieActionsKeyboard()
        }
      );
    }
  }

  console.log(`[moviegen] generation completed for update ${updateId}`);
}

export function createBot(options: BotOptions = {}): Telegraf<Context> {
  const bot = new Telegraf(config.telegramBotToken);

  const runMovieGeneration = async (ctx: Context): Promise<void> => {
    const task = generateAndSendMovie(ctx).catch(async (error) => {
      console.error(`[moviegen] generation failed for update ${ctx.update.update_id}:`, error);

      try {
        await ctx.reply(
          'Не получилось подобрать фильм. Проверь AI API key/лимиты и попробуй ещё раз.',
          movieActionsKeyboard()
        );
      } catch (replyError) {
        console.error('[moviegen] failed to send generation error message:', replyError);
      }
    });

    if (options.scheduleTask) {
      options.scheduleTask(task);
      return;
    }

    await task;
  };

  bot.start(sendMainMenu);

  bot.action(MAIN_MENU_ACTION, async (ctx) => {
    await ctx.answerCbQuery();
    await sendMainMenu(ctx);
  });

  bot.action(NEW_MOVIE_ACTION, async (ctx) => {
    await ctx.answerCbQuery('Подбираю фильм...');
    await runMovieGeneration(ctx);
  });

  bot.command('new', runMovieGeneration);

  bot.catch(async (error, ctx) => {
    console.error(`Bot error for update ${ctx.update.update_id}:`, error);

    try {
      await ctx.reply(
        'Не получилось сгенерировать фильм. Проверь токены API и попробуй ещё раз.',
        movieActionsKeyboard()
      );
    } catch (replyError) {
      console.error('Failed to send error message:', replyError);
    }
  });

  return bot;
}

export async function setBotCommands(bot: Telegraf<Context>): Promise<void> {
  await bot.telegram.setMyCommands([
    { command: 'start', description: 'Открыть главное меню' },
    { command: 'new', description: 'Подобрать фильм' }
  ]);
}

async function launchLocalBot(): Promise<void> {
  const bot = createBot();
  await setBotCommands(bot);
  await bot.launch();
  console.log('MovieGen Bot is running.');

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

const currentFileUrl = pathToFileURL(process.argv[1] ?? '').href;

if (import.meta.url === currentFileUrl) {
  await launchLocalBot();
}
