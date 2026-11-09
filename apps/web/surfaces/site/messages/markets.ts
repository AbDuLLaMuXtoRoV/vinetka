import { defineMessages } from "@snapbell/sdk";

/** /markets page chrome (the market copy itself comes from the CMS). */
export const marketsPageMsgs = defineMessages(
  {
    meta: {
      title: "Markets: schools, sports, dance, preschool, seniors and events",
      ogTitle: "Snapbell for every kind of picture day",
      description: "See how Snapbell is set up for school picture day, sports leagues, dance recitals, preschools, senior portraits and events.",
    },
    hero: {
      eyebrow: "Markets",
      title: "Set up for the way your picture day really works.",
      lead: "Album type, delivery and products change from a kindergarten class to a soccer league to a recital. Pick your market to see the typical setup.",
    },
    tabsAria: "Markets",
    workflow: "Typical workflow",
    albumType: "Album type",
    shipping: "Shipping",
    products: "Top products",
    startFor: (market: string) => `Talk to us about ${market.toLowerCase()}`,
    demo: "Book a demo",
  },
  {
    ru: {
      meta: {
        title: "Направления: школы, спорт, танцы, детские сады, выпускники и мероприятия",
        ogTitle: "Snapbell для любого дня съёмки",
        description: "Посмотрите, как Snapbell настраивается для школьного дня съёмки, спортивных лиг, танцевальных концертов, детских садов, выпускных портретов и мероприятий.",
      },
      hero: {
        eyebrow: "Направления",
        title: "Настроено под то, как на самом деле проходит ваш день съёмки.",
        lead: "Тип альбома, доставка и товары различаются для детсадовской группы, футбольной лиги и концерта. Выберите направление, чтобы увидеть типичную настройку.",
      },
      tabsAria: "Направления",
      workflow: "Типичный сценарий",
      albumType: "Тип альбома",
      shipping: "Доставка",
      products: "Популярные товары",
      startFor: (market) => `Обсудить направление «${market}»`,
      demo: "Записаться на демо",
    },
    uz: {
      meta: {
        title: "Yoʻnalishlar: maktablar, sport, raqs, bogʻchalar, bitiruvchilar va tadbirlar",
        ogTitle: "Har qanday suratga olish kuni uchun Snapbell",
        description: "Snapbell maktabdagi suratga olish kuni, sport ligalari, raqs konsertlari, bogʻchalar, bitiruvchilar portretlari va tadbirlar uchun qanday sozlanishini koʻring.",
      },
      hero: {
        eyebrow: "Yoʻnalishlar",
        title: "Suratga olish kuningiz aslida qanday oʻtsa, shunga moslab sozlangan.",
        lead: "Albom turi, yetkazib berish va mahsulotlar bogʻcha guruhida, futbol ligasida va konsertda farq qiladi. Odatiy sozlamani koʻrish uchun yoʻnalishingizni tanlang.",
      },
      tabsAria: "Yoʻnalishlar",
      workflow: "Odatiy ish jarayoni",
      albumType: "Albom turi",
      shipping: "Yetkazib berish",
      products: "Ommabop mahsulotlar",
      startFor: (market) => `«${market}» yoʻnalishi boʻyicha bogʻlanish`,
      demo: "Demoga yozilish",
    },
  },
);
