import { defineMessages } from "@snapbell/sdk";

export const viewerMsgs = defineMessages(
  {
    dialog: (i: number, n: number) => `Photo ${i} of ${n}`,
    close: "Close viewer",
    addFavorite: "Add to favorites",
    removeFavorite: "Remove from favorites",
    imageAlt: (tag: string, i: number, n: number) => `${tag} ${i} of ${n}`,
    previous: "Previous photo",
    next: "Next photo",
    useInProduct: "Use in a product",
  },
  {
    ru: {
      dialog: (i, n) => `Фото ${i} из ${n}`,
      close: "Закрыть просмотр",
      addFavorite: "Добавить в избранное",
      removeFavorite: "Убрать из избранного",
      imageAlt: (tag, i, n) => `${tag} ${i} из ${n}`,
      previous: "Предыдущее фото",
      next: "Следующее фото",
      useInProduct: "Заказать с этим фото",
    },
    uz: {
      dialog: (i, n) => `${n} tadan ${i}-surat`,
      close: "Koʻrishni yopish",
      addFavorite: "Sevimlilarga qoʻshish",
      removeFavorite: "Sevimlilardan olib tashlash",
      imageAlt: (tag, i, n) => `${tag}, ${n} tadan ${i}-surat`,
      previous: "Oldingi surat",
      next: "Keyingi surat",
      useInProduct: "Shu surat bilan buyurtma berish",
    },
  },
);
