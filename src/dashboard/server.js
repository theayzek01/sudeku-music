const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');
const { ChannelType } = require('discord.js');
const { search } = require('../player/search');

class DashboardServer {
  constructor(client, playerManager, port = 3000) {
    this.client = client;
    this.playerManager = playerManager;
    this.port = port;

    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ noServer: true });

    this.setupExpress();
    this.setupWebSockets();

    // Register itself to PlayerManager
    this.playerManager.setDashboardWS(this);
  }

  setupExpress() {
    this.app.use(express.json());

    // Serve static files from public directory
    this.app.use(express.static(path.join(__dirname, '../../public')));
    
    // Serve Micro Icon Pack static assets
    this.app.use('/assets', express.static(path.join(__dirname, '../../assets/Micro Icon Pack')));

    // Redirect root to index.html
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../../public/index.html'));
    });

    // API: Get bot status & guilds
  this.app.get('/api/status', (req, res) => {
    const heapUsed = process.memoryUsage().heapUsed / 1024 / 1024;
    const rss = process.memoryUsage().rss / 1024 / 1024;
    const totalMem = os.totalmem() / 1024 / 1024 / 1024;
    const freeMem = os.freemem() / 1024 / 1024 / 1024;
    const usedMem = totalMem - freeMem;
    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model.replace(/\(R\)|\(TM\)/g, "").trim() : "Unknown CPU";
    const loadAvg = os.loadavg();
    const cpuUsagePct = ((loadAvg[0] / Math.max(1, os.cpus().length)) * 100).toFixed(1);

    res.json({
      username: this.client.user.username,
      avatar: this.client.user.displayAvatarURL(),
      guildsCount: this.client.guilds.cache.size,
      activePlayersCount: this.playerManager.queues.size,
      uptime: this.client.uptime,
      memory: `${heapUsed.toFixed(1)} MB (RSS: ${rss.toFixed(1)} MB)`,
      systemMemory: `${usedMem.toFixed(1)} GB / ${totalMem.toFixed(1)} GB`,
      cpu: `${Math.min(100, Math.max(0, parseFloat(cpuUsagePct))).toFixed(1)}% (${cpuModel})`,
      nodeVersion: process.version,
      ping: Math.round(this.client.ws.ping || 0)
    });
  });

  // API: Get detailed list of all guilds & channels
  this.app.get('/api/guilds', (req, res) => {
    const guilds = this.client.guilds.cache.map(guild => {
      const queue = this.playerManager.getQueue(guild.id);

      // Fetch text and voice channels for connection utility
      const voiceChannels = guild.channels.cache
        .filter(c => c.type === 2 || c.type === 13) // GuildVoice
        .map(c => ({ id: c.id, name: c.name }));

      const textChannels = guild.channels.cache
        .filter(c => c.type === 0 || c.type === 5) // GuildText
        .map(c => ({ id: c.id, name: c.name }));

      return {
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL() || 'https://cdn.discordapp.com/embed/avatars/0.png',
        hasActivePlayer: !!queue,
        voiceChannels,
        textChannels,
        currentState: queue ? queue.getState() : null,
        memberCount: guild.memberCount || 0,
        boostCount: guild.premiumSubscriptionCount || 0,
        boostTier: guild.premiumTier || 0
      };
    });

    // SORT: Active players first, then by memberCount descending
    guilds.sort((a, b) => {
      if (a.hasActivePlayer && !b.hasActivePlayer) return -1;
      if (!a.hasActivePlayer && b.hasActivePlayer) return 1;
      return b.memberCount - a.memberCount;
    });

    res.json(guilds);
  });

  // API: Search music
    this.app.get('/api/search', async (req, res) => {
      const query = req.query.q;
      if (!query) return res.status(400).json({ error: 'Missing query' });
      try {
        const results = await search(query, this.client.user);
        res.json(results);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // Catch-all route to serve dashboard SPA index
    this.app.use((req, res) => {
      res.sendFile(path.join(__dirname, '../../public/index.html'));
    });

    // Upgrade HTTP server to WebSocket
    this.server.on('upgrade', (request, socket, head) => {
      if (request.url.startsWith('/api/ws')) {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });
  }

  setupWebSockets() {
    this.wss.on('connection', (ws) => {
      ws.isAlive = true;
      ws.subscribedGuilds = new Set();

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);

          if (data.type === 'subscribe') {
            ws.subscribedGuilds.add(data.guildId);
            const queue = this.playerManager.getQueue(data.guildId);
            ws.send(JSON.stringify({
              type: 'state',
              guildId: data.guildId,
              state: queue ? queue.getState() : null
            }));
          }

          else if (data.type === 'unsubscribe') {
            ws.subscribedGuilds.delete(data.guildId);
          }

          // Command handling via websocket for zero lag
          else if (data.type === 'command') {
            const { guildId, action, value } = data;
            const queue = this.playerManager.getQueue(guildId);

            if (action === 'join') {
              const { voiceId, textId } = value;
              const guild = this.client.guilds.cache.get(guildId);
              if (guild) {
                const textChannel = guild.channels.cache.get(textId);
                const q = this.playerManager.getOrCreateQueue(guildId, voiceId, textChannel);
                q.broadcastState();
              }
              return;
            }

            if (!queue) return;

            switch (action) {
              case 'play':
                const tracks = await search(value, this.client.user);
                if (tracks.length > 0) {
                  queue.addTrack(tracks[0]); // Adds the first search result
                }
                break;
              case 'prev':
                await queue.playPrevious();
                break;
              case 'pause':
                queue.pause();
                break;
              case 'resume':
                queue.resume();
                break;
              case 'skip':
                queue.skip();
                break;
              case 'stop':
                queue.stop();
                break;
              case 'volume':
                queue.setVolume(parseInt(value));
                break;
              case 'loop':
                queue.setLoopMode(parseInt(value));
                break;
              case 'shuffle':
                queue.shuffle();
                break;
              case 'clear':
                queue.clear();
                break;
              case 'remove':
                if (queue.tracks[value]) {
                  queue.tracks.splice(value, 1);
                  queue.broadcastState();
                }
                break;
              case 'disconnect':
                queue.destroy();
                break;
            }
          }
        } catch (err) {
          console.error("WS Message handling error:", err);
        }
      });
    });

    // Ping loop to keep connections alive
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  broadcastGuildState(guildId, state) {
    const message = JSON.stringify({
      type: 'state',
      guildId,
      state
    });

    this.wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN && ws.subscribedGuilds.has(guildId)) {
        ws.send(message);
      }
    });
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`[Dashboard] Running at http://localhost:${this.port}`);
    });
  }
}

module.exports = DashboardServer;
