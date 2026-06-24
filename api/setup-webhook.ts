import type { VercelRequest, VercelResponse } from '@vercel/node';

const webhookUrl = 'https://moviegen-bot.vercel.app/api/telegram';

type TelegramResponse<T> = {
  ok: boolean;
  description?: string;
  result?: T;
};

type WebhookInfo = {
  url: string;
  pending_update_count: number;
  last_error_message?: string;
};

function getQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function callTelegram<T>(method: string, body?: Record<string, string>): Promise<TelegramResponse<T>> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured.');
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });

  return response.json() as Promise<TelegramResponse<T>>;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const setupSecret = process.env.WEBHOOK_SETUP_SECRET;
  const requestSecret = getQueryValue(req.query.secret);

  if (!setupSecret || requestSecret !== setupSecret) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }

  try {
    const setWebhook = await callTelegram<boolean>('setWebhook', {
      url: webhookUrl,
      drop_pending_updates: 'true'
    });
    const webhookInfo = await callTelegram<WebhookInfo>('getWebhookInfo');

    res.status(setWebhook.ok ? 200 : 502).json({
      ok: setWebhook.ok,
      description: setWebhook.description,
      webhookUrl: webhookInfo.result?.url,
      pendingUpdateCount: webhookInfo.result?.pending_update_count,
      lastErrorMessage: webhookInfo.result?.last_error_message
    });
  } catch (error) {
    console.error('Failed to setup Telegram webhook:', error);
    res.status(500).json({ ok: false, error: 'Failed to setup Telegram webhook' });
  }
}
