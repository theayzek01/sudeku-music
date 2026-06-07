# Sudeku Music

Discord sunucuları için müzik odaklı, slash komutlu ve kendi kendini toparlamaya çalışan bir bot.

YouTube tarafında `yt-dlp`, ses tarafında `ffmpeg-static`, Discord tarafında `discord.js v14` kullanır. Spotify linklerini de YouTube üzerinden çözüp sıraya alabilir. İstersen mention/DM üzerinden AI sohbet özelliği de çalışır.

<p align="center">
  <img src="assets/sudekubanner.png" alt="Sudeku Music" width="100%">
</p>

## Neler var?

- YouTube arama, YouTube linki ve Spotify linki ile çalma
- Sıra sistemi, geçmiş, önceki şarkı, karıştırma, döngü ve autoplay
- Butonlu oynatma kontrolü: duraklat, devam et, geç, önceki, durdur
- Ses filtreleri: bassboost, nightcore, vaporwave, 8D, echo ve diğerleri
- Şarkı sözü arama
- Rank, avatar, server info, istatistik ve love gibi yardımcı komutlar
- Slash komutları ve `a.` / `a!` prefix desteği
- AI sohbet: DM veya bot mention ile cevap verir
- SQLite tabanlı XP, voice time ve kullanım verisi
- `yt-dlp` ve `ffmpeg` runtime kontrolü

## Kurulum

Gerekenler:

- Node.js 18 veya üstü
- Discord bot token
- Discord Developer Portal'da `Message Content Intent` açık olmalı

Bağımlılıkları yükle:

```bash
npm install
```

`.env` veya `sudekuenv.env` dosyası oluştur:

```env
TOKEN=discord_bot_tokenin
```

Kod `Token` adını da kabul eder:

```env
Token=discord_bot_tokenin
```

Botu başlat:

```bash
npm start
```

Windows'ta istersen `baslat.bat` ile de başlatabilirsin.

## Opsiyonel ayarlar

Spotify API bilgileri yoksa bot yine çalışır. Spotify linkleri için embed/fallback çözümünü dener.

```env
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REFRESH_TOKEN=
SPOTIFY_MARKET=TR
```

AI için OpenRouter kullan:

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=...
OPENROUTER_API_KEY_2=...
OPENROUTER_API_KEY_3=...
OPENROUTER_MODEL=openai/gpt-oss-20b:free
```

Birden fazla key varsa bot sırayla dener; kota/rate limit veya key hatasında otomatik sonraki keye geçer. İstersen tek satırda `OPENROUTER_API_KEYS=key1,key2,key3` formatı da çalışır.

OpenAI uyumlu başka bir endpoint kullanmak istersen:

```env
AI_PROVIDER=openai
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_API_KEY=...
OPENAI_MODEL=openai/gpt-oss-20b:free
```

Elle binary yolu vermek istersen:

```env
YT_DLP_PATH=C:\path\to\yt-dlp.exe
FFMPEG_PATH=C:\path\to\ffmpeg.exe
```

## Komutlar

Müzik:

| Komut | Ne yapar? |
| --- | --- |
| `/play` | Şarkı/link arar ve sıraya ekler. |
| `/search` | Sonuçları butonlarla gezdirip seçtirir. |
| `/queue` | Sırayı gösterir. |
| `/nowplaying` | Çalan şarkıyı gösterir. |
| `/skip` | Sonraki şarkıya geçer. |
| `/pause` | Çalmayı duraklatır. |
| `/resume` | Devam ettirir. |
| `/stop` | Sırayı temizler ve oynatıcıyı durdurur. |
| `/join` | Botu ses kanalına alır. |
| `/leave` | Botu ses kanalından çıkarır. |
| `/volume` | Ses seviyesini ayarlar. |
| `/loop` | Döngü modunu değiştirir. |
| `/autoplay` | Otomatik çalmayı açar/kapatır. |
| `/shuffle` | Sırayı karıştırır. |
| `/clear` | Sırayı temizler. |
| `/seek` | Şarkıyı belirli saniyeye sarar. |
| `/filter` | Ses filtresi uygular. |
| `/lyrics` | Şarkı sözlerini arar. |

Yardımcı komutlar:

| Komut | Ne yapar? |
| --- | --- |
| `/help` | Komut listesini gösterir. |
| `/rank` | Kullanıcının seviye kartını gösterir. |
| `/stats` | Bot ve sistem durumunu gösterir. |
| `/avatar` | Kullanıcı avatarını gösterir. |
| `/serverinfo` | Sunucu bilgisini gösterir. |
| `/love` | İki kullanıcı için uyum kartı üretir. |

Prefix komutları da var:

```text
a.play şarkı adı
a.queue
a.skip
a.filter bassboost
```

## Bakım komutları

Syntax kontrolü:

```bash
npm test
```

Aynı kontrol için:

```bash
npm run check
```

Tüm runtime verisini sıfırla:

```bash
npm run reset:data
```

Bu komut AI hafızasını, kısa geçmişi, adaptive state dosyasını ve SQLite veritabanını temizler. `data/dataset.json` ve `data/persona-report.md` korunur.

## Sorun giderme

`Token tanımlanmamış` hatası alırsan `.env` veya `sudekuenv.env` içinde `TOKEN` ya da `Token` olduğundan emin ol.

`Yayın başlatılamadı` hatası genelde `yt-dlp` veya YouTube tarafındaki geçici erişim sorunundan gelir. `npm start` logunda `yt-dlp hazır` ve `ffmpeg` satırlarını kontrol et.

Slash komutları hemen görünmezse Discord'un global komut yayılımını bekle. Bot her açılışta global komutları yeniden kaydeder.

AI cevapları sürekli fallback dönüyorsa OpenRouter/OpenAI API key veya model adını kontrol et. AI kapalı kalsa bile müzik sistemi çalışır.

## Notlar

- Veritabanı dosyası: `sudeku.db`
- Runtime AI verileri: `data/bot-memory.json`, `data/short-history.json`, `data/adaptive-state.json`, `data/mind-core.json`
- Slash komutları global kaydedilir
- Lisans bilgisi `package.json` içinde `ISC` olarak duruyor
