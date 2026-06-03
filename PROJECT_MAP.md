# 🎵 Sudeku — All-in-One Discord Botu — Proje Haritası
> Son güncelleme: 2026-06-03
> Bu dosya MoonCode tarafından her değişiklikte güncellenir.

---

## 📁 Dosya Yapısı

```
Sudeku Music/
├── .env                  # Bot token + PORT
├── .gitignore            # node_modules, env, log hariç
├── sudekuenv.env         # Alternatif token dosyası
├── openssl_compat.cnf    # OpenSSL eski sunucu uyumluluğu
├── package.json          # sudeku-music v1.0.0 (commonjs)
├── package-lock.json
├── baslat.bat            # Windows auto-restart launcher
├── bot.log               # Log dosyası
├── sudeku.db             # SQLite veritabanı dosyası
├── emojis.json           # 47KB emoji mapping
├── README.md             # Proje açıklaması
├── PROJECT_MAP.md        # ← Bu dosya
│
├── assets/
│   ├── sudekubanner.png
│   └── Micro Icon Pack/  # Çeşitli ikon setleri
│
├── public/
│   └── index.html        # 930 satır — Tek sayfa dashboard (Tailwind + Lucide + WS)
│
└── src/
    ├── index.js          # Bot giriş, dinamik komut handler, AFK/AutoMod events
    ├── database.js       # SQLite / better-sqlite3 veritabanı yönetimi
    ├── commands/
    │   ├── index.js      # Dinamik komut yükleyici ve helper metodlar
    │   ├── automod/      # automod.js
    │   ├── economy/      # buy, coins, daily, deposit, inventory, rob, send, shop, withdraw, work
    │   ├── fun/          # afk, giveaway, poll, remind, quiz
    │   ├── moderation/   # ban, clearwarns, kick, mute, purge, slowmode, timeout, unmute, unwarn, warn, warns
    │   ├── music/        # autoplay, clear, filter, loop, lyrics, nowplaying, pause, play, queue, resume, seek, shuffle, skip, stop, volume
    │   └── utility/      # leaderboard, rank, serverinfo, stats, help, ticket, askai
    │
    ├── player/
    │   ├── PlayerManager.js
    │   ├── Queue.js      # FFmpeg transcoder, filtreler, seeking, stream handling
    │   ├── search.js     # Spotify/YouTube arama çözümleri
    │   └── canvasGenerator.js
    │
    ├── dashboard/
    │   └── server.js     # Express + WS dashboard sunucusu
    │
    ├── ai/               # AI bilişsel servisleri ve Ollama entegrasyonu
    └── utils/
        └── emojis.js     # Özelleştirilmiş emoji haritası
```

---

## 🔧 Teknoloji Yığını

| Kategori | Teknoloji |
|----------|-----------|
| Runtime | Node.js (CommonJS) |
| Discord | discord.js v14, @discordjs/voice |
| Ses | play-dl + yt-dlp fallback, ffmpeg-static, opusscript |
| Canvas | @napi-rs/canvas |
| Dashboard | Express 5 + ws, Tailwind CDN, Lucide |
| Veritabanı | SQLite (better-sqlite3) |
| Yapay Zeka | Ollama entegrasyonu (gemma4:31b-cloud) |

---

## 🎯 Mevcut Özellikler

- **Modüler Komut Sistemi:** 50'den fazla komut slash ve prefix olarak çalışır.
- **AutoMod Korumaları:** Küfür, davet linki, URL ve spam engelleme filtreleri.
- **Ekonomi & Kumar:** Günlük coin, çalışma, soygun, bakiye, envanter, dükkan sistemi.
- **Destek Sistemi (Ticket):** Butonlu talep açma, kapatma ve veri kaydı.
- **Yapay Zeka (AI):** Gelişmiş Ollama motoru ve profil hafızası entegrasyonu.
- **Müzik Yetenekleri:** FFmpeg filtreleri (bassboost, 8d vb.), seek özelliği, dinamik görsel now playing kartları.
- **Sıralama & XP:** Ses kanallarında kalma süresi + chat mesaj sayısına göre seviye/XP kazanımı ve dinamik seviye kartı.

---

## 📝 Değişiklik Günlüğü

| Tarih | Değişiklik | Dosya(lar) |
|-------|-----------|------------|
| 2026-06-03 | SQLite geçişi, modüler komut yapısı, AutoMod ve ekonomi sistemleri, Ticket sistemi, AI askai komutu, eğlence/quiz eklentileri tamamlandı. | Tüm src/ dosyaları |

---

## Proje Durumu
- Altyapı ve tüm komut kategorileri başarıyla modüler sisteme geçirilerek tamamlanmıştır. Bot şu anda tüm kanallardan stabil şekilde kullanılabilmektedir.
