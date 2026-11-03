import { defineMessages, type OrderStatus } from "@snapbell/sdk";

/** Order status badges and the tracking timeline (order page and account). */
export const statusMsgs = defineMessages<Record<OrderStatus, string>>(
  {
    paid: "Paid",
    at_lab: "At the lab",
    shipped: "Shipped",
    delivered: "Delivered",
    refunded: "Refunded",
    partially_refunded: "Partly refunded",
  },
  {
    ru: {
      paid: "Оплачен",
      at_lab: "В лаборатории",
      shipped: "Отправлен",
      delivered: "Доставлен",
      refunded: "Возвращён",
      partially_refunded: "Частично возвращён",
    },
    uz: {
      paid: "Toʻlandi",
      at_lab: "Laboratoriyada",
      shipped: "Joʻnatildi",
      delivered: "Yetkazildi",
      refunded: "Pul qaytarildi",
      partially_refunded: "Qisman qaytarildi",
    },
  },
);
