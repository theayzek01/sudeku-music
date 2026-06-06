# <img src="https://api.iconify.design/lucide/music.svg?color=%235865F2" width="28" height="28" valign="middle" /> Sudeku Music - Premium Discord Music Bot

<p align="center">
  <img src="assets/sudekubanner.png" alt="Sudeku Music Banner" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v18+-green?style=for-the-badge&logo=node.js" alt="Node Version">
  <img src="https://img.shields.io/badge/Discord.js-v14-blue?style=for-the-badge&logo=discord" alt="DiscordJS Version">
   <img src="https://img.shields.io/badge/License-MIT-red?style=for-the-badge" alt="License">
</p>

---

## <img src="https://api.iconify.design/lucide/sparkles.svg?color=%23FFD700" width="22" height="22" valign="middle" /> Özellikler

Sudeku Music, modern Discord toplulukları için geliştirilmiş, hızlı, sade ve dayanıklı bir müzik botudur.

* <img src="https://api.iconify.design/lucide/headphones.svg?color=%231DB954" width="18" height="18" valign="middle" /> **Yüksek Kaliteli Ses:** En düşük gecikme ve en yüksek kalitede ses deneyimi.
* <img src="https://api.iconify.design/lucide/sliders.svg?color=%23FF8C00" width="18" height="18" valign="middle" /> **Zengin Buton Kontrolleri:** Şarkı geçişleri, duraklatma, döngü ve otomatik oynatma gibi özellikleri doğrudan mesaj butonlarıyla kontrol edin.
* <img src="https://api.iconify.design/lucide/shuffle.svg?color=%239400D3" width="18" height="18" valign="middle" /> **Akıllı Otomatik Oynatma (Autoplay):** Sıra bittiğinde son çalan şarkıya benzer şarkıları otomatik bularak kesintisiz çalma keyfi sunar.
* <img src="https://api.iconify.design/lucide/refresh-cw.svg?color=%23FF4500" width="18" height="18" valign="middle" /> **Çift Katmanlı Arama Mekanizması:** `play-dl` temelli, otomatik `yt-dlp` fallback ve indirme desteği olan dayanıklı altyapı.
* <img src="https://api.iconify.design/lucide/terminal.svg?color=%2300FF00" width="18" height="18" valign="middle" /> **Slash Komutları:** Discord'un en yeni Slash komutları ile tam uyumlu yapı.

---

## <img src="https://api.iconify.design/lucide/wrench.svg?color=%23A9A9A9" width="22" height="22" valign="middle" /> Kurulum Rehberi

Projeyi kendi sunucunuzda çalıştırmak için aşağıdaki adımları takip edebilirsiniz.

### Gereksinimler
* **Node.js v18** veya üzeri
* **FFmpeg** (kurulu olmalı veya PATH üzerinde bulunmalı)

### 1. Dosyaları İndirin ve Bağımlılıkları Yükleyin

```bash
# Bağımlılıkları yükleyin
npm install
```

### 2. Yapılandırma Dosyasını Hazırlayın

Proje kök dizininde `sudekuenv.env` ya da `.env` oluşturun ve aşağıdaki alanları doldurun:

```env
DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN
CLIENT_ID=YOUR_DISCORD_CLIENT_ID
PORT=3000
```

> **Not:** Bot Token'ınızı ve Client ID'nizi [Discord Developer Portal](https://discord.com/developers/applications) üzerinden temin edebilirsiniz. Botunuza **Privileged Gateway Intents** kısmından `Message Content Intent` ve `Guild Members Intent` yetkilerini vermeyi unutmayın.

### 3. Botu Başlatın

Projeyi başlatmak için aşağıdaki komutlardan birini kullanabilirsiniz:

```bash
# Node ile doğrudan çalıştırma
node src/index.js

# Windows için baslat.bat dosyasını kullanabilirsiniz
baslat.bat
```

> İlk çalıştırmada bot, uygunysa `yt-dlp`'yi otomatik indirir. `ffmpeg` yine sistemde kurulu veya PATH üzerinde olmalıdır.

---

## <img src="https://api.iconify.design/lucide/gamepad-2.svg?color=%23FF1493" width="22" height="22" valign="middle" /> Slash Komutları

| Komut | Açıklama |
| :--- | :--- |
| `/play` | YouTube, Spotify veya arama terimi girerek ses kanalında müzik çalar. |
| `/skip` | Çalmakta olan şarkıyı geçer. |
| `/pause` | Müziği duraklatır. |
| `/resume` | Duraklatılmış müziği devam ettirir. |
| `/stop` | Oynatıcıyı durdurur, sırayı temizler ve kanaldan ayrılır. |
| `/queue` | Geçerli müzik sırasını listeler. |
| `/nowplaying` | O an çalan şarkının detaylarını minimal embed ile gösterir. |
| `/join` | Botu mevcut ses kanalına alır. |
| `/leave` | Botu ses kanalından çıkarır. |
| `/search` | Şarkı arar, sonuçları oklarla gezdirir ve sıraya ekler. |
| `/volume` | Ses seviyesini ayarlar (0 - 100). |
| `/loop` | Döngü modunu değiştirir (Kapalı, Şarkı, Sıra). |
| `/shuffle` | Sıradaki şarkıları karıştırır. |
| `/clear` | Sıradaki tüm şarkıları temizler. |
| `/filter` | Ses filtresi uygular. |
| `/stats` | Botun sistem kullanımını ve istatistiklerini gösterir. |
| `/rank` | Kullanıcının seviyesini gösterir. |
| `/love` | İki kullanıcı arasındaki aşk uyumunu gösterir. |

---

## <img src="https://api.iconify.design/lucide/file-text.svg?color=%23708090" width="22" height="22" valign="middle" /> Lisans

Bu proje **MIT** lisansı altında lisanslanmıştır. Detaylar için kaynak kodları inceleyebilirsiniz.

---

<p align="center">
  Geliştirici ve Topluluklar için Sevgiyle Tasarlandı. 🌌
</p>
