const fs = require('fs');
const path = require('path');
const { ChannelType } = require('discord.js');
const aiConfig = require('../config/ai');
const { readJson, writeJsonAtomic } = require('./store');
const { embed } = require('./vectorMemory');

const MODEL_PATH = path.join(path.dirname(aiConfig.data.memoryPath), 'sudeStyleModel.json');

// Default initial styling settings extracted from original Sude data
const DEFAULT_STYLE = {
  lastScrapedAt: null,
  totalMessagesScraped: 0,
  targetUserId: '1392608176217522247',
  isScraping: false,
  progress: {
    currentGuild: '',
    currentChannel: '',
    channelsScraped: 0,
    messagesProcessed: 0,
    matchesFound: 0,
    status: 'idle' // idle, running, success, error
  },
  stats: {
    allLowercaseRate: 0.95,
    endPunctuationRate: 0.08,
    averageWordCount: 4.8,
    capitalizationHabit: 'lowercase', // 'lowercase', 'normal', 'caps'
    slangWords: ['şuan', 'fln', 'bence', 'ya', 'kanka', 'demi', 'bişey', 'valla', 'napıyon', 'yapıcam', 'gibi', 'böyle', 'öyle'],
    favEmojis: [],
    typoMappings: {
      "değil": "degil",
      "çünkü": "cünkü",
      "şey": "sey",
      "geliyor": "geliyo",
      "gidiyor": "gidiyo",
      "yapacağım": "yapıcam",
      "edeceğim": "edicem",
      "bir şey": "bişey",
      "her şey": "hersey",
      "şu an": "şuan",
      "geliyorum": "geliyom",
      "gidiyorum": "gidiyom",
      "yapıyorum": "yapıyom",
      "ediyorum": "ediyom",
      "istiyorum": "istiyom",
      "seviyorum": "seviyom",
      "geliyorsun": "geliyon",
      "gidiyorsun": "gidiyon",
      "yapıyorsun": "yapıyon",
      "ediyorsun": "ediyon",
      "istiyorsun": "istiyon",
      "olacağım": "olucam",
      "gideceğim": "gidicem",
      "geleceğim": "gelicem",
      "tamam": "tmm",
      "ne yapıyorsun": "napıyon",
      "ne yapıyosun": "napıyon",
      "evet": "evt",
      "hayır": "hyr",
      "peki": "pk"
    }
  },
  scrapedConversations: []
};

class StyleLearner {
  constructor() {
    this.model = readJson(MODEL_PATH, DEFAULT_STYLE);
    // Ensure all base structures are present
    if (!this.model.stats) this.model.stats = DEFAULT_STYLE.stats;
    if (!this.model.progress) this.model.progress = DEFAULT_STYLE.progress;
    if (!this.model.scrapedConversations) this.model.scrapedConversations = [];
    this.model.isScraping = false;
    this.model.progress.status = 'idle';

    // Auto seed on boot if empty to ensure Sude starts fully trained!
    if (this.model.totalMessagesScraped === 0) {
      this.preTrainFromDataset();
    }
  }

  save() {
    writeJsonAtomic(MODEL_PATH, this.model);
  }

  getStatus() {
    return {
      isScraping: this.model.isScraping,
      progress: this.model.progress,
      totalMessagesScraped: this.model.totalMessagesScraped,
      lastScrapedAt: this.model.lastScrapedAt,
      stats: this.model.stats
    };
  }

  async startScraping(client, targetUserId = '1392608176217522247') {
    if (this.model.isScraping) {
      console.warn('[SCRAPER] Already running!');
      return;
    }

    this.model.isScraping = true;
    this.model.targetUserId = targetUserId;
    this.model.progress = {
      currentGuild: 'Başlatılıyor...',
      currentChannel: '',
      channelsScraped: 0,
      messagesProcessed: 0,
      matchesFound: 0,
      status: 'running'
    };
    this.save();

    console.log(`[SCRAPER] Starting scraping for User ID: ${targetUserId}`);

    // Run scraper asynchronously
    this._runScrapingProcess(client, targetUserId).catch(err => {
      console.error('[SCRAPER RUN ERROR]', err);
      this.model.isScraping = false;
      this.model.progress.status = 'error';
      this.save();
    });
  }

