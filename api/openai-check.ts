import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

function getQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const checkSecret = process.env.OPENAI_CHECK_SECRET;
  const requestSecret = getQueryValue(req.query.secret);

  if (!checkSecret || requestSecret !== checkSecret) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }

  const model = process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini';

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: 'Return only OK' }],
      max_tokens: 5
    });

    res.status(200).json({
      ok: true,
      model,
      response: response.choices[0]?.message.content ?? null
    });
  } catch (error) {
    const openAiError = error as {
      status?: number;
      code?: string;
      type?: string;
      message?: string;
    };

    res.status(200).json({
      ok: false,
      model,
      status: openAiError.status,
      code: openAiError.code,
      type: openAiError.type,
      message: openAiError.message
    });
  }
}
