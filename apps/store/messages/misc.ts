import { defineMessages } from "@snapbell/sdk";

/** The client error boundary and the reorder button. */
export const miscMsgs = defineMessages(
  {
    errorTitle: "Something went wrong",
    errorBody: "Your cart and favorites are safe. Please try again.",
    tryAgain: "Try again",
    startOver: "Start over",
    reorder: "Reorder",
    reorderFailed: "Couldn't reorder",
  },
  {
    ru: {
      errorTitle: "Что-то пошло не так",
      errorBody: "Корзина и избранное сохранены. Попробуйте ещё раз.",
      tryAgain: "Попробовать снова",
      startOver: "Начать заново",
      reorder: "Повторить заказ",
      reorderFailed: "Не удалось повторить заказ",
    },
    uz: {
      errorTitle: "Nimadir xato ketdi",
      errorBody: "Savat va sevimlilar saqlangan. Qayta urinib koʻring.",
      tryAgain: "Qayta urinish",
      startOver: "Boshidan boshlash",
      reorder: "Qayta buyurtma berish",
      reorderFailed: "Qayta buyurtma berib boʻlmadi",
    },
  },
);
