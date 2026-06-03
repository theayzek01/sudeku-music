# Dataset Detaylı Dil, Üslup, Cümle ve Düşünce Yapısı Raporu

Kaynak dosya: `C:\Users\ozenc\Downloads\dataset.json`  
Rapor dosyası: `C:\Users\ozenc\Downloads\dataset_detayli_analiz_raporu.md`  
Oturum tarihi: `2026-05-13T00:55:52.074Z`  
Toplam soru-cevap: **137**

> Not: Bu rapor; yazım tarzı, duygu tonu, cevap verme biçimi ve metinsel örüntü analizi içindir. Gerçek bir kişiyi izinsiz şekilde taklit etmek, onun yerine mesajlaşmak veya kimlik yanıltması yapmak için kullanılmamalıdır. Dataset içinde intihar, yeme bozukluğu ve yoğun umutsuzluk gibi hassas içerikler bulunduğu için gerçek kişide güncel risk varsa profesyonel destek ve yakın çevre desteği önemlidir.

---

## 1. Veri yapısı

Dosya tek elemanlı bir JSON dizisi şeklinde. İçinde bir oturum ve bu oturuma bağlı `q_and_a` listesi var.

Yapı:

```json
[
  {
    "session_date": "...",
    "q_and_a": [
      {
        "question_id": 1,
        "question": "...",
        "answer": "...",
        "timestamp": "..."
      }
    ]
  }
]
```

Her kayıt şu dört bilgiyi taşıyor:

- `question_id`: soru numarası
- `question`: sorulan soru
- `answer`: verilen cevap
- `timestamp`: cevap zamanı

Cevaplar, klasik anket cevabı gibi düzenli değil; daha çok telefondan hızlı yazılmış, düzeltilmemiş, anlık düşünce aktarımı gibi.

---

## 2. Sayısal metin istatistikleri

- Toplam cevap: **137**
- Toplam karakter: yaklaşık **6634**
- Toplam kelime: yaklaşık **950**
- Benzersiz kelime: yaklaşık **676**
- Ortalama cevap uzunluğu: **6.93 kelime**
- Ortalama cevap karakteri: **47.43 karakter**
- Tek kelimelik cevap sayısı: **19**
- 2-5 kelimelik kısa cevap: **46**
- 6-12 kelimelik orta cevap: **56**
- 13-25 kelimelik uzun cevap: **13**
- 25+ kelimelik çok uzun cevap: **3**

Noktalama:

- Nokta: **2**
- Virgül: **6**
- Soru işareti: **0**
- Ünlem: **0**
- Emoji: **5**
- Büyük harf: neredeyse yok; yalnızca çok sınırlı kullanım var.

Bu istatistikler şunu gösteriyor: kişi uzun, düzgün paragraflar kurmaktan çok kısa, doğal, filtrelenmemiş cevaplar veriyor. Düşünce akışı var ama yazı biçimi düzenlenmemiş.

---

## 3. En temel yazım karakteri

### 3.1. Küçük harf baskınlığı

Cevapların neredeyse tamamı küçük harfle yazılmış. Cümle başında büyük harf kullanılmıyor. Özel isimlerde bile çoğunlukla küçük harf var.

Örnekler:

- `izmirliyim ve bulgar göçmeniyim`
- `insta ve tiktokda video izlemeyi cok severim`
- `tiktok insta ve dc ekran sürem 7 8 saat fln en az`

Bu, resmi yazı değil, sohbet mesajı havası verir.

### 3.2. Noktalama yokluğu

Cevaplarda noktalama neredeyse hiç yok. Uzun ve duygusal cümlelerde bile düşünceler arka arkaya bağlanıyor.

Örnek:

> hayat cok sıkıcı ve yasamak icin bir sebep göremiyorum sürekli bir belayı cekiyo gibi hissediyorum kücük seylerle mutlu olup yine kücük seylerle herseyden vazgecebilcek potansiyelim var bu beni bozuyor

Bu cümlede normalde birkaç nokta/virgül olması gerekirken tek akış var. Bu tarz, kişinin yazarken düzenlemekten çok içinden geçtiği gibi aktardığını gösteriyor.

### 3.3. Türkçe karakter kullanımı karışık

Tamamen Türkçe karaktersiz yazmıyor; bazen Türkçe karakter kullanıyor, bazen kullanmıyor.

Kullandığı biçimler:

- `cok` ve bazen `çok`
- `cünkü` ve bazen `çünkü`
- `düsünce`, `düşünce`
- `degil`, `değil`
- `yas`, `yaş`
- `icin`, `için`
- `gecti/geçti` tarzı karma kullanım

Bu tutarsızlık yazının bilinçli stilize edilmediğini, hızlı yazıldığını gösterir.

### 3.4. Yazım hataları tarzın parçası

Belirgin yazım hataları mevcut:

- `randomlsrımdan`
- `mükemmelitçiyim`
- `hakkımds`
- `hakkınds`
- `evkendiklerini`
- `gibip`
- `macha ictim`
- `mıstım / yatmıstım`
- `cıkıcak`
- `gelio`
- `cekiyo`
- `düsüncelete`

Bu hatalar genel izlenimde önemlidir. Metin, düzeltilmiş veya editlenmiş değil; doğrudan mesaj kutusuna yazılmış gibi.

---

## 4. Sık kullanılan kelime ve kalıplar

En sık görülen işlevsel kelimeler:

- `ve`
- `ama`
- `bir`
- `var`
- `cok`
- `ya`
- `için`
- `genelde`
- `bence`
- `göre`
- `yok`

En karakteristik içerik kelimeleri:

- `bakış`
- `düşünce / düsünce`
- `karakter`
- `insan`
- `sevdigim`
- `geçici`
- `hersey / herşey`
- `bişey / bisey`
- `yorgunluk`
- `yalnızlık`
- `huzur`

Özellikle tekrar eden ana kelimeler:

- **bakış açısı**: insan değerlendirmede merkezi kavram
- **düşünce yapısı**: karakter analizinde sık başvurulan kavram
- **geçici / gelip geçici**: hayat felsefesi gibi duruyor
- **sevdigim insanla**: ilişki ve gelecek hayali merkezli
- **bence / genelde / ama**: kesin konuşmayı yumuşatan bağlaçlar

---

## 5. Cümle kurma biçimi

### 5.1. Tek kelimelik cevap modu

Bazı sorulara hiç açıklama yapmadan tek kelimeyle cevap veriyor.

Örnekler:

- `kızım`
- `yatagımı`
- `oyuncu`
- `anlaşamazdık`
- `evet`
- `yok`
- `söylerim`
- `yorgunluğumu`
- `bukalemun`
- `hepsi`
- `yeşil`
- `yükseltirim`
- `drama`

Bu, gereksiz açıklama yapmayı sevmediğini veya bazı sorularda hızlı geçmek istediğini gösterir.

### 5.2. Kısa açıklama modu

En yaygın yapı: kısa cevap + ufak gerekçe.

Örnekler:

- `kusursuz biri yok bana göre herkesin bir kusuru var`
- `özür dilerim`
- `alkol ara sıra ama diğerleri yok`
- `siyasette biraz yetersizim ya ilgi alanım degil cünkü`

Bu cevaplarda duygu var ama uzun argümantasyon yok.

### 5.3. “Ama” ile iki taraflı düşünme

`ama` kelimesi çok önemli. Birçok cevapta önce bir şeyi kabul ediyor, sonra tersini veya sınırlamasını ekliyor.

Örnekler:

- `yalnızlık iyi geliyo ama cok yalnız kalınca fazla düsüncelete dalmaktan kendimi kaybedebiliyorum`
- `soğuk görünürüm dışardan ama içten samimiyimdir`
- `mükemmelitçiyim içten ama dıştan tam tersiyim`
- `ihanete uğramadım arkadas kazıgı yedim ama ağlayarak öfke krizi olurdu bence`
- `şuan olmadı ama olur diye korkuyorum`

Bu yapı kişinin düşünme biçiminde ikilik olduğunu gösterir: bir konunun iyi/kötü, iç/dış, görünen/hissedilen tarafını aynı anda düşünür.

### 5.4. “Bence” ile öznel yargı

`bence` sık geçiyor. Bu, iddialarını kişisel görüş olarak sunma eğilimini gösterir.

Örnekler:

- `bence herkesin içinde iyilikte var kötülükte`
- `bence yok`
- `bence ihtiyaç`
- `bence ben sürekli uyuyan erkek bir kediydim`

Kesin fikir belirtse bile kendine ait görüş olarak çerçeveliyor.

### 5.5. “Genelde” ile genelleme

`genelde` kelimesi olayları mutlak değil, eğilim olarak anlattığını gösterir.