  async _runScrapingProcess(client, targetUserId) {
    const guilds = Array.from(client.guilds.cache.values());
    const conversations = [];
    
    let totalChannels = 0;
    let processedChannelsCount = 0;

    // Count text channels
    for (const guild of guilds) {
      const channels = Array.from(guild.channels.cache.values());
      totalChannels += channels.filter(c => c.type === ChannelType.GuildText).length;
    }

    for (const guild of guilds) {
      this.model.progress.currentGuild = guild.name;
      this.save();
      console.log(`[SCRAPER] Scraping guild: ${guild.name}`);

      const channels = Array.from(guild.channels.cache.values()).filter(c => c.type === ChannelType.GuildText);

      for (const channel of channels) {
        this.model.progress.currentChannel = channel.name;
        this.save();
        console.log(`[SCRAPER] Reading channel: #${channel.name} in ${guild.name}`);

        try {
          // Verify permissions
          const permissions = channel.permissionsFor(client.user);
          if (!permissions || !permissions.has('ViewChannel') || !permissions.has('ReadMessageHistory')) {
            console.log(`[SCRAPER] Skipping #${channel.name} (No permissions)`);
            processedChannelsCount++;
            this.model.progress.channelsScraped = processedChannelsCount;
            this.save();
            continue;
          }

          // Fetch messages in batches (up to 300 messages per channel to keep it lightweight but informative)
          let lastId = null;
          let fetchedCount = 0;
          const maxMessagesToFetch = 300;

          while (fetchedCount < maxMessagesToFetch) {
            const options = { limit: 100 };
            if (lastId) options.before = lastId;

            const fetched = await channel.messages.fetch(options).catch(() => null);
            if (!fetched || fetched.size === 0) break;

            fetchedCount += fetched.size;
            this.model.progress.messagesProcessed += fetched.size;
            this.save();

            const msgArray = Array.from(fetched.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
            
            for (let i = 0; i < msgArray.length; i++) {
              const msg = msgArray[i];
              if (msg.author.id === targetUserId) {
                // We found Sude's message! Let's find what she was replying to.
                let contextMessage = null;

                // Case 1: Active reply
                if (msg.reference && msg.reference.messageId) {
                  try {
                    contextMessage = await channel.messages.fetch(msg.reference.messageId).catch(() => null);
                  } catch (e) {}
                }

                // Case 2: No active reply, let's look at the immediately preceding message in channel sent by someone else
                if (!contextMessage) {
                  for (let j = i - 1; j >= 0; j--) {
                    if (msgArray[j].author.id !== targetUserId && !msgArray[j].author.bot) {
                      contextMessage = msgArray[j];
                      break;
                    }
                  }
                }

                if (contextMessage && contextMessage.content.trim() && msg.content.trim()) {
                  conversations.push({
                    q: contextMessage.content.trim(),
                    a: msg.content.trim(),
                    timestamp: msg.createdAt.toISOString()
                  });
                  this.model.progress.matchesFound++;
                  this.save();
                }
              }
            }

            lastId = msgArray[0].id;
            // Delay slightly to prevent heavy rate limits
            await new Promise(r => setTimeout(r, 250));
          }

        } catch (err) {
          console.error(`[SCRAPER] Error in channel #${channel.name}:`, err.message);
        }

        processedChannelsCount++;
        this.model.progress.channelsScraped = processedChannelsCount;
        this.save();
      }
    }

    console.log(`[SCRAPER] Scraping finished! Scraped ${conversations.length} conversation turns.`);
    this.model.scrapedConversations = conversations;
    this.model.totalMessagesScraped = conversations.length;
    this.model.lastScrapedAt = new Date().toISOString();
    this.model.isScraping = false;
    this.model.progress.status = 'success';
    
    // Auto run style analysis on the gathered data
    this.analyzeStyle();
    this.save();
    
    // Auto integrate to vector memory/dataset
    this.integrateToDataset();
  }

  analyzeStyle() {
    console.log('[SCRAPER] Analyzing scraped messages for styling rules...');
    const conversations = this.model.scrapedConversations;
    if (conversations.length === 0) return;

    let lowercaseCount = 0;
    let endingPunctuationCount = 0;
    let wordCountSum = 0;
    const emojiFreq = {};
    const wordFreq = {};

    const customEmojiRegex = /<a?:\w{2,32}:\d{17,22}>/g;

    for (const turn of conversations) {
      const a = turn.a;
      wordCountSum += a.split(/\s+/).length;

      // Lowercase analysis
      if (a === a.toLowerCase()) {
        lowercaseCount++;
      }

      // Ending punctuation check
      if (/[.!?]$/.test(a.trim())) {
        endingPunctuationCount++;
      }

      // Extrapolate words
      const words = a.toLowerCase().match(/[a-zçğıöşü0-9]+/gi) || [];
      for (const w of words) {
        if (w.length > 2) {
          wordFreq[w] = (wordFreq[w] || 0) + 1;
        }
      }

      // Extrapolate custom emojis
      const emojis = a.match(customEmojiRegex) || [];
      for (const emo of emojis) {
        emojiFreq[emo] = (emojiFreq[emo] || 0) + 1;
      }
    }

    const total = conversations.length;
    this.model.stats.allLowercaseRate = Number((lowercaseCount / total).toFixed(4));
    this.model.stats.endPunctuationRate = Number((endingPunctuationCount / total).toFixed(4));
    this.model.stats.averageWordCount = Number((wordCountSum / total).toFixed(2));

    if (this.model.stats.allLowercaseRate > 0.8) {
      this.model.stats.capitalizationHabit = 'lowercase';
    } else if (this.model.stats.allLowercaseRate < 0.2) {
      this.model.stats.capitalizationHabit = 'normal';
    } else {
      this.model.stats.capitalizationHabit = 'hybrid';
    }

    // Top slang / filler words
    const topWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([w]) => w);
    
    // Merge found slang words with default ones
    const dynamicSlangs = new Set([...DEFAULT_STYLE.stats.slangWords, ...topWords]);
    this.model.stats.slangWords = Array.from(dynamicSlangs).slice(0, 50);

    // Top emojis
    const topEmojis = Object.entries(emojiFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([emo]) => emo);
    this.model.stats.favEmojis = topEmojis;

    console.log(`[SCRAPER] Analysis results:
      Lowercase Rate: ${this.model.stats.allLowercaseRate * 100}%
      End Punctuation Rate: ${this.model.stats.endPunctuationRate * 100}%
      Avg Words per Msg: ${this.model.stats.averageWordCount}
      Top Emojis: ${this.model.stats.favEmojis.join(', ') || 'yok'}
    `);
  }

