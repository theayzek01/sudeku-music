const https = require('https');

const SPOTIFY_URL_RE = /^https?:\/\/(?:open\.)?spotify\.com\/(?:intl-[\w-]+\/)?(track|album|playlist)\/([a-zA-Z0-9]+)/i;

function parseSpotifyUrl(url) {
  const match = url.trim().match(SPOTIFY_URL_RE);
  if (!match) return null;
  return { type: match[1], id: match[2] };
}

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchHtml(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Spotify embed HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error('Spotify embed request timed out'));
    });
  });
}

function parseNextData(html) {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error('Spotify embed metadata not found');
  }
  return JSON.parse(match[1]);
}

function getEntityFromState(state) {
  return state?.data?.entity || state?.data?.entityV2 || null;
}

function mapTrackEntity(entity) {
  const artists = (entity.artists || []).map(a => a.name).filter(Boolean);
  if (!artists.length && entity.subtitle) {
    artists.push(entity.subtitle);
  }

  const title = entity.title || entity.name || 'Unknown';
  const durationMs = entity.duration || entity.duration_ms || 0;
  const thumbnail = entity.visualIdentity?.image?.[0]?.url
    || entity.coverArt?.sources?.[0]?.url
    || entity.images?.[0]?.url
    || '';
  const trackId = entity.id || entity.uri?.split(':').pop();

  return {
    title: artists.length ? `${title} - ${artists.join(', ')}` : title,
    trackName: title,
    artists,
    durationMs,
    thumbnail,
    spotifyUrl: trackId ? `https://open.spotify.com/track/${trackId}` : null
  };
}

async function getSpotifyTrack(url) {
  const parsed = parseSpotifyUrl(url);
  if (!parsed || parsed.type !== 'track') {
    throw new Error('Invalid Spotify track URL');
  }

  const html = await fetchHtml(`https://open.spotify.com/embed/track/${parsed.id}`);
  const nextData = parseNextData(html);
  const entity = getEntityFromState(nextData?.props?.pageProps?.state);
  if (!entity) {
    throw new Error('Spotify track metadata unavailable');
  }
  return mapTrackEntity(entity);
}

async function getSpotifyCollection(url) {
  const parsed = parseSpotifyUrl(url);
  if (!parsed || (parsed.type !== 'album' && parsed.type !== 'playlist')) {
    throw new Error('Invalid Spotify album/playlist URL');
  }

  const html = await fetchHtml(`https://open.spotify.com/embed/${parsed.type}/${parsed.id}`);
  const nextData = parseNextData(html);
  const pageProps = nextData?.props?.pageProps;
  if (pageProps?.status === 404) {
    throw new Error('Spotify albüm/playlist bulunamadı veya erişilemiyor.');
  }

  const state = pageProps?.state;
  const entity = getEntityFromState(state);
  if (!entity) {
    throw new Error('Spotify collection metadata unavailable');
  }

  const tracks = [];
  const trackList = entity.trackList || entity.tracks?.items || state?.data?.trackList || [];

  for (const item of trackList) {
    const track = item.track || item;
    if (!track || !(track.title || track.name)) continue;
    tracks.push(mapTrackEntity({
      ...track,
      type: 'track',
      artists: track.artists || entity.artists || entity.authors || [],
      visualIdentity: track.visualIdentity || entity.visualIdentity,
      coverArt: track.coverArt || entity.coverArt,
      images: track.images || entity.images
    }));
  }

  return {
    title: entity.title || entity.name || entity.subtitle || 'Spotify Collection',
    thumbnail: entity.visualIdentity?.image?.[0]?.url
      || entity.coverArt?.sources?.[0]?.url
      || entity.images?.[0]?.url
      || '',
    tracks
  };
}

module.exports = {
  parseSpotifyUrl,
  getSpotifyTrack,
  getSpotifyCollection
};
