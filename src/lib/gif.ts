// Chat messages have a single `text` column with no "type" field, so a
// message is treated as a GIF purely by its URL shape - a Giphy CDN link or
// anything ending in .gif. Avoids a schema migration for a message type.
export const isGifUrl = (text: string): boolean => {
  const t = text.trim();
  return /^https?:\/\/\S*\.giphy\.com\/\S+/i.test(t) || /\.gif(\?\S*)?$/i.test(t);
};
