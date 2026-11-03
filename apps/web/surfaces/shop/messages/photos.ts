import { defineMessages } from "@snapbell/sdk";

/** Shared by the album grid, the photo viewer and the photo picker. */
export const photoMsgs = defineMessages(
  {
    photo: "Photo",
    favoriteFailed: "Couldn't save your favorite",
    hiddenTitle: "Photos are hidden while you're away",
    hiddenBody: "Tap anywhere to keep browsing.",
  },
  {
    ru: {
      photo: "Фото",
      favoriteFailed: "Не удалось сохранить в избранное",
      hiddenTitle: "Фото скрыты, пока вы не на странице",
      hiddenBody: "Нажмите в любом месте, чтобы продолжить.",
    },
    uz: {
      photo: "Surat",
      favoriteFailed: "Sevimlilarga saqlab boʻlmadi",
      hiddenTitle: "Siz sahifada boʻlmaganingizda suratlar yashiriladi",
      hiddenBody: "Davom etish uchun istalgan joyga bosing.",
    },
  },
);
