import { defineMessages } from "@snapbell/sdk";

/** /features overview. */
export const featuresMsgs = defineMessages(
  {
    meta: {
      title: "Features",
      ogTitle: "Snapbell features",
      description: "Check-in app, Smart Match, a branded Family Store, automatic marketing and photo protection — everything a picture-day business needs in one platform.",
    },
    hero: {
      eyebrow: "Features",
      title: "Everything between “say cheese” and “order shipped.”",
      lead: "Snapbell replaces the envelopes, spreadsheets, sorting and reminder emails with one connected system — from the check-in line to the parent's doorstep.",
      start: "Start free",
      demo: "Book a demo",
    },
    subnavAria: "Feature sections",
    subnav: { workflow: "Workflow", store: "Store", marketing: "Marketing", protection: "Protection" },
    workflow: {
      eyebrow: "Workflow",
      title: "Check in, shoot, upload. Sorting happens on its own.",
      body: "The check-in app captures a reference photo for each child, even without signal. Upload your cards afterwards and Smart Match files every photo to the right album, flagging only the ones it isn't sure about.",
      link: "More about check-in",
      phone: "Check-in app roster with offline badge",
    },
    store: {
      eyebrow: "Family Store",
      title: "A store parents can finish before the bell rings.",
      body: "Text message, verify, pick a bundle, pay. Your logo and colors throughout, packages prefilled with their favorite photos, and live previews for every product.",
      link: "More about the Family Store",
      phone: "Family Store album",
    },
    marketing: {
      eyebrow: "Marketing",
      title: "Reminders that send themselves, at the right moments.",
      body: "Publish, reminder, deadline, shipped: each job gets a sensible message schedule you can edit. Sell a Picture Day Pass before you shoot, and run promo codes with real limits.",
      link: "More about marketing",
      sms: [
        { text: "Brightside Photo Co.: Leo's photos are ready to view. brightside.photo/a/LEOM26", time: "Tue 4:12 pm" },
        { text: "Reminder: order by Friday for free delivery to school.", time: "Sat 10:00 am" },
        { text: "Ordered! Thanks for the reminder.", time: "" },
      ],
    },
    protection: {
      eyebrow: "Protection",
      title: "Proofs stay proofs.",
      body: "Originals live in private storage and are never publicly reachable. Previews are watermarked, served through expiring links, and protected against long-press saves, right-click downloads and screen capture.",
      link: "How protection works",
      overlay: "Viewed by parent@example.com",
      alt: "Watermarked proof with the viewer's email across the bottom",
    },
  },
  {
    ru: {
      meta: {
        title: "Возможности",
        ogTitle: "Возможности Snapbell",
        description: "Приложение для регистрации, Smart Match, фирменный Family Store, автоматический маркетинг и защита фото — всё, что нужно бизнесу школьной съёмки, на одной платформе.",
      },
      hero: {
        eyebrow: "Возможности",
        title: "Всё между «скажите сыр» и «заказ отправлен».",
        lead: "Snapbell заменяет конверты, таблицы, ручную сортировку и письма-напоминания одной связанной системой — от очереди на регистрацию до двери родителей.",
        start: "Начать бесплатно",
        demo: "Записаться на демо",
      },
      subnavAria: "Разделы возможностей",
      subnav: { workflow: "Процесс", store: "Магазин", marketing: "Маркетинг", protection: "Защита" },
      workflow: {
        eyebrow: "Процесс",
        title: "Отметили, сняли, загрузили. Сортировка происходит сама.",
        body: "Приложение для регистрации делает контрольное фото каждого ребёнка — даже без связи. Потом загрузите карты памяти, и Smart Match разложит каждое фото в нужный альбом, отметив только те, в которых не уверен.",
        link: "Подробнее о регистрации",
        phone: "Список в приложении для регистрации с отметкой «офлайн»",
      },
      store: {
        eyebrow: "Family Store",
        title: "Магазин, где родители успеют оформить заказ до звонка с урока.",
        body: "SMS, подтверждение, выбор набора, оплата. Ваш логотип и цвета на каждом экране, наборы, заполненные любимыми фото, и живой предпросмотр каждого товара.",
        link: "Подробнее о Family Store",
        phone: "Альбом в Family Store",
      },
      marketing: {
        eyebrow: "Маркетинг",
        title: "Напоминания, которые отправляются сами — в нужный момент.",
        body: "Публикация, напоминание, срок заказа, отправка: у каждой съёмки есть разумное расписание сообщений, которое можно изменить. Продавайте Picture Day Pass ещё до съёмки и запускайте промокоды с реальными ограничениями.",
        link: "Подробнее о маркетинге",
        sms: [
          { text: "Brightside Photo Co.: фото Лео готовы к просмотру. brightside.photo/a/LEOM26", time: "Вт 16:12" },
          { text: "Напоминаем: закажите до пятницы — доставим в школу бесплатно.", time: "Сб 10:00" },
          { text: "Заказали! Спасибо за напоминание.", time: "" },
        ],
      },
      protection: {
        eyebrow: "Защита",
        title: "Пробные снимки остаются пробными.",
        body: "Оригиналы хранятся в закрытом хранилище и никогда не доступны публично. Превью с водяными знаками открываются по ссылкам с ограниченным сроком действия и защищены от сохранения долгим нажатием, скачивания правым кликом и записи экрана.",
        link: "Как работает защита",
        overlay: "Просмотр: parent@example.com",
        alt: "Пробный снимок с водяным знаком и email зрителя внизу",
      },
    },
    uz: {
      meta: {
        title: "Imkoniyatlar",
        ogTitle: "Snapbell imkoniyatlari",
        description: "Roʻyxatga olish ilovasi, Smart Match, brendli Family Store, avtomatik marketing va suratlarni himoyalash — suratga olish biznesiga kerak boʻlgan hammasi bitta platformada.",
      },
      hero: {
        eyebrow: "Imkoniyatlar",
        title: "«Kulib turing»dan «buyurtma joʻnatildi»gacha boʻlgan hamma narsa.",
        lead: "Snapbell konvertlar, jadvallar, qoʻlda saralash va eslatma xatlarini yagona tizim bilan almashtiradi — roʻyxatga olish navbatidan ota-onaning eshigigacha.",
        start: "Bepul boshlash",
        demo: "Demoga yozilish",
      },
      subnavAria: "Imkoniyatlar boʻlimlari",
      subnav: { workflow: "Ish jarayoni", store: "Doʻkon", marketing: "Marketing", protection: "Himoya" },
      workflow: {
        eyebrow: "Ish jarayoni",
        title: "Belgilang, suratga oling, yuklang. Saralash oʻz-oʻzidan bajariladi.",
        body: "Roʻyxatga olish ilovasi har bir bolaning nazorat suratini oladi — aloqa boʻlmasa ham. Keyin xotira kartalarini yuklang: Smart Match har bir suratni tegishli albomga joylaydi va faqat ishonchi komil boʻlmaganlarini belgilaydi.",
        link: "Roʻyxatga olish haqida batafsil",
        phone: "Oflayn belgisi bilan roʻyxatga olish ilovasidagi roʻyxat",
      },
      store: {
        eyebrow: "Family Store",
        title: "Ota-onalar dars qoʻngʻirogʻigacha buyurtma berib ulguradigan doʻkon.",
        body: "SMS, tasdiqlash, toʻplam tanlash, toʻlov. Har bir ekranda logotipingiz va ranglaringiz, sevimli suratlar bilan toʻldirilgan toʻplamlar va har bir mahsulotni jonli oldindan koʻrish.",
        link: "Family Store haqida batafsil",
        phone: "Family Store albomi",
      },
      marketing: {
        eyebrow: "Marketing",
        title: "Oʻz vaqtida oʻzi yuboriladigan eslatmalar.",
        body: "Eʼlon qilish, eslatma, buyurtma muddati, joʻnatish: har bir suratga olish uchun oʻzgartirish mumkin boʻlgan qulay xabarlar jadvali tuziladi. Picture Day Passni suratga olishdan oldin soting va haqiqiy cheklovli promokodlardan foydalaning.",
        link: "Marketing haqida batafsil",
        sms: [
          { text: "Brightside Photo Co.: Leoning suratlari tayyor. brightside.photo/a/LEOM26", time: "Sesh 16:12" },
          { text: "Eslatma: jumagacha buyurtma bering — maktabga bepul yetkazamiz.", time: "Shan 10:00" },
          { text: "Buyurtma berdik! Eslatganingiz uchun rahmat.", time: "" },
        ],
      },
      protection: {
        eyebrow: "Himoya",
        title: "Namuna suratlar namunaligicha qoladi.",
        body: "Asl suratlar yopiq xotirada saqlanadi va hech qachon ochiq boʻlmaydi. Suv belgili suratlar muddati tugaydigan havolalar orqali koʻrsatiladi hamda uzoq bosib saqlash, oʻng tugma bilan yuklab olish va ekranni yozib olishdan himoyalangan.",
        link: "Himoya qanday ishlaydi",
        overlay: "Koʻruvchi: parent@example.com",
        alt: "Pastida koʻruvchining emaili yozilgan suv belgili namuna surat",
      },
    },
  },
);