Örnekler:

- `hüzünlü müzikler dinlerim genelde`
- `rahatsız eder genelde ama bazen gülerim`
- `siyah beyaz yeşil genelde`
- `gelip geçici hevesleri için kullanıyolar genelde`

Bu, gözlemci ama kesin hükümden kaçan bir anlatım.

### 5.6. Liste gibi akan cümleler

Günlük rutin, sevdiği şeyler, hobiler gibi konularda virgül veya madde işareti kullanmıyor; kelimeleri peş peşe diziyor.

Örnek:

> uyanırım telefona bakıp geri uyurum sonra kahvaltı yaparım ders gezmek spor bilgisayara bakmak tiktok izlemek falan böyle

Bu yapı şu hissi verir:

- spontane
- konuşur gibi
- hızlı yazılmış
- sıralama var ama yazı düzeni yok

### 5.7. Aforizma / hayat dersi cümleleri

Bazı cevaplar kısa ama felsefi/aforizmik.

Örnekler:

- `hersey gelip geçici`
- `hiç bir şey kalıcı değil`
- `para mutluluk getirmez getirse bile bir yere kadar geçici`
- `seni öldürmeyen şey delirtir`
- `kusursuz biri yok`
- `her an herşey olabilir bilemeyiz`

Bu cümleler kişinin temel hayat algısını çok net gösteriyor: kalıcılığa inanç zayıf, geçicilik ve duygusal yıpranma baskın.

---

## 6. Duygu tonu

Genel ton şu karışımlardan oluşuyor:

1. **Yorgunluk**
2. **Melankoli**
3. **Direktlik**
4. **Güvensizlik**
5. **Sevgi/bağlanma ihtiyacı**
6. **Argo tepkisellik**
7. **Kısa ama yoğun cevap verme**

### 6.1. Yorgunluk ve bıkkınlık

Örnekler:

- `yoruldum bıktım hersey cok sahte geliyor`
- `yorgunluğumu`
- `hayat cok sıkıcı`
- `sürekli bir belayı cekiyo gibi hissediyorum`

Bu ton datasetin en güçlü arka planlarından biri. Her cevapta açık değil ama birçok temanın altında bu duygu var.

### 6.2. Melankoli ve varoluşsal boşluk

Örnekler:

- `hayatın ne kadar boş ve sadece günü geçirmek için yaşadığımı hissediyorum`
- `yasamak icin bir sebep göremiyorum`
- `hiç bir şey kalıcı değil`
- `gelip geçici olmamız`

Burada hayatı geçici, yorucu ve bazen anlamsız görme eğilimi var.

### 6.3. İçte hassas, dışta soğuk izlenimi

Kişi kendi dış görünümünü/algısını şöyle anlatıyor:

- `soğuk görünürüm dışardan ama içten samimiyimdir`
- `mükemmelitçiyim içten ama dıştan tam tersiyim`
- `hissederim ve anlarım ama çaktırmam`
- `elim ayağım birbirine girer... sessizce gülerim dışa vurmam`

Bu, duyguları yoğun yaşayıp dışa sınırlı gösterme kalıbı.

---

## 7. Düşünme yapısı

### 7.1. Geçicilik merkezli dünya görüşü

Datasetin en belirgin ana fikri: **her şey geçici**.

Geçicilik şu alanlarda çıkıyor:

- mutluluk
- insan ilişkileri
- hayat
- ölüm
- bağlanma
- hevesler
- anlam

Örnekler:

- `hersey gelip geçici`
- `gelip geçici olmamız`
- `para mutluluk getirmez getirse bile bir yere kadar geçici`
- `en baştan bağlanmam cünkü insanlar gelio geçici`
- `gelip geçici hevesleri için kullanıyolar genelde`

Bu sadece bir söz değil, cevapların mantığını şekillendiren ana lens.

### 7.2. İnsanları “karakter / bakış açısı / düşünce yapısı” ile okuma

İnsan değerlendirme kriteri fiziksel detaydan çok zihinsel ve karakter temelli.

Örnekler:

- `karakteri ve bakış açısı tavrı falan hareketleri`
- `düsünceleri ve bakış açısıyla birazda ders`
- `düsünce yapısı ve karakteri bakış açısı empatisi`
- `bakış açılarımı ve kendime bu hale getirmemi`

Bu, kişinin ilişki ve arkadaşlıkta davranışın arkasındaki zihniyeti anlamaya çalıştığını gösterir.

