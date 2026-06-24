import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

function getQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const checkSecret = process.env.GROQ_CHECK_SECRET;
  const requestSecret = getQueryValue(req.query.secret);

  if (!checkSecret || requestSecret !== checkSecret) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }

  const model = process.env.GROQ_TEXT_MODEL || 'llama-3.1-8b-instant';

  try {
    const client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1'
    });

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
    const apiError = error as {
      status?: number;
      code?: string;
      type?: string;
      message?: string;
    };

    res.status(200).json({
      ok: false,
      model,
      status: apiError.status,
      code: apiError.code,
      type: apiError.type,
      message: apiError.message
    });
  }
}
