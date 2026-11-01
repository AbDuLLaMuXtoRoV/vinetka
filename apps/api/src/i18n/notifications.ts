import { defineMessages, type ExportType, type Role } from "@snapbell/sdk";

/**
 * Texts and emails the platform sends. Messages to parents use the parent's saved
 * language; messages to staff use the language of whoever triggered them.
 * Studio-written scheduled messages are sent as written (they are studio content).
 */
export const notificationMessages = defineMessages(
  {
    otp: {
      subject: "Your verification code",
      body: (code: string) => `Your Snapbell code is ${code}. It expires in 10 minutes.`,
      logBody: "Your Snapbell code is ••••••.",
    },
    magicLink: {
      subject: "Your Snapbell sign-in link",
      body: (link: string) => `Sign in to Snapbell: ${link} (expires in 15 minutes)`,
      logBody: "Sign in to Snapbell: [link redacted]",
    },
    orderConfirmation: {
      subject: (number: string) => `Order ${number} confirmed`,
      body: (p: { firstName: string; studio: string; number: string; total: string; downloads: boolean }) =>
        `Thanks ${p.firstName}! ${p.studio} received order ${p.number} (${p.total}).${p.downloads ? " Your digital downloads are ready now." : ""}`,
    },
    refund: {
      subject: (number: string) => `Refund for order ${number}`,
      body: (amount: string, number: string) => `We've refunded ${amount} for order ${number}. It can take 5–10 days to appear on your statement.`,
    },
    shipped: {
      subject: (number: string) => `Order ${number} has shipped`,
      body: (studio: string, number: string, trackingUrl: string | null) =>
        `${studio}: order ${number} is on its way.${trackingUrl ? ` Track it: ${trackingUrl}` : ""}`,
    },
    pass: {
      subject: "Your Picture Day Pass",
      body: (credit: string, job: string, studio: string) =>
        `You're set! ${credit} of photo credit for ${job} with ${studio}. We'll text you when photos are ready.`,
    },
    dataExport: {
      subject: "Your data export request",
      body: "We received your request for a copy of your Snapbell data. We'll email it within 30 days.",
    },
    deletion: {
      subject: "Your data deletion request",
      body: (date: string) => `We received your request to delete your Snapbell data. Everything will be removed by ${date}.`,
    },
    gallery: {
      subject: (job: string) => `Photos from ${job} are ready`,
      /** Used when the studio hasn't written its own "publish" message. Placeholders are filled in later. */
      defaultBody: "{{studio}}: photos from {{job}} are ready. {{album_link}}",
    },
    notifyMe: {
      subject: (job: string) => `Photos from ${job} are ready`,
      body: (studio: string, job: string, link: string) => `${studio}: photos from ${job} are ready to view. ${link}`,
    },
    teamInvite: {
      subject: (inviter: string, studio: string) => `${inviter} invited you to ${studio} on Snapbell`,
      body: (inviter: string, studio: string, role: string, link: string) =>
        `${inviter} invited you to join ${studio} on Snapbell as ${role}. Choose your password here (the link works for 7 days): ${link}`,
    },
    studioWelcome: {
      subject: (studio: string) => `Your Snapbell studio "${studio}" is ready`,
      body: (name: string, studio: string, link: string) =>
        `Hello ${name}! We've created ${studio} on Snapbell for you. Choose your password here (the link works for 7 days): ${link} After that, the setup wizard walks you through your logo, prices and first picture day.`,
    },
    contactRequest: {
      subject: (kind: string, name: string) => `New ${kind} request from ${name}`,
      body: (kind: string, name: string, company: string, reach: string, message: string) =>
        `${kind}: ${name}${company ? ` (${company})` : ""}. Contact: ${reach}. Message: ${message || "—"}. Open the Requests screen in Snapbell Admin to reply.`,
      kinds: { partner: "partner", contact: "contact", demo: "demo", switch: "switch platform", data_request: "data request" },
    },
    exportReady: {
      subject: (type: string) => `Your ${type} export is ready`,
      body: (job: string, link: string) => `Your export for ${job} is ready: ${link}`,
    },
    roles: { owner: "Owner", admin: "Admin", photographer: "Photographer" } satisfies Record<Role, string>,
    exportTypes: { subjects_csv: "roster CSV", yearbook: "yearbook", images_by_label: "images by label" } satisfies Record<ExportType, string>,
    testPrefix: "[Test]",
    deadlineFallback: "the deadline",
    /** Starting texts for a new job's message schedule, in the language of the staff member creating it. */
    defaultSchedule: {
      publish: ["{{child}}'s photos are ready", "{{studio}}: {{child}}'s {{job}} photos are ready to view. {{album_link}}"],
      reminder: ["Reminder: order {{child}}'s photos", "Don't forget: {{child}}'s photos are waiting. Order by {{deadline}}. {{album_link}}"],
      deadline: ["Last day tomorrow", "Ordering for {{job}} closes tomorrow. {{album_link}}"],
      last_chance: ["Last chance today", "Last chance! Orders for {{job}} close tonight. {{album_link}}"],
      shipped: ["Your order has shipped", "{{studio}}: your order {{order_number}} is on its way. {{tracking_link}}"],
    } as Record<"publish" | "reminder" | "deadline" | "last_chance" | "shipped", [string, string]>,
    smsOptOut: "Reply STOP to opt out.",
    inbound: {
      stopped: "You're unsubscribed from Snapbell texts. Reply START to resubscribe.",
      started: "You're resubscribed to Snapbell texts. Reply STOP to unsubscribe.",
    },
  },
  {
    ru: {
      otp: {
        subject: "Ваш код подтверждения",
        body: (code) => `Ваш код Snapbell: ${code}. Он действует 10 минут.`,
        logBody: "Ваш код Snapbell: ••••••.",
      },
      magicLink: {
        subject: "Ваша ссылка для входа в Snapbell",
        body: (link) => `Вход в Snapbell: ${link} (ссылка действует 15 минут)`,
        logBody: "Вход в Snapbell: [ссылка скрыта]",
      },
      orderConfirmation: {
        subject: (number) => `Заказ ${number} подтверждён`,
        body: (p) =>
          `Спасибо, ${p.firstName}! Студия «${p.studio}» получила заказ ${p.number} (${p.total}).${p.downloads ? " Цифровые файлы уже можно скачать." : ""}`,
      },
      refund: {
        subject: (number) => `Возврат по заказу ${number}`,
        body: (amount, number) => `Мы вернули ${amount} по заказу ${number}. Деньги поступят на счёт в течение 5–10 дней.`,
      },
      shipped: {
        subject: (number) => `Заказ ${number} отправлен`,
        body: (studio, number, trackingUrl) => `${studio}: заказ ${number} уже в пути.${trackingUrl ? ` Отследить: ${trackingUrl}` : ""}`,
      },
      pass: {
        subject: "Ваш Picture Day Pass",
        body: (credit, job, studio) =>
          `Готово! У вас ${credit} на фотографии со съёмки «${job}» от студии «${studio}». Мы пришлём SMS, когда фотографии будут готовы.`,
      },
      dataExport: {
        subject: "Ваш запрос на выгрузку данных",
        body: "Мы получили ваш запрос на копию данных Snapbell и отправим её по email в течение 30 дней.",
      },
      deletion: {
        subject: "Ваш запрос на удаление данных",
        body: (date) => `Мы получили ваш запрос на удаление данных Snapbell. Всё будет удалено до ${date}.`,
      },
      gallery: {
        subject: (job) => `Фотографии со съёмки «${job}» готовы`,
        defaultBody: "{{studio}}: фотографии со съёмки «{{job}}» готовы. {{album_link}}",
      },
      notifyMe: {
        subject: (job) => `Фотографии со съёмки «${job}» готовы`,
        body: (studio, job, link) => `${studio}: фотографии со съёмки «${job}» уже можно посмотреть. ${link}`,
      },
      teamInvite: {
        subject: (inviter, studio) => `${inviter} приглашает вас в студию «${studio}» в Snapbell`,
        body: (inviter, studio, role, link) =>
          `${inviter} приглашает вас в студию «${studio}» в Snapbell. Ваша роль: ${role}. Придумайте пароль по ссылке (действует 7 дней): ${link}`,
      },
      studioWelcome: {
        subject: (studio) => `Ваша студия «${studio}» в Snapbell готова`,
        body: (name, studio, link) =>
          `Здравствуйте, ${name}! Мы создали для вас студию «${studio}» в Snapbell. Придумайте пароль по ссылке (действует 7 дней): ${link} Затем мастер настройки поможет добавить логотип, цены и первую съёмку.`,
      },
      contactRequest: {
        subject: (kind, name) => `Новая заявка (${kind}) от ${name}`,
        body: (kind, name, company, reach, message) =>
          `${kind}: ${name}${company ? ` (${company})` : ""}. Контакты: ${reach}. Сообщение: ${message || "—"}. Ответить можно в разделе «Заявки» в Snapbell Admin.`,
        kinds: { partner: "партнёр", contact: "вопрос", demo: "демо", switch: "переход", data_request: "запрос данных" },
      },
      exportReady: {
        subject: (type) => `Экспорт готов: ${type}`,
        body: (job, link) => `Экспорт по съёмке «${job}» готов: ${link}`,
      },
      roles: { owner: "Владелец", admin: "Администратор", photographer: "Фотограф" },
      exportTypes: { subjects_csv: "список участников (CSV)", yearbook: "выпускной альбом", images_by_label: "фото по метке" },
      testPrefix: "[Тест]",
      deadlineFallback: "окончания приёма заказов",
      defaultSchedule: {
        publish: ["Фотографии: {{child}}", "{{studio}}: фотографии {{child}} со съёмки «{{job}}» готовы. {{album_link}}"],
        reminder: ["Напоминание: закажите фотографии", "Не забудьте: фотографии {{child}} ждут вас. Закажите до {{deadline}}. {{album_link}}"],
        deadline: ["Завтра последний день", "Приём заказов по съёмке «{{job}}» закрывается завтра. {{album_link}}"],
        last_chance: ["Сегодня последний шанс", "Последний шанс! Приём заказов по съёмке «{{job}}» закрывается сегодня вечером. {{album_link}}"],
        shipped: ["Ваш заказ отправлен", "{{studio}}: ваш заказ {{order_number}} уже в пути. {{tracking_link}}"],
      },
      smsOptOut: "Чтобы отписаться, ответьте STOP.",
      inbound: {
        stopped: "Вы отписались от SMS Snapbell. Чтобы подписаться снова, ответьте START.",
        started: "Вы снова подписаны на SMS Snapbell. Чтобы отписаться, ответьте STOP.",
      },
    },
    uz: {
      otp: {
        subject: "Tasdiqlash kodingiz",
        body: (code) => `Snapbell kodingiz: ${code}. U 10 daqiqa amal qiladi.`,
        logBody: "Snapbell kodingiz: ••••••.",
      },
      magicLink: {
        subject: "Snapbellʼga kirish havolangiz",
        body: (link) => `Snapbell tizimiga kirish: ${link} (havola 15 daqiqa amal qiladi)`,
        logBody: "Snapbell tizimiga kirish: [havola yashirilgan]",
      },
      orderConfirmation: {
        subject: (number) => `${number} raqamli buyurtma tasdiqlandi`,
        body: (p) =>
          `Rahmat, ${p.firstName}! «${p.studio}» studiyasi ${p.number} raqamli buyurtmani qabul qildi (${p.total}).${p.downloads ? " Raqamli fayllarni hozir yuklab olishingiz mumkin." : ""}`,
      },
      refund: {
        subject: (number) => `${number} raqamli buyurtma boʻyicha pul qaytarildi`,
        body: (amount, number) => `${number} raqamli buyurtma boʻyicha ${amount} qaytarildi. Mablagʻ hisobingizga 5–10 kun ichida tushadi.`,
      },
      shipped: {
        subject: (number) => `${number} raqamli buyurtma joʻnatildi`,
        body: (studio, number, trackingUrl) => `${studio}: ${number} raqamli buyurtma yoʻlda.${trackingUrl ? ` Kuzatish: ${trackingUrl}` : ""}`,
      },
      pass: {
        subject: "Picture Day Passʼingiz",
        body: (credit, job, studio) =>
          `Tayyor! «${studio}» studiyasining «${job}» suratlari uchun ${credit} kredit. Suratlar tayyor boʻlganda SMS yuboramiz.`,
      },
      dataExport: {
        subject: "Maʼlumotlarni yuklab olish soʻrovingiz",
        body: "Snapbell maʼlumotlaringiz nusxasi uchun soʻrovingizni oldik. Uni 30 kun ichida emailga yuboramiz.",
      },
      deletion: {
        subject: "Maʼlumotlarni oʻchirish soʻrovingiz",
        body: (date) => `Snapbell maʼlumotlaringizni oʻchirish soʻrovingizni oldik. Hammasi ${date} gacha oʻchiriladi.`,
      },
      gallery: {
        subject: (job) => `«${job}» suratlari tayyor`,
        defaultBody: "{{studio}}: «{{job}}» suratlari tayyor. {{album_link}}",
      },
      notifyMe: {
        subject: (job) => `«${job}» suratlari tayyor`,
        body: (studio, job, link) => `${studio}: «${job}» suratlarini endi koʻrishingiz mumkin. ${link}`,
      },
      teamInvite: {
        subject: (inviter, studio) => `${inviter} sizni Snapbellʼdagi «${studio}» studiyasiga taklif qildi`,
        body: (inviter, studio, role, link) =>
          `${inviter} sizni Snapbellʼdagi «${studio}» studiyasiga taklif qildi. Rolingiz: ${role}. Parolni shu havola orqali oʻrnating (7 kun amal qiladi): ${link}`,
      },
      studioWelcome: {
        subject: (studio) => `Snapbellʼdagi «${studio}» studiyangiz tayyor`,
        body: (name, studio, link) =>
          `Assalomu alaykum, ${name}! Siz uchun Snapbellʼda «${studio}» studiyasini yaratdik. Parolni shu havola orqali oʻrnating (7 kun amal qiladi): ${link} Soʻngra sozlash ustasi logotip, narxlar va birinchi suratga olish kunini qoʻshishda yordam beradi.`,
      },
      contactRequest: {
        subject: (kind, name) => `Yangi soʻrov (${kind}): ${name}`,
        body: (kind, name, company, reach, message) =>
          `${kind}: ${name}${company ? ` (${company})` : ""}. Aloqa: ${reach}. Xabar: ${message || "—"}. Javob berish uchun Snapbell Adminʼdagi «Soʻrovlar» boʻlimini oching.`,
        kinds: { partner: "hamkor", contact: "savol", demo: "demo", switch: "oʻtish", data_request: "maʼlumot soʻrovi" },
      },
      exportReady: {
        subject: (type) => `Eksport tayyor: ${type}`,
        body: (job, link) => `«${job}» boʻyicha eksport tayyor: ${link}`,
      },
      roles: { owner: "Egasi", admin: "Administrator", photographer: "Fotograf" },
      exportTypes: { subjects_csv: "ishtirokchilar roʻyxati (CSV)", yearbook: "bitiruv albomi", images_by_label: "belgi boʻyicha suratlar" },
      testPrefix: "[Sinov]",
      deadlineFallback: "buyurtma muddati tugaguncha",
      defaultSchedule: {
        publish: ["{{child}} suratlari tayyor", "{{studio}}: {{child}}ning «{{job}}» suratlari tayyor. {{album_link}}"],
        reminder: ["Eslatma: suratlarga buyurtma bering", "Unutmang: {{child}}ning suratlari sizni kutmoqda. {{deadline}} gacha buyurtma bering. {{album_link}}"],
        deadline: ["Ertaga oxirgi kun", "«{{job}}» boʻyicha buyurtmalar ertaga yopiladi. {{album_link}}"],
        last_chance: ["Bugun oxirgi imkoniyat", "Oxirgi imkoniyat! «{{job}}» boʻyicha buyurtmalar bugun kechqurun yopiladi. {{album_link}}"],
        shipped: ["Buyurtmangiz joʻnatildi", "{{studio}}: {{order_number}} raqamli buyurtmangiz yoʻlda. {{tracking_link}}"],
      },
      smsOptOut: "Obunani bekor qilish uchun STOP deb javob yozing.",
      inbound: {
        stopped: "Snapbell SMS xabarlaridan obunani bekor qildingiz. Qayta obuna boʻlish uchun START deb javob yozing.",
        started: "Snapbell SMS xabarlariga qayta obuna boʻldingiz. Obunani bekor qilish uchun STOP deb javob yozing.",
      },
    },
  },
);
