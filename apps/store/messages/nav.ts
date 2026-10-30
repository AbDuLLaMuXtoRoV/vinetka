import { defineMessages, plural } from "@snapbell/sdk";

export const navMsgs = defineMessages(
  {
    label: "Store",
    photos: "Photos",
    shop: "Shop",
    cart: "Cart",
    account: "Account",
    cartItems: (n: number) => plural("en", n, { one: ", # item", other: ", # items" }),
  },
  {
    ru: {
      label: "Магазин",
      photos: "Фото",
      shop: "Магазин",
      cart: "Корзина",
      account: "Аккаунт",
      cartItems: (n) => plural("ru", n, { one: ", # товар", few: ", # товара", many: ", # товаров", other: ", # товара" }),
    },
    uz: {
      label: "Doʻkon",
      photos: "Suratlar",
      shop: "Doʻkon",
      cart: "Savat",
      account: "Hisob",
      cartItems: (n) => plural("uz", n, { one: ", # ta mahsulot", other: ", # ta mahsulot" }),
    },
  },
);
