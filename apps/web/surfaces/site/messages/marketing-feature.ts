import { defineMessages } from "@snapbell/sdk";

/** /features/marketing */
export const marketingFeatureMsgs = defineMessages(
  {
    meta: {
      title: "Marketing: automatic texts, emails and Picture Day Pass",
      ogTitle: "Snapbell marketing automation",
      description: "Automatic gallery, reminder, deadline and shipping messages for every job, plus Picture Day Pass pre-pay and promo codes with real limits.",
    },
    hero: {
      eyebrow: "Marketing",
      title: "The follow-up you never have time for, done automatically.",
      lead: "Every job gets a message schedule the moment you create it. Edit the words, move the dates, send a test — or leave it alone and let it work.",
      sms: [
        { text: "Brightside Photo Co.: Ava's photos are ready! 📸 Tap to view: brightside.photo/a/SAMPLE", time: "Tue 4:12 pm" },
        { text: "Oh these are so cute", time: "" },
        { text: "Reminder: order by Friday for free delivery to school. Reply STOP to opt out.", time: "Sat 10:00 am" },
      ],
    },
    timeline: {
      eyebrow: "Automatic messages",
      title: "Four messages, perfectly timed",
      lead: "Opt-in only, quiet hours respected, STOP and unsubscribe honored everywhere.",
      step: (n: number) => `Step ${n}, `,
      steps: [
        { when: "Photos published", title: "Gallery ready", channel: "Text + email", email: true, text: "Leo's Fall Picture Day photos are ready. Tap to view: brightside.photo/a/LEOM26" },
        { when: "5 days before deadline", title: "Friendly reminder", channel: "Text + email", email: true, text: "Don't forget Leo's photos — order by Friday for free delivery to school." },
        { when: "1 day before deadline", title: "Deadline tomorrow", channel: "Text", email: false, text: "Ordering for Fall Picture Day closes tomorrow." },
        { when: "When the lab ships", title: "Order shipped", channel: "Text", email: false, text: "Your order SB-10482 is on its way. Track it here: …" },
      ],
      quiet: "No texts between 9 pm and 8 am local time.",
    },
    pass: {
      eyebrow: "Picture Day Pass",
      title: "Get paid before you shoot.",
      lead: "Offer families a pre-paid credit weeks before picture day, with a bonus to make it worth their while. When the album goes live, the credit is applied at checkout automatically.",
      bullets: [
        "Choose the amounts and the bonus (for example, +10%)",
        "Send the offer by text and email, or print the QR code on flyers",
        "Credit applies automatically — no codes for parents to remember",
        "See passes sold per job before picture day even starts",
      ],
      cardTitle: "Winter Recital · Picture Day Pass",
      cardBody: "Pay now, get 10% extra credit for recital photos.",
      payGet: (pay: string, credit: string): [string, string, string] => [`Pay ${pay}, get `, credit, " of credit."],
      buy: "Buy pass",
    },
    promo: {
      eyebrow: "Promo codes",
      title: "Promotions with guardrails",
      lead: "Percent off, fixed amount or free shipping — limited by date, job, minimum spend and number of uses. Usage counts update live.",
      codes: [
        { code: "FALL10", rule: "10% off · ends Nov 20", used: "9 used" },
        { code: "FREESHIP", rule: "Free shipping over $40", used: "21 used" },
        { code: "GOEAGLES", rule: "$5 off · Eagles U12 only · 50 max", used: "3 of 50" },
      ],
    },
  },
  {
    ru: {
      meta: {
        title: "Маркетинг: автоматические SMS, письма и Picture Day Pass",
        ogTitle: "Автоматизация маркетинга в Snapbell",
        description: "Автоматические сообщения о готовности галереи, напоминания, сроки заказа и уведомления об отправке для каждой съёмки, а также предоплата Picture Day Pass и промокоды с реальными ограничениями.",
      },
      hero: {
        eyebrow: "Маркетинг",
        title: "Напоминания, на которые вечно не хватает времени, — автоматически.",
        lead: "Каждая съёмка получает расписание сообщений сразу после создания. Поправьте текст, сдвиньте даты, отправьте тестовое сообщение — или ничего не трогайте, всё сработает само.",
        sms: [
          { text: "Brightside Photo Co.: фото Авы готовы! 📸 Смотрите: brightside.photo/a/SAMPLE", time: "Вт 16:12" },
          { text: "Какие же они милые", time: "" },
          { text: "Напоминаем: закажите до пятницы — доставим в школу бесплатно. Ответьте STOP, чтобы отписаться.", time: "Сб 10:00" },
        ],
      },
      timeline: {
        eyebrow: "Автоматические сообщения",
        title: "Четыре сообщения точно в срок",
        lead: "Только с согласия, с учётом тихих часов; STOP и отписка работают везде.",
        step: (n) => `Шаг ${n}, `,
        steps: [
          { when: "Фото опубликованы", title: "Галерея готова", channel: "SMS + email", email: true, text: "Фото Лео с осеннего дня съёмки готовы. Смотрите: brightside.photo/a/LEOM26" },
          { when: "За 5 дней до срока заказа", title: "Дружеское напоминание", channel: "SMS + email", email: true, text: "Не забудьте про фото Лео — закажите до пятницы, и мы бесплатно доставим их в школу." },
          { when: "За 1 день до срока заказа", title: "Срок заказа — завтра", channel: "SMS", email: false, text: "Приём заказов на осенний день съёмки закрывается завтра." },
          { when: "Когда лаборатория отправит заказ", title: "Заказ отправлен", channel: "SMS", email: false, text: "Ваш заказ SB-10482 уже в пути. Отследить: …" },
        ],
        quiet: "Никаких SMS с 21:00 до 8:00 по местному времени.",
      },
      pass: {
        eyebrow: "Picture Day Pass",
        title: "Получите оплату ещё до съёмки.",
        lead: "Предложите семьям предоплаченный кредит за несколько недель до дня съёмки — с бонусом, чтобы было выгодно. Когда альбом откроется, кредит автоматически применится при оформлении заказа.",
        bullets: [
          "Выберите суммы и бонус (например, +10%)",
          "Отправьте предложение по SMS и email или напечатайте QR-код на листовках",
          "Кредит применяется автоматически — родителям не нужно помнить коды",
          "Смотрите, сколько пропусков продано по каждой съёмке, ещё до её начала",
        ],
        cardTitle: "Зимний концерт · Picture Day Pass",
        cardBody: "Оплатите сейчас и получите на 10% больше кредита на фото с концерта.",
        payGet: (pay, credit) => [`Платите ${pay} — получаете `, credit, " кредита."],
        buy: "Купить пропуск",
      },
      promo: {
        eyebrow: "Промокоды",
        title: "Акции с ограничителями",
        lead: "Скидка в процентах, фиксированная сумма или бесплатная доставка — с ограничениями по дате, съёмке, минимальной сумме и числу использований. Счётчики использований обновляются в реальном времени.",
        codes: [
          { code: "FALL10", rule: "Скидка 10% · до 20 ноября", used: "использован 9 раз" },
          { code: "FREESHIP", rule: "Бесплатная доставка от $40", used: "использован 21 раз" },
          { code: "GOEAGLES", rule: "Скидка $5 · только Eagles U12 · не более 50", used: "3 из 50" },
        ],
      },
    },
    uz: {
      meta: {
        title: "Marketing: avtomatik SMS, xatlar va Picture Day Pass",
        ogTitle: "Snapbell marketing avtomatlashtiruvi",
        description: "Har bir suratga olish uchun galereya tayyorligi, eslatma, buyurtma muddati va joʻnatish haqidagi avtomatik xabarlar, shuningdek Picture Day Pass oldindan toʻlovi va haqiqiy cheklovli promokodlar.",
      },
      hero: {
        eyebrow: "Marketing",
        title: "Hech qachon vaqtingiz yetmaydigan eslatmalar — avtomatik.",
        lead: "Har bir suratga olish yaratilishi bilan xabarlar jadvalini oladi. Matnni tahrirlang, sanalarni surib qoʻying, test xabar yuboring — yoki tegmang, oʻzi ishlayveradi.",
        sms: [
          { text: "Brightside Photo Co.: Avaning suratlari tayyor! 📸 Koʻrish: brightside.photo/a/SAMPLE", time: "Sesh 16:12" },
          { text: "Voy, juda yoqimli", time: "" },
          { text: "Eslatma: jumagacha buyurtma bering — maktabga bepul yetkazamiz. Obunani bekor qilish uchun STOP deb javob yozing.", time: "Shan 10:00" },
        ],
      },
      timeline: {
        eyebrow: "Avtomatik xabarlar",
        title: "Oʻz vaqtida yuboriladigan toʻrtta xabar",
        lead: "Faqat rozilik bilan, tinch soatlarga rioya qilinadi, STOP va obunani bekor qilish hamma joyda ishlaydi.",
        step: (n) => `${n}-qadam, `,
        steps: [
          { when: "Suratlar eʼlon qilinganda", title: "Galereya tayyor", channel: "SMS + email", email: true, text: "Leoning kuzgi suratga olish kuni suratlari tayyor. Koʻrish: brightside.photo/a/LEOM26" },
          { when: "Muddatdan 5 kun oldin", title: "Doʻstona eslatma", channel: "SMS + email", email: true, text: "Leoning suratlarini unutmang — jumagacha buyurtma bersangiz, maktabga bepul yetkazamiz." },
          { when: "Muddatdan 1 kun oldin", title: "Muddat — ertaga", channel: "SMS", email: false, text: "Kuzgi suratga olish kuni uchun buyurtmalar qabuli ertaga yopiladi." },
          { when: "Laboratoriya joʻnatganda", title: "Buyurtma joʻnatildi", channel: "SMS", email: false, text: "SB-10482 buyurtmangiz yoʻlda. Kuzatish: …" },
        ],
        quiet: "Mahalliy vaqt bilan 21:00 dan 8:00 gacha SMS yuborilmaydi.",
      },
      pass: {
        eyebrow: "Picture Day Pass",
        title: "Suratga olishdan oldinroq pul oling.",
        lead: "Suratga olish kunidan bir necha hafta oldin oilalarga bonusli oldindan toʻlov kreditini taklif qiling. Albom ochilganda kredit buyurtmani rasmiylashtirishda avtomatik qoʻllanadi.",
        bullets: [
          "Summalar va bonusni tanlang (masalan, +10%)",
          "Taklifni SMS va email orqali yuboring yoki QR kodni varaqalarga chop eting",
          "Kredit avtomatik qoʻllanadi — ota-onalar kod eslab qolishi shart emas",
          "Har bir suratga olish boʻyicha sotilgan passlarni u boshlanishidan oldin koʻring",
        ],
        cardTitle: "Qishki konsert · Picture Day Pass",
        cardBody: "Hozir toʻlang va konsert suratlari uchun 10% qoʻshimcha kredit oling.",
        payGet: (pay, credit) => [`${pay} toʻlang, `, credit, " kredit oling."],
        buy: "Pass sotib olish",
      },
      promo: {
        eyebrow: "Promokodlar",
        title: "Cheklovli aksiyalar",
        lead: "Foizli chegirma, qatʼiy summa yoki bepul yetkazib berish — sana, suratga olish, minimal xarid va foydalanishlar soni boʻyicha cheklanadi. Foydalanish hisoblagichi real vaqtda yangilanadi.",
        codes: [
          { code: "FALL10", rule: "10% chegirma · 20-noyabrgacha", used: "9 marta ishlatilgan" },
          { code: "FREESHIP", rule: "$40 dan ortiq xaridga bepul yetkazish", used: "21 marta ishlatilgan" },
          { code: "GOEAGLES", rule: "$5 chegirma · faqat Eagles U12 · koʻpi bilan 50", used: "50 tadan 3 tasi" },
        ],
      },
    },
  },
);
