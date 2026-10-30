import { defineMessages } from "@snapbell/sdk";

/** Logo and color pickers (onboarding and studio settings). */
export const brandMsgs = defineMessages(
  {
    replaceLogo: "Replace logo",
    uploadLogo: "Upload logo",
    removeLogo: "Remove logo",
    logoAlt: (name: string) => `${name} logo`,
    tooBig: "Use an image under 5 MB.",
    unreadable: "We couldn't read that image. Try a PNG or JPEG.",
    logoHint: "Square PNG works best. Shown on your albums and receipts.",
    useColor: (c: string) => `Use ${c}`,
  },
  {
    ru: {
      replaceLogo: "Заменить логотип",
      uploadLogo: "Загрузить логотип",
      removeLogo: "Удалить логотип",
      logoAlt: (name) => `Логотип ${name}`,
      tooBig: "Нужно изображение меньше 5 МБ.",
      unreadable: "Не удалось прочитать изображение. Попробуйте PNG или JPEG.",
      logoHint: "Лучше всего подходит квадратный PNG. Показывается в альбомах и чеках.",
      useColor: (c) => `Выбрать цвет ${c}`,
    },
    uz: {
      replaceLogo: "Logotipni almashtirish",
      uploadLogo: "Logotipni yuklash",
      removeLogo: "Logotipni oʻchirish",
      logoAlt: (name) => `${name} logotipi`,
      tooBig: "5 MB dan kichik rasm tanlang.",
      unreadable: "Rasmni oʻqib boʻlmadi. PNG yoki JPEG sinab koʻring.",
      logoHint: "Kvadrat PNG eng yaxshi mos keladi. Albomlar va cheklarda koʻrsatiladi.",
      useColor: (c) => `${c} rangini tanlash`,
    },
  },
);
