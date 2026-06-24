import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
  GROQ_API_KEY: z.string().default(''),
  GROQ_TEXT_MODEL: z.string().default('llama-3.1-8b-instant'),
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_TEXT_MODEL: z.string().default('gemini-2.0-flash'),
  OPENAI_API_KEY: z.string().default(''),
  OPENAI_TEXT_MODEL: z.string().default('gpt-4.1-mini'),
  OPENAI_IMAGE_MODEL: z.string().default('dall-e-3'),
  OPENAI_IMAGE_SIZE: z.string().default('1024x1792'),
  DATABASE_PATH: z.string().default(process.env.VERCEL ? '/tmp/moviegen-movies.json' : 'data/movies.json')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const message = parsedEnv.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  throw new Error(`Invalid environment configuration:\n${message}`);
}

export const config = {
  telegramBotToken: parsedEnv.data.TELEGRAM_BOT_TOKEN,
  groqApiKey: parsedEnv.data.GROQ_API_KEY,
  groqTextModel: parsedEnv.data.GROQ_TEXT_MODEL,
  geminiApiKey: parsedEnv.data.GEMINI_API_KEY,
  geminiTextModel: parsedEnv.data.GEMINI_TEXT_MODEL,
  openAiApiKey: parsedEnv.data.OPENAI_API_KEY,
  openAiTextModel: parsedEnv.data.OPENAI_TEXT_MODEL,
  openAiImageModel: parsedEnv.data.OPENAI_IMAGE_MODEL,
  openAiImageSize: parsedEnv.data.OPENAI_IMAGE_SIZE,
  databasePath: process.env.VERCEL ? '/tmp/moviegen-movies.json' : parsedEnv.data.DATABASE_PATH
} as const;
