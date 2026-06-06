const { VectorMemory } = require('./vectorMemory');
const memory = new VectorMemory();

function getRelationship(userId, userName) {
  const bucket = memory.userBucket(userId);
  if (!bucket.profile) bucket.profile = {};
  
  const p = bucket.profile;
  if (p.affinity === undefined) p.affinity = 30; // Başlangıç: Yabancı sınırı
  if (p.messagesSeen === undefined) p.messagesSeen = 0;
  if (p.level === undefined) p.level = 'Yabancı';
  if (!p.coreBeliefs) p.coreBeliefs = [];
  
  return p;
}

function updateAffinity(userId, userName, change) {
  const bucket = memory.userBucket(userId);
  const p = getRelationship(userId, userName);
  
  p.affinity = Math.max(0, Math.min(100, p.affinity + change));
  p.messagesSeen += 1;
  
  // Seviye belirleme
  if (p.affinity <= 15) {
    p.level = 'Düşman';
  } else if (p.affinity <= 35) {
    p.level = 'Yabancı';
  } else if (p.affinity <= 65) {
    p.level = 'Arkadaş';
  } else if (p.affinity <= 85) {
    p.level = 'Flört';
  } else if (p.affinity <= 95) {
    p.level = 'Büyük Aşk';
  } else {
    p.level = 'Saplantılı';
  }
  
  memory.dirty = true;
  memory.save();
  return p;
}

function processMessageForRelationship(userId, userName, text) {
  const clean = String(text || '').toLowerCase();
  let change = 0.15; // Küçük stabil artış her sohbette
  
  // Sevgi/Flört kelimeleri
  if (/sev|iyi ki|tatlı|bebeğim|canım|aşkım|güzelsin|iyisin/i.test(clean)) {
    change += 1.8;
  }
  // Erotik/Baştan çıkarıcı
  if (/seviş|öp|ıslak|yatak|istiyorum|dokun|soyun|çıplak|sex|seks|am|göt|meme|yala/i.test(clean)) {
    change += 2.5;
  }
  // Düşmanca/Kötü davranma
  if (/sus|salak|mal|sg|kes|gerizekalı|aptal|nefret|bıktım senden|çirkin/i.test(clean)) {
    change -= 4.0;
  }
  
  return updateAffinity(userId, userName, change);
}

module.exports = {
  getRelationship,
  updateAffinity,
  processMessageForRelationship
};
