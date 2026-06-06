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
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { resolveSpotifyTrack, formatMs, Track, searchYoutube } = require('./search');
const { getFfmpegPath } = require('./ytDlp');
const Database = require('../database');

const GLOBAL_EMOJIS = require('../utils/emojis');

const EMOJIS = {
  get spotify() { return GLOBAL_EMOJIS.spotify; },
  get youtube() { return GLOBAL_EMOJIS.youtube; },
  get loading() { return GLOBAL_EMOJIS.loading; },
  get verify() { return GLOBAL_EMOJIS.verify; },
  get tick() { return GLOBAL_EMOJIS.tick; },
  get cross() { return GLOBAL_EMOJIS.cross; },
  get note() { return GLOBAL_EMOJIS.note; },
  get voice() { return GLOBAL_EMOJIS.voice; },
  get mute() { return GLOBAL_EMOJIS.mute; },
  get moon() { return GLOBAL_EMOJIS.moon; },
  get status() { return GLOBAL_EMOJIS.status; },
  get fillStart() { return GLOBAL_EMOJIS.barFillStart; },
  get fill() { return GLOBAL_EMOJIS.barFill; },
  get fillEnd() { return GLOBAL_EMOJIS.barFillEnd; },
  get empty() { return GLOBAL_EMOJIS.barEmpty; },
  get emptyEnd() { return GLOBAL_EMOJIS.barEmptyEnd; },
  get arrowLeft() { return GLOBAL_EMOJIS.prev; },
  get arrowRight() { return GLOBAL_EMOJIS.skip; },
  get play() { return GLOBAL_EMOJIS.play; },
  get pause() { return GLOBAL_EMOJIS.pause; },
  get stop() { return GLOBAL_EMOJIS.stop; },
  get loop() { return GLOBAL_EMOJIS.loop; },
  get autoplay() { return GLOBAL_EMOJIS.pip; }
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
    this.voiceChannelStatus = null;

    this.playGeneration = 0;

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
    const guild = this.client.guilds.cache.get(this.guildId);
    if (!guild) {
      throw new Error(`Guild not found in cache for ${this.guildId}`);
    }

    this.connection = joinVoiceChannel({
      channelId: this.voiceChannelId,
      guildId: this.guildId,
      adapterCreator: guild.voiceAdapterCreator
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
      void this.playNext().catch(nextErr => {
        console.error(`[Queue] playNext failed after player error in ${this.guildId}:`, nextErr);
      });
    });
  }

    async playTrack(track, seekSeconds = 0) {
    const generation = ++this.playGeneration;
    this.stopPlaybackTicker();
    if (seekSeconds === 0) {
      await this.disableOldMessageButtons();
    }
    this.cleanupStreams();

    this.currentTrack = track;
    this.playbackTimeMs = seekSeconds * 1000;

    try {
      let playUrl = track.url || track.resolvedUrl;

      if (track.source === 'spotify' && (!playUrl || !playUrl.startsWith('http'))) {
        const parts = track.title.split(' - ');
        const resolved = await resolveSpotifyTrack(parts[0], parts.slice(1).join(' ') || '');
        if (!resolved) {
          throw new Error("Spotify track could not be resolved on YouTube.");
        }
        track.resolvedUrl = resolved;
        playUrl = resolved;
      }

      if (!playUrl || typeof playUrl !== 'string' || (!playUrl.startsWith('http://') && !playUrl.startsWith('https://'))) {
        throw new Error(`Geçersiz veya eksik oynatma adresi (URL): ${playUrl}`);
      }

      // Generate the stream (with yt-dlp fallback)
      let directUrl = track.directUrl || '';

    if (!directUrl) {
      try {
        directUrl = await ytDlp.getDirectAudioUrl(playUrl);
      } catch (ytDlpErr) {
        console.error('[Queue] yt-dlp stream URL alınamadı:', ytDlpErr.message || ytDlpErr);
        throw new Error(`Yayın başlatılamadı: ${ytDlpErr.message}`);
      }
    } else {
      console.log(`[Queue] Ultra-Low Latency: playing using pre-fetched stream URL for track: ${track.title}`);
    }

    if (generation !== this.playGeneration) {
      return;
    }

    const ffmpegArgs = [];
    if (seekSeconds > 0) {
      ffmpegArgs.push('-ss', String(seekSeconds));
    }
    ffmpegArgs.push(
      '-reconnect', '1',
      '-reconnect_streamed', '1',
      '-reconnect_delay_max', '5',
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

    const ffmpegPath = getFfmpegPath();
    if (!ffmpegPath) {
      throw new Error('ffmpeg bulunamadı. Lütfen ffmpeg kurulu olsun veya ffmpeg-static paketini tamamlayın.');
    }
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

    if (generation !== this.playGeneration) {
      this.cleanupStreams();
      return;
    }

    this.player.play(this.resource);

    await this.updateVoiceChannelStatus().catch(() => {});

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

      // Announce the song in chat with a lightweight embed & control buttons
      if (seekSeconds === 0 && this.textChannel) {
        this.nowPlayingMessage = await this.textChannel.send({
          embeds: [{
            title: 'Şu An Çalıyor',
            description: `${EMOJIS.note} [**${track.title}**](${track.url || track.spotifyUrl})\n\n**Süre:** \`${track.duration}\`\n**İsteyen:** <@${track.requester.id}>`,
            color: 0x5a189a,
            thumbnail: track.thumbnail ? { url: track.thumbnail } : undefined,
            footer: { text: track.source === 'spotify' ? 'Spotify çözümlendi' : 'YouTube akışı' }
          }],
          components: this.getControlRows()
        });
      }

      // Legacy fallback kept disabled to avoid duplicate/canvas work
      try {
      if (false && seekSeconds === 0 && this.textChannel) {
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
      void this.playNext().catch(nextErr => {
        console.error(`[Queue] playNext failed after track error in ${this.guildId}:`, nextErr);
      });
    }
  }

  getControlRows() {
    const prevButton = new ButtonBuilder()
      .setCustomId('music_prev')
      .setEmoji(EMOJIS.arrowLeft)
      .setLabel('Önceki')
      .setStyle(ButtonStyle.Secondary);

    const playPauseButton = new ButtonBuilder()
      .setCustomId('music_play_pause')
      .setEmoji(this.paused ? EMOJIS.play : EMOJIS.pause)
      .setLabel(this.paused ? 'Devam' : 'Duraklat')
      .setStyle(ButtonStyle.Secondary);

    const skipButton = new ButtonBuilder()
      .setCustomId('music_skip')
      .setEmoji(EMOJIS.arrowRight)
      .setLabel('İleri')
      .setStyle(ButtonStyle.Secondary);

    const stopButton = new ButtonBuilder()
      .setCustomId('music_stop')
      .setEmoji(EMOJIS.stop)
      .setLabel('Durdur')
      .setStyle(ButtonStyle.Secondary);

    const row1 = new ActionRowBuilder().addComponents(prevButton, playPauseButton, skipButton, stopButton);

    const loopLabel = this.loopMode === 0 ? 'Döngü: Kapalı' : this.loopMode === 1 ? 'Döngü: Şarkı' : 'Döngü: Sıra';
    const loopButton = new ButtonBuilder()
      .setCustomId('music_loop')
      .setEmoji(EMOJIS.loop)
      .setLabel(loopLabel)
      .setStyle(this.loopMode === 0 ? ButtonStyle.Secondary : ButtonStyle.Primary);

    const autoplayLabel = `Oto-Oynat: ${this.autoplay ? 'Açık' : 'Kapalı'}`;
    const autoplayButton = new ButtonBuilder()
      .setCustomId('music_autoplay')
      .setEmoji(EMOJIS.autoplay)
      .setLabel(autoplayLabel)
      .setStyle(this.autoplay ? ButtonStyle.Primary : ButtonStyle.Secondary);

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

  async updateVoiceChannelStatus() {
    const guild = this.client.guilds.cache.get(this.guildId);
    const channel = guild?.channels.cache.get(this.voiceChannelId);
    const me = guild?.members?.me || await guild?.members?.fetchMe?.().catch(() => null);

    if (!channel || typeof channel.setStatus !== 'function') return;
    if (!me?.permissions?.has(PermissionFlagsBits.ManageChannels)) return;
    if (!this.currentTrack) return;

    const statusText = `${EMOJIS.note} ${this.currentTrack.title}`.slice(0, 60);
    if (this.voiceChannelStatus === statusText) return;

    try {
      await channel.setStatus(statusText);
      this.voiceChannelStatus = statusText;
    } catch {
      // ignore permission/API failures
    }
  }

  async clearVoiceChannelStatus() {
    const guild = this.client.guilds.cache.get(this.guildId);
    const channel = guild?.channels.cache.get(this.voiceChannelId);
    const me = guild?.members?.me || await guild?.members?.fetchMe?.().catch(() => null);

    if (!channel || typeof channel.setStatus !== 'function') return;
    if (!me?.permissions?.has(PermissionFlagsBits.ManageChannels)) return;

    try {
      await channel.setStatus(null);
      this.voiceChannelStatus = null;
    } catch {
      // ignore permission/API failures
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
      void this.playTrack(this.currentTrack).catch(err => {
        console.error(`[Queue] Loop replay failed in ${this.guildId}:`, err);
      });
    } else if (this.loopMode === 2 && this.currentTrack) {
      // Loop queue
      this.tracks.push(this.currentTrack);
      void this.playNext().catch(err => {
        console.error(`[Queue] Loop queue advance failed in ${this.guildId}:`, err);
      });
    } else {
      void this.playNext().catch(err => {
        console.error(`[Queue] playNext failed in ${this.guildId}:`, err);
      });
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
      this.playbackTimeMs = 0;
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
      void this.playNext().catch(err => {
        console.error(`[Queue] Initial playNext failed in ${this.guildId}:`, err);
      });
    } else {
      this.broadcastState();
    }
  }

  skip() {
    this.playGeneration++;
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
    this.playGeneration++;
    this.tracks = [];
    this.currentTrack = null;
    this.playbackTimeMs = 0;
    this.cleanupStreams();
    this.player.stop();
    this.disableOldMessageButtons();
    void this.clearVoiceChannelStatus();
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
    this.playbackInterval = setInterval(() => {
      if (this.resource && !this.paused) {
        this.playbackTimeMs += 1000;
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
        query = parts.length > 1 ? `${parts[0]} ${parts.slice(1).join(' ')}` : lastTrack.title;
      } else {
        try {
          const info = await ytDlp.getVideoInfo(lastTrack.url || lastTrack.resolvedUrl);
          query = info.channel || info.uploader || lastTrack.title;
        } catch {
          query = lastTrack.title;
        }
      }

      if (!query) return null;

      const searchResult = await searchYoutube(`${query} music`, 10, this.client.user);
      const historyUrls = this.history.map(t => t.url).filter(Boolean);
      const queueUrls = this.tracks.map(t => t.url).filter(Boolean);
      const excludeUrls = [lastTrack.url, lastTrack.resolvedUrl, ...historyUrls, ...queueUrls].filter(Boolean);

      const candidate = searchResult.find(track => track.url && !excludeUrls.includes(track.url));
      if (candidate) {
        return new Track({
          title: candidate.title,
          url: candidate.url,
          duration: candidate.duration,
          durationMs: candidate.durationMs,
          thumbnail: candidate.thumbnail,
          requester: this.client.user,
          source: 'youtube'
        });
      }
    } catch (err) {
      console.error('Autoplay track generation error:', err.message || err);
    }
    return null;
  }

  destroy() {
    this.stopPlaybackTicker();
    this.disableOldMessageButtons();
    this.cleanupStreams();
    void this.clearVoiceChannelStatus();
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
    return;
  }

  async seek(seconds) {
    if (!this.currentTrack) return false;
    await this.playTrack(this.currentTrack, seconds);
    return true;
  }

  async setFilter(filterName) {
    const FILTERS = {
      clean: 'highpass=f=80,lowpass=f=16000,volume=1.0',
      clarity: 'highpass=f=120,lowpass=f=15000,equalizer=f=3200:t=q:w=1:g=3,volume=1.08',
      bassboost: 'bass=g=14:f=100:w=0.65,volume=1.05',
      deepbass: 'bass=g=20:f=75:w=0.55,volume=1.08',
      vocalboost: 'highpass=f=120,lowpass=f=14000,equalizer=f=3200:t=q:w=1:g=5,volume=1.12',
      vocalcut: 'stereotools=mlev=0.05',
      radio: 'highpass=f=250,lowpass=f=3500,acompressor=threshold=-18dB:ratio=3:attack=5:release=80,volume=1.1',
      nightcore: 'asetrate=48000*1.22,aresample=48000,atempo=1.01',
      vaporwave: 'asetrate=48000*0.82,aresample=48000',
      '8d': 'apulsator=hz=0.08',
      echo: 'aecho=0.8:0.9:60:0.35',
      speedup: 'atempo=1.3',
      slowmo: 'atempo=0.82'
    };

    if (!filterName || filterName === 'none' || filterName === 'clear' || filterName === 'normal') {
      this.filter = null;
      this.filterString = null;
      this.playbackTimeMs = Math.floor(this.playbackTimeMs || 0);
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