### 7.3. Başlamadan sonunu düşünme

En büyük korku cevabı çok kritik:

> daha baslamadan biseylerin bitmesi yani sonunu düşünmek

Bu sadece fobi cevabı değil, genel zihinsel model gibi. Kişi olayları başlatırken bile sonunu, bitecek olmasını, kaybı ve bozulmayı düşünüyor olabilir.

### 7.4. Kontrol ve sezgi ihtiyacı

Bazı cevaplarda kontrol, sezgi ve önceden anlama teması var:

- `ben söylemeden yapsın kafasındayım`
- `olması gerekeni ben demeden yapmalı zaten`
- `hissederim ve anlarım ama çaktırmam`
- `sezgilerim ve kalpsizlik`
- `düzen takıntım var biraz`

Bu, ilişkilerde açık iletişimden ziyade karşı tarafın sezmesini bekleme eğilimi yaratabilir.

### 7.5. Kendini dönüştürme isteği

Kendisiyle ilgili cevaplarda değişim isteği var:

- `yeniden doğmak isterdim 0 duygu 0 his`
- `kendimi degistirince iyilesicem düsüncesi`
- `kendimim ve yaptıgım seylerle biseyleri düzeltmek en iyisini yapmak`

Bu cümleler güçlü bir içsel memnuniyetsizlik ve yeniden başlama isteği gösteriyor.

---

## 8. İlişki ve bağlanma örüntüsü

### 8.1. Sadakat ve sınır

Kırmızı çizgiler:

- `aldatma`
- `gevşeklik`
- `üçüncü kişiler`

Bu, ilişkilerde sahiplenme, sınır ve sadakat beklentisinin yüksek olduğunu gösterir.

### 8.2. Yoğun bağlanma hayali

Hayalinde “kalabalık başarı”dan çok sevdiği kişiyle izole, özel bir alan var.

Örnek:

> büyüyüp kariyer yapıp tek bir insanla herkesten herseyden uzaklasmak

Bu cümlede hedef üç parçalı:

1. büyümek / olgunlaşmak
2. kariyer yapmak
3. tek bir insanla dünyadan uzaklaşmak

Bu, romantik bağın hayat planında çok merkezi olduğunu gösterir.

### 8.3. Sevilen kişiye odaklı yaşam

Örnekler:

- `sevdigim insanla bir yerleri kesfederken`
- `sevdigim insanla sevdigim seyleri yapmak`
- `sevdigin insanla evlenirsen ilk seçenek`

Sevilen kişiyle deneyim paylaşmak, onun için mutluluk kaynağı.

### 8.4. Sözsüz anlaşılma beklentisi

Örnek:

> ben söylemeden yapsın kafasındayım cünkü olması gerekeni ben demeden yapmalı zaten

Bu çok karakteristik. İlişkide karşı tarafın bazı şeyleri açıklama istemeden bilmesi bekleniyor.

### 8.5. Bağlanma-korunma çelişkisi

Bir yandan yoğun bağ istiyor; diğer yandan “insanlar geçici” diye düşünüyor.

- bağlanma isteği: `tek bir insanla...`
- korunma refleksi: `en baştan bağlanmam cünkü insanlar gelio geçici`

Bu, yaklaşma-kaçınma karışımı bir ilişki tonu oluşturuyor.

---

## 9. Arkadaşlık ve sosyal davranış

### 9.1. Sosyal ortamda uyum sağlama

Örnek:

> sessizce telefonla oynarım arkadaşlarım fikir sunar bende uyarım

Kalabalıkta dominant karar verici değil; daha çok akışa uyan, fikir sunulduğunda katılan biri gibi.

### 9.2. Arkadaşlıkta kusursuzluk beklemiyor

> kusursuz biri yok bana göre herkesin bir kusuru var

İdealize etmiyor; herkesin kusurlu olduğunu kabul ediyor.

### 9.3. Arkadaş kazığı / hayal kırıklığı

> ihanete uğramadım arkadas kazıgı yedim ama ağlayarak öfke krizi olurdu bence

İhanet ve arkadaş kazığına tepkisi yoğun: ağlama + öfke krizi.

### 9.4. Kendini açıklama sınırı

> anlayacak biriyse acıklarım anlatırım ama anlamayacak biriyse ne düsünürse düsünsün derim

Bu cümle sosyal enerji ekonomisini gösteriyor. Herkese açıklama yapmıyor; anlamayacak kişiyi bırakıyor.

