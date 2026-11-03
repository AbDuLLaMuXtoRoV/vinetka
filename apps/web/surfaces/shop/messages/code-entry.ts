import { defineMessages } from "@snapbell/sdk";

export const codeEntryMsgs = defineMessages(
  {
    title: "Find your picture day photos",
    intro: "Enter the 6-character code from your code card or flyer.",
    codeLabel: "Album code",
    submit: "View my photos",
    opening: (studio: string) => `Opening ${studio}…`,
    textTitle: "Got a text from your photographer?",
    textBody: "Tap the link in the message. It opens your album directly, no code needed.",
  },
  {
    ru: {
      title: "Найдите фото со дня съёмки",
      intro: "Введите 6-значный код с карточки или листовки.",
      codeLabel: "Код альбома",
      submit: "Смотреть мои фото",
      opening: (studio) => `Открываем ${studio}…`,
      textTitle: "Получили SMS от фотографа?",
      textBody: "Нажмите на ссылку в сообщении — альбом откроется сразу, без кода.",
    },
    uz: {
      title: "Suratga olish kuni suratlaringizni toping",
      intro: "Kartochka yoki varaqadagi 6 belgili kodni kiriting.",
      codeLabel: "Albom kodi",
      submit: "Suratlarimni koʻrish",
      opening: (studio) => `${studio} ochilmoqda…`,
      textTitle: "Fotografdan SMS keldimi?",
      textBody: "Xabardagi havolani bosing — albom darhol ochiladi, kod kerak emas.",
    },
  },
);
