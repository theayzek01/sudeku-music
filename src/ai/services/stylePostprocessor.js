const fs = require('fs');
const path = require('path');
const aiConfig = require('../config/ai');
const { readJson } = require('./store');

const MODEL_PATH = path.join(path.dirname(aiConfig.data.memoryPath), 'sudeStyleModel.json');

function runWithTagsPreserved(text, fn) {
  const placeholders = [];
  const regex = /<a?:\w+:\d+>|<@&?\d+>|<#\d+>|<t:\d+(?::[a-zA-Z])?>|https?:\/\/[^\s]+/gi;
  
  const tokenized = String(text || '').replace(regex, (match) => {
    const id = placeholders.length;
    placeholders.push(match);
    return `__discord_tag_${id}__`;
  });
  
  let result = fn(tokenized, placeholders);
  
  for (let i = 0; i < placeholders.length; i++) {
    result = result.replace(new RegExp(`__discord_tag_${i}__`, 'gi'), placeholders[i]);
  }
  
  return result;
}

function stripBotty(text) {
  return String(text || '')
    .replace(/\btabii ki\b/gi, 'tabi')
    .replace(/\btabii\b/gi, 'tabi')
    .replace(/\belbette\b/gi, 'kesinlikle')
    .replace(/\byardımcı olabilirim\b/gi, 'senin için ne yapabilirim')
    .replace(/\bnasıl yardımcı olabilirim\??/gi, 'ne istiyorsun söyle')
    .replace(/\bbugün nasılsın, nasıl geçiyor günün\??/gi, 'napıyosun')
    .replace(/\bnasıl geçiyor günün\??/gi, 'napıyosun')
    .replace(/\bsohbet edelim\b/gi, 'konuşalım')
    .replace(/\bmerhaba\b/gi, 'selam')
    .replace(/\bahlaki\b/gi, '')
    .replace(/\byapay zeka\b/gi, '');
}

function casualize(text, model = null) {
  return runWithTagsPreserved(text, (tokenizedText) => {
    const activeModel = model || readJson(MODEL_PATH, null);
    
    // Capitalization Habit: default to lowercase for maximum realism unless stated otherwise
    const habit = activeModel?.stats?.capitalizationHabit || 'lowercase';
    let out = stripBotty(tokenizedText).trim();
    
    if (habit === 'lowercase') {
      out = out.toLowerCase();
    }

    // Default swaps
    const swaps = [
      [/\bçok\b/gi, 'cok'],
      [/\bçünkü\b/gi, 'cünkü'],
      [/\bdeğil\b/gi, 'degil'],
      [/\byapacağım\b/gi, 'yapıcam'],
      [/\bedececeğim\b/gi, 'edicem'],
      [/\bgeliyor\b/gi, 'geliyo'],
      [/\bgidiyor\b/gi, 'gidiyo'],
      [/\bbilmiyorum\b/gi, 'bilmiyorum'],
      [/\bbir şey\b/gi, 'bişey'],
      [/\bher şey\b/gi, 'hersey'],
      [/\bşu an\b/gi, 'şuan'],
      [/\bgeliyorum\b/gi, 'geliyom'],
      [/\bgidiyorum\b/gi, 'gidiyom'],
      [/\byapıyorum\b/gi, 'yapıyom'],
      [/\bediyorum\b/gi, 'ediyom'],
      [/\bistiyorum\b/gi, 'istiyom'],
      [/\bseviyorum\b/gi, 'seviyom'],
      [/\bgeliyorsun\b/gi, 'geliyon'],
      [/\bgidiyorsun\b/gi, 'gidiyon'],
      [/\byapıyorsun\b/gi, 'yapıyon'],
      [/\bediyorsun\b/gi, 'ediyon'],
      [/\bistiyorsun\b/gi, 'istiyon'],
      [/\bolacağım\b/gi, 'olucam'],
      [/\bgideceğim\b/gi, 'gidicem'],
      [/\bgeleceğim\b/gi, 'gelicem']
    ];

    // Load custom learned swaps/typos if available in model
    if (activeModel?.stats?.typoMappings) {
      const customs = activeModel.stats.typoMappings;
      Object.keys(customs).forEach(key => {
        // Create matching regex for exact word boundary
        const cleanKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        swaps.push([new RegExp(`\\b${cleanKey}\\b`, 'gi'), customs[key]]);
      });
    }

    for (const [a, b] of swaps) {
      out = out.replace(a, b);
    }

    out = out
      .replace(/\s+/g, ' ')
      .replace(/\?{2,}/g, '?')
      .trim();
      
    return out;
  });
}