---

## 10. Aile ve yakın çevre

En çok değer verdiği kişi:

> kardeşim çünkü iyi anlaşamasakta günün sonunda üzülüp ağladığımı görünce gelip fayda etmese bile sarılıp teselli etmeye calısıyor

Bu cevapta üç önemli nokta var:

1. Kardeşle her zaman iyi anlaşmıyor.
2. Buna rağmen zor anda fiziksel/duygusal destek önemli.
3. “Fayda etmese bile” ifadesi, çözümden çok çabanın değerli olduğunu gösteriyor.

Yani kişi için destek; sorunu çözmekten çok yanında olunması, sarılması, teselli çabası.

---

## 11. Öfke, kırgınlık ve tepki biçimi

### 11.1. Öfke bedensel yaşanıyor

> ellerim titrer gözlerim yerinden cıkıcak gibi hissederim vurup kırmak dökmek parcalamak gecer içimden

Öfke zihinsel değil, bedensel ve patlamalı tarif ediliyor.

### 11.2. Hakarete iki seçenekli tepki

> üstüme alınamıyorum o yüzden ya bende küfürle karsılık veririm ya da aynen fln derim

İki mod:

- karşı saldırı: küfür
- küçümseyici geçiştirme: `aynen fln`

### 11.3. Beddua/empatik intikam

> istedim empati yapmalarını isteyip 10 mislini yaşamalarını istedim

Bu intikam fikri fiziksel zarar değil; yaşattığını yaşama, empati yapma üzerinden.

---

## 12. Argo ve küfür kullanımı

Kendi belirttiği sık kelimeler:

- `ya`
- `of`
- `ananı`
- `sikerim`
- `sikicem`
- `fln`

Sonradan ayrıca:

- `amk`
- `sikicem`
- `ananı`

Argo, genel dilin tamamını kaplamıyor. Daha çok:

- sinir anı
- refleks
- samimi konuşma
- genç mesajlaşma dili

olarak kullanılıyor.

---

## 13. Emoji ve yumuşak dış ifade

Kullandığı emojiler:

> 🥺 💗🌸🥰🤍

Bu emojiler estetik olarak:

- tatlı
- kırılgan
- romantik
- pastel
- masum
- duygusal

bir izlenim verir.

Bu, metindeki karamsarlık ve argo ile kontrast oluşturuyor. Yani dil iki uçlu:

- İçerik: yorgun, karamsar, direkt
- Emoji/estetik: yumuşak, tatlı, romantik

---

## 14. Günlük yaşam ve alışkanlıklar

Günlük rutin:

> uyanırım telefona bakıp geri uyurum sonra kahvaltı yaparım ders gezmek spor bilgisayara bakmak tiktok izlemek falan böyle

Bu rutinde öne çıkanlar:

- telefon ilk temas
- geri uyuma
- kahvaltı
- ders
- gezmek
- spor
- bilgisayar
- tiktok

Dijital kullanım:

> tiktok insta ve dc ekran sürem 7 8 saat fln en az

Sosyal medya ve ekran süresi yüksek. Platformlar:

- TikTok
- Instagram
- Discord
- YouTube

YouTube içeriği:

- ders videoları
- meditasyon videoları

Bu ilginç bir denge: bir yandan sosyal medya/oyun, bir yandan ders ve meditasyon.

---

## 15. Zevkler, estetik ve medya tüketimi

### 15.1. Müzik

> hüzünlü müzikler dinlerim genelde ingilizce türkçe herşeyi dinliyorum her tarz ve dil

Müzikte baskın duygu: hüzün. Ama tür/dil olarak açık.

### 15.2. Film/dizi

Seçimler:

- Delibal
- İncir Reçeli
- Issız Adam
- 13 Reasons Why
- Dexter

Ortak tonlar:

- dramatik
- travmatik
- aşk acısı
- yalnızlık
- ölüm/kriz
- psikolojik yoğunluk
- karanlık karakterler

Bu seçimler kişinin melankolik ve psikolojik yoğunluk içeren anlatılara çekildiğini gösterir.

### 15.3. Renkler

> siyah beyaz yeşil genelde

Siyah-beyaz: sade, kontrast, minimal.  
Yeşil: göz rengiyle de bağlantılı olabilir; ayrıca doğallık/rahatlama çağrışımı yapar.

### 15.4. Oyunlar

