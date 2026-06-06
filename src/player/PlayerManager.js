const Queue = require('./Queue');

class PlayerManager {
  constructor(client) {
    this.client = client;
    this.queues = new Map();

    // Listen to voice state updates to dynamically handle moves and disconnects
    this.client.on('voiceStateUpdate', (oldState, newState) => {
      if (newState.member.id === this.client.user.id) {
        const queue = this.getQueue(newState.guild.id);
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
    }
    return queue;
  }

  deleteQueue(guildId) {
    this.queues.delete(guildId);
  }

  getAllQueuesState() {
    const states = {};
    for (const [guildId, queue] of this.queues.entries()) {
      states[guildId] = queue.getState();
    }
    return states;
  }
}

module.exports = PlayerManager;
