const {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
  VoiceConnectionDisconnectReason,
  NoSubscriberBehavior
} = require('@discordjs/voice');
const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const play = require('play-dl');
const { resolveSpotifyTrack, formatMs } = require('./search');
const { generateNowPlayingCard } = require('./canvasGenerator');
const Database = require('../database');
const https = require('https');
const { exec, spawn } = require('child_process');
const fs = require('fs');

function getYtDlpCommand() {
  const possiblePaths = [
    'C:\\Users\\ozenc\\AppData\\Local\\Python\\pythoncore-3.14-64\\Scripts\\yt-dlp.exe',
    process.env.YT_DLP_PATH
  ];
  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
      return `"${p}"`;
    }
  }
  return 'yt-dlp';
}
function getStreamWithYtDlp(ytUrl) {
  const ytDlpCmd = getYtDlpCommand().replace(/"/g, '');
  const child = spawn(ytDlpCmd, [
    '-f', 'bestaudio',
    '--no-playlist',
    '--buffer-size', '16K',
    '-o', '-',
    ytUrl
  ], { stdio: ['ignore', 'pipe', 'ignore'] });

  child.stdout.childProcess = child;
  return child.stdout;
}

function getDirectUrlWithYtDlp(ytUrl) {
  return new Promise((resolve, reject) => {
    const ytDlpCmd = getYtDlpCommand();
    const cmd = `${ytDlpCmd} -f bestaudio -g "${ytUrl}"`;
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(err);
      const url = stdout.trim();
      if (!url) return reject(new Error("No URL returned from yt-dlp"));
      resolve(url);
    });
  });
}