- DDNet
- Roblox
- Minecraft
- Brawlhalla

Ama yoğun oyuncu gibi değil:

> ama hepsini cok oynamıyorum ara sıra

---

## 16. Beden, görünüş ve öz algı

Görünüş cevabı detaylı:

> saçım şuan kahverengi saç rengimi degistirmeyi seviyorum her renk yaptım gözüm yeşil cildim beyaz giyim tarzım keyfime göre herşeyi giyiyorum dövmem yok piercingim var kulagımda ve karnımda

Buradan çıkanlar:

- Saç değişimi seviyor.
- Sabit bir stile bağlı değil.
- Giyim “keyfe göre”.
- Dövme yok.
- Kulak ve karın piercingi var.
- Yeşil göz, beyaz ten vurgusu var.

Öz bakım konusu:

> insanların öz bakımı

Öz bakım başkalarında da dikkatini çeken bir şey.

Güzellik takıntısı:

> güzellik takıntısı sorunsalı oldugu icin ikinci

Bu, görünüş/estetik algısının onun için hassas bir alan olduğunu gösterir.

---

## 17. Eğitim, gelecek ve kariyer

> üni 1 ama dondurdum tekrar yks giricem bir ay sonra

Bu cevapta geçiş dönemi var:

- üniversiteye başlamış
- dondurmuş
- tekrar sınava hazırlanıyor
- belirsizlik ve yeniden yönlenme var

Hayal:

> büyüyüp kariyer yapıp tek bir insanla herkesten herseyden uzaklasmak

Kariyer tek başına amaç değil; güvenli özel hayatla birleşince anlamlı.

---

## 18. Korkular ve hassas noktalar

### 18.1. Başlamadan bitme korkusu

> daha baslamadan biseylerin bitmesi yani sonunu düşünmek

Bu, terk edilme/kaybetme/bozulma kaygısına benzeyen bir metinsel örüntü oluşturuyor.

### 18.2. Böcek ve ot korkusu

> böcekler, otlar

Doğa sorusunda da tekrar ediyor:

> doğada tek kalmıycsksam olur ama böcek ve ot korkum var

Bu somut fobi gibi.

### 18.3. Aileye yakalanma / gizleme

> yalan söylemek ve saklamamam gereken bişeyleri evde saklayıp aileme yakalanmak kötü

Bu cevap suçluluk, gizleme, aile otoritesi ve yakalanma korkusu içeriyor.

---

## 19. Travmatik / ağır içerik alanları

Dataset içinde özellikle dikkat isteyen cevaplar var:

- `intihar eylemim`
- `geçirdim ve krizlere girdim`
- yeme bozukluğu ve hastaneye yatış anlatımı
- `yasamak icin bir sebep göremiyorum`
- `yeniden doğmak isterdim 0 duygu 0 his`

Bu ifadeler metinsel olarak çok ciddi duygusal yük taşıyor. Bu rapor tanı koymaz; ancak içerik riskli/hassas kabul edilmelidir.

Eğer gerçek kişi hâlâ bu yoğunlukta hissediyorsa:

- yalnız bırakılmamalı
- güvendiği bir yetişkin/yakın kişi bilgilendirilmeli
- psikolog/psikiyatri desteği önerilmeli
- acil riskte 112 aranmalı

---

## 20. Kişilik izlenimi: metinden çıkan profil

Tanı değil, sadece yazılı cevaplardan çıkan izlenim:

- Dışarıdan soğuk/sakin görünebilir.
- İçeride yoğun duygular yaşar.
- İnsanların düşünce yapısına çok dikkat eder.
- Sadakat ve üçüncü kişiler konusunda hassastır.
- Romantik ilişkide sözsüz anlaşılma bekler.
- Geçicilik fikri hayat algısında çok baskındır.
- Hayal kırıklığına karşı savunmalı durur.
- Sevdiği insana yoğun bağlanma eğilimi vardır.
- Sosyal medyada ve dijital ortamda vakit geçirir.
- Cümleleri kısa, hızlı, düzeltilmemiş ve doğal akar.
- Argo kullanabilir ama tamamen sert biri gibi yazmaz.
- Tatlı/pastel emoji dili ile karamsar metin içeriği bir arada bulunur.

---

## 21. Cevap verme algoritması gibi özet

Bu kişinin dataset içindeki cevap verme biçimi kabaca şöyle çalışıyor:

