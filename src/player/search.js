const play = require('play-dl');
const ytDlp = require('./ytDlp');
const { getSpotifyTrack, getSpotifyCollection } = require('./spotifyEmbed');

let spotifyReady = false;

async function initSpotifyAuth() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return false;
  }

  try {
    await play.setToken({
      spotify: {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        market: process.env.SPOTIFY_MARKET || 'TR'
      }
    });
    spotifyReady = true;
    return true;
  } catch (err) {
    console.warn('[Search] Spotify token init failed, embed fallback will be used:', err.message || err);
    return false;
  }
}

const spotifyInitPromise = initSpotifyAuth();

function isLikelyUrl(value) {
  return /^https?:\/\//i.test(value.trim());
}

class Track {
  constructor({ title, url, duration, durationMs, thumbnail, requester, source, spotifyUrl = null }) {
    this.title = title;
    this.url = url;
    this.duration = duration;
    this.durationMs = durationMs;
    this.thumbnail = thumbnail;
    this.requester = requester;
    this.source = source;
    this.spotifyUrl = spotifyUrl;
    this.resolvedUrl = url;
  }
}

function trackFromYtDlpEntry(entry, requester) {
  const durationSec = Number(entry.duration) || 0;
  return new Track({
    title: entry.title,
    url: entry.url || `https://www.youtube.com/watch?v=${entry.id}`,
    duration: formatMs(durationSec * 1000),
    durationMs: durationSec * 1000,
    thumbnail: entry.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`,
    requester,
    source: 'youtube'
  });
}

function trackFromYtDlpInfo(info, requester) {
  const durationSec = Number(info.duration) || 0;
  return new Track({
    title: info.title,
    url: info.webpage_url || info.original_url || info.url,
    duration: formatMs(durationSec * 1000),
    durationMs: durationSec * 1000,
    thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || '',
    requester,
    source: 'youtube'
  });
}

async function searchYoutube(query, limit, requester) {
  try {
    const entries = await ytDlp.searchYoutube(query, limit);
    if (entries.length > 0) {
      return entries.map(entry => trackFromYtDlpEntry(entry, requester));
    }
  } catch (ytErr) {
    console.warn('[Search] yt-dlp search failed, trying play-dl:', ytErr.message || ytErr);
  }

  const searchResult = await play.search(query, { limit, source: { youtube: 'video' } });
  return (searchResult || [])
    .filter(video => video && video.title && video.url)
    .map(video => new Track({
      title: video.title,
      url: video.url,
      duration: video.durationRaw || formatMs(video.durationInSec * 1000),
      durationMs: video.durationInSec * 1000,
      thumbnail: video.thumbnails?.[0]?.url || '',
      requester,
      source: 'youtube'
    }));
}

async function resolveSpotifyTrack(trackName, artistName = '') {
  const query = `${trackName} ${artistName}`.trim();
  if (!query) return null;

  try {
    const tracks = await searchYoutube(query, 1, null);
    return tracks[0]?.url || null;
  } catch (err) {
    console.error('[Search] Error resolving Spotify track:', err.message || err);
    return null;
  }
}

async function resolveSpotifyTrackRecord(meta, requester, spotifyUrl) {
  const resolvedUrl = await resolveSpotifyTrack(meta.trackName || meta.title, meta.artists?.join(' ') || '');
  return new Track({
    title: meta.title,
    url: resolvedUrl,
    duration: formatMs(meta.durationMs),
    durationMs: meta.durationMs,
    thumbnail: meta.thumbnail || '',
    requester,
    source: 'spotify',
    spotifyUrl: spotifyUrl || meta.spotifyUrl
  });
}

async function search(query, requester, limit = 1) {
  await spotifyInitPromise;

  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const queryType = isLikelyUrl(trimmed) ? await play.validate(trimmed) : 'search';

    if (queryType === 'yt_video') {
      try {
        const info = await ytDlp.getVideoInfo(trimmed);
        return [trackFromYtDlpInfo(info, requester)];
      } catch {
        const info = await play.video_basic_info(trimmed);
        const video = info.video_details;
        return [new Track({
          title: video.title,
          url: video.url,
          duration: video.durationRaw || formatMs(video.durationInSec * 1000),
          durationMs: video.durationInSec * 1000,
          thumbnail: video.thumbnails?.[0]?.url || '',
          requester,
          source: 'youtube'
        })];
      }
    }

    if (queryType === 'yt_playlist') {
      try {
        const output = await ytDlp.execYtDlp([
          '--flat-playlist',
          '--dump-single-json',
          '--no-warnings',
          trimmed
        ]);
        const playlist = JSON.parse(output);
        const entries = (playlist.entries || []).filter(entry => entry && entry.id && entry.title);
        if (entries.length > 0) {
          return entries.map(entry => trackFromYtDlpEntry(entry, requester));
        }
      } catch (ytPlaylistErr) {
        console.warn('[Search] yt-dlp playlist parse failed, trying play-dl:', ytPlaylistErr.message || ytPlaylistErr);
      }

      const playlist = await play.playlist_info(trimmed, { incomplete: true });
      const videos = await playlist.all_videos();
      return videos
        .filter(video => video && video.title && video.url)
        .map(video => new Track({
          title: video.title,
          url: video.url,
          duration: video.durationRaw || formatMs(video.durationInSec * 1000),
          durationMs: video.durationInSec * 1000,
          thumbnail: video.thumbnails?.[0]?.url || '',
          requester,
          source: 'youtube'
        }));
    }

    if (queryType === 'sp_track') {
      if (spotifyReady) {
        try {
          const spData = await play.spotify(trimmed);
          return [new Track({
            title: `${spData.name} - ${spData.artists.map(a => a.name).join(', ')}`,
            url: null,
            duration: formatMs(spData.durationInMs),
            durationMs: spData.durationInMs,
            thumbnail: spData.thumbnail?.url || '',
            requester,
            source: 'spotify',
            spotifyUrl: trimmed
          })];
        } catch (spErr) {
          console.warn('[Search] Spotify API track lookup failed, using embed fallback:', spErr.message || spErr);
        }
      }

      const meta = await getSpotifyTrack(trimmed);
      return [await resolveSpotifyTrackRecord(meta, requester, trimmed)];
    }

    if (queryType === 'sp_playlist' || queryType === 'sp_album') {
      if (spotifyReady) {
        try {
          const spData = await play.spotify(trimmed);
          const tracks = await spData.all_tracks();
          return tracks.map(track => new Track({
            title: `${track.name} - ${track.artists.map(a => a.name).join(', ')}`,
            url: null,
            duration: formatMs(track.durationInMs),
            durationMs: track.durationInMs,
            thumbnail: track.thumbnail?.url || spData.thumbnail?.url || '',
            requester,
            source: 'spotify',
            spotifyUrl: track.url || trimmed
          }));
        } catch (spErr) {
          console.warn('[Search] Spotify API collection lookup failed, using embed fallback:', spErr.message || spErr);
        }
      }

      const collection = await getSpotifyCollection(trimmed);
      if (!collection.tracks.length) {
        throw new Error('Spotify çalma listesinden şarkı okunamadı.');
      }

      const resolved = [];
      for (const trackMeta of collection.tracks) {
        resolved.push(await resolveSpotifyTrackRecord({
          ...trackMeta,
          thumbnail: trackMeta.thumbnail || collection.thumbnail
        }, requester, trimmed));
      }
      return resolved;
    }

    return await searchYoutube(trimmed, limit, requester);
  } catch (error) {
    console.error('[Search] Search failed:', error.message || error);
    throw error;
  }
}

function formatMs(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

  const secStr = seconds < 10 ? `0${seconds}` : seconds;
  const minStr = minutes < 10 ? `0${minutes}` : minutes;
  const hrStr = hours > 0 ? `${hours}:` : '';

  return `${hrStr}${minStr}:${secStr}`;
}

module.exports = {
  Track,
  search,
  resolveSpotifyTrack,
  formatMs,
  searchYoutube
};
