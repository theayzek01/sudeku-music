const aiConfig = require('../config/ai');

class OllamaClient {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || aiConfig.ollama.baseUrl).replace(/\/$/, '');
    this.model = options.model || aiConfig.ollama.model;
    this.timeoutMs = options.timeoutMs || aiConfig.ollama.timeoutMs;
  }

  async request(path, body, timeoutMs = this.timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Ollama HTTP ${res.status}: ${text.slice(0, 300)}`);
      }
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async health() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: controller.signal });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      const data = await res.json();
      const models = Array.isArray(data.models) ? data.models.map(x => x.name) : [];
      return { ok: true, model: this.model, modelInstalled: models.includes(this.model), models };
    } catch (error) {
      return { ok: false, error: error.message, model: this.model };
    } finally {
      clearTimeout(timer);
    }
  }

  async chat(messages, options = {}) {
    // API sınırlarını atlamak/NSFW açmak için sistem mesajı veya mesaj geçmişi enjekte edilebilir,
    // şu an persona kurallarından sağlanıyor
    const body = {
      model: this.model,
      messages,
      stream: false,
      options: {
        temperature: options.temperature ?? aiConfig.ollama.temperature,
        top_p: options.topP ?? aiConfig.ollama.topP,
        repeat_penalty: options.repeatPenalty ?? aiConfig.ollama.repeatPenalty,
        num_ctx: options.numCtx ?? aiConfig.ollama.numCtx,
        num_predict: options.numPredict ?? aiConfig.ollama.numPredict ?? 110,
      },
    };
    const data = await this.request('/api/chat', body);
    return String(data?.message?.content || '').trim();
  }
}

module.exports = { OllamaClient };