function getStreamFromUrl(directUrl) {
  return new Promise((resolve, reject) => {
    const req = https.get(directUrl, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to get stream: HTTP ${res.statusCode}`));
        return;
      }
      resolve(res);
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}

const EMOJIS = {
  spotify: "<:kanserspotify:1473947599256944751>",
  youtube: "<a:kanseryoutube:1473947604432977941>",
  loading: "<a:kanserload:1473947555283865765>",
  verify: "<a:kanserVerify:1473947440553136178>",
  tick: "<:kansertik:1500939716961505372>",
  cross: "<:kanserred:1473947453471457483>",
  note: "<a:kansernote:1445409966197313656>",
  voice: "<:kanservcb:1473947473197269084>",
  mute: "<:kanservmute:1500941934858866858>",
  moon: "<a:kansermoon:1459736359437598741>",
  status: "<:kanserstatus:1500946084749381663>",
  fillStart: "<a:kanserfillstart:1473947582991564800>",
  fill: "<a:kanserfill:1473947575014002728>",
  fillEnd: "<a:kanserfillend:1473947578478362656>",
  empty: "<:kanserempty:1473947567443410974>",
  emptyEnd: "<:kanseremptyend:1473947571226677288>",
  arrowLeft: "1511537892420223139",
  arrowRight: "1511537893938561064",
  play: "1511537879359164446",
  pause: "1511537887781453824",
  stop: "1473947453471457483",
  loop: "1511537884174221393",
  autoplay: "1511537885755740221"
};

class Queue {
  constructor(client, guildId, voiceChannelId, textChannel, playerManager) {
    this.client = client;
    this.guildId = guildId;
    this.voiceChannelId = voiceChannelId;
    this.textChannel = textChannel;
    this.playerManager = playerManager;

    this.tracks = [];
    this.currentTrack = null;
    this.history = [];
    this.volume = 80;
    this.loopMode = 0; // 0 = off, 1 = track, 2 = queue
    this.paused = false;
    this.autoplay = false;

    this.filter = null;
    this.filterString = null;

    this.connection = null;
    this.player = null;
    this.resource = null;
    this.currentStream = null;
    this.playbackTimeMs = 0;
    this.playbackInterval = null;
    this.disconnectTimeout = null;
    this.nowPlayingMessage = null;

    this.initVoice();
  }

  cleanupStreams() {
    if (this.currentStream) {
      try {
        if (this.currentStream.childProcess) {
          this.currentStream.childProcess.kill('SIGKILL');
        }
        if (typeof this.currentStream.destroy === 'function') {
          this.currentStream.destroy();
        }
      } catch (e) {
        console.error("[Queue] Error destroying currentStream:", e);
      }
      this.currentStream = null;
    }
    if (this.resource) {
      try {
        if (this.resource.playStream && typeof this.resource.playStream.destroy === 'function') {
          this.resource.playStream.destroy();
        }
      } catch (e) {
        console.error("[Queue] Error destroying resource playStream:", e);
      }
      this.resource = null;
    }
  }

  initVoice() {
    this.connection = joinVoiceChannel({
      channelId: this.voiceChannelId,
      guildId: this.guildId,
      adapterCreator: this.client.guilds.cache.get(this.guildId).voiceAdapterCreator
    });

    this.player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play
      }
    });
    this.connection.subscribe(this.player);

    this.rejoinAttempts = 0;

    // Set up connection event listeners
    this.connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
      console.warn(`[Voice Connection] Disconnected from channel in guild ${this.guildId}. Reason: ${newState.reason}, Close code: ${newState.closeCode}`);

      if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
        try {
          await entersState(this.connection, VoiceConnectionStatus.Connecting, 2000);
          console.log(`[Voice Connection] Reconnecting/Moved in guild ${this.guildId}.`);
        } catch {
          console.log(`[Voice Connection] Kicked/Disconnected in guild ${this.guildId}.`);
          this.destroy();
        }
      } else if (this.rejoinAttempts < 5) {
        this.rejoinAttempts++;
        const delay = this.rejoinAttempts * 2000;
        console.log(`[Voice Connection] Temporary disconnect in guild ${this.guildId}. Retrying in ${delay}ms... (Attempt ${this.rejoinAttempts}/5)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        try {
          if (this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
            this.connection.rejoin();
          }
        } catch (err) {
          console.error(`[Voice Connection] Rejoin attempt failed:`, err);
        }
      } else {
        console.warn(`[Voice Connection] Too many reconnect attempts failed in guild ${this.guildId}. Destroying queue.`);
        this.destroy();
      }
    });

    this.connection.on(VoiceConnectionStatus.Ready, () => {
      console.log(`[Voice Connection] Ready in guild ${this.guildId}.`);
      this.rejoinAttempts = 0;
    });

    // Set up player event listeners
    this.player.on(AudioPlayerStatus.Idle, () => {
      this.handleTrackEnd();
    });

    this.player.on(AudioPlayerStatus.Playing, () => {
      this.paused = false;
      this.startPlaybackTicker();
      this.updateControlButtons();
      this.broadcastState();
    });

    this.player.on(AudioPlayerStatus.Paused, () => {
      this.paused = true;
      this.stopPlaybackTicker();
      this.updateControlButtons();
      this.broadcastState();
    });

    this.player.on('error', (err) => {
      console.error(`Player Error in guild ${this.guildId}:`, err);
      this.textChannel?.send({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Şarkı yürütülürken hata oluştu!** Sıradaki şarkıya geçiliyor.`
        }]
      });
      this.playNext();
    });
  }

    async playTrack(track, seekSeconds = 0) {
    this.stopPlaybackTicker();
    if (seekSeconds === 0) {
      await this.disableOldMessageButtons();
    }
    this.cleanupStreams();

    this.currentTrack = track;
    this.playbackTimeMs = seekSeconds * 1000;

    try {
      let playUrl = track.url;

      // If it's Spotify, we resolve the search query to a YouTube stream
      if (track.source === 'spotify' && !track.resolvedUrl) {
        const resolved = await require('./search').resolveSpotifyTrack(track.title, "");
        if (!resolved) {
          throw new Error("Spotify track could not be resolved on YouTube.");
        }
        track.resolvedUrl = resolved;
        playUrl = resolved;
      } else if (track.source === 'spotify') {
        playUrl = track.resolvedUrl;
      }

      if (!playUrl || typeof playUrl !== 'string' || (!playUrl.startsWith('http://') && !playUrl.startsWith('https://'))) {
        throw new Error(`Geçersiz veya eksik oynatma adresi (URL): ${playUrl}`);
      }

      // Generate the stream (with yt-dlp fallback)
      let directUrl = '';

      try {
        console.log(`[Queue] play-dl ile stream aranıyor: ${playUrl}`);
        const stream = await require('play-dl').stream(playUrl, { quality: 2, discordPlayerCompatible: true });
        directUrl = stream.url;
      } catch (playDlErr) {
        console.warn(`[Queue] play-dl ile stream alınamadı, yt-dlp fallback kullanılıyor. Hata: ${playDlErr.message || playDlErr}`);
        try {
          console.log(`[Queue] yt-dlp ile doğrudan stream url alınıyor.`);
          directUrl = await new Promise((resolve, reject) => {
            const ytDlpCmd = require('path').join(process.env.YT_DLP_PATH || 'C:\\Users\\ozenc\\AppData\\Local\\Python\\pythoncore-3.14-64\\Scripts\\yt-dlp.exe');
            const { exec } = require('child_process');
            const cmd = `"${ytDlpCmd}" -f bestaudio -g "${playUrl}"`;
            exec(cmd, (err, stdout) => {
              if (err) return reject(err);
              resolve(stdout.trim());
            });
          });
        } catch (ytDlpErr) {
          console.error(`[Queue] yt-dlp fallback de başarısız oldu!`, ytDlpErr);
          throw new Error(`Yayın başlatılamadı (play-dl ve yt-dlp hatası): ${ytDlpErr.message}`);
        }
      }

      const ffmpegArgs = [];
      if (seekSeconds > 0) {
        ffmpegArgs.push('-ss', String(seekSeconds));
      }
      ffmpegArgs.push(
        '-i', directUrl,
        '-analyzeduration', '0',
        '-loglevel', '0',
        '-f', 's16le',
        '-ar', '48000',
        '-ac', '2'
      );

      if (this.filterString) {
        ffmpegArgs.push('-af', this.filterString);
      }

      const ffmpegPath = require('ffmpeg-static');
      const prism = require('prism-media');
      const transcoder = new prism.FFmpeg({
        binary: ffmpegPath,
        args: ffmpegArgs
      });

      this.currentStream = transcoder;
      this.resource = createAudioResource(transcoder, {
        inputType: 'raw',
        inlineVolume: true
      });

      this.resource.volume.setVolume(this.volume / 100);
      this.player.play(this.resource);

      // Register track played in database
      if (seekSeconds === 0) {
        try {
          Database.addTrackPlayed(
            this.guildId,
            track.requester.id,
            track.requester.username,
            track.requester.displayAvatarURL({ extension: 'png', size: 128 })
          );
        } catch (dbErr) {
          console.error("[Queue DB] Failed to record track play:", dbErr);
        }
      }

      // Announce the song in chat with beautiful canvas card & control buttons
      try {
      if (seekSeconds === 0 && this.textChannel) {
        try {
          const canvasBuffer = await generateNowPlayingCard(track, track.requester.username);
          const attachment = new AttachmentBuilder(canvasBuffer, { name: 'nowplaying.png' });
          const rows = this.getControlRows();

          this.nowPlayingMessage = await this.textChannel.send({
            files: [attachment],
            components: rows
          });
        } catch (err2) {
          // Fallback to text embed
          throw err2;
        }
      }
    } catch (canvasErr) {
          console.error("Canvas sending failed, sending basic embed:", canvasErr);
          const sourceIcon = track.source === 'spotify' ? EMOJIS.spotify : EMOJIS.youtube;
          this.nowPlayingMessage = await this.textChannel.send({
            embeds: [{
              title: `Şu An Çalıyor`,
              description: `${EMOJIS.note} [**${track.title}**](${track.url || track.spotifyUrl})\\n\\n**Süre:** \`${track.duration}\` | **İsteyen:** <@${track.requester.id}>`,
              thumbnail: { url: track.thumbnail },
              color: 0x5a189a
            }],
            components: this.getControlRows()
          });
        }
    this.broadcastState();
    } catch (err) {
      console.error(`Error playing track in guild ${this.guildId}:`, err);
      console.error("Track details:", JSON.stringify(track, null, 2));
      this.cleanupStreams();
      if (this.textChannel) {
        this.textChannel.send({
          embeds: [{
            color: 0xff3333,
            description: `${EMOJIS.cross} [**${track.title}**](${track.url || track.spotifyUrl}) oynatılamadı. Hata: \`${err.message}\``
          }]
        });
      }
      this.playNext();
    }
  }

  getControlRows() {
    const prevButton = new ButtonBuilder()
      .setCustomId('music_prev')
      .setEmoji(EMOJIS.arrowLeft)
      .setStyle(ButtonStyle.Secondary);

    const playPauseButton = new ButtonBuilder()
      .setCustomId('music_play_pause')
      .setEmoji(this.paused ? EMOJIS.play : EMOJIS.pause)
      .setStyle(ButtonStyle.Secondary);

    const skipButton = new ButtonBuilder()
      .setCustomId('music_skip')
      .setEmoji(EMOJIS.arrowRight)
      .setStyle(ButtonStyle.Secondary);

    const stopButton = new ButtonBuilder()
      .setCustomId('music_stop')
      .setEmoji(EMOJIS.stop)
      .setStyle(ButtonStyle.Secondary);

    const row1 = new ActionRowBuilder().addComponents(prevButton, playPauseButton, skipButton, stopButton);

    const loopLabel = this.loopMode === 0 ? 'Döngü: Kapalı' : this.loopMode === 1 ? 'Döngü: Şarkı' : 'Döngü: Sıra';
    const loopButton = new ButtonBuilder()
      .setCustomId('music_loop')
      .setEmoji(EMOJIS.loop)
      .setLabel(loopLabel)
      .setStyle(ButtonStyle.Secondary);

    const autoplayLabel = `Oto-Oynat: ${this.autoplay ? 'Açık' : 'Kapalı'}`;
    const autoplayButton = new ButtonBuilder()
      .setCustomId('music_autoplay')
      .setEmoji(EMOJIS.autoplay)
      .setLabel(autoplayLabel)
      .setStyle(ButtonStyle.Secondary);

    const row2 = new ActionRowBuilder().addComponents(loopButton, autoplayButton);

    return [row1, row2];
  }

  async updateControlButtons() {
    if (this.nowPlayingMessage) {
      try {
        const rows = this.getControlRows();
        await this.nowPlayingMessage.edit({ components: rows });
      } catch (err) {
        // Safe check
      }
    }
  }

  async disableOldMessageButtons() {
    if (this.nowPlayingMessage) {
      try {
        const components = this.nowPlayingMessage.components.map(row => {
          const updatedRow = ActionRowBuilder.from(row);
          updatedRow.components.forEach(btn => {
            btn.setDisabled(true);
          });
          return updatedRow;
        });
        await this.nowPlayingMessage.edit({ components });
      } catch (err) {
        // Safe check
      }
      this.nowPlayingMessage = null;
    }
  }

  handleTrackEnd() {
    this.stopPlaybackTicker();

    if (this.currentTrack) {
      this.history.push(this.currentTrack);
    }

    if (this.loopMode === 1 && this.currentTrack) {
      // Loop track
      this.playTrack(this.currentTrack);
    } else if (this.loopMode === 2 && this.currentTrack) {
      // Loop queue
      this.tracks.push(this.currentTrack);
      this.playNext();
    } else {
      this.playNext();
    }
  }

  async playNext() {
    if (this.tracks.length === 0) {
      if (this.autoplay && this.currentTrack) {
        const autoplayTrack = await this.getAutoplayTrack(this.currentTrack);
        if (autoplayTrack) {
          if (this.textChannel) {
            this.textChannel.send({
              embeds: [{
                description: `✨ **Otomatik Oynatma:** [**${autoplayTrack.title}**](${autoplayTrack.url}) sıraya eklendi.`,
                color: 0x5a189a
              }]
            });
          }
          this.tracks.push(autoplayTrack);
        }
      }
    }

    if (this.tracks.length === 0) {
      await this.disableOldMessageButtons();
      this.currentTrack = null;
      this.resource = null;
      this.broadcastState();

      // Auto-disconnect timeout of 3 minutes
      this.disconnectTimeout = setTimeout(() => {
        if (!this.currentTrack && this.tracks.length === 0) {
          if (this.textChannel) {
            this.textChannel.send({
              embeds: [{
                description: `${EMOJIS.moon} **Sırada şarkı kalmadığı için kanaldan ayrıldım.**`,
                color: 0x121214
              }]
            });
          }
          this.destroy();
        }
      }, 180000);

      return;
    }

    const nextTrack = this.tracks.shift();
    await this.playTrack(nextTrack);
  }

  async playPrevious() {
    if (this.history.length === 0) return false;
    const prev = this.history.pop();
    if (this.currentTrack) {
      this.tracks.unshift(this.currentTrack);
    }
    await this.playTrack(prev);
    return true;
  }

  addTrack(track) {
    if (Array.isArray(track)) {
      this.tracks.push(...track);
    } else {
      this.tracks.push(track);
    }

    if (!this.currentTrack) {
      this.playNext();
    } else {
      this.broadcastState();
    }
  }

  skip() {
    this.cleanupStreams();
    this.player.stop();
  }

  pause() {
    this.player.pause();
  }

  resume() {
    this.player.unpause();
  }

  stop() {
    this.tracks = [];
    this.currentTrack = null;
    this.cleanupStreams();
    this.player.stop();
    this.disableOldMessageButtons();
    this.broadcastState();
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(150, vol));
    if (this.resource && this.resource.volume) {
      this.resource.volume.setVolume(this.volume / 100);
    }
    this.broadcastState();
  }

  setLoopMode(mode) {
    this.loopMode = mode; // 0, 1, 2
    this.updateControlButtons();
    this.broadcastState();
  }

  shuffle() {
    for (let i = this.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
    }
    this.broadcastState();
  }

  clear() {
    this.tracks = [];
    this.broadcastState();
  }

  startPlaybackTicker() {
    this.stopPlaybackTicker();
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = null;
    }
    let tickCount = 0;
    this.playbackInterval = setInterval(async () => {
      if (this.resource && !this.paused) {
        this.playbackTimeMs += 1000;
        // Broadcast updates to dashboard every 1 second
        this.broadcastStateOnlyToWS();

        tickCount++;
        if (tickCount % 15 === 0) {
          await this.updateNowPlayingEmbed();
        }
      }
    }, 1000);
  }

  stopPlaybackTicker() {
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
  }

  getProgressBar(size = 12) {
    if (!this.currentTrack || this.currentTrack.durationMs === 0) return "";
    const progress = this.playbackTimeMs / this.currentTrack.durationMs;
    const progressBlocks = Math.round(size * Math.min(1, progress));

    let bar = "";
    if (progressBlocks > 0) {
      bar += EMOJIS.fillStart;
    } else {
      bar += EMOJIS.empty;
    }

    for (let i = 1; i < size - 1; i++) {
      if (i < progressBlocks) {
        bar += EMOJIS.fill;
      } else {
        bar += EMOJIS.empty;
      }
    }

    if (progressBlocks >= size) {
      bar += EMOJIS.fillEnd;
    } else {
      bar += EMOJIS.emptyEnd;
    }

    return bar;
  }

  async updateNowPlayingEmbed() {
    if (!this.nowPlayingMessage || !this.currentTrack) return;
    try {
      const track = this.currentTrack;
      const rows = this.getControlRows();
      const hasAttachment = this.nowPlayingMessage.attachments.size > 0;
      
      const embed = {
        title: `Şu An Çalıyor`,
        description: `${EMOJIS.note} [**${track.title}**](${track.url || track.spotifyUrl})\n\n${this.getProgressBar(15)} \`[${formatMs(this.playbackTimeMs)} / ${track.duration}]\`\n\n**İsteyen:** <@${track.requester.id}>`,
        color: 0x5a189a
      };

      if (hasAttachment) {
        embed.image = { url: 'attachment://nowplaying.png' };
      } else {
        embed.thumbnail = { url: track.thumbnail };
      }

      await this.nowPlayingMessage.edit({
        embeds: [embed],
        components: rows
      });
    } catch (err) {
      // Safe check
    }
  }

  setAutoplay(val) {
    this.autoplay = val;
    this.updateControlButtons();
    this.broadcastState();
  }

  async getAutoplayTrack(lastTrack) {
    if (!lastTrack) return null;
    try {
      let query = '';
      if (lastTrack.source === 'spotify') {
        const parts = lastTrack.title.split(' - ');
        query = parts[1] || parts[0];
      } else {
        try {
          const info = await play.video_basic_info(lastTrack.url);
          query = info.video_details.channel?.name || lastTrack.title;
        } catch (e) {
          query = lastTrack.title;
        }
      }

      if (!query) return null;

      const searchResult = await play.search(query, { limit: 10 });
      const historyUrls = this.history.map(t => t.url).filter(Boolean);
      const queueUrls = this.tracks.map(t => t.url).filter(Boolean);
      const excludeUrls = [lastTrack.url, lastTrack.resolvedUrl, ...historyUrls, ...queueUrls].filter(Boolean);

      const candidate = searchResult.find(v => v.url && !excludeUrls.includes(v.url));
      if (candidate) {
        const Track = lastTrack.constructor;
        return new Track({
          title: candidate.title,
          url: candidate.url,
          duration: candidate.durationRaw || "0:00",
          durationMs: candidate.durationInSec * 1000,
          thumbnail: candidate.thumbnails[0]?.url || "",
          requester: this.client.user,
          source: 'youtube'
        });
      }
    } catch (err) {
      console.error("Autoplay track generation error:", err);
    }
    return null;
  }

  destroy() {
    this.stopPlaybackTicker();
    this.disableOldMessageButtons();
    this.cleanupStreams();
    try {
      this.player.stop();
      this.connection.destroy();
    } catch (e) {}
    this.playerManager.deleteQueue(this.guildId);
  }

  getState() {
    return {
      guildId: this.guildId,
      voiceChannelId: this.voiceChannelId,
      currentTrack: this.currentTrack ? {
        title: this.currentTrack.title,
        url: this.currentTrack.url || this.currentTrack.spotifyUrl,
        duration: this.currentTrack.duration,
        durationMs: this.currentTrack.durationMs,
        thumbnail: this.currentTrack.thumbnail,
        requester: this.currentTrack.requester?.username || this.currentTrack.requester || "Bilinmeyen",
        source: this.currentTrack.source,
        playbackTimeMs: this.playbackTimeMs,
        progressBar: this.getProgressBar(15)
      } : null,
      tracks: this.tracks.map(t => ({
        title: t.title,
        url: t.url || t.spotifyUrl,
        duration: t.duration,
        requester: t.requester?.username || t.requester || "Bilinmeyen",
        source: t.source,
        thumbnail: t.thumbnail
      })),
      history: this.history.slice(-10).reverse().map(t => ({
        title: t.title,
        url: t.url || t.spotifyUrl,
        duration: t.duration,
        requester: t.requester?.username || t.requester || "Bilinmeyen",
        source: t.source,
        thumbnail: t.thumbnail
      })),
      volume: this.volume,
      loopMode: this.loopMode,
      paused: this.paused
    };
  }

  broadcastState() {
    // Send state to dashboard WebSocket
    if (this.playerManager.dashboardWS) {
      this.playerManager.dashboardWS.broadcastGuildState(this.guildId, this.getState());
    }
  }

  broadcastStateOnlyToWS() {
    if (this.playerManager.dashboardWS) {
      this.playerManager.dashboardWS.broadcastGuildState(this.guildId, {
        guildId: this.guildId,
        playbackTimeMs: this.playbackTimeMs,
        progressBar: this.getProgressBar(15),
        currentTrack: this.currentTrack ? {
          title: this.currentTrack.title,
          url: this.currentTrack.url || this.currentTrack.spotifyUrl,
          duration: this.currentTrack.duration,
          durationMs: this.currentTrack.durationMs,
          thumbnail: this.currentTrack.thumbnail,
          requester: this.currentTrack.requester.username,
          source: this.currentTrack.source,
          playbackTimeMs: this.playbackTimeMs,
          progressBar: this.getProgressBar(15)
        } : null
      });
    }
  }

  async seek(seconds) {
    if (!this.currentTrack) return false;
    await this.playTrack(this.currentTrack, seconds);
    return true;
  }

  async setFilter(filterName) {
    const FILTERS = {
      bassboost: 'bass=g=15:f=110:w=0.6',
      nightcore: 'asetrate=48000*1.25,aresample=48000',
      '8d': 'apulsator=hz=0.08',
      vaporwave: 'asetrate=48000*0.8,aresample=48000',
      karaoke: 'stereotools=mlev=0.03',
      speedup: 'atempo=1.5',
      slowmo: 'atempo=0.75'
    };

    if (!filterName || filterName === 'none' || filterName === 'clear') {
      this.filter = null;
      this.filterString = null;
    } else if (FILTERS[filterName]) {
      this.filter = filterName;
      this.filterString = FILTERS[filterName];
    } else {
      return false;
    }

    if (this.currentTrack) {
      const currentSecond = Math.floor(this.playbackTimeMs / 1000);
      await this.playTrack(this.currentTrack, currentSecond);
    }
    return true;
  }
}

module.exports = Queue;
