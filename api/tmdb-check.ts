import type { VercelRequest, VercelResponse } from '@vercel/node';

function getQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function fetchTmdb(path: string, params: URLSearchParams): Promise<Response> {
  const tmdbApiKey = process.env.TMDB_API_KEY ?? '';
  const headers: Record<string, string> = {
    accept: 'application/json'
  };

  if (tmdbApiKey.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${tmdbApiKey}`;
  } else {
    params.set('api_key', tmdbApiKey);
  }

  return fetch(`https://api.themoviedb.org/3${path}?${params.toString()}`, {
    headers
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const checkSecret = process.env.TMDB_CHECK_SECRET;
  const requestSecret = getQueryValue(req.query.secret);

  if (!checkSecret || requestSecret !== checkSecret) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }

  try {
    const searchResponse = await fetchTmdb('/search/movie', new URLSearchParams({
      query: 'The Matrix',
      year: '1999',
      language: 'ru-RU'
    }));
    const searchData = (await searchResponse.json()) as {
      results?: Array<{ id?: number; poster_path?: string | null; title?: string }>;
      status_message?: string;
    };
    const movie = searchData.results?.[0];

    if (!searchResponse.ok || !movie?.id) {
      res.status(200).json({
        ok: false,
        status: searchResponse.status,
        message: searchData.status_message ?? 'TMDb movie search failed'
      });
      return;
    }

    const videosResponse = await fetchTmdb(`/movie/${movie.id}/videos`, new URLSearchParams({
      language: 'en-US'
    }));
    const videosData = (await videosResponse.json()) as {
      results?: Array<{ site?: string; key?: string; type?: string }>;
    };
    const trailer = videosData.results?.find((video) => video.site === 'YouTube' && video.key);

    res.status(200).json({
      ok: videosResponse.ok,
      movieTitle: movie.title,
      hasPoster: Boolean(movie.poster_path),
      hasTrailer: Boolean(trailer?.key)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown TMDb diagnostic error';
    res.status(200).json({ ok: false, message });
  }
}
