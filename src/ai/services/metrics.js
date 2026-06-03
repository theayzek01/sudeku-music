const os = require('os');

class Metrics {
  constructor() {
    this.startedAt = Date.now();
    this.counters = { messagesSeen: 0, aiRequests: 0, aiErrors: 0, replies: 0, reactions: 0 };
    this.lastErrors = [];
    this.lastReplies = [];
  }
  inc(key, by = 1) { this.counters[key] = (this.counters[key] || 0) + by; }
  error(scope, error) {
    this.inc('aiErrors');
    this.lastErrors.unshift({ t: new Date().toISOString(), scope, message: String(error?.message || error).slice(0, 500) });
    this.lastErrors = this.lastErrors.slice(0, 30);
  }
  reply(row) {
    this.inc('replies');
    this.lastReplies.unshift({ t: new Date().toISOString(), ...row });
    this.lastReplies = this.lastReplies.slice(0, 40);
  }
  snapshot(client) {
    return {
      uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
      counters: this.counters,
      process: { pid: process.pid, memory: process.memoryUsage(), node: process.version, platform: process.platform, cpuLoad: os.loadavg() },
      discord: client ? { guilds: client.guilds?.cache?.size || 0, users: client.users?.cache?.size || 0, wsPing: client.ws?.ping ?? null, ready: Boolean(client.isReady?.()) } : null,
      lastErrors: this.lastErrors,
      lastReplies: this.lastReplies,
    };
  }
}

module.exports = new Metrics();
