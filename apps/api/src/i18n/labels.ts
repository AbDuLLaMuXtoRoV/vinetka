import { defineMessages, plural } from "@snapbell/sdk";

/** Human-readable labels the API returns inside data (checklists, to-dos, delivery options). */
export const labelMessages = defineMessages(
  {
    checklist: {
      rosterOptional: "Roster (optional for Open albums)",
      roster: (n: number) => plural("en", n, { one: "Roster imported (# person)", other: "Roster imported (# people)" }),
      photos: (n: number) => `Photos uploaded (${n} ready)`,
      matchesPending: (review: number, unmatched: number) => `${review} matches to review, ${unmatched} unmatched`,
      matchesDone: "Matches reviewed",
      priceSheet: (name: string) => `Price sheet: ${name}`,
      choosePriceSheet: "Choose a price sheet",
      stripe: "Stripe connected for payouts",
      deadlineSet: "Order deadline set",
      setDeadline: "Set an order deadline",
    },
    todos: {
      stripe: "Connect Stripe so you can get paid",
      review: (n: number, job: string) =>
        plural("en", n, { one: `Review # low-confidence match in ${job}`, other: `Review # low-confidence matches in ${job}` }),
      unmatched: (n: number, job: string) => plural("en", n, { one: `# unmatched photo in ${job}`, other: `# unmatched photos in ${job}` }),
      unpublished: (job: string) => `${job} isn't published yet`,
      closesIn: (job: string, days: number) => plural("en", days, { one: `${job} closes in # day`, other: `${job} closes in # days` }),
    },
    shipping: {
      home: "Ship to my home",
      pickup: (place: string) => `Free pickup at ${place}`,
      school: "school",
    },
    unsubscribed: "You're unsubscribed from Snapbell emails. Order receipts will still be sent.",
    overlay: { studioPreview: "Studio preview", viewedBy: (who: string) => `Viewed by ${who}` },
  },
  {
    ru: {
      checklist: {
        rosterOptional: "Список участников (для открытых альбомов необязателен)",
        roster: (n) =>
          plural("ru", n, {
            one: "Список участников загружен (# человек)",
            few: "Список участников загружен (# человека)",
            many: "Список участников загружен (# человек)",
            other: "Список участников загружен (# человека)",
          }),
        photos: (n) => `Фото загружены (готово: ${n})`,
        matchesPending: (review, unmatched) => `Проверить совпадений: ${review}, без сопоставления: ${unmatched}`,
        matchesDone: "Совпадения проверены",
        priceSheet: (name) => `Прайс-лист: ${name}`,
        choosePriceSheet: "Выберите прайс-лист",
        stripe: "Stripe подключён для выплат",
        deadlineSet: "Срок заказа установлен",
        setDeadline: "Установите срок заказа",
      },
      todos: {
        stripe: "Подключите Stripe, чтобы получать выплаты",
        review: (n, job) =>
          plural("ru", n, {
            one: `Проверьте # неуверенное совпадение в съёмке «${job}»`,
            few: `Проверьте # неуверенных совпадения в съёмке «${job}»`,
            many: `Проверьте # неуверенных совпадений в съёмке «${job}»`,
            other: `Проверьте # неуверенных совпадения в съёмке «${job}»`,
          }),
        unmatched: (n, job) =>
          plural("ru", n, {
            one: `# несопоставленное фото в съёмке «${job}»`,
            few: `# несопоставленных фото в съёмке «${job}»`,
            many: `# несопоставленных фото в съёмке «${job}»`,
            other: `# несопоставленных фото в съёмке «${job}»`,
          }),
        unpublished: (job) => `Съёмка «${job}» ещё не опубликована`,
        closesIn: (job, days) =>
          plural("ru", days, {
            one: `Приём заказов по съёмке «${job}» закроется через # день`,
            few: `Приём заказов по съёмке «${job}» закроется через # дня`,
            many: `Приём заказов по съёмке «${job}» закроется через # дней`,
            other: `Приём заказов по съёмке «${job}» закроется через # дня`,
          }),
      },
      shipping: {
        home: "Доставка домой",
        pickup: (place) => `Бесплатный самовывоз: ${place}`,
        school: "школа",
      },
      unsubscribed: "Вы отписались от писем Snapbell. Чеки по заказам по-прежнему будут приходить.",
      overlay: { studioPreview: "Предпросмотр студии", viewedBy: (who) => `Просматривает ${who}` },
    },
    uz: {
      checklist: {
        rosterOptional: "Ishtirokchilar roʻyxati (ochiq albomlar uchun ixtiyoriy)",
        roster: (n) => `Ishtirokchilar roʻyxati yuklandi (${n} kishi)`,
        photos: (n) => `Suratlar yuklandi (${n} tasi tayyor)`,
        matchesPending: (review, unmatched) => `Tekshirish kerak boʻlgan mosliklar: ${review}, moslashtirilmagan: ${unmatched}`,
        matchesDone: "Mosliklar tekshirildi",
        priceSheet: (name) => `Narxlar roʻyxati: ${name}`,
        choosePriceSheet: "Narxlar roʻyxatini tanlang",
        stripe: "Toʻlovlar uchun Stripe ulangan",
        deadlineSet: "Buyurtma muddati belgilangan",
        setDeadline: "Buyurtma muddatini belgilang",
      },
      todos: {
        stripe: "Toʻlov olish uchun Stripe hisobini ulang",
        review: (n, job) => `«${job}»da ${n} ta noaniq moslikni tekshiring`,
        unmatched: (n, job) => `«${job}»da ${n} ta moslashtirilmagan surat`,
        unpublished: (job) => `«${job}» hali eʼlon qilinmagan`,
        closesIn: (job, days) => `«${job}» boʻyicha buyurtmalar ${days} kundan keyin yopiladi`,
      },
      shipping: {
        home: "Uyga yetkazib berish",
        pickup: (place) => `Bepul olib ketish: ${place}`,
        school: "maktab",
      },
      unsubscribed: "Siz Snapbell xatlaridan obunani bekor qildingiz. Buyurtma kvitansiyalari baribir yuboriladi.",
      overlay: { studioPreview: "Studiya koʻrinishi", viewedBy: (who) => `Koʻrmoqda: ${who}` },
    },
  },
);
