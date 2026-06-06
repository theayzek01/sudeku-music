const aiConfig = require('./aiConfig');

class OllamaClient {
  constructor(options = {}) {
    this.provider = options.provider || aiConfig.provider || 'ollama';
    this.baseUrl = (options.baseUrl || (this.provider === 'openai' ? aiConfig.openai.baseUrl : aiConfig.ollama.baseUrl)).replace(/\/$/, '');
    this.model = options.model || (this.provider === 'openai' ? aiConfig.openai.model : aiConfig.ollama.model);
    this.timeoutMs = options.timeoutMs || (this.provider === 'openai' ? aiConfig.openai.timeoutMs : aiConfig.ollama.timeoutMs);
    this.apiKey = options.apiKey || (this.provider === 'openai' ? aiConfig.openai.apiKey : '');
  }

  async request(path, body, timeoutMs = this.timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.provider === 'openai' ? {
            ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
            'x-title': 'Sudeku Music',
            'http-referer': 'https://localhost'
          } : {}),
        },
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
      if (this.provider === 'openai') {
        const res = await fetch(`${this.baseUrl}/models`, {
          signal: controller.signal,
          headers: this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {},
        });
        if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, model: this.model };
        return { ok: true, model: this.model, provider: this.provider };
      }

      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: controller.signal });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      const data = await res.json();
      const models = Array.isArray(data.models) ? data.models.map(x => x.name) : [];
      return { ok: true, model: this.model, modelInstalled: models.includes(this.model), models, provider: this.provider };
    } catch (error) {
      return { ok: false, error: error.message, model: this.model };
    } finally {
      clearTimeout(timer);
    }
  }

  async chat(messages, options = {}) {
    if (this.provider === 'openai') {
      const body = {
        model: this.model,
        messages,
        temperature: options.temperature ?? aiConfig.openai.temperature,
        top_p: options.topP ?? aiConfig.openai.topP,
        max_tokens: options.numPredict ?? aiConfig.openai.numPredict,
      };
      const data = await this.request('/chat/completions', body, options.timeoutMs || this.timeoutMs);
      return String(data?.choices?.[0]?.message?.content || '').trim();
    }

    const body = {
      model: this.model,
      messages,
      stream: false,
      options: {
        temperature: options.temperature ?? aiConfig.ollama.temperature,
        top_p: options.topP ?? aiConfig.ollama.topP,
        repeat_penalty: options.repeatPenalty ?? aiConfig.ollama.repeatPenalty,
        num_ctx: options.numCtx ?? aiConfig.ollama.numCtx,
        num_predict: options.numPredict ?? aiConfig.ollama.numPredict,
      },
    };
    const data = await this.request('/api/chat', body, options.timeoutMs || this.timeoutMs);
    return String(data?.message?.content || '').trim();
  }
}

module.exports = { OllamaClient };
