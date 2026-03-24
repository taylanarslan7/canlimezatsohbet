# Canlı Yayın Birleşik Sohbet Ekranı — Ürün Gereksinimleri Dokümanı (PRD)

**Versiyon:** 1.0  
**Tarih:** Mart 2026  
**Hazırlayan:** Ürün Sahibi  
**Hedef Kitle:** Geliştirici Ekip (Antigravity)

---

## 1. Proje Özeti

Bu uygulama, satıcının aynı anda Instagram ve Facebook'ta açtığı canlı yayınlardaki sohbet mesajlarını **tek bir ekranda gerçek zamanlı olarak** gösterir. Başka hiçbir özellik bu versiyonda yer almaz.

---

## 2. Problem Tanımı

Satıcı şu anda yalnızca Instagram'da canlı yayın yaparak mezat usulü tekstil satışı gerçekleştirmektedir. Facebook'ta da aynı anda yayın açmak istemektedir. Ancak iki platformun sohbet ekranları birbirinden bağımsızdır; satıcı iki ekranı aynı anda takip edemez ve mesaj kaçırma riski doğar.

**Çözülmek istenen tek problem:** Instagram ve Facebook canlı yayın sohbetlerini yan yana değil, tek ve birleşik bir akışta görmek.

---

## 3. Hedef

Instagram ve Facebook canlı yayın yorumlarını tek bir ekranda, gerçek zamanlı olarak göster.

---

## 4. Kapsam Dışı (Bu Versiyon)

Aşağıdakiler bu versiyonda **kesinlikle yer almayacaktır:**

- Anahtar kelime tespiti veya sipariş alma
- Talep kuyruğu veya onay sistemi
- Müşteri kayıt / adres / sipariş takibi
- Ödeme veya kargo yönetimi
- TikTok veya başka platform entegrasyonu
- Mobil uygulama

---

## 5. Platform

**Web uygulaması** — Tarayıcıdan (Chrome, Firefox, Edge) çalışır. Masaüstü ekrana optimize edilmiştir (minimum 1280x768). Mobil uyumluluk bu versiyonda zorunlu değildir.

---

## 6. Platform Entegrasyonları

### 6.1 Instagram Live

- Meta Graph API üzerinden Instagram Live yayın yorumları çekilir.
- API erişimi için Instagram hesabının Meta Business Suite'e bağlı olması gerekmektedir.
- **Kritik Not:** Instagram Live yorum API'si Meta'nın onayına tabi olabilir. Geliştirici ekip, geliştirmeye başlamadan önce bu API erişiminin mevcut durumunu doğrulamalıdır.

### 6.2 Facebook Live

- Meta Graph API üzerinden Facebook Live yayın yorumları çekilir.
- `live_videos` ve `comments` uç noktaları kullanılır.
- Uzun ömürlü erişim tokenı (long-lived access token) kullanılır, otomatik yenileme yapılır.

### 6.3 Genel

- Her iki platformdan gelen mesajlar zaman damgasına göre sıralanarak **tek bir akışta** gösterilir.
- Her mesaja platform etiketi (Instagram / Facebook) ve zaman damgası eklenir.

---

## 7. Temel Özellikler

### 7.1 Kimlik Doğrulama

- Meta OAuth 2.0 akışı ile giriş yapılır.
- Satıcı hesabı Meta Business Suite'e bağlı olmalıdır.
- Token yenileme (refresh) otomatik olarak yönetilir.

### 7.2 Birleşik Sohbet Akışı

- Instagram ve Facebook yorumları tek bir listede, **zaman sırasına göre** (en yeni altta veya üstte — tercihe göre) gösterilir.
- Her mesaj şu bilgileri içerir:
  - Platform ikonu (Instagram / Facebook)
  - Kullanıcı adı
  - Mesaj içeriği
  - Zaman damgası (saat:dakika:saniye)
- Akış otomatik olarak en yeni mesaja kayar.
- Platform filtresi: Satıcı isterse sadece Instagram veya sadece Facebook mesajlarını görebilir.

### 7.3 Bağlantı Durumu

- Ekranın üstünde Instagram ve Facebook bağlantı durumu göstergesi bulunur (Bağlı / Bağlantı Kesildi).
- Bağlantı koptuğunda satıcıya görsel uyarı verilir.

---

## 8. Kullanıcı Arayüzü

- Tek sayfa (single page) uygulama.
- Üst bar: Bağlantı durumu göstergeleri + Oturumu Başlat / Durdur butonu.
- Ana alan: Birleşik sohbet akışı (tüm ekranı kaplar).
- Platform filtresi: Üst bar veya yan panel — geliştirici tercihe göre konumlandırabilir.
- Arayüz dili: **Türkçe.**

---

## 9. Teknik Gereksinimler

- Gerçek zamanlı güncelleme: Mesajlar en fazla **1-2 saniye** gecikmeyle ekranda görünmelidir.
- Yöntem: Meta Graph API Webhooks (tavsiye edilen) veya polling.
- Tüm zaman damgaları UTC olarak alınır; gösterimde yerel saate çevrilebilir.
- Yoğun yayınlarda (saniyede çok mesaj) frontend performansı korunmalıdır (sanal liste / windowing önerilir).
- API rate limit aşımlarına karşı backoff mekanizması eklenmelidir.

---

## 10. Riskler

| Risk | Açıklama | Öneri |
|---|---|---|
| Instagram Live API erişimi | Meta onayı gerekebilir, başvuru süreci uzun sürebilir. | Geliştirme başlamadan önce erişim durumu doğrulanmalıdır. |
| Token süresi dolumu | Yayın ortasında token süresi dolabilir. | Proaktif token yenileme sistemi kurulmalıdır. |
| API rate limiting | Yoğun yayınlarda limit aşılabilir. | Backoff + cache mekanizması eklenmelidir. |

---

## 11. Başarı Kriterleri

- Instagram ve Facebook yorumları 2 saniye veya daha kısa gecikmeyle ekrana yansır.
- İki platform mesajları zaman sırasına göre doğru şekilde sıralanır.
- Uygulama en az 2 saatlik kesintisiz yayın boyunca stabil çalışır.
- Bağlantı koptuğunda satıcı anında bilgilendirilir.

---

## 12. Sonraki Versiyon Fırsatları (V2)

- Anahtar kelime tespiti ("AL", "AL M", "AL L Kırmızı" gibi)
- Talep kuyruğu ve hak sıralaması (ilk yazan önce)
- Manuel onay / red paneli
- Müşteri ve sipariş yönetimi
- TikTok entegrasyonu

---

*Bu doküman, Antigravity geliştirici ekibi tarafından uygulamanın ilk versiyonunu geliştirmek için referans alınacaktır. Instagram Live API erişim durumu geliştirmeye başlamadan önce netleştirilmelidir.*
