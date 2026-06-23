import type { GeneratedMovie } from '../types/movie.js';

const htmlEscapes: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => htmlEscapes[char] ?? char);
}

export function formatMovieCaption(movie: GeneratedMovie): string {
  return [
    '🎬 <b>Новый фильм сгенерирован!</b>',
    '',
    `<b>Название:</b> «${escapeHtml(movie.title)}»`,
    `<b>Жанр:</b> ${escapeHtml(movie.genres.join(', '))}`,
    `<b>Год:</b> ${movie.year}`,
    `<b>Режиссёр:</b> ${escapeHtml(movie.director)}`,
    `<b>В ролях:</b> ${escapeHtml(movie.actors.join(', '))}`,
    `<b>Рейтинг:</b> IMDb ${movie.rating.toFixed(1)}`,
    '',
    '<b>Синопсис:</b>',
    escapeHtml(movie.synopsis)
  ].join('\n');
}
