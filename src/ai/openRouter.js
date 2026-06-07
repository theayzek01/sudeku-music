const aiConfig = require('./aiConfig');

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

class OpenRouterClient {
  constructor(options = {}) {
    this.provider = options.provider || aiConfig.provider || 'openrouter';
    this.baseUrl = (options.baseUrl || aiConfig.openai.baseUrl).replace(/\/$/, '');
    this.model = options.model || aiConfig.openai.model;
    this.timeoutMs = options.timeoutMs || aiConfig.openai.timeoutMs;
    this.apiKeys = this.normalizeApiKeys(options.apiKeys || options.apiKey || aiConfig.openai.apiKeys || aiConfig.openai.apiKey);
    this.apiKeyIndex = 0;
    this.apiKey = this.apiKeys[0] || '';
  }

  normalizeApiKeys(input) {
    if (Array.isArray(input)) return unique(input.map(x => String(x || '').trim()));
    return unique(String(input || '').split(/[\s,]+/).map(x => x.trim()));
  }

  currentApiKey() {
    return this.apiKeys[this.apiKeyIndex] || this.apiKey || '';
  }

  headers(apiKey = this.currentApiKey()) {
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY veya OPENROUTER_API_KEYS tanımlı değil.');
    }

    return {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
      'http-referer': 'https://localhost',
      'x-title': 'Sudeku Music'
    };
  }

  isRetryableStatus(status) {
    return [401, 402, 403, 408, 409, 429, 500, 502, 503, 504].includes(status);
  }

  async requestWithKey(path, body, timeoutMs, apiKey) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: this.headers(apiKey),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        const error = new Error(`OpenRouter HTTP ${res.status}: ${text.slice(0, 300)}`);
        error.status = res.status;
        error.retryWithNextKey = this.isRetryableStatus(res.status);
        throw error;
      }

      return await res.json();
    } catch (error) {
      if (error.name === 'AbortError') error.retryWithNextKey = true;
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async request(path, body, timeoutMs = this.timeoutMs) {
    if (!this.apiKeys.length) this.headers();

    const errors = [];
    for (let offset = 0; offset < this.apiKeys.length; offset++) {
      const keyIndex = (this.apiKeyIndex + offset) % this.apiKeys.length;
      const apiKey = this.apiKeys[keyIndex];

      try {
        const data = await this.requestWithKey(path, body, timeoutMs, apiKey);
        this.apiKeyIndex = keyIndex;
        this.apiKey = apiKey;
        return data;
      } catch (error) {
        errors.push(error.message);
        if (!error.retryWithNextKey || offset === this.apiKeys.length - 1) {
          if (error.retryWithNextKey && errors.length > 1) {
            throw new Error(`OpenRouter tum API key denemeleri basarisiz: ${errors.join(' | ')}`);
          }
          throw error;
        }
        console.warn(`[AI] API key ${keyIndex + 1}/${this.apiKeys.length} basarisiz (${error.status || error.name || 'hata'}), siradaki deneniyor.`);
      }
    }

    throw new Error('OpenRouter API istegi basarisiz.');
  }

  async health() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        signal: controller.signal,
        headers: this.headers(),
      });

      if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, model: this.model, provider: this.provider };
      return { ok: true, model: this.model, provider: this.provider };
    } catch (error) {
      return { ok: false, error: error.message, model: this.model, provider: this.provider };
    } finally {
      clearTimeout(timer);
    }
  }

  async chat(messages, options = {}) {
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
}

module.exports = { OpenRouterClient };
