import { defineMessages } from "@snapbell/sdk";

/** Album access states (code entry and album pages) and the "notify me" form. */
export const accessMsgs = defineMessages(
  {
    notReadyTitle: "Photos aren't ready yet",
    notReadyBody: (studio: string | null, day: string | null) => `${studio ?? "Your photographer"} will publish this album ${day ? `on ${day}` : "soon"}.`,
    closedTitle: "This album has closed",
    closedBody: (studio: string | null) => `Ordering for these photos has ended. Contact ${studio ?? "your photographer"} if you still need prints.`,
    invalidTitle: "We couldn't find that code",
    invalidBody: "Check the letters and numbers on your card. Codes never use the letters O or I.",
    tooMany: "Too many tries",
    failed: "Something went wrong",
    notify: {
      label: "Text or email me when photos are ready",
      placeholder: "Mobile number or email",
      submit: "Notify me",
      invalid: "Enter a mobile number or an email address.",
      done: "We'll let you know the moment they're ready.",
    },
  },
  {
    ru: {
      notReadyTitle: "Фото ещё не готовы",
      notReadyBody: (studio, day) => `${studio ?? "Ваш фотограф"} опубликует этот альбом ${day ?? "в ближайшее время"}.`,
      closedTitle: "Альбом закрыт",
      closedBody: (studio) => `Приём заказов на эти фото завершён. Если вам всё ещё нужны отпечатки, свяжитесь ${studio ? `со студией ${studio}` : "с вашим фотографом"}.`,
      invalidTitle: "Код не найден",
      invalidBody: "Проверьте буквы и цифры на карточке. В кодах не бывает букв O и I.",
      tooMany: "Слишком много попыток",
      failed: "Что-то пошло не так",
      notify: {
        label: "Сообщить по SMS или email, когда фото будут готовы",
        placeholder: "Номер телефона или email",
        submit: "Сообщить мне",
        invalid: "Введите номер мобильного или адрес email.",
        done: "Мы сообщим, как только фото будут готовы.",
      },
    },
    uz: {
      notReadyTitle: "Suratlar hali tayyor emas",
      notReadyBody: (studio, day) => `${studio ?? "Fotografingiz"} bu albomni ${day ? `${day} kuni` : "tez orada"} eʼlon qiladi.`,
      closedTitle: "Albom yopilgan",
      closedBody: (studio) => `Bu suratlarga buyurtma qabul qilish tugagan. Bosma suratlar hali ham kerak boʻlsa, ${studio ? `${studio} studiyasi` : "fotografingiz"} bilan bogʻlaning.`,
      invalidTitle: "Bunday kod topilmadi",
      invalidBody: "Kartochkadagi harf va raqamlarni tekshiring. Kodlarda O va I harflari ishlatilmaydi.",
      tooMany: "Urinishlar juda koʻp",
      failed: "Nimadir xato ketdi",
      notify: {
        label: "Suratlar tayyor boʻlganda SMS yoki email orqali xabar bering",
        placeholder: "Telefon raqami yoki email",
        submit: "Xabar berish",
        invalid: "Telefon raqami yoki email manzilini kiriting.",
        done: "Suratlar tayyor boʻlishi bilan xabar beramiz.",
      },
    },
  },
);
