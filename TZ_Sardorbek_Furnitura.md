# Texnik Topshiriq (TZ)
# "Sardorbek Furnitura" — Kassa/POS Tizimi

**Versiya:** 2.0
**Sana:** 2026-03-13
**Loyiha turi:** Mebel furnitura do'koni uchun to'liq avtomatlashtirilgan kassa tizimi

---

## 1. UMUMIY MA'LUMOT

### 1.1 Loyiha maqsadi
Mebel furnitura do'konining barcha jarayonlarini — sotuvdan tortib, omborxona, qarz, xodimlar, xarajatlar va ta'minotchilargacha — yagona tizim orqali boshqarish.

### 1.2 Foydalanuvchi rollari

| Rol | Kirish | Tavsif |
|-----|--------|--------|
| **Admin** | To'liq | Barcha modullarni boshqaradi: mahsulotlar, sotuv, qarz, HR, xarajat, sozlamalar |
| **Kassir** | Cheklangan | Faqat kassa, cheklar, mijozlar va qarzlar bilan ishlaydi |
| **Yordamchi** | Minimal | QR skanerlash, mahsulot qidirish, chek tayyorlash |

### 1.3 Tizim imkoniyatlari (umumiy)
- Real-time yangilanishlar (WebSocket)
- Offline rejimda ishlash va keyinchalik sinxronizatsiya
- Telegram bot orqali bildirishnomalar (sotuv, qarz)
- QR kod generatsiya va skanerlash
- Termal printerga chop etish
- Mobil qurilmalarda to'liq ishlash (responsive)
- GPS orqali xodim davomat nazorati
- Ko'p tilli interfeys (O'zbek, Ingliz, Rus)
- PWA (Progressive Web App) — telefondan ilova sifatida o'rnatish
- Mijoz ball tizimi (loyalty points)
- CRM kontaktlar boshqaruvi
- Avans to'lov tizimi (xodimlar uchun)
- Narx tarixi va audit trail
- Avtomatik versiya tekshiruv va yangilanish

---

## 2. ADMIN PANEL

### 2.1 Sidebar navigatsiya

Admin panelning chap tomonida doimiy sidebar mavjud.

**Sidebar menyu (hozirda ko'rinadigan):**

| # | Bo'lim |
|---|--------|
| 1 | Statistika |
| 2 | Kassa |
| 3 | Mahsulotlar |
| 4 | Kategoriyalar |
| 5 | Qarzlar |
| 6 | Mijozlar |
| 7 | Ta'minotchilar |
| 8 | Xarajatlar |
| 9 | HR — Xodimlar |
| 10 | HR — Oylik |

**Qo'shimcha sahifalar (sidebar da yo'q, boshqa sahifalardan kirish):**

| # | Bo'lim | Kirish usuli |
|---|--------|--------------|
| 11 | Omborxona | Mahsulotlar sahifasidan |
| 12 | Qarz tasdiqlash | Qarzlar sahifasidan / badge |
| 13 | Buyurtmalar | Kassa sahifasidan |
| 14 | Xodimlar (sotuv) | HR sahifasidan |
| 15 | Xodim cheklari | Xodimlar sahifasidan |
| 16 | HR — Davomat | HR sahifasidan |
| 17 | Telegram sozlamalari | Sozlamalar orqali |
| 18 | Kontaktlar | Mijozlar sahifasidan |
| 19 | Hamkorlar | Sidebar yoki sozlamalar orqali |
| 20 | Monitoring | Sozlamalar orqali |

Sidebar mobil qurilmalarda hamburger menyu orqali ochiladi. Swipe gesture bilan yopiladi.
Sidebar menyusi admin tomonidan sozlanishi mumkin (navbarItems settings).

**Sidebar pastki qismi:**
- **Foydalanuvchi kartasi:** Ism, rol (badge), avatar (birinchi harf)
- **Profil tahrirlash tugmasi:** Bosilganda modal ochiladi — ism, telefon, parol o'zgartirish
- **Valyuta kursi tugmasi (faqat admin):** USD → UZS kursni kiritish va saqlash
- **Til almashtirgich:** O'zbek / Ingliz / Rus
- **Chiqish tugmasi:** Tizimdan chiqish

**Mobil pastki navigatsiya (barcha rollar uchun):**

| # | Tugma |
|---|-------|
| 1 | Statistika |
| 2 | Kassa |
| 3 | Mahsulotlar |
| 4 | Qarzlar |

Pastki navigatsiya modal ochiq bo'lganda yashirinadi.

---

### 2.2 Statistika (Dashboard)

Dashboard sahifasida 3 ta asosiy tab mavjud:

#### 2.2.1 Tab: Hisobot

**Sana filtri:** "Dan" va "Gacha" sana tanlash maydonlari (standart: bugungi kun)

**8 ta statistik karta:**

| # | Karta nomi | Tavsif |
|---|-----------|--------|
| 1 | Jami sotuv | Tanlangan davrdagi umumiy sotuv summasi |
| 2 | Naqd | Naqd pul orqali to'langan summa |
| 3 | Karta | Bank kartasi orqali to'langan summa |
| 4 | Click | Click orqali to'langan summa |
| 5 | Qarz | Qarzga berilgan summa |
| 6 | Bonus | Xodimlarga berilgan bonus summasi |
| 7 | Xarajat | Tanlangan davrdagi umumiy xarajat |
| 8 | Yetkazish | Yetkazib berish orqali sotilgan summa |

**Sof foyda:** Ekranning pastki qismida ko'rsatiladi.
**Formula:** `Sof foyda = Jami sotuv - Xarajat - Bonus`

#### 2.2.2 Tab: Xodimlar

Ikki blokdan iborat:

**Kassirlar jadvali:**

| Ustun | Tavsif |
|-------|--------|
| Ism | Kassir ismi |
| Sotuvlar soni | Amalga oshirgan sotuvlar soni |
| Jami summa | Umumiy sotuv summasi |
| Bonus | Hisoblangan bonus summasi |

**Dostavchilar jadvali:**

| Ustun | Tavsif |
|-------|--------|
| Ism | Dostavchi ismi |
| Yetkazishlar soni | Amalga oshirgan yetkazishlar |
| Jami summa | Yetkazilgan buyurtmalar summasi |

#### 2.2.3 Tab: Cheklar

- Barcha sotuvlar ro'yxati (infinite scroll bilan)
- Har bir chek: sana, summa, to'lov usuli, kassir, mijoz
- To'lov usuli bo'yicha filtr (Barchasi / Naqd / Karta / Click / Qarz)
- Chekni bosish → batafsil ma'lumot ochiladi (mahsulotlar ro'yxati)

---

### 2.3 Kassa (Sotuv nuqtasi)

Bu sahifa sotuv amalga oshirish uchun asosiy ish joyi. Ikki qismdan iborat:

#### 2.3.1 Chap qism — Mahsulotlar

**Qidiruv:** Yuqorida qidiruv maydoni (Ctrl+K bilan fokus). Mahsulot nomi, kodi bo'yicha qidirish. Natijalar dropdown sifatida ko'rinadi.

**Kategoriya filtri:** Gorizontal scrollable tugmalar — "Barchasi" + barcha kategoriyalar. Kategoriya tanlanganida uning ichki kategoriyalari (subcategory) ham ko'rinadi.

**Mahsulotlar gridi:** Kartalar ko'rinishida:
- Mahsulot rasmi (lazy loading)
- Nomi
- Narxi (dona/karobka)
- Qoldiq (stock) — rangli indikator: yashil (yetarli), sariq (kam qolgan), qizil (tugagan)
- Chegirma darajalari (agar mavjud)
- Bosganda savatga qo'shiladi

