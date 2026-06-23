import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createBot } from '../src/bot.js';

const bot = createBot();

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'GET') {
    res.status(200).json({ ok: true, service: 'MovieGen Bot webhook' });
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    await bot.handleUpdate(req.body, res);

    if (!res.writableEnded) {
      res.status(200).json({ ok: true });
    }
  } catch (error) {
    console.error('Telegram webhook failed:', error);

    if (!res.writableEnded) {
      res.status(500).json({ ok: false });
    }
  }
}
