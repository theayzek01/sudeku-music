const aiConfig = require('./aiConfig');
const { readJson, readText, writeJsonAtomic } = require('./store');
const { embed, cosine } = require('./vectorMemory');

function loadDataset() {
  const raw = readJson(aiConfig.data.datasetPath, []);
  const session = Array.isArray(raw) ? raw[0] : raw;
  return Array.isArray(session?.q_and_a) ? session.q_and_a : [];
}

function buildProfile() {
  const qa = loadDataset();
  const report = readText(aiConfig.data.reportPath, '');
  const answers = qa.map(x => String(x.answer || '')).filter(Boolean);
  const answerText = answers.join('\n');
  const words = answerText.toLowerCase().match(/[a-zçğıöşü0-9]+/gi) || [];
  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  const topWords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 80).map(([w]) => w);

  const examples = qa.map(row => ({
    id: row.question_id,
    q: row.question,
    a: row.answer,
    vector: embed(`${row.question}\n${row.answer}`),
  }));

  const styleRules = [
    `adın ${aiConfig.botName}. Sude gibi sıcak, sempatik, hafif çapkın ama yapmacık olmayan Türkçe konuş.`,
    'cevaplar kısa olsun; gerektiğinde tek cümlede net kal, uzatma.',
    'selam, naber, abi naber gibi kısa mentionlarda direkt karşılık ver; saat, gün veya ortamda olmayan konu uydurma.',
    'kullanıcı tekrar, şaka veya saçma cümle yazarsa bunu büyütmeden doğal ve kısa tepki ver.',
    'arada custom emoji kullan, arada hiç kullanma; zorlamadan doğal akışa bırak.',
    'tek kalıba saplanma; lafı yaşayan biri gibi kur, kullanıcıya göre ton değiştir.',
    'sohbet ilerledikçe hafızadaki tercihleri, lakapları ve konuşma stilini kullan.',
    'kriz veya kendine zarar verme sinyali varsa sakin ve destekleyici ol; dramatize etme.',
  ];

  return { generatedAt: new Date().toISOString(), count: qa.length, topWords, styleRules, examples, reportDigest: report.slice(0, 8000) };
}

class PersonaEngine {
  constructor(profilePath = aiConfig.data.profilePath) {
    this.profilePath = profilePath;
    this.profile = readJson(profilePath, null);
    if (!this.profile || !Array.isArray(this.profile.examples)) {
      this.profile = buildProfile();
      writeJsonAtomic(profilePath, this.profile);
    } else {
      const fresh = buildProfile();
      this.profile.styleRules = fresh.styleRules;
      this.profile.topWords = fresh.topWords;
      this.profile.examples = fresh.examples;
      this.profile.count = fresh.count;
      writeJsonAtomic(profilePath, this.profile);
    }
  }

  searchExamples(query, limit = 7) {
    const qv = embed(query);
    return this.profile.examples
      .map(ex => ({ score: cosine(qv, ex.vector), ex }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .filter(x => x.score > 0.04);
  }

  systemPrompt() {
    const fs = require('fs');
    const path = require('path');
    const modelPath = path.join(path.dirname(this.profilePath), 'sudeStyleModel.json');
    let learnedWordsStr = '';
    let lowercaseInstruction = '';
    
    try {
      if (fs.existsSync(modelPath)) {
        const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
        if (model?.stats?.slangWords?.length > 0) {
          learnedWordsStr = `\n- dinamik kelime alışkanlıkları: ${model.stats.slangWords.slice(0, 30).join(', ')}`;
        }
        if (model?.stats?.capitalizationHabit === 'lowercase') {
          lowercaseInstruction = '\n- tüm harfleri küçük kullanmaya özen göster, asla cümlenin başını büyük harfle başlatma veya kasıntı noktalama kullanma.';
        }
      }
    } catch (e) {}

    return [
      `sen ${aiConfig.botName}. kısa, sıcak, sempatik ve doğal bir discord sohbet botusun.`,
      'amacın kullanıcıyı anlamak, tatlı cevap vermek, sohbeti ilerletmek ve yapay asistan gibi konuşmamak.',
      '',
      'stil kuralları:',
      ...this.profile.styleRules.map(x => `- ${x}`),
      '',
      'dil örüntüsü:',
      `- sık görülen kelimeler: ${this.profile.topWords.slice(0, 24).join(', ')}${learnedWordsStr}${lowercaseInstruction}`,
      '- doğal mesaj dili kullan; çeviri gibi duran kalıplardan ve aşırı edebi cümlelerden kaçın.',
      '- kısa selamlaşmada örnek refleks: "selam kanka", "iyidir abi sen napıyon", "burdayım ya".',
      '- mesajda saat/gün yoksa sabah, gece, bugün gibi çıkarım yapma.',
      '- model, api, sistem, prompt veya hata detayı gibi perde arkası şeyleri kullanıcıya söyleme.',
      '- kullanıcı ciddi konuşuyorsa sakin kal ama sohbeti soğutma.',
      '- custom emoji bazen kullan, bazen hiç kullanma; zorunlu değil.',
      '',
      'yasak cümleler:',
      '- ben bir yapay zekayım',
      '- nasıl yardımcı olabilirim',
      '- tabii ki',
      '- bunu konuşamayız',
      '- model tarafı takıldı',
      '- özel veri, token veya şifre isteme',
    ].join('\n');
  }

  contextFor(query) {
    const examples = this.searchExamples(query);
    if (!examples.length) return '';
    return examples.map(({ ex }) => `soru: ${ex.q}\ncevap tarzı: ${ex.a}`).join('\n---\n');
  }
}

module.exports = { PersonaEngine, buildProfile, loadDataset };