**Statistik kartalar (qidiruv maydonida):**
- Jami mahsulotlar soni
- Kam qolgan mahsulotlar
- Tugagan mahsulotlar
- Umumiy qiymat

#### 2.3.2 O'ng qism — Savatcha

**Savatcha ro'yxati:** Har bir element uchun:
- Mahsulot nomi
- Miqdor +/- tugmalar (raqam bevosita kiritish mumkin)
- Birlik narxi
- Jami narx
- O'chirish tugmasi
- O'ram rejimi (metrli mahsulotlar uchun) — o'ram sonini kiritish, tizim metrajni avtomatik hisoblaydi

**Pastki panel:**
- Umumiy summa
- "Tozalash" tugmasi — savatchani bo'shatish
- "Saqlash" tugmasi — chekni qoralama sifatida saqlash
- "To'lov" tugmasi — to'lov modalini ochish

#### 2.3.3 To'lov modali

To'lov tugmasi bosilganda ochiladi:

**Mijoz tanlash:**
- Mavjud mijozlar ro'yxatidan qidirish
- "Yangi mijoz" — ism, telefon kiritish

**To'lov usullari:**

| Usul | Tavsif |
|------|--------|
| Naqd | To'liq naqd pul |
| Karta | Bank kartasi |
| Click | Click ilovasi |
| Aralash | Naqd + Karta + Click kombinatsiya |
| Qarz | To'liq yoki qisman qarzga |

**Qo'shimcha maydonlar:**
- Bonus foizi (xodim uchun)
- Yetkazish rejimi (yoqilsa dostavchi tanlash)
- To'lov xulosasi: Jami, chegirma, bonus, qarz qoldig'i

**Chek chop etish:** To'lov tasdiqlangandan keyin termal printerga chop etish imkoniyati.

---

### 2.4 Mahsulotlar