/** /features/check-in */
export const checkInMsgs = defineMessages(
  {
    meta: {
      title: "Check-in app and Smart Match",
      ogTitle: "Snapbell check-in app and Smart Match",
      description: "Check in every child on your phone, capture a reference photo, and let Smart Match sort every picture to the right album — even without signal.",
    },
    hero: {
      eyebrow: "Check-in app + Smart Match",
      title: "The check-in line that sorts your photos for you.",
      lead: "Tap a name, snap a reference photo, wave them through. Later, Smart Match files every frame from your camera card into the right child's album.",
      phone: "Check-in app in hand: roster list with the current student highlighted",
      offline: "Works offline",
    },
    day: {
      eyebrow: "Picture day, start to finish",
      title: "Before, during and after",
      blocks: [
        {
          title: "Before",
          items: ["Import the roster from the school's CSV", "Codes generated for every student", "Download the job to each phone for offline use", "Print code cards or flyers if the school wants paper"],
        },
        {
          title: "During",
          items: ["Search or scan to find a student in seconds", "One tap to capture a reference photo", "Add walk-ups and retakes on the spot", "Every phone shares the same live roster"],
        },
        {
          title: "After",
          items: ["Phones sync when they're back online", "Upload thousands of photos, resumable", "Smart Match sorts while you drive home", "Review only what it flags, then publish"],
        },
      ],
    },
    match: {
      eyebrow: "Smart Match",
      title: "Reference photo in, sorted album out.",
      lead: "Smart Match compares each pro photo with the reference from check-in. Confident matches are filed automatically; the rest wait for a quick human check.",
      aria: "How Smart Match works",
      frames: [
        { label: "Reference photo", detail: "Snapped at check-in" },
        { label: "Pro photo", detail: "From your camera card" },
        { label: "Matched", detail: "Filed to Mia Chen's album" },
      ],
      note: "Low-confidence matches are never visible to parents. They sit in your review queue until you accept, reassign or split them.",
    },
    faqEyebrow: "FAQ",
    faqTitle: "Questions photographers ask",
    faq: [
      {
        question: "How accurate is Smart Match?",
        answer:
          "On typical school portraits, the large majority of photos are matched with high confidence and applied automatically. Anything below the confidence threshold goes to your review queue instead — low-confidence matches are never shown to parents until you accept them.",
      },
      {
        question: "What about twins?",
        answer:
          "Twins and look-alike siblings are exactly why the review queue exists. Matches between similar faces score lower, so they land in review, and the Split action lets you separate photos that were grouped together in one click.",
      },
      {
        question: "Is face data private?",
        answer:
          "Reference photos and face data are used only to sort photos within that job. Face data is deleted automatically when the season ends. Parents who use selfie search see a consent screen first, and the selfie is deleted right after the search.",
      },
      {
        question: "Does it work without Wi-Fi?",
        answer: "Yes. Download the job before you leave and check in all day offline. The app syncs automatically once you're back on a connection.",
      },
      {
        question: "Can several photographers check in at once?",
        answer: "Yes. Every phone works from the same roster, and check-ins merge when they sync — no duplicate reference photos.",
      },
    ],
    download: { title: "Get the check-in app", lead: "Free with every Snapbell account. Sign in with your studio login." },
  },
  {
    ru: {
      meta: {
        title: "Приложение для регистрации и Smart Match",
        ogTitle: "Приложение Snapbell для регистрации и Smart Match",
        description: "Отмечайте каждого ребёнка в телефоне, делайте контрольное фото — и Smart Match разложит каждый снимок в нужный альбом, даже без связи.",
      },
      hero: {
        eyebrow: "Приложение для регистрации + Smart Match",
        title: "Регистрация, которая сама сортирует ваши фото.",
        lead: "Нажмите на имя, сделайте контрольное фото — следующий! А потом Smart Match разложит каждый кадр с карты памяти в альбом нужного ребёнка.",
        phone: "Приложение для регистрации в руке: список с выделенным текущим учеником",
        offline: "Работает офлайн",
      },
      day: {
        eyebrow: "День съёмки от начала до конца",
        title: "До, во время и после",
        blocks: [
          {
            title: "До",
            items: ["Импортируйте список из CSV от школы", "Коды создаются для каждого ученика", "Скачайте съёмку на каждый телефон для работы офлайн", "Распечатайте карточки с кодами или листовки, если школе нужна бумага"],
          },
          {
            title: "Во время",
            items: ["Найдите ученика поиском или сканированием за секунды", "Контрольное фото — одним касанием", "Добавляйте опоздавших и пересъёмки на месте", "Все телефоны работают с одним живым списком"],
          },
          {
            title: "После",
            items: ["Телефоны синхронизируются, как только появится связь", "Загружайте тысячи фото с докачкой", "Smart Match сортирует, пока вы едете домой", "Проверьте только отмеченное и опубликуйте"],
          },
        ],
      },
      match: {
        eyebrow: "Smart Match",
        title: "На входе контрольное фото, на выходе — разобранный альбом.",
        lead: "Smart Match сравнивает каждое профессиональное фото с контрольным снимком с регистрации. Уверенные совпадения применяются автоматически, остальные ждут быстрой проверки человеком.",
        aria: "Как работает Smart Match",
        frames: [
          { label: "Контрольное фото", detail: "Снято при регистрации" },
          { label: "Профессиональное фото", detail: "С вашей карты памяти" },
          { label: "Совпадение", detail: "Добавлено в альбом Mia Chen" },
        ],
        note: "Неуверенные совпадения никогда не видны родителям. Они ждут в очереди проверки, пока вы их не примете, не переназначите или не разделите.",
      },
      faqEyebrow: "Вопросы и ответы",
      faqTitle: "Что спрашивают фотографы",
      faq: [
        {
          question: "Насколько точен Smart Match?",
          answer:
            "На типичных школьных портретах подавляющее большинство фото сопоставляется с высокой уверенностью и применяется автоматически. Всё, что ниже порога уверенности, попадает в очередь проверки — неуверенные совпадения не показываются родителям, пока вы их не примете.",
        },
        {
          question: "А как же близнецы?",
          answer:
            "Близнецы и похожие братья и сёстры — как раз то, ради чего существует очередь проверки. Совпадения похожих лиц получают меньшую оценку и уходят на проверку, а действие «Разделить» одним кликом разводит сгруппированные вместе фото.",
        },
        {
          question: "Данные о лицах защищены?",
          answer:
            "Контрольные фото и данные о лицах используются только для сортировки фото внутри этой съёмки. Данные о лицах автоматически удаляются в конце сезона. Родители, которые ищут по селфи, сначала видят экран согласия, а селфи удаляется сразу после поиска.",
        },
        {
          question: "Работает ли без Wi-Fi?",
          answer: "Да. Скачайте съёмку перед выездом и отмечайте детей весь день офлайн. Приложение синхронизируется автоматически, как только появится связь.",
        },
        {
          question: "Могут ли несколько фотографов отмечать детей одновременно?",
          answer: "Да. Все телефоны работают с одним списком, а отметки объединяются при синхронизации — без дублей контрольных фото.",
        },
      ],
      download: { title: "Скачайте приложение для регистрации", lead: "Бесплатно для каждого аккаунта Snapbell. Входите с логином вашей студии." },
    },
    uz: {
      meta: {
        title: "Roʻyxatga olish ilovasi va Smart Match",
        ogTitle: "Snapbell roʻyxatga olish ilovasi va Smart Match",
        description: "Har bir bolani telefonda belgilang, nazorat suratini oling — Smart Match har bir suratni tegishli albomga joylaydi, hatto aloqa boʻlmasa ham.",
      },
      hero: {
        eyebrow: "Roʻyxatga olish ilovasi + Smart Match",
        title: "Suratlaringizni oʻzi saralaydigan roʻyxatga olish.",
        lead: "Ismni bosing, nazorat suratini oling — navbatdagisi! Keyin Smart Match xotira kartasidagi har bir kadrni tegishli bolaning albomiga joylaydi.",
        phone: "Qoʻldagi roʻyxatga olish ilovasi: joriy oʻquvchi ajratib koʻrsatilgan roʻyxat",
        offline: "Oflayn ishlaydi",
      },
      day: {
        eyebrow: "Suratga olish kuni boshidan oxirigacha",
        title: "Oldin, davomida va keyin",
        blocks: [
          {
            title: "Oldin",
            items: ["Roʻyxatni maktabning CSV faylidan import qiling", "Har bir oʻquvchi uchun kod yaratiladi", "Oflayn ishlash uchun suratga olishni har bir telefonga yuklab oling", "Maktab qogʻoz talab qilsa, kod kartalari yoki varaqalarni chop eting"],
          },
          {
            title: "Davomida",
            items: ["Oʻquvchini qidiruv yoki skaner orqali soniyalarda toping", "Nazorat surati — bitta bosish bilan", "Kechikkanlar va qayta suratga olishni joyida qoʻshing", "Barcha telefonlar bitta jonli roʻyxat bilan ishlaydi"],
          },
          {
            title: "Keyin",
            items: ["Aloqa tiklanishi bilan telefonlar sinxronlanadi", "Minglab suratlarni uzilishdan keyin davom ettirib yuklang", "Uyga qaytguningizcha Smart Match saralaydi", "Faqat belgilanganlarni tekshiring va eʼlon qiling"],
          },
        ],
      },
      match: {
        eyebrow: "Smart Match",
        title: "Kirishda nazorat surati, chiqishda saralangan albom.",
        lead: "Smart Match har bir professional suratni roʻyxatga olishdagi nazorat surati bilan solishtiradi. Ishonchli mosliklar avtomatik qoʻllanadi, qolganlari esa inson tomonidan tezkor tekshiruvni kutadi.",
        aria: "Smart Match qanday ishlaydi",
        frames: [
          { label: "Nazorat surati", detail: "Roʻyxatga olishda olingan" },
          { label: "Professional surat", detail: "Xotira kartangizdan" },
          { label: "Moslandi", detail: "Mia Chen albomiga joylandi" },
        ],
        note: "Ishonchsiz mosliklar ota-onalarga hech qachon koʻrinmaydi. Siz ularni qabul qilmaguningizcha, boshqasiga oʻtkazmaguningizcha yoki ajratmaguningizcha tekshiruv navbatida turadi.",
      },
      faqEyebrow: "Savol-javob",
      faqTitle: "Fotograflar beradigan savollar",
      faq: [
        {
          question: "Smart Match qanchalik aniq?",
          answer:
            "Odatiy maktab portretlarida suratlarning katta qismi yuqori ishonch bilan moslanadi va avtomatik qoʻllanadi. Ishonch chegarasidan pastdagilari tekshiruv navbatiga tushadi — ishonchsiz mosliklar siz qabul qilmaguningizcha ota-onalarga koʻrsatilmaydi.",
        },
        {
          question: "Egizaklar-chi?",
          answer:
            "Tekshiruv navbati aynan egizaklar va bir-biriga oʻxshash aka-uka, opa-singillar uchun mavjud. Oʻxshash yuzlar mosligi pastroq baholanadi va tekshiruvga tushadi, «Ajratish» amali esa birga guruhlangan suratlarni bir bosishda ajratadi.",
        },
        {
          question: "Yuz maʼlumotlari maxfiymi?",
          answer:
            "Nazorat suratlari va yuz maʼlumotlari faqat shu suratga olish doirasida suratlarni saralash uchun ishlatiladi. Mavsum tugagach, yuz maʼlumotlari avtomatik oʻchiriladi. Selfi orqali qidiradigan ota-onalar avval rozilik ekranini koʻradi, selfi esa qidiruvdan soʻng darhol oʻchiriladi.",
        },
        {
          question: "Wi-Fi boʻlmasa ishlaydimi?",
          answer: "Ha. Joʻnashdan oldin suratga olishni yuklab oling va kun boʻyi oflayn belgilang. Aloqa tiklangach, ilova avtomatik sinxronlanadi.",
        },
        {
          question: "Bir nechta fotograf bir vaqtda belgilay oladimi?",
          answer: "Ha. Barcha telefonlar bitta roʻyxat bilan ishlaydi, belgilar sinxronlashda birlashadi — nazorat suratlari takrorlanmaydi.",
        },
      ],
      download: { title: "Roʻyxatga olish ilovasini yuklab oling", lead: "Har bir Snapbell hisobi uchun bepul. Studiyangiz logini bilan kiring." },
    },
  },
);