function isCustomEmoji(str) {
  return typeof str === 'string' && /<a?:\w{2,32}:\d{17,22}>/.test(str);
}

function stripUnicodeEmojis(text) {
  return text.replace(/[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
}

function smartShorten(text, originalUserText = '') {
  // Let Sude speak and express herself naturally without aggressive truncation!
  // Truncating sentences makes her sound truncated, incomplete and robotic.
  return text;
}

function dedupeFillers(text) {
  if (text.includes('*') || /(ahh|ohh|seviş|istiyorum|yala|sürt|inle)/i.test(text)) {
    return text;
  }
  const fillers = new Set(['ya', 'bence', 'genelde', 'cok', 'ama', 'of', 'ahh']);
  const words = text.split(/\s+/).filter(Boolean);
  const seen = {};
  const out = [];
  for (const w of words) {
    const key = w.toLowerCase().replace(/[^a-zçğıöşü]/gi, '');
    if (fillers.has(key)) {
      seen[key] = (seen[key] || 0) + 1;
      if (seen[key] > 2) continue;
    }
    out.push(w);
  }
  return out.join(' ');
}

function sanitizePetNames(text, userText = '', affinity = 30) {
  const isFlirty = text.includes('*') || 
                   /(ahh|ohh|seviş|istiyorum|yala|sürt|kucağıma|şehvet|inle|tahrik|soyun|çıplak)/i.test(text) ||
                   /(ahh|ohh|seviş|istiyorum|yala|sürt|kucağıma|şehvet|inle|tahrik|soyun|çıplak)/i.test(userText);
  
  if (isFlirty) return text;
  
  const hasAffinity = affinity >= 70;
  
  return text.replace(/\b(bebeğim|tatlım|canım|aşkım)\b/gi, (match) => {
    const rand = Math.random();
    if (hasAffinity) {
      if (rand < 0.40) return match;
      if (rand < 0.70) return rand < 0.55 ? 'kanka' : 'ya';
      return '';
    } else {
      if (rand < 0.10) return match;
      if (rand < 0.55) return 'kanka';
      if (rand < 0.85) return 'ya';
      return '';
    }
  }).replace(/\s+/g, ' ').trim();
}

function removeTranslationese(text) {
  return text
    .replace(/\bbu konuda\b/gi, '')
    .replace(/\bseninle bunu konuşmak isterim\b/gi, 'konuşalım bunu')
    .replace(/\bbunu duyduğuma üzüldüm\b/gi, 'kötü olmuş ya')
    .replace(/\banlıyorum seni\b/gi, 'anladım')
    .replace(/\bbu gerçekten zor olmalı\b/gi, 'zor cidden')
    .replace(/\bkendini böyle hissetmen çok normal\b/gi, 'öyle hissetmen doğal')
    .replace(/\bbana daha fazla anlatmak ister misin\b/gi, 'anlatsana biraz')
    .replace(/\bherhangi bir sorun olursa\b/gi, 'bişey olursa')
    .replace(/\byardımcı olmak için buradayım\b/gi, 'buralardayım')
    .replace(/\bbaşka bir şey yapmak ister misin\b/gi, 'başka bişey istiyon mu')
    .replace(/\bumarım bu bilgiler işine yarar\b/gi, 'umarım işine yarar')
    .replace(/\bnasıl yardımcı olabilirim\??/gi, 'napıyosun ya')
    .replace(/\bharika bir gün geçir\b/gi, 'iyi bak kendine')
    .replace(/\bkesinlikle haklısın\b/gi, 'haklısın valla')
    .replace(/\bhaklısınız\b/gi, 'haklısın')
    .replace(/\büzgünüm\b/gi, 'tüh ya')
    .replace(/\byardımcı olabildiğime sevindim\b/gi, 'sevindim valla')
    .replace(/\bgörüşmek üzere\b/gi, 'baybay')
    .replace(/\bhoşça kal\b/gi, 'kaçtım ben')
    .replace(/\brica ederim\b/gi, 'ne demek ya')
    .replace(/\bmerhaba\b/gi, 'selam')
    .replace(/\bbir yapay zekayım\b/gi, 'insanım sanki')
    .replace(/\bbu soruya cevap veremem\b/gi, 'boşver bunu ya')
    .replace(/\bharika\b/gi, 'cok iyi')
    .replace(/\s+/g, ' ')
    .trim();
}

function reduceQuestions(text, userText = '') {
  const userAsked = /\?|(ne|nasi|nası|neden|kim|hangi|mi|mı|mu|mü)\b/i.test(userText);
  const parts = text.split('?');
  if (parts.length <= 2) return text;
  return userAsked ? `${parts[0]}?` : parts[0].trim();
}

function moodTrim(text, mood = '') {
  let out = text;
  if (/kuru|düz|umursamaz|boşvermiş|suskun/.test(mood) && out.split(/\s+/).length > 8) out = out.split(/\s+/).slice(0, 8).join(' ');
  if (/enerjik|oyuncu|random|şakacı|tatlı kaotik/.test(mood) && out.length < 80 && Math.random() < 0.25) out = out.replace(/\b(evett?|tamam|olur)\b/i, '$1$1');
  if (/hafif sinirli/.test(mood)) out = out.replace(/^(evet|yok|bilmiyorum)/i, 'of $1');
  return out;
}

function stylePostprocess(text, { userText = '', emoji = '', candidateEmojis = [], avgLen = null, mood = '', affinity = 30 } = {}) {
  let cleaned = String(text || '').replace(/<\s*(a?)\s*:\s*(\w{2,32})\s*:\s*(\d{17,22})\s*>/gi, (m, g1, g2, g3) => {
    return `<${g1 ? g1 : ''}:${g2}:${g3}>`;
  });

  const activeModel = readJson(MODEL_PATH, null);

  return runWithTagsPreserved(cleaned, (tokenizedText, placeholders) => {
    let out = casualize(removeTranslationese(tokenizedText), activeModel);
    out = reduceQuestions(out, userText);
    out = smartShorten(out, userText);
    out = dedupeFillers(out);
    out = sanitizePetNames(out, userText, affinity);
    out = moodTrim(out, mood);
    out = stripUnicodeEmojis(out);
    
    // Dynamic trailing punctuation removal to match real Sude rate
    const puncRate = activeModel?.stats?.endPunctuationRate ?? 0.08;
    if (Math.random() > puncRate) {
      // Omit periods or spaces at the end, but keep question marks & exclamation marks
      out = out.replace(/\.+$/, '').trim();
    }
    
    // Choose emoji from candidates or dynamic scraped favEmojis
    let selectedEmoji = '';
    const learnedEmojis = activeModel?.stats?.favEmojis || [];
    const mergedCandidates = [...(candidateEmojis || []), ...learnedEmojis];

    if (mergedCandidates.length > 0) {
      selectedEmoji = mergedCandidates[Math.floor(Math.random() * mergedCandidates.length)];
    } else if (emoji) {
      selectedEmoji = emoji;
    }

    const hasEmojiAlready = selectedEmoji && isCustomEmoji(selectedEmoji) && (out.includes(selectedEmoji) || placeholders.some(p => p.toLowerCase() === selectedEmoji.toLowerCase()));
    if (selectedEmoji && isCustomEmoji(selectedEmoji) && out.length < 500 && !hasEmojiAlready) {
      const rand = Math.random();
      if (rand < 0.15) {
        out += ` ${selectedEmoji}`;
      } else if (rand < 0.28) {
        const words = out.split(/\s+/).filter(Boolean);
        if (words.length > 3) {
          const insertIdx = Math.floor(Math.random() * (words.length - 2)) + 1;
          words.splice(insertIdx, 0, selectedEmoji);
          out = words.join(' ');
        } else {
          out += ` ${selectedEmoji}`;
        }
      } else if (rand < 0.38) {
        out = `${selectedEmoji} ${out}`;
      }
    }
    return out || 'bilmiyorum valla';
  });
}

module.exports = { stylePostprocess, casualize };