#### 2.4.1 Yuqori panel
- Qidiruv maydoni (nomi, kodi bo'yicha)
- Kategoriya filtri (dropdown)
- Ichki kategoriya filtri (dropdown)
- "Yangi mahsulot" tugmasi

#### 2.4.2 Statistik kartalar

| Karta | Tavsif |
|-------|--------|
| Jami | Barcha mahsulotlar soni |
| Kam qolgan | Minimal stokdan past mahsulotlar |
| Tugagan | Stok 0 bo'lgan mahsulotlar |
| Jami qiymat | Barcha mahsulotlarning umumiy qiymati |

#### 2.4.3 Mahsulotlar gridi

Har bir mahsulot kartasi:
- Rasm (placeholder agar rasm yo'q)
- Mahsulot nomi
- Narx (dona va karobka)
- Qoldiq soni va birlik turi
- Chegirma darajalari (agar mavjud)
- Checkbox (batch tanlash uchun)

**Batch amallar:** Bir nechta mahsulot tanlanganida:
- QR kod chop etish (tanlanganlarga)
- Batch tahrirlash

#### 2.4.4 Mahsulot qo'shish/tahrirlash modali

| Maydon | Tavsif | Majburiy |
|--------|--------|----------|
| Nomi | Mahsulot nomi | Ha |
| Tavsif | Qisqacha tavsif | Yo'q |
| Kategoriya | Asosiy kategoriya | Ha |
| Ichki kategoriya | Subcategory | Yo'q |
| Birlik turi | dona / kg / metr / litr / karobka / qop | Ha |
| Tan narxi | Sotib olish narxi | Ha |
| Sotish narxi (dona) | Donasiga sotish narxi | Ha |
| Sotish narxi (karobka) | Karobkasiga narx | Yo'q |
| Tan narxi (USD) | Dollar kursidagi tan narxi | Yo'q |
| Karobkadagi soni | 1 karobkada nechta dona | Yo'q |
| Og'irligi | Karobka og'irligi | Yo'q |
| O'ramdagi metr | 1 o'ramda nechta metr (metrli mahsulotlar) | Yo'q |
| Pachkadagi soni | 1 pachkada nechta birlik | Yo'q |
| Rasmlar | 8 tagacha rasm yuklash | Yo'q |
| Minimal stok | Ogohlantirish chegarasi | Yo'q |

**Chegirma darajalari (3 ta gacha):**

| Daraja | Tavsif |
|--------|--------|
| 1-daraja | Minimal miqdor + Chegirma foizi (masalan: 10 donadan — 5%) |
| 2-daraja | Minimal miqdor + Chegirma foizi (masalan: 50 donadan — 10%) |
| 3-daraja | Minimal miqdor + Chegirma foizi (masalan: 100 donadan — 15%) |

Chegirma kassada avtomatik qo'llanadi — mijoz ko'rsatilgan miqdordan ko'p sotib olsa.

---

### 2.5 Kategoriyalar


#### 2.5.1 Kategoriyalar ro'yxati
- Har bir kategoriya: nomi, ichki kategoriyalar soni, mahsulotlar soni
- Tartibni o'zgartirish (drag & drop yoki tugmalar)
- Tahrirlash va o'chirish tugmalari

#### 2.5.2 Kategoriyani bosish
Kategoriya bosilganda ikki qism ochiladi:
- **Ichki kategoriyalar** — qo'shish, tahrirlash, o'chirish
- **Mahsulotlar** — ushbu kategoriyaga tegishli mahsulotlar

#### 2.5.3 Kategoriya modali
- Nomi (majburiy)
- Holati (faol/nofaol)

#### 2.5.4 Ichki kategoriya modali
- Nomi (majburiy)
- Tegishli kategoriya (avtomatik)

---

### 2.6 Omborxona


#### 2.6.1 Omborlar gridi
Har bir ombor kartasi:
- Nomi
- Kod
- Mahsulotlar soni
- Bosganda mahsulotlar modali ochiladi

#### 2.6.2 Ombor mahsulotlari modali
Mahsulotlar ro'yxati:
- Rasm
- Nomi va kodi
- Tan narxi, optom narxi
- Paket ma'lumoti (soni, paketdagi birlik)
- QR kod generatsiya

#### 2.6.3 Ombor qo'shish/tahrirlash

| Maydon | Tavsif |
|--------|--------|
| Nomi | Ombor nomi |
| Manzil | Joylashuv |

---

### 2.7 Qarzlar


#### 2.7.1 Tablar

| Tab | Tavsif |
|-----|--------|
| Olinadigan qarzlar | Mijozlardan olinadigan qarzlar (receivable) |
| Beriladigan qarzlar | Ta'minotchilarga beriladigan qarzlar (payable) |

#### 2.7.2 Filtrlar
- Qidiruv maydoni (mijoz nomi, telefoni bo'yicha)
- Status filtri: Barchasi / Kutilmoqda / Tasdiqlangan / To'langan

#### 2.7.3 Statistik kartalar

| Karta | Tavsif |
|-------|--------|
| Jami qarzlar | Umumiy qarzlar soni |
| Kutilmoqda | Tasdiq kutayotgan qarzlar |
| Tasdiqlangan | Tasdiqlangan aktiv qarzlar |
| To'langan | To'liq to'langan qarzlar |
| Jami summa | Barcha qarzlarning umumiy summasi |
| Qoldiq | Hali to'lanmagan qarz summasi |

#### 2.7.4 Qarzlar ro'yxati (infinite scroll)

Har bir qarz:
- Mijoz ismi va telefoni
- Qarz summasi
- To'langan summa
- Qoldiq summa
- Muddat (due date)
- Status badge (rangli)
- Garov (agar mavjud)

#### 2.7.5 Amallar

| Amal | Tavsif |
|------|--------|
| To'lov qabul qilish | Qisman yoki to'liq to'lov kiritish |
| Tahrirlash | Qarz ma'lumotlarini o'zgartirish |
| O'chirish | Qarzni o'chirish (faqat admin) |
| Muddatni uzaytirish | Yangi muddat belgilash |

#### 2.7.6 Yangi qarz modali

| Maydon | Tavsif | Majburiy |
|--------|--------|----------|
| Mijoz | Mavjud mijozdan tanlash yoki yangi yaratish | Ha |
| Summa | Qarz summasi | Ha |
| Muddat | To'lov muddati | Ha |
| Tavsif | Izoh | Yo'q |
| Garov | Kafolat ma'lumoti | Yo'q |
| Mahsulotlar | Qarzga olingan mahsulotlar | Yo'q |

---

### 2.8 Qarz tasdiqlash


Bu sahifa faqat **tasdiq kutayotgan** qarzlarni ko'rsatadi (kassir tomonidan yaratilgan qarzlar admin tomonidan tasdiqlanishi kerak).

Har bir qarz uchun:
- Mijoz ma'lumoti
- Qarz summasi
- Yaratilgan sana
- Kim yaratgan (kassir nomi)

**Amallar:**
- "Tasdiqlash" — qarzni aktiv holatga o'tkazadi
- "Rad etish" — qarzni bekor qiladi

**Badge:** Sidebar da tasdiq kutayotgan qarzlar soni ko'rsatiladi (real-time).

---

### 2.9 Buyurtmalar


#### 2.9.1 Status filtri

| Status | Tavsif |
|--------|--------|
| Barchasi | Barcha buyurtmalar |
| Yangi | Yangi tushgan buyurtmalar |
| Jarayonda | Tayyorlanayotgan buyurtmalar |
| Jo'natilgan | Yo'lga chiqqan buyurtmalar |
| Yetkazilgan | Muvaffaqiyatli yetkazilgan |
| Bekor qilingan | Bekor qilingan buyurtmalar |

#### 2.9.2 Buyurtmalar ro'yxati

Har bir buyurtma:
- Buyurtma raqami
- Mijoz ismi
- Mahsulotlar soni
- Umumiy summa
- Sana
- Status badge

#### 2.9.3 Amallar
- Statusni o'zgartirish (dropdown)
- Buyurtmani o'chirish (faqat admin)

---

### 2.10 Mijozlar


#### 2.10.1 Filtrlar
- Qidiruv maydoni (ism, telefon)
- Viloyat filtri
- Tuman filtri
- Saralash: Yangi / Ism / Qarz / Xaridlar

#### 2.10.2 Statistik kartalar

| Karta | Tavsif |
|-------|--------|
| Jami mijozlar | Umumiy mijozlar soni |
| Qarzli mijozlar | Qarzi bor mijozlar soni |
| Jami qarz | Barcha mijozlarning umumiy qarz summasi |
| Jami xaridlar | Barcha mijozlar xaridlari summasi |

#### 2.10.3 Mijozlar ro'yxati (infinite scroll)

Har bir mijoz:
- Ism
- Telefon raqam
- Qarz summasi
- Oxirgi xarid sanasi
- Jami xaridlar summasi

#### 2.10.4 Amallar

| Amal | Tavsif |
|------|--------|
| Tahrirlash | Mijoz ma'lumotlarini o'zgartirish |
| O'chirish | Mijozni o'chirish |
| Statistika | Xaridlar tarixi, qarz tarixi, faollik |
| Kontakt import | Telefondan kontaktlarni yuklash |

#### 2.10.5 Mijoz modali

| Maydon | Tavsif | Majburiy |
|--------|--------|----------|
| Ism | Mijoz to'liq ismi | Ha |
| Telefon | +998 formatda | Ha |
| Email | Elektron pochta | Yo'q |
| Manzil | Yashash manzili | Yo'q |
| Viloyat | Viloyat | Yo'q |
| Tuman | Tuman | Yo'q |

---

### 2.11 Ta'minotchilar


#### 2.11.1 Ta'minotchilar ro'yxati
- Ism, kompaniya, telefon
- Jami qarz
- Jami to'langan
- Tranzaksiyalar soni

#### 2.11.2 Ta'minotchi batafsil sahifa (bosilganda)

**Ma'lumotlar:** Ism, telefon, kompaniya, manzil, izoh

**Statistika:**
- Jami kirim summasi
- Jami to'langan
- Qoldiq qarz

**Kirimlar tarixi:** Barcha tranzaksiyalar ro'yxati (sana, summa, to'lov usuli)

#### 2.11.3 Yangi kirim yaratish

| Maydon | Tavsif |
|--------|--------|
| Mahsulotlar | Ro'yxatdan tanlash, miqdor va narx kiritish |
| Valyuta | UZS yoki USD (kurs avtomatik) |
| To'lov usuli | Naqd / Karta / Click / Qarz / Aralash |
| Izoh | Qo'shimcha ma'lumot |

Har bir mahsulot uchun:
- Mahsulotni tanlash (qidiruv bilan)
- Miqdor
- Narx (UZS yoki USD)
- Jami = Miqdor × Narx

#### 2.11.4 Qarz to'lash modali
- To'lov summasi
- To'lov usuli (naqd/karta/click)
- Izoh

#### 2.11.5 Ta'minotchi modali

| Maydon | Tavsif | Majburiy |
|--------|--------|----------|
| Ism | Ta'minotchi ismi | Ha |
| Telefon | Telefon raqam | Yo'q |
| Kompaniya | Kompaniya nomi | Yo'q |
| Manzil | Manzil | Yo'q |
| Izoh | Qo'shimcha ma'lumot | Yo'q |

---

### 2.12 Xarajatlar


#### 2.12.1 Filtrlar
- Sana oralig'i (dan — gacha)
- Kategoriya filtri

#### 2.12.2 Xarajat kategoriyalari

| Kategoriya | Tavsif |
|-----------|--------|
| Komunal | Elektr, suv, gaz, internet |
| Soliqlar | Soliq to'lovlari |
| Ovqatlanish | Xodimlar ovqati |
| Dostavka | Yetkazib berish xarajatlari |
| Tovar xarid | Mahsulot sotib olish |
| Shaxsiy | Shaxsiy xarajatlar |
| Maosh | Oylik to'lovlar |

#### 2.12.3 Statistika
- Umumiy xarajat summasi
- O'rtacha xarajat
- Kategoriya bo'yicha taqsimot (har bir kategoriya summasi)

#### 2.12.4 Xarajatlar ro'yxati (pagination — 20 tadan)

Har bir xarajat:
- Kategoriya (rangli badge)
- Summa
- Izoh
- Sana

#### 2.12.5 Amallar
- Tahrirlash (faqat qo'lda kiritilganlar)
- O'chirish (faqat qo'lda kiritilganlar)
- Avtomatik xarajatlar (masalan: inventarizatsiyadan) tahrirlanmaydi

#### 2.12.6 Xarajat modali

| Maydon | Tavsif | Majburiy |
|--------|--------|----------|
| Kategoriya | Yuqoridagi ro'yxatdan | Ha |
| Summa | Xarajat summasi | Ha |
| Izoh | Tavsif | Yo'q |
| Sana | Xarajat sanasi | Ha (standart: bugun) |

---

### 2.13 Xodimlar (sotuv)


Bu sahifa kassir va yordamchilarning sotuv ko'rsatkichlarini ko'rsatadi.

#### 2.13.1 Filtrlar
- Qidiruv (ism bo'yicha)
- Rol filtri: Barchasi / Kassir / Yordamchi
- Saralash: Ism / Sotuvlar / Summa

#### 2.13.2 Xodim kartalari

Har bir karta:
- Xodim ismi va roli (badge)
- Cheklar soni
- Jami sotuv summasi
- Bonus foizi
- Hisoblangan bonus summasi

#### 2.13.3 Xodim kartasini bosish → Cheklar modali
- Xodimning barcha cheklari (pagination)
- Har bir chek: sana, summa, mahsulotlar soni, to'lov usuli
- Chekni yoyish → mahsulotlar ro'yxati

#### 2.13.4 Amallar
- Tahrirlash (ism, telefon, login, parol, rol, bonus %)
- O'chirish

---

### 2.14 Xodim cheklari


#### 2.14.1 Filtrlar
- Xodim tanlash (dropdown)
- Sana oralig'i (dan — gacha)
- Qidiruv

#### 2.14.2 Cheklar ro'yxati (pagination)

Har bir chek (accordion — bosilganda yoyiladi):
- Chek raqami
- Xodim ismi va roli
- Sana va vaqt
- Umumiy summa
- To'lov usuli

**Yoyilganda:**
- Mahsulotlar jadvali (nomi, miqdor, narx, jami)
- Chegirmalar (agar qo'llangan)
- Mijoz ma'lumoti

#### 2.14.3 Amallar
- Chop etish (termal printer)
- O'chirish

---

### 2.15 Kontaktlar (CRM)


#### 2.15.1 Kontaktlar ro'yxati
- Qidiruv (ism, telefon bo'yicha)
- Kategoriya filtri (Mijoz, Ta'minotchi, Boshqa)
- Pagination

#### 2.15.2 Kontakt kategoriyalari

| Amal | Tavsif |
|------|--------|
| Kategoriya yaratish | Yangi kategoriya nomi va rangi |
| Kategoriya o'chirish | Standart kategoriyalar o'chirilmaydi |
| Kategoriya tayinlash | Kontaktga kategoriya qo'shish/olib tashlash |

**Avtomatik sinxronizatsiya:**
- Kontaktga "Mijoz" kategoriyasi tayinlansa → avtomatik Customer yaratiladi
- Kontaktga "Ta'minotchi" kategoriyasi tayinlansa → avtomatik Supplier yaratiladi

#### 2.15.3 Kontakt import
- Telefondan kontaktlarni ommaviy yuklash
- Telefon raqami bo'yicha dublikat tekshiruv
- Mavjud kontaktlar o'tkazib yuboriladi

#### 2.15.4 Kontakt qo'shish modali

| Maydon | Tavsif | Majburiy |
|--------|--------|----------|
| Ism | Kontakt ismi | Ha |
| Telefon | Telefon raqami (unikal) | Ha |
| Kategoriyalar | Bir nechta kategoriya tanlash | Yo'q |

---

### 2.16 Mahsulot batafsil ko'rinish


Bu sahifa alohida — sidebar dan emas, QR kod skanerlanganda yoki havola orqali ochiladi.

**Ko'rsatiladi:**
- Mahsulot rasmi (galeriya)
- Nomi va tavsifi
- Barcha narxlar (tan, dona, karobka)
- Chegirma darajalari jadvali
- Qoldiq va birlik turi
- Ombor ma'lumoti
- Kategoriya va ichki kategoriya

---

### 2.17 Telegram sozlamalari


| Qism | Tavsif |
|------|--------|
| Bot ma'lumoti | Bot nomi, username, status |
| Webhook URL | Telegram webhook manzili |
| Bot token | Telegram bot tokeni |
| Chat ID | Xabar yuboriladigan chat ID |
| Test xabar | Test xabar yuborish tugmasi |

**POS Bot:** Telegram orqali mijoz ro'yxatdan o'tishi mumkin (bot ga yozib).

---

## 3. HR MODULI

### 3.1 HR — Xodimlar


#### 3.1.1 Filtrlar
- Qidiruv (ism bo'yicha)
- Rol filtri: Barchasi / Admin / Kassir / Yordamchi

#### 3.1.2 Statistik kartalar

| Karta | Tavsif |
|-------|--------|
| Jami xodimlar | Barcha xodimlar soni |
| Faol xodimlar | Hozirda faol xodimlar |
| Jami oylik fondi | Barcha oyliklarning summasi |
| O'rtacha oylik | O'rtacha oylik summa |

#### 3.1.3 Xodim kartalari

Har bir karta:
- Ism, telefon
- Rol (badge)
- Yollangan sana
- Oylik turi (soatlik/oylik)

#### 3.1.4 Xodim amallari

**Oylik sozlamalari modali:**

| Maydon | Tavsif |
|--------|--------|
| Oylik turi | Soatlik (hourly) yoki Oylik (monthly) |
| Bazaviy oylik | Asosiy oylik summa |
| Soatlik stavka | Soatiga to'lov (soatlik turi uchun) |
| Kuchga kirish sanasi | Qaysi sanadan boshlab |

**KPI vazifalari modali:**

| Maydon | Tavsif |
|--------|--------|
| Kunlik vazifalar | Xodim har kuni bajarishi kerak bo'lgan ishlar |
| Kunlik mukofot | Vazifani bajargani uchun mukofot summasi |

**Kunlik yozuvlar:**
- Sana tanlash
- O'sha kundagi davomat
- Ish soatlari
- Bajarilgan vazifalar

#### 3.1.5 Xodim qo'shish/tahrirlash modali

| Maydon | Tavsif | Majburiy |
|--------|--------|----------|
| Ism | To'liq ism | Ha |
| Login | Kirish uchun login | Ha |
| Parol | Kirish paroli | Ha |
| Telefon | Telefon raqam | Yo'q |
| Rol | admin / kassir / yordamchi | Ha |
| Dostavchi | Dostavchi sifatida belgilash | Yo'q |

---

### 3.2 HR — Davomat


#### 3.2.1 Tab: Bugungi

**Umumiy statistika (4 ta karta):**

| Karta | Tavsif |
|-------|--------|
| Kelganlar | Bugun ishga kelgan xodimlar soni |
| Ketganlar | Ishdan ketgan xodimlar soni |
| Kelmagan | Ishga kelmagan xodimlar |
| Kechikkanlar | Kech kelgan xodimlar |

**Davomat ro'yxati:**

Har bir xodim (accordion — bosilganda yoyiladi):
- Ismi va roli
- Kelish vaqti
- Ketish vaqti
- Ish soatlari
- Status (Kelgan / Ketgan / Kelmagan / Kechikkan)

**Yoyilganda:**
- GPS koordinatalari (agar mavjud)
- Kechikish vaqti (daqiqalarda)
- Izohlar

#### 3.2.2 Tab: Joylashuv

**Xarita (Leaflet):**
- Do'kon joylashuvi markerda ko'rsatiladi
- Ruxsat etilgan radius doirasi

**Sozlamalar:**

| Maydon | Tavsif |
|--------|--------|
| Do'kon nomi | Joylashuv nomi |
| Koordinatalar | Kenglik (latitude) va uzunlik (longitude) |
| Ruxsat radiusi | Necha metr ichida check-in qilish mumkin |
| Ish boshlanish vaqti | Soat nechada boshlanadi |

**QR kod:**
- Joylashuv uchun QR kod generatsiya
- Xodimlar shu QR kodni skanerlash orqali davomat belgilaydi

---

### 3.3 HR — Oylik


#### 3.3.1 Davr tanlash
- Yil tanlash (dropdown)
- Oy tanlash (dropdown)
- "Barchasini hisoblash" tugmasi

#### 3.3.2 Oylik ro'yxati

Har bir xodim uchun:

| Ustun | Tavsif |
|-------|--------|
| Xodim | Ism va roli |
| Davr | Oy/Yil |
| Bazaviy oylik | Asosiy oylik |
| Bonus | KPI va boshqa bonuslar |
| Ushlab qolish | Chegirmalar (avans, jarima) |
| Sof oylik | Qo'lga tegadigan summa |
| Status | Kutilmoqda / Tasdiqlangan / To'langan / Bekor |

#### 3.3.3 Amallar

| Amal | Tavsif |
|------|--------|
| To'lash | Oylikni to'langan deb belgilash |
| Bekor qilish | Oylikni bekor qilish |

#### 3.3.4 Oylik hisoblash formulasi
```
Bazaviy oylik (sozlamalardan)
+ KPI bonuslari (vazifalar bajarilishi)
+ Sotuv bonusi (bonus foizi × sotuv)
- Avans to'lovlar
- Jarimalar
= Sof oylik
```

---

### 3.4 Avans to'lovlar

Xodimlar oylikdan oldin avans olishi mumkin.

#### 3.4.1 Avans so'rovi

| Maydon | Tavsif | Majburiy |
|--------|--------|----------|
| Xodim | Qaysi xodim uchun | Ha |
| Summa | Avans miqdori | Ha |
| Sabab | Nima uchun kerak | Yo'q |
| Oylikdan ushlab qolish | Oylikdan avtomatik chegirish | Ha |
| Chegirish davri | Necha oyda chegirish | Yo'q |

#### 3.4.2 Avans holatlari

| Status | Tavsif |
|--------|--------|
| Kutilmoqda | So'rov yuborilgan |
| Tasdiqlangan | Admin tomonidan tasdiqlangan |
| Rad etilgan | Rad etilgan |
| Chegirilgan | Oylikdan chegirilgan |

#### 3.4.3 Avans jarayoni
1. Xodim yoki admin avans so'rovini yaratadi
2. Admin tasdiqlaydi yoki rad etadi
3. Tasdiqlanganda avans beriladi
4. Oylik hisoblashda avtomatik chegiriladi

---

### 3.5 KPI tizimi (batafsil)

#### 3.5.1 KPI shablonlari

Admin quyidagi KPI turlarini yaratishi mumkin:

| Tur | Tavsif |
|-----|--------|
| Sotuv summasi | Belgilangan summa sotuv qilish |
| Cheklar soni | Belgilangan sondagi chek yaratish |
| O'rtacha chek | Chek o'rtacha summasi |
| Davomat | Ish kunlariga kelish foizi |
| Xatolik soni | Bekor qilingan cheklar (kam = yaxshi) |
| Mijoz bahosi | Mijozlardan baho |
| Maxsus | Admin belgilagan boshqa vazifalar |

#### 3.5.2 KPI tayinlash
- Har bir xodimga alohida KPI shablonlari tayinlanadi
- Har bir tayinlashda: maxsus maqsad, vazn, maksimal bonus
- Boshlanish va tugash sanasi

#### 3.5.3 KPI hisoblash
- Har oy uchun `maqsad` va `haqiqiy natija` taqqoslanadi
- `Bajarilish foizi = Haqiqiy / Maqsad × 100%`
- `Bonus = Bajarilish × Bonus stavka` (maksimal chegara bilan)

---

## 4. KASSIR PANELI

### 4.1 Sidebar navigatsiya

**Sidebar menyu (hozirda ko'rinadigan):**

| # | Bo'lim |
|---|--------|
| 1 | Kassa |
| 2 | Qarzlar |
| 3 | Profilim |

**Qo'shimcha sahifalar (sidebar da yo'q, boshqa sahifalardan kirish):**

| # | Bo'lim | Kirish usuli |
|---|--------|--------------|
| 4 | Cheklar | Kassa sahifasidan |
| 5 | Mijozlar | Kassa sahifasidan |

Kassir sidebarida yuqori qismda **"Keldim"** va **"Ketdim"** tugmalari mavjud (davomat uchun).
"Ketdim" bosilganda tizimdan avtomatik chiqish amalga oshadi.

---

### 4.2 Kassa

Admin kassasi bilan bir xil (2.3-bo'lim). Faqat farqi:
- Kassir admin sozlamalarini ko'rmaydi
- Qarz yaratilganda admin tomonidan tasdiq kerak

---

### 4.3 Cheklar


#### 4.3.1 Filtrlar
- Sana oralig'i (dan — gacha)

#### 4.3.2 Cheklar ro'yxati (accordion)
Har bir chek yoyilganda:
- Mahsulotlar jadvali
- Jami summa
- To'lov usuli
- Mijoz ma'lumoti

#### 4.3.3 Xodimlar bo'yicha statistika

| Ustun | Tavsif |
|-------|--------|
| Ism | Xodim ismi |
| Rol | Kassir / Yordamchi |
| Cheklar soni | Yaratilgan cheklar |
| Jami summa | Umumiy sotuv |
| Kutilmoqda | Tasdiq kutayotgan cheklar |
| Tasdiqlangan | Tasdiqlangan cheklar |

#### 4.3.4 Amallar
- Chop etish
- O'chirish

---

### 4.4 Mijozlar


#### 4.4.1 Filtrlar
- Qidiruv (ism, telefon)
- Qarz filtri: Barchasi / Qarzli / Qarzsiz

#### 4.4.2 Statistik kartalar
- Jami mijozlar
- Qarzli mijozlar
- Jami qarz summasi
- Jami xaridlar

#### 4.4.3 Mijozlar ro'yxati
Har bir mijoz: ism, telefon, qarz, oxirgi xarid sanasi

#### 4.4.4 Amallar
- Kontakt import (telefondan)
- Yangi mijoz qo'shish

---

### 4.5 Qarzlar


#### 4.5.1 Filtrlar
- Qidiruv
- Status filtri: Barchasi / Kutilmoqda / Tasdiqlangan / To'langan

#### 4.5.2 Statistik kartalar

| Karta | Tavsif |
|-------|--------|
| Jami | Qarzlar soni |
| Kutilmoqda | Tasdiq kutayotgan |
| Tasdiqlangan | Aktiv qarzlar |
| To'langan | Yopilgan qarzlar |
| Jami summa | Umumiy qarz |
| To'langan summa | Qaytarilgan qarz |
| Qoldiq | Hali to'lanmagan |

#### 4.5.3 Qarzlar ro'yxati
Har bir qarz: mijoz, summa, to'langan, muddat, status

#### 4.5.4 Amallar
- Ko'rish (batafsil)
- O'chirish

---

## 5. YORDAMCHI PANELI

### 5.1 Sidebar navigatsiya

| # | Bo'lim |
|---|--------|
| 1 | Skaner |
| 2 | Mahsulotlar |
| 3 | Profilim |

---

### 5.2 Skaner (Asosiy sahifa)


#### 5.2.1 QR/Barkod skanerlash
- Kamera orqali skanerlash (old/orqa kamera almashtirish)
- Qo'lda kod kiritish maydoni
- Skanerlangan mahsulot avtomatik savatga tushadi

#### 5.2.2 Mahsulot qidirish
- Qidiruv maydoni (nom, kod bo'yicha)
- Kategoriya filtri
- Natijalar ro'yxati — bosilganda savatga qo'shiladi

#### 5.2.3 Narx darajalari
- Har bir mahsulot uchun chegirma darajalari ko'rsatiladi
- Yig'iladigan (collapsible) panel

#### 5.2.4 Savatcha
- Mahsulotlar ro'yxati (miqdor +/-)
- Umumiy summa
- Mijoz tanlash (mavjud / yangi)
- "Saqlash" tugmasi — chekni qoralama sifatida saqlaydi

#### 5.2.5 Arxiv tabi
- Saqlangan qoralama cheklar ro'yxati
- Har bir chek yoyiladi (mahsulotlar ko'rinadi)
- Tahrirlash imkoniyati
- O'chirish imkoniyati

#### 5.2.6 Real-time yangilanish
- Mahsulot narxi yoki stokda o'zgarish bo'lsa — avtomatik yangilanadi (WebSocket)

---

### 5.3 Mahsulotlar


- Qidiruv + Kategoriya filtri
- Mahsulotlar gridi (infinite scroll)
- Faqat narxni ko'rish va o'zgartirish mumkin (cheklangan huquq)

---

## 6. XODIM PROFILI


Barcha xodimlar (kassir va yordamchi) uchun umumiy sahifa.

### 6.1 Shaxsiy ma'lumotlar
- Ism
- Telefon
- Rol
- Yollangan sana

### 6.2 Oylik ma'lumotlari

| Qism | Tavsif |
|------|--------|
| Bazaviy oylik | Sozlamalardagi asosiy summa |
| KPI bonus | Vazifalar bajarish bonusi |
| Taxminiy oylik | Hisoblangan umumiy summa |

### 6.3 Kunlik vazifalar
- Sana tanlash (kalendar)
- Vazifalar ro'yxati (checkbox bilan)
- Har bir vazifani "bajarildi" deb belgilash
- Kunlik mukofot summasi

### 6.4 Davomat

| Qism | Tavsif |
|------|--------|
| Kelish vaqti | Bugungi check-in vaqti |
| Ketish vaqti | Bugungi check-out vaqti |
| Ish soatlari | Hisoblangan soatlar |
| Kechikish | Kech kelgan bo'lsa — necha daqiqa |

### 6.5 QR orqali davomat
- QR kod skanerlash tugmasi
- GPS tekshiruvi (do'kondan belgilangan radius ichida bo'lishi kerak)
- "Keldim" — check-in
- "Ketdim" — check-out
- GPS koordinatalari va vaqt saqlanadi

---

## 7. UMUMIY FUNKSIONALLIK

### 7.1 Autentifikatsiya
- Login sahifasi (login + parol)
- JWT token asosida sessiya
- Token muddati tugaganda avtomatik chiqish
- Rol asosida yo'naltirish (admin → /admin, kassir → /kassa, yordamchi → /helper)
- Kassa sessiya boshqaruvi (login vaqti, oxirgi faollik, IP, user agent)
- Sessiya timeout — belgilangan vaqt o'tsa avtomatik chiqish
- Admin credential o'zgartirish (login/parol)

### 7.2 Real-time yangilanishlar (WebSocket)

Quyidagi hodisalar real-time uzatiladi:

| Hodisa | Tavsif |
|--------|--------|
| Yangi sotuv | Mahsulot stoki yangilanadi |
| Mahsulot o'zgarishi | Narx/stok barcha ekranlarda yangilanadi |
| Yangi qarz | Qarz ro'yxati yangilanadi |
| Yangi mijoz | Mijozlar ro'yxati yangilanadi |
| Davomat | Davomat holati yangilanadi |

### 7.3 Offline rejim

| Qism | Tavsif |
|------|--------|
| Aniqlash | Internet holatini avtomatik tekshirish |
| Indikator | Ekran yuqorisida qizil chiziq ("Offline rejim") |
| Mahsulotlar keshi | Mahsulotlar qurilmada saqlanadi, oflayn rejimda ishlatiladi |
| Oflayn sotuv | Cheklar qurilmada saqlanadi, internet qaytganda sinxronlanadi |
| Sinxronizatsiya | Avtomatik yoki qo'lda (tugma orqali) |
| Dublikat himoya | Bir chek ikki marta saqlanmaydi |

### 7.4 Telegram bildirishnomalar

**2 ta alohida bot:**

| Bot | Vazifasi |
|-----|----------|
| POS Bot | Yangi sotuv haqida xabar (chek ma'lumotlari) |
| Qarz Bot | Yangi qarz, to'lov, muddati o'tgan qarzlar haqida xabar |

**Xabar formati:**
- Mijoz ismi
- Mahsulotlar ro'yxati
- Summa va to'lov usuli
- Sana va vaqt

### 7.5 QR kod tizimi
- Mahsulot uchun QR generatsiya
- QR kodni chop etish (batch — bir nechta)
- QR skanerlash orqali mahsulot topish
- Davomat uchun joylashuv QR kodi

### 7.6 Chop etish (Termal printer)
- Chek formatlash (termal printer uchun)
- Printer buyruqlari generatsiya
- PDF sifatida yuklab olish
- Printer holatini tekshirish

### 7.7 Valyuta kursi
- USD → UZS kurs sozlamasi
- Ta'minotchi kirimlarida USD/UZS tanlash
- Avtomatik konvertatsiya

### 7.8 Rasm boshqaruvi
- Mahsulot uchun 8 tagacha rasm yuklash
- Avtomatik siqish va optimizatsiya (Sharp)
- Lazy loading (ko'rinish zonasiga kirganda yuklanadi)
- WebP format qo'llab-quvvatlash
- Placeholder (rasm yuklanayotganda)

### 7.9 Kalkulyator
- Ekranda suzuvchi kalkulyator tugmasi
- Siljitish mumkin (drag)
- Amallar: +, -, ×, ÷, %
- Har qanday sahifada ishlatish mumkin

### 7.10 Ko'p tilli interfeys (i18n)

Tizim 3 ta tilni qo'llab-quvvatlaydi:

| Til | Kod |
|-----|-----|
| O'zbek | uz |
| Ingliz | en |
| Rus | ru |

- Til almashtirgich: Header, Sidebar yoki Login sahifasida
- Tanlangan til localStorage'da saqlanadi
- Barcha UI elementlari tarjima qilinadi

---

### 7.11 PWA (Progressive Web App)

Tizim mobil qurilmadan ilova sifatida o'rnatilishi mumkin:

| Xususiyat | Tavsif |
|-----------|--------|
| Manifest | Ilova nomi, ikonkalar, ranglar |
| Service Worker | Oflayn kesh va fon sinxronizatsiya |
| O'rnatish | "Bosh sahifaga qo'shish" orqali |
| Shortcutlar | Statistika, Mahsulotlar, POS — to'g'ridan-to'g'ri kirish |
| Ikonkalar | 16x16 dan 512x512 gacha, maskable |

---

### 7.12 Versiya tekshiruvi

- Har 2 daqiqada yangi versiya bormi tekshiriladi
- Yangi versiya aniqlansa — sahifa avtomatik qayta yuklanadi
- Foydalanuvchi hech narsa qilishi shart emas

---

### 7.13 Ball tizimi (Loyalty)

- Har bir xaridda mijozga ball beriladi
- Formula: `har 1,000,000 so'm = 1 ball`
- Ballar mijoz profilida saqlanadi
- Kelajakda chegirma yoki mukofot uchun ishlatilishi mumkin

---

### 7.14 Narx tarixi (Audit Trail)

Har bir mahsulot narx o'zgarishi saqlanadi:

| Maydon | Tavsif |
|--------|--------|
| Mahsulot | Qaysi mahsulot |
| O'zgarish turi | Yaratish / Yangilash / Ommaviy yangilash |
| Eski narxlar | O'zgarishdan oldingi narxlar |
| Yangi narxlar | O'zgarishdan keyingi narxlar |
| Kim o'zgartirdi | Foydalanuvchi ismi |
| Sana | O'zgarish vaqti |
| Sabab | Nima uchun o'zgartirildi |

---

### 7.15 Debug rejimi

- Faqat developer/admin uchun
- Suzuvchi debug tugmasi
- Console loglarni to'playdi (oxirgi 100 ta)
- Xatolarni ko'rish, nusxalash va tozalash

---

### 7.16 Xavfsizlik
- Har bir foydalanuvchi faqat o'z roli bo'yicha ruxsat etilgan sahifalarga kiradi
- Parollar shifrlangan holda saqlanadi
- Ko'p marta noto'g'ri parol kiritilsa — vaqtincha bloklanadi
- Zararli kiritishlardan himoyalangan

### 7.17 Responsive dizayn
- Barcha sahifalar mobil qurilmalarda to'liq ishlaydi
- Sidebar → hamburger menyu (mobil)
- Touch-optimized tugmalar va formalar

### 7.18 Gesture tizimi (ilg'or)

| Gesture | Tavsif |
|---------|--------|
| Swipe right | Modal yopish / orqaga qaytish (iOS uslubida) |
| Swipe left | Keyingi bo'limga o'tish |
| Pull-to-refresh | Ro'yxatni pastga tortib yangilash |
| Swipe to close | Modalni pastga suring yopish |

- Tezlikka asoslangan swipe aniqlash (velocity-based)
- Visual feedback (overlay) swipe paytida
- Input va scroll zonalarida swipe bloklanadi
- Modal stack boshqaruvi (bir nechta modal ochiq bo'lsa)

### 7.19 Xato boshqaruvi (Error Boundary)
- Komponent xatosi bo'lsa — butun sahifa buzilmaydi
- Xato haqida ma'lumot ko'rsatiladi (dev rejimda stack trace)
- "Qayta yuklash" va "Qayta urinish" tugmalari

### 7.20 Tizim salomatligi
- Tizim ishlayotganligini tekshirish
- Sekin ishlaydigan jarayonlarni aniqlash
- Kunlik avtomatik zaxira nusxa (soat 02:00 da)
- Qo'lda zaxira nusxa yaratish imkoniyati

---

## 8. TIZIMDA SAQLANADIGAN MA'LUMOTLAR

Quyida tizim qaysi turdagi ma'lumotlarni saqlashi ko'rsatilgan (25 ta tur):

### 8.1 Foydalanuvchi
Ism, login, parol, telefon, email, rol (admin/kassir/yordamchi), holat (faol/nofaol), lavozim, bo'lim, bonus foizi, yollangan sana, ish tugash sanasi, yetkazuvchi belgisi, QR token (davomat uchun), jami daromad, jami bonus, shaxsiy sozlamalar (menyu tartibi).

### 8.2 Mahsulot
Kod (avtomatik), nom, tavsif, narxlar (tan narx, dona narx, karobka narx, 3 ta chegirma darajasi), qoldiq soni, birlik turi (dona/kg/metr/litr/karobka/qop), kategoriya, ichki kategoriya, rasmlar (8 tagacha), minimal stok chegarasi, USD tan narxi, karobka ma'lumoti (soni, og'irligi, tan narxi, sotish narxi), o'ram ma'lumoti (metrlari), pachka ma'lumoti (birliklar soni).

### 8.3 Chek (sotuv hujjati)
Sotilgan mahsulotlar ro'yxati (har biriga: mahsulot, miqdor, narx, sotuv turi, asl narx, qo'llangan chegirma), umumiy summa, to'lov usuli (naqd/karta/click/aralash), mijoz, naqd/karta/click summalari, bonus summa, qarz qoldig'i, to'lov holati, yetkazish bormi, dostavchi, yetkazish holati, chek turi (sotuv/yordamchi chek/to'g'ridan-to'g'ri sotuv/yetkazish), qaytarish belgisi, kim yaratgan, kim qayta ishlagan, oflayn sinxron ma'lumotlari.

### 8.4 Mijoz
Ism, telefon (unikal), email, manzil, Telegram chat ID, jami xaridlar summasi, loyalty ballari (har 1,000,000 so'm = 1 ball), joriy qarz summasi.

### 8.5 Qarz
Mijoz, kim yaratgan, kreditor ismi (beriladigan qarzlar uchun), qarz summasi, to'langan summa, muddat, status (kutilmoqda/tasdiqlangan/muddati o'tgan/to'langan/qora ro'yxat), turi (olinadigan/beriladigan), izoh, garov, qarzga olingan mahsulotlar, to'lov tarixi (sana, summa, usul), muddat uzaytirish ma'lumotlari.

### 8.6 Ta'minotchi
Ism, telefon, kompaniya, manzil, izoh, jami qarz, jami to'langan, jami kirim summasi, tranzaksiyalar soni.

### 8.7 Ta'minotchi tranzaksiyasi (kirim)
Ta'minotchi, kiritilgan mahsulotlar (mahsulot, miqdor, narx), umumiy summa, naqd/karta/click to'lov, qarzga qolgan, izoh.

### 8.8 Xarajat
Kategoriya (komunal/soliqlar/ovqatlanish/dostavka/tovar xarid/shaxsiy/maosh), summa, izoh, sana, manba (qo'lda/inventarizatsiya).

### 8.9 Kategoriya
Nomi (unikal), tartib raqami, faol/nofaol holati, ichki kategoriyalar ro'yxati.

### 8.10 Davomat
Xodim, sana, kelish/ketish vaqti, ish soatlari, status (kelgan/kelmagan/kechikkan/yarim kun/kasallik/ta'til), kechikish daqiqasi, GPS koordinatalari.

### 8.11 Oylik
Xodim, davr (oy/yil), bazaviy oylik, soatlik stavka, ish kunlari, ish soatlari, bonus, ushlab qolishlar, sof oylik, status (kutilmoqda/tasdiqlangan/to'langan/bekor), to'lov usuli, to'lov sanasi, izoh.

### 8.12 Oylik sozlamasi
Xodim, oylik turi (soatlik/oylik), bazaviy oylik, soatlik stavka, bonus yoqilganmi, maks/min bonus, qo'shimcha to'lovlar, chegirmalar, kuchga kirish sanasi, tugash sanasi.

### 8.13 Avans to'lov
Xodim, summa, sabab, oylikdan chegirishmi, necha oyda chegirish, status (kutilmoqda/tasdiqlangan/rad etilgan/chegirilgan), kim tasdiqlagan.

### 8.14 KPI shablon
Nomi, tavsif, turi (sotuv summasi/cheklar soni/o'rtacha chek/davomat/xatolik/mijoz bahosi/maxsus), birlik, maqsad qiymati, vazn, har ball uchun bonus, maks bonus, qaysi rollar uchun.

### 8.15 KPI tayinlash va yozuv
Xodimga KPI tayinlash: maxsus maqsad, vazn, maks bonus, boshlanish/tugash sanasi. KPI yozuv: davr, maqsad, haqiqiy natija, bajarilish foizi, olingan bonus.

### 8.16 Kassa sessiyasi
Foydalanuvchi nomi, kirish vaqti, oxirgi faollik, faolmi, IP manzil, brauzer ma'lumoti, tugash vaqti.

### 8.17 Narx tarixi
Mahsulot, o'zgarish turi (yaratish/yangilash/ommaviy), eski va yangi narxlar, kim o'zgartirgan, sabab.

### 8.18 Do'kon joylashuvi
Nomi, koordinatalar (kenglik/uzunlik), ruxsat etilgan radius (metr), QR token, manzil, ish boshlanish vaqti.

### 8.19 Kontakt va kontakt kategoriyasi
Kontakt: ism, telefon (unikal), kategoriyalar. Kategoriya: nomi, rangi, standart kategoriyami.

### 8.20 Buyurtma
Mijoz, mahsulotlar, umumiy summa, status (yangi/jarayonda/jo'natilgan/yetkazilgan/bekor), to'lov holati, jami tejash.

### 8.21 Ombor
Nomi, manzil.

### 8.22 Mahsulot buyurtmasi
Buyurtma mahsulotlari, umumiy summa, tavsif, status, buyurtma sanasi, qabul qilingan sana.

### 8.23 Sozlamalar
Kalit-qiymat juftliklari (masalan: valyuta kursi).

---

## 9. TASHQI TIZIMLAR BILAN BOG'LANISH

| Tizim | Nima qiladi |
|-------|-------------|
| Telegram Bot (POS) | Har bir sotuv haqida xabar yuboradi, mijoz ro'yxatdan o'tishi mumkin |
| Telegram Bot (Qarz) | Yangi qarz, to'lov, muddati o'tgan qarzlar haqida xabar |
| Telegram Bot (Davomat) | Xodim keldi/ketdi haqida xabar |
| Termal Printer | Chek chop etish |
| GPS | Xodim davomat belgilashda joylashuvni tekshirish |
| Kamera | QR kod skanerlash (old va orqa kamera) |
| Oflayn saqlash | Internet yo'qolsa mahsulotlar va sotuvlar lokal saqlanadi |
| Xarita | Do'kon joylashuvini ko'rsatish (HR davomat) |
| Real-time yangilanish | Narx/stok/qarz/davomat o'zgarsa barcha ekranlarda darhol yangilanadi |

---

## 10. BIZNES QOIDALAR

### 10.1 Chegirma tizimi
- Har bir mahsulotda 3 tagacha chegirma darajasi
- Mijoz ko'rsatilgan miqdordan ko'p olsa — avtomatik chegirma
- Eng yaxshi narx avtomatik hisoblanadi

### 10.2 Qarz jarayoni
1. Kassir qarz yaratadi → status: "kutilmoqda"
2. Admin tasdiqlaydi yoki rad etadi
3. Tasdiqlangan qarz → aktiv
4. Qisman to'lovlar kiritilishi mumkin
5. To'liq to'langanda → status: "to'langan"
6. Muddat o'tsa → status: "muddati o'tgan"

### 10.3 Sotuv jarayoni
1. Mahsulot savatga qo'shiladi
2. Miqdor kiritiladi (chegirma avtomatik)
3. Mijoz tanlanadi (ixtiyoriy)
4. To'lov usuli tanlanadi
5. Aralash to'lovda har usul uchun summa kiritiladi
6. Qarz bo'lsa → tasdiq jarayoniga tushadi
7. Stok avtomatik kamayadi
8. Chek yaratiladi va chop etiladi
9. Telegram xabar yuboriladi

### 10.4 Ta'minotchi kirimi
1. Ta'minotchi tanlanadi
2. Mahsulotlar qo'shiladi (miqdor, narx, valyuta)
3. To'lov usuli tanlanadi
4. Qarz bo'lsa → ta'minotchi qarziga qo'shiladi
5. Mahsulot stoklari avtomatik oshadi

### 10.5 Oylik hisoblash
1. Oy oxirida "Barchasini hisoblash" bosiladi
2. Tizim har xodim uchun hisoblab chiqadi:
   - Bazaviy oylik (sozlamalardan)
   - KPI bonuslari (bajarilgan vazifalar)
   - Sotuv bonusi (bonus % × sotuv summasi)
   - Avans va jarimalar chegiriladi
3. Admin tasdiqlaydi
4. To'langan deb belgilaydi

### 10.6 Davomat qoidalari
- Xodim QR skanerlash + GPS orqali "Keldim" belgilaydi
- Do'kondan belgilangan radius ichida bo'lishi shart
- Ish boshlanish vaqtidan keyin kelsa → "kechikkan"
- "Ketdim" bosganda ish soatlari hisoblanadi
- Kassir "Ketdim" bosganda tizimdan avtomatik chiqadi
- GPS koordinatalari har check-in/check-out da saqlanadi
- Oylik statistika: ish kunlari, jami soatlar, kechikishlar

### 10.7 Kontakt sinxronizatsiya
1. Telefondan kontaktlar import qilinadi (bulk)
2. Dublikat telefon raqamlar o'tkazib yuboriladi
3. Kontaktga "Mijoz" kategoriyasi tayinlansa → Customer avtomatik yaratiladi
4. Kontaktga "Ta'minotchi" tayinlansa → Supplier avtomatik yaratiladi
5. Kontakt o'chirilsa → bog'liq Customer/Supplier saqlanib qoladi

### 10.8 Ball tizimi
1. Har sotuv amalga oshganda → mijozga ball beriladi
2. Formula: `ball = Math.floor(sotuv_summa / 1,000,000)`
3. Ballar yig'iladi — o'chirilmaydi
4. Kelajakda chegirma yoki sovg'alar uchun ishlatilishi mo'ljallangan

### 10.9 Narx nazorati
1. Har bir narx o'zgarishi avtomatik saqlanadi
2. Kim, qachon, nima uchun o'zgartirganini ko'rish mumkin
3. Eski va yangi narxlar taqqoslanadi
4. Ommaviy narx yangilash ham kuzatiladi (bulk_update)

### 10.10 Oflayn sotuv jarayoni
1. Internet yo'qolganda → tizim offline rejimga o'tadi
2. Mahsulotlar IndexedDB keshdan olinadi
3. Sotuv amalga oshadi → chek IndexedDB'ga saqlanadi (offlineId bilan)
4. Internet qaytganda → avtomatik sinxronizatsiya boshlanadi
5. Har bir chek offlineId orqali tekshiriladi — dublikat saqlanmaydi
6. Sinxron muvaffaqiyatli bo'lsa → lokal cheklar "synced" deb belgilanadi

### 10.11 Avans jarayoni
1. Xodim yoki admin avans so'rovini yaratadi
2. Admin tasdiqlaydi → pul beriladi
3. Oylik hisoblashda chegiriladi (avtomatik)
4. Bir necha oyga bo'lib chegirish mumkin (deductionPeriod)

---

## 11. HAMKORLAR (PARTNERS) MODULI


### 11.1 Hamkorlar ro'yxati
- Barcha hamkorlar ro'yxati
- Qidiruv (ism, kompaniya bo'yicha)

### 11.2 Hamkor to'lovi
- To'lov summasi
- To'lov usuli
- Izoh

### 11.3 Hamkor statistikasi
- Jami to'lovlar
- O'rtacha to'lov
- Faol hamkorlar soni

---

## 12. MONITORING VA TIZIM NAZORATI


### 12.1 Performance metriklari
- So'rovlar soni (jami, muvaffaqiyatli, xato)
- O'rtacha javob vaqti (ms)
- Eng sekin endpointlar ro'yxati
- "Metrikalarni tozalash" tugmasi

### 12.2 Tizim ma'lumotlari
- Server uptime
- MongoDB holati (ulanish soni, ma'lumotlar bazasi hajmi)
- Node.js versiyasi
- Xotira ishlatilishi (RAM)
- CPU yuklanishi

### 12.3 Backup boshqaruvi
- Backuplar ro'yxati (sana, hajm)
- Qo'lda backup yaratish tugmasi
- Kunlik avtomatik backup (soat 02:00)

### 12.4 Avtomatik hisobot (Product Report Scheduler)
- Belgilangan vaqtda mahsulotlar hisoboti generatsiya qilinadi
- Kam qolgan mahsulotlar ro'yxati
- Telegram orqali admin ga yuboriladi

---

## 13. QO'SHIMCHA FUNKSIYALAR

### 13.1 Mahsulotlarni ommaviy yuklash
- Ko'plab mahsulotni bir vaqtda tizimga kiritish imkoniyati
- Dublikat mahsulotlar avtomatik aniqlanadi va o'tkazib yuboriladi

### 13.2 Qarzlarni tozalash
- Mijozi o'chirilgan (noma'lum) qarzlarni tizimdan tozalash

### 13.3 Mahsulot qaytarish
- Sotilgan mahsulotni qaytarish imkoniyati
- Qaytarilgan mahsulotlar stokga qaytadi
- Kim qaytarishni amalga oshirgani saqlanadi

---

*Ushbu hujjat loyihaning barcha funksional talablarini to'liq qamrab oladi.*
*Jami: 20+ sahifa, 25 ta ma'lumot turi, 9 ta tashqi tizim integratsiyasi.*
*Har bir bo'lim mustaqil modul sifatida ishlab chiqilishi mumkin.*
