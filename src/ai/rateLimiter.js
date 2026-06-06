class RateLimiter {
  constructor() {
    this.buckets = new Map();
  }

  check(key, { limit = 8, windowMs = 60000 } = {}) {
    const now = Date.now();
    const bucket = this.buckets.get(key) || [];
    const fresh = bucket.filter(t => now - t < windowMs);
    if (fresh.length >= limit) {
      this.buckets.set(key, fresh);
      return { ok: false, retryAfterMs: windowMs - (now - fresh[0]) };
    }
    fresh.push(now);
    this.buckets.set(key, fresh);
    return { ok: true, remaining: limit - fresh.length };
  }

  sweep() {
    const now = Date.now();
    for (const [key, rows] of this.buckets) {
      const fresh = rows.filter(t => now - t < 120000);
      if (fresh.length) this.buckets.set(key, fresh);
      else this.buckets.delete(key);
    }
  }
}

module.exports = new RateLimiter();