  integrateToDataset() {
    console.log('[SCRAPER] Integrating scraped style pairs into the Vector/QA Dataset...');
    const datasetPath = aiConfig.data.datasetPath;
    const currentDataset = readJson(datasetPath, []);
    
    if (!Array.isArray(currentDataset) || currentDataset.length === 0) {
      console.warn('[SCRAPER] Main dataset is empty or invalid. Integration skipped.');
      return;
    }

    const session = currentDataset[0] || {};
    if (!Array.isArray(session.q_and_a)) session.q_and_a = [];

    // Filter conversations to keep distinct questions, mapping to question format
    let newItemsAdded = 0;
    const existingQuestions = new Set(session.q_and_a.map(item => item.question.toLowerCase().trim()));

    // Let's take up to 250 highest-quality scraped conversation pairs
    const sortedConvs = [...this.model.scrapedConversations]
      .sort((a, b) => b.a.length - a.a.length) // prefer highly descriptive responses
      .slice(0, 250);

    let nextId = Math.max(...session.q_and_a.map(x => x.question_id || 0), 100) + 1;

    for (const conv of sortedConvs) {
      const qClean = conv.q.toLowerCase().trim();
      if (!existingQuestions.has(qClean) && conv.a.length > 2 && conv.a.length < 500) {
        session.q_and_a.push({
          question_id: nextId++,
          question: conv.q,
          answer: conv.a,
          timestamp: conv.timestamp,
          scraped: true
        });
        existingQuestions.add(qClean);
        newItemsAdded++;
      }
    }

    writeJsonAtomic(datasetPath, currentDataset);
    console.log(`[SCRAPER] Successfully integrated ${newItemsAdded} unique conversation flows into ${datasetPath}`);

    // Rebuild profile to embed new scraped values
    try {
      const { buildProfile } = require('./persona');
      const profilePath = aiConfig.data.profilePath;
      const fresh = buildProfile();
      writeJsonAtomic(profilePath, fresh);
      console.log('[SCRAPER] Persona memory profile successfully rebuilt and vectorized!');
    } catch (e) {
      console.error('[SCRAPER] Error rebuilding persona profile:', e);
    }
  }

  preTrainFromDataset() {
    console.log('[SCRAPER] Seeding and pre-training Sude styling rules from dataset.json...');
    try {
      const datasetPath = aiConfig.data.datasetPath;
      if (!fs.existsSync(datasetPath)) return;
      const currentDataset = readJson(datasetPath, []);
      if (!Array.isArray(currentDataset) || currentDataset.length === 0) return;

      const session = currentDataset[0] || {};
      const qa = Array.isArray(session.q_and_a) ? session.q_and_a : [];
      if (qa.length === 0) return;

      const conversations = qa.map(row => ({
        q: row.question,
        a: row.answer,
        timestamp: row.timestamp || new Date().toISOString()
      }));

      this.model.scrapedConversations = conversations;
      this.model.totalMessagesScraped = conversations.length;
      this.model.lastScrapedAt = new Date().toISOString();
      
      this.analyzeStyle();
      this.save();
      console.log(`[SCRAPER] Pre-training complete! Seeded ${conversations.length} conversation rules.`);
    } catch (e) {
      console.error('[SCRAPER] Pre-training failed:', e);
    }
  }
}

module.exports = new StyleLearner();
