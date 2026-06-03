# <img src="https://api.iconify.design/lucide/music.svg?color=%235865F2" width="28" height="28" valign="middle" /> Sudeku Music - Premium Discord Music Bot & Dashboard

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

## <img src="https://api.iconify.design/lucide/sparkles.svg?color=%23FFD700" width="22" height="22" valign="middle" /> Özellikler

Sudeku Music, modern Discord toplulukları için geliştirilmiş, **özel görsel oynatıcı kartları (Canvas)** ve **Web tabanlı yönetim paneli** barındıran üst düzey bir müzik botudur.

* <img src="https://api.iconify.design/lucide/headphones.svg?color=%231DB954" width="18" height="18" valign="middle" /> **Yüksek Kaliteli Ses:** En düşük gecikme ve en yüksek kalitede ses deneyimi.
* <img src="https://api.iconify.design/lucide/image.svg?color=%23E24A8D" width="18" height="18" valign="middle" /> **Özel Tasarım Canvas Kartları:** `@napi-rs/canvas` kütüphanesiyle o an çalan şarkıya özel dinamik görseller (arkaplan rengine uyumlu gradyan, albüm resmi, ilerleme çubuğu).
* <img src="https://api.iconify.design/lucide/globe.svg?color=%2300E5FF" width="18" height="18" valign="middle" /> **Web Dashboard:** Botun durumunu, aktif çalınan şarkıları, sunucu istatistiklerini ve sistem kaynaklarını (CPU/RAM) izleyebileceğiniz dinamik web paneli.
* <img src="https://api.iconify.design/lucide/sliders.svg?color=%23FF8C00" width="18" height="18" valign="middle" /> **Zengin Buton Kontrolleri:** Şarkı geçişleri, duraklatma, ses döngüsü (loop), otomatik oynatma (autoplay) gibi özellikleri doğrudan mesaj butonlarıyla kontrol edin.
* <img src="https://api.iconify.design/lucide/shuffle.svg?color=%239400D3" width="18" height="18" valign="middle" /> **Akıllı Otomatik Oynatma (Autoplay):** Sıra bittiğinde son çalan şarkıya benzer şarkıları otomatik bularak kesintisiz çalma keyfi sunar.
* <img src="https://api.iconify.design/lucide/refresh-cw.svg?color=%23FF4500" width="18" height="18" valign="middle" /> **Çift Katmanlı Arama Mekanizması:** `play-dl` kütüphanesini temel alan, engellemelere karşı otomatik `yt-dlp` fallback desteği sunan dayanıklı altyapı.
* <img src="https://api.iconify.design/lucide/terminal.svg?color=%2300FF00" width="18" height="18" valign="middle" /> **Slash Komutları:** Discord'un en yeni Slash komutları ile tam uyumlu yapı.

---

## <img src="https://api.iconify.design/lucide/wrench.svg?color=%23A9A9A9" width="22" height="22" valign="middle" /> Kurulum Rehberi

Projeyi kendi sunucunuzda çalıştırmak için aşağıdaki adımları takip edebilirsiniz.

### Gereksinimler
* **Node.js v18** veya üzeri
* **FFmpeg** (Sisteminizde kurulu ve PATH'e eklenmiş olmalıdır)

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

## <img src="https://api.iconify.design/lucide/gamepad-2.svg?color=%23FF1493" width="22" height="22" valign="middle" /> Slash Komutları

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

## <img src="https://api.iconify.design/lucide/palette.svg?color=%238A2BE2" width="22" height="22" valign="middle" /> Görsel Tasarım & Prompt Kılavuzu

Sudeku Music için özel Midjourney, DALL-E 3 ve Stable Diffusion görsel tasarım promptlarına [PROMPTS.md](PROMPTS.md) dosyası üzerinden erişebilir, botunuz için harika logolar ve afişler üretebilirsiniz.

---

## <img src="https://api.iconify.design/lucide/file-text.svg?color=%23708090" width="22" height="22" valign="middle" /> Lisans

Bu proje **MIT** lisansı altında lisanslanmıştır. Detaylar için kaynak kodları inceleyebilirsiniz.

---

<p align="center">
  Geliştirici ve Topluluklar için Sevgiyle Tasarlandı. 🌌
</p>
