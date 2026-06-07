const Queue = require('./Queue');

class PlayerManager {
  constructor(client) {
    this.client = client;
    this.queues = new Map();

    // Listen to voice state updates to dynamically handle moves and disconnects
    this.client.on('voiceStateUpdate', (oldState, newState) => {
      if (newState.id === this.client.user?.id) {
        const queue = this.getQueue(newState.guild?.id);
        if (queue) {
          if (!newState.channelId) {
            // Bot was disconnected from voice channel
            queue.destroy();
          } else {
            // Bot was moved to another channel
            queue.voiceChannelId = newState.channelId;
            queue.broadcastState();
          }
        }
      }
    });
  }

  getQueue(guildId) {
    return this.queues.get(guildId);
  }

  getOrCreateQueue(guildId, voiceChannelId, textChannel) {
    let queue = this.queues.get(guildId);
    if (!queue) {
      queue = new Queue(this.client, guildId, voiceChannelId, textChannel, this);
      this.queues.set(guildId, queue);
    } else {
      if (queue.voiceChannelId && queue.voiceChannelId !== voiceChannelId) {
        throw new Error('Bot zaten başka bir ses kanalında çalıyor. Aynı kanala girip tekrar dene.');
      }
      queue.textChannel = textChannel || queue.textChannel;
    }
    return queue;
  }

  deleteQueue(guildId) {
    this.queues.delete(guildId);
    this.updateActivity();
  }

  getAllQueuesState() {
    const states = {};
    for (const [guildId, queue] of this.queues.entries()) {
      states[guildId] = queue.getState();
    }
    return states;
  }

  updateActivity() {
    let currentTrack = null;
    for (const queue of this.queues.values()) {
      if (queue.currentTrack && queue.player?.state?.status !== 'idle') {
        currentTrack = queue.currentTrack;
        break;
      }
    }

    if (currentTrack) {
      const title = currentTrack.title.length > 100 ? currentTrack.title.slice(0, 97) + '...' : currentTrack.title;
      this.client.user.setActivity({ name: title, type: 2 }).catch(() => {});
    } else {
      this.client.user.setActivity({ name: 'Sudeku Music | /play', type: 2 }).catch(() => {});
    }
  }
}

module.exports = PlayerManager;