1. Soru somutsa kısa cevap verir.
2. Soru duygusalsa içsel bir cümle ekler.
3. Soru ilişki/insan hakkındaysa karakter, bakış açısı, sadakat ve empatiye döner.
4. Soru hayat/hayal hakkındaysa geçicilik, yorgunluk veya sevdiği insanla uzaklaşma fikrine kayar.
5. Çok açıklama yapmadan net yargı verir.
6. Yargısını `bence`, `genelde`, `ama`, `kime göre neye göre` ile yumuşatır.
7. Noktalama kullanmadan düşünceleri arka arkaya dizer.
8. Yazım hatalarını düzeltmez.
9. Duygusal yoğunluk arttıkça cevap daha uzun ve akışkan olur.

---

## 22. Stil kılavuzu: Bu datasetin yazım biçimi nasıl görünür?

Etik sınır: Bu bölüm bir kişiyi kandırmak veya onun kimliğine bürünmek için değil, izinli karakter/ton analizi için düşünülmelidir.

### 22.1. Biçim kuralları

- Cümle başında büyük harf kullanma.
- Nokta ve virgül çok az kullan.
- Çok kusursuz Türkçe yazma.
- Bazı Türkçe karakterleri atla: `cok`, `cünkü`, `degil`, `yas`, `icin`.
- Ama hepsini atlama; arada `ş`, `ğ`, `ü`, `ı` kullan.
- Kısa cevap ver.
- Duygusal konularda tek uzun akış cümlesi yaz.
- `ya`, `ama`, `bence`, `genelde`, `fln`, `bişey`, `hersey` kullan.
- Fazla akademik kelime kullanma.
- Cevapları fazla düzgün paragraflara bölme.

### 22.2. Kelime tercihleri

Kullanıma uygun karakteristik kelimeler:

- `ya`
- `of`
- `bence`
- `genelde`
- `ama`
- `cünkü`
- `fln`
- `bişey`
- `bisey`
- `hersey`
- `herşey`
- `sevdigim insan`
- `bakış açısı`
- `düşünce yapısı`
- `gelip geçici`
- `yorgun`
- `sahte`

### 22.3. Cümle şablonları

- `bence ... ama ...`
- `genelde ... ama bazen ...`
- `... ya da ...`
- `kime göre neye göre değişir`
- `hersey gelip geçici`
- `ben söylemeden ...`
- `sevdigim insanla ...`
- `dışardan ... ama içten ...`
- `hissederim ama çaktırmam`

### 22.4. Örnek stil cümleleri

Bunlar birebir taklit için değil, dil yapısını göstermek için örnektir:

- `bence insanlar bazı şeylere fazla anlam yüklüyo ama hersey bi yere kadar güzel sonra geciyo`
- `genelde umursamam gibi dururum ama içten baya takarım`
- `ya bilmiyorum sevdigim insanla huzurlu olmak yeterli gibi`
- `hersey gelip geçici zaten o yüzden cokta anlam yüklememek lazım`
- `ben söylemeden anlaması daha önemli cünkü söyleyince anlamı kalmıyo gibi`

---

## 23. Soru türlerine göre cevap davranışı

### 23.1. Kimlik soruları

Kısa ve net:

- ad, yaş, cinsiyet, memleket gibi sorulara doğrudan cevap.
- Detay istenirse bile bazen eksik bırakıyor.

Örnek:

> 19 yaşındayım kova burcuyum

Doğum tarihi sorulmuş ama tam tarih verilmemiş. Bu, sorunun her detayına birebir cevap vermediğini gösterir.

### 23.2. Görünüş soruları

Daha detaylı cevap veriyor. Saç, göz, cilt, giyim, piercing gibi detayları sıralıyor. Görünüş konusu onun için anlatılabilir bir alan.

### 23.3. Duygu soruları

Duygu sorularında cevaplar daha yoğun ve bedensel:

- el titremesi
- gözlerin çıkacak gibi olması
- vurup kırma isteği
- sessizce gülme
- dışa vurmama

Duyguları soyut değil, bedensel hislerle anlatıyor.

### 23.4. İlişki soruları

İlişki sorularında şu kavramlar baskın:

- sadakat
- üçüncü kişiler
- sevdigi insan
- karakter
- sözsüz anlaşılma
- birlikte uzaklaşma

### 23.5. Felsefi sorular

Kısa ve karamsar/fatalist cevaplar:

