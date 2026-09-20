export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.trim().match(regExp);
  return (match && match[2] && match[2].length === 11) ? match[2] : null;
}

export function hasValidYouTubeVideo(url) {
  return Boolean(extractYouTubeId(url));
}

export function extractYouTubePlaylistId(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/[?&]list=([^#\&\?]+)/);
  return match ? match[1] : null;
}

export function isYouTubePlaylist(url) {
  return Boolean(extractYouTubePlaylistId(url));
}

export function getYouTubeThumbnail(url) {
  const id = extractYouTubeId(url);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

export function getYouTubeEmbedUrl(url, autoplay = false) {
  const id = extractYouTubeId(url);
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}?enablejsapi=1&rel=0${autoplay ? '&autoplay=1' : ''}`;
}

export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
