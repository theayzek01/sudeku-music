const play = require('play-dl');

class Track {
  constructor({ title, url, duration, durationMs, thumbnail, requester, source, spotifyUrl = null }) {
    this.title = title;
    this.url = url;
    this.duration = duration;
    this.durationMs = durationMs;
    this.thumbnail = thumbnail;
    this.requester = requester;
    this.source = source; // 'youtube' or 'spotify'
    this.spotifyUrl = spotifyUrl;
    this.resolvedUrl = url; // Will be determined right before playing if it's Spotify
  }
}

async function resolveSpotifyTrack(trackName, artistName) {
  try {
    const searchResult = await play.search(`${trackName} ${artistName}`, { limit: 1, source: { youtube: 'video' } });
    if (searchResult && searchResult.length > 0) {
      return searchResult[0].url;
    }
  } catch (err) {
    console.error("Error resolving Spotify track:", err);
  }
  return null;
}

async function search(query, requester) {
  try {
    const queryType = await play.validate(query);

    if (queryType === 'yt_video') {
      const info = await play.video_basic_info(query);
      const video = info.video_details;
      return [new Track({
        title: video.title,
        url: video.url,
        duration: video.durationRaw || formatMs(video.durationInSec * 1000),
        durationMs: video.durationInSec * 1000,
        thumbnail: video.thumbnails[0]?.url || "",
        requester,
        source: 'youtube'
      })];
    }

    if (queryType === 'yt_playlist') {
 const playlist = await play.playlist_info(query, { incomplete: true });
 const videos = await playlist.all_videos();
 return videos
   .filter(video => video && video.title && video.url)
   .map(video => new Track({
     title: video.title,
     url: video.url,
     duration: video.durationRaw || formatMs(video.durationInSec * 1000),
     durationMs: video.durationInSec * 1000,
     thumbnail: video.thumbnails[0]?.url || "",
     requester,
     source: 'youtube'
   }));
 }

    if (queryType === 'sp_track') {
      try {
        const spData = await play.spotify(query);
        return [new Track({
          title: `${spData.name} - ${spData.artists.map(a => a.name).join(', ')}`,
          url: null, // will resolve when playing
          duration: formatMs(spData.durationInMs),
          durationMs: spData.durationInMs,
          thumbnail: spData.thumbnail?.url || "",
          requester,
          source: 'spotify',
          spotifyUrl: query
        })];
      } catch (spErr) {
        console.error("Spotify track search failed, trying YouTube fallback:", spErr);
        // Clean query fallback
        const cleanQuery = query.replace(/https?:\/\/(open\.)?spotify\.com\/track\//i, '').split('?')[0];
        const ytSearch = await play.search(cleanQuery, { limit: 1 });
        if (ytSearch && ytSearch.length > 0) {
          return [new Track({
            title: ytSearch[0].title,
            url: ytSearch[0].url,
            duration: ytSearch[0].durationRaw || formatMs(ytSearch[0].durationInSec * 1000),
            durationMs: ytSearch[0].durationInSec * 1000,
            thumbnail: ytSearch[0].thumbnails[0]?.url || "",
            requester,
            source: 'youtube'
          })];
        }
        throw spErr;
      }
    }

    if (queryType === 'sp_playlist' || queryType === 'sp_album') {
      try {
        const spData = await play.spotify(query);
        const tracks = await spData.all_tracks();
        return tracks.map(track => new Track({
          title: `${track.name} - ${track.artists.map(a => a.name).join(', ')}`,
          url: null,
          duration: formatMs(track.durationInMs),
          durationMs: track.durationInMs,
          thumbnail: track.thumbnail?.url || spData.thumbnail?.url || "",
          requester,
          source: 'spotify',
          spotifyUrl: track.url || query
        }));
      } catch (spErr) {
        console.error("Spotify playlist/album search failed:", spErr);
        throw new Error("Spotify çalma listesi yüklenemedi. Spotify API geçici olarak yanıt vermiyor olabilir.");
      }
    }

    // Plain search query
 const searchResult = await play.search(query, { limit: 1 });
 if (!searchResult || searchResult.length === 0) return [];

 return searchResult
   .filter(video => video && video.title && video.url)
   .map(video => new Track({
     title: video.title,
     url: video.url,
     duration: video.durationRaw || formatMs(video.durationInSec * 1000),
     durationMs: video.durationInSec * 1000,
     thumbnail: video.thumbnails[0]?.url || "",
     requester,
     source: 'youtube'
   }));
  } catch (error) {
    console.error("Search general error:", error);
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
  search,
  resolveSpotifyTrack,
  formatMs
};