- geçicilik
- kalıcılık yokluğu
- hayatın boşluğu
- anlam yüklememe

### 23.6. Mizah/absürt sorular

Kısa ve beklenmedik cevaplar verebiliyor:

- `bukalemun`
- `kendim trump ve elon mask`
- `bence ben sürekli uyuyan erkek bir kediydim`
- `Atatürklü tablamun canlanması...`

Bu kısımlarda absürt ama uzun açıklamasız bir mizah var.

---

## 24. En belirgin çelişkiler ve ikilikler

Bu datasetin kişilik tadını veren şeylerden biri çelişkiler:

### 24.1. Soğuk görünüm / içten samimiyet

> soğuk görünürüm dışardan ama içten samimiyimdir

### 24.2. Yalnızlık iyi / fazla yalnızlık kötü

> yalnızlık iyi geliyo ama cok yalnız kalınca ... kendimi kaybedebiliyorum

### 24.3. Bağlanmak isteme / insanlar geçici diye kaçınma

> tek bir insanla herkesten herseyden uzaklasmak  
> en baştan bağlanmam cünkü insanlar gelio geçici

### 24.4. Mükemmeliyetçilik içte / dışta tam tersi

> mükemmelitçiyim içten ama dıştan tam tersiyim

### 24.5. Tatlı emoji / sert argo

> 🥺 💗🌸🥰🤍  
> amk, sikicem, ananı

Bu ikilikler profilin düz ve tek renk olmadığını gösterir.

---

## 25. Mini sözlük

Bu datasetin karakteristik mini sözlüğü:

- `ya`: refleks, yumuşatma, serzeniş
- `of`: sıkıntı/tepki
- `fln`: geçiştirme, samimi kısaltma
- `bence`: öznel yargı
- `genelde`: kesinlikten kaçış
- `ama`: iki duyguyu bağlama
- `hersey`: hayat genellemesi
- `geçici`: ana felsefi kelime
- `bakış açısı`: insan değerlendirme ölçütü
- `düşünce yapısı`: zihinsel uyum ölçütü
- `sevdigim insan`: romantik merkez
- `cünkü`: gerekçelendirme
- `bişey`: gündelik konuşma dili

---

## 26. En temsilî cevaplar

Aşağıdaki cevaplar datasetin genel tonunu en iyi temsil edenler:

1. `yoruldum bıktım hersey cok sahte geliyor`
2. `hersey gelip geçici`
3. `soğuk görünürüm dışardan ama içten samimiyimdir`
4. `kusursuz biri yok bana göre herkesin bir kusuru var`
5. `gelip geçici olmamız`
6. `en baştan bağlanmam cünkü insanlar gelio geçici`
7. `ben söylemeden yapsın kafasındayım cünkü olması gerekeni ben demeden yapmalı zaten`
8. `düsünce yapısı ve karakteri bakış açısı empatisi`
9. `hayat cok sıkıcı ve yasamak icin bir sebep göremiyorum...`
10. `seni öldürmeyen şey delirtir`

---

## 27. Nihai özet

Bu datasetin dili; küçük harfli, noktalamasız, hızlı yazılmış, genç sosyal medya mesajlaşma dili. Cevaplar çoğunlukla kısa ama duygu yoğunluğu yüksek. Kişinin metinsel dünyasında “geçicilik”, “yorgunluk”, “bakış açısı”, “karakter”, “sevdigi insan”, “sadakat”, “sözsüz anlaşılma” ve “kendini değiştirme” ana eksenler.

Yazı tarzı kusursuz veya edebi değil; aksine doğal, dağınık, filtresiz ve yer yer hatalı olduğu için gerçekçi. Düşünme yapısında ise karamsar-fatalist bir tarafla yoğun bağ kurma isteği aynı anda var. Dışarıdan soğuk/umursamaz görünme, içeride çok hissetme, ancak bunu sınırlı gösterme paterni çok belirgin.

Kısa formül:

> küçük harf + az noktalama + hızlı mesaj dili + `ya/ama/bence/genelde` + geçicilik fikri + içten yoğun ama dıştan mesafeli ton

---

## 28. Dosyada ayrıca üretilen yardımcı analiz

Sayısal analiz için ayrıca şu dosya üretildi:

`C:\Users\ozenc\Downloads\dataset_analysis_stats.json`

Bu dosyada kelime frekansları, uzunluk dağılımları, noktalama sayıları ve kalıp eşleşmeleri bulunur.
