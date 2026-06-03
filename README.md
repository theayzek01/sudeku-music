# 🎵 Sudeku Music - Premium Discord Music Bot & Dashboard

<p align="center">
  <img src="assets/sudekubanner.png" alt="Sudeku Music Banner" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v18+-green?style=for-the-badge&logo=node.js" alt="Node Version">
  <img src="https://img.shields.io/badge/Discord.js-v14-blue?style=for-the-badge&logo=discord" alt="DiscordJS Version">
  <img src="https://img.shields.io/badge/Express.js-Backend-black?style=for-the-badge&logo=express" alt="ExpressJS">
  <img src="https://img.shields.io/badge/License-MIT-red?style=for-the-badge" alt="License">
</p>

---

## ✨ Özellikler

Sudeku Music, modern Discord toplulukları için geliştirilmiş, **özel görsel oynatıcı kartları (Canvas)** ve **Web tabanlı yönetim paneli** barındıran üst düzey bir müzik botudur.

*   🎧 **Yüksek Kaliteli Ses:** En düşük gecikme ve en yüksek kalitede ses deneyimi.
*   🖼️ **Özel Tasarım Canvas Kartları:** `@napi-rs/canvas` kütüphanesiyle o an çalan şarkıya özel dinamik görseller (arkaplan rengine uyumlu gradyan, albüm resmi, ilerleme çubuğu).
*   🌐 **Web Dashboard:** Botun durumunu, aktif çalınan şarkıları, sunucu istatistiklerini ve sistem kaynaklarını (CPU/RAM) izleyebileceğiniz dinamik web paneli.
*   🕹️ **Zengin Buton Kontrolleri:** Şarkı geçişleri, duraklatma, ses döngüsü (loop), otomatik oynatma (autoplay) gibi özellikleri doğrudan mesaj butonlarıyla kontrol edin.
*   🔀 **Akıllı Otomatik Oynatma (Autoplay):** Sıra bittiğinde son çalan şarkıya benzer şarkıları otomatik bularak kesintisiz çalma keyfi sunar.
*   🔄 **Çift Katmanlı Arama Mekanizması:** `play-dl` kütüphanesini temel alan, engellemelere karşı otomatik `yt-dlp` fallback desteği sunan dayanıklı altyapı.
*   🛠️ **Slash Komutları:** Discord'un en yeni Slash komutları ile tam uyumlu yapı.

---

## 🛠️ Kurulum Rehberi

Projeyi kendi sunucunuzda çalıştırmak için aşağıdaki adımları takip edebilirsiniz.

### Gereksinimler
*   **Node.js v18** veya üzeri
*   **FFmpeg** (Sisteminizde kurulu ve PATH'e eklenmiş olmalıdır)

### 1. Dosyaları İndirin ve Bağımlılıkları Yükleyin

```bash
# Bağımlılıkları yükleyin
npm install
```

### 2. Yapılandırma Dosyasını Hazırlayın

Proje kök dizininde `.env` adında bir dosya oluşturun ve aşağıdaki alanları doldurun:

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

---

## 🎮 Slash Komutları

| Komut | Açıklama |
| :--- | :--- |
| `/play` | YouTube, Spotify veya arama terimi girerek ses kanalında müzik çalar. |
| `/skip` | Çalmakta olan şarkıyı geçer. |
| `/pause` | Müziği duraklatır. |
| `/resume` | Duraklatılmış müziği devam ettirir. |
| `/stop` | Oynatıcıyı durdurur, sırayı temizler ve kanaldan ayrılır. |
| `/queue` | Geçerli müzik sırasını listeler. |
| `/nowplaying` | O an çalan şarkının detaylarını ve Canvas kartını gösterir. |
| `/volume` | Ses seviyesini ayarlar (0 - 100). |
| `/loop` | Döngü modunu değiştirir (Kapalı, Şarkı, Sıra). |
| `/shuffle` | Sıradaki şarkıları karıştırır. |
| `/clear` | Sıradaki tüm şarkıları temizler. |
| `/stats` | Botun sistem kullanımını ve istatistiklerini gösterir. |
| `/help` | Kullanılabilir tüm komutları listeler. |

---

## 🎨 Görsel Tasarım & Prompt Kılavuzu

Sudeku Music için özel Midjourney, DALL-E 3 ve Stable Diffusion görsel tasarım promptlarına [PROMPTS.md](PROMPTS.md) dosyası üzerinden erişebilir, botunuz için harika logolar ve afişler üretebilirsiniz.

---

## 📄 Lisans

Bu proje **MIT** lisansı altında lisanslanmıştır. Detaylar için kaynak kodları inceleyebilirsiniz.

---

<p align="center">
  Geliştirici ve Topluluklar için Sevgiyle Tasarlandı. 🌌
</p>
