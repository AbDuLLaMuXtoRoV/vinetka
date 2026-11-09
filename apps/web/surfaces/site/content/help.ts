import type { Locale } from "@snapbell/sdk";
import type { Block } from "./blog";

export type HelpCategory = "getting-started" | "jobs" | "store" | "payments" | "parents";

/** Display order of the category cards. */
export const HELP_CATEGORY_IDS: readonly HelpCategory[] = ["getting-started", "jobs", "store", "payments", "parents"];

export interface HelpCategoryInfo {
  id: HelpCategory;
  label: string;
  description: string;
}

export const helpCategoryCopy: Record<Locale, Record<HelpCategory, { label: string; description: string }>> = {
  en: {
    "getting-started": { label: "Getting started", description: "Set up your studio, brand and payouts." },
    jobs: { label: "Jobs", description: "Rosters, uploads, matching and publishing." },
    store: { label: "Store", description: "Price sheets, packages and photo protection." },
    payments: { label: "Payments", description: "Payouts, refunds and tax." },
    parents: { label: "Parents", description: "Finding photos, ordering and delivery." },
  },
  ru: {
    "getting-started": { label: "Начало работы", description: "Настройте студию, бренд и выплаты." },
    jobs: { label: "Съёмки", description: "Списки участников, загрузка, сопоставление и публикация." },
    store: { label: "Магазин", description: "Прайс-листы, пакеты и защита фото." },
    payments: { label: "Платежи", description: "Выплаты, возвраты и налоги." },
    parents: { label: "Родителям", description: "Поиск фото, заказ и доставка." },
  },
  uz: {
    "getting-started": { label: "Ishni boshlash", description: "Studiya, brend va toʻlovlarni sozlang." },
    jobs: { label: "Suratga olishlar", description: "Ishtirokchilar roʻyxati, yuklash, moslashtirish va eʼlon qilish." },
    store: { label: "Doʻkon", description: "Narxlar roʻyxati, toʻplamlar va suratlarni himoya qilish." },
    payments: { label: "Toʻlovlar", description: "Toʻlovlar, pulni qaytarish va soliq." },
    parents: { label: "Ota-onalar uchun", description: "Suratlarni topish, buyurtma berish va yetkazib berish." },
  },
};

/** An article as the pages render it, in one language. */
export interface HelpArticle {
  slug: string;
  title: string;
  summary: string;
  category: HelpCategory;
  updatedAt: string;
  body: Block[];
}

export interface HelpCopy {
  title: string;
  summary: string;
  body: Block[];
}

export interface HelpSource {
  slug: string;
  category: HelpCategory;
  updatedAt: string;
  copy: Record<Locale, HelpCopy>;
}

export const helpSources: HelpSource[] = [
  {
    slug: "set-up-your-studio",
    category: "getting-started",
    updatedAt: "2026-11-01",
    copy: {
      en: {
        title: "Getting your studio account",
        summary: "The Snapbell team creates your studio. You set a password, then the setup wizard does the rest.",
        body: [
          { type: "p", text: "Studio accounts are created by the Snapbell team. Send us a request on the Become a partner page (or call us) and we'll get in touch within one business day." },
          { type: "p", text: "Once we've talked, we create your studio and send the owner a personal link to set a password. The link works once and expires after 7 days — if it runs out, ask us for a new one." },
          { type: "p", text: "After you log in, the setup wizard walks you through six short steps. Your progress is saved after each one, so you can stop and come back." },
          { type: "ul", items: ["Studio name and logo", "Brand color (used in your Family Store)", "Markets you serve", "Connect Stripe (you can skip this until your first publish)", "Pick a default lab", "Start from a suggested price sheet"] },
          { type: "p", text: "Need a hand? We'll go through setup with you on a call and help you publish your first job." },
        ],
      },
      ru: {
        title: "Как получить аккаунт студии",
        summary: "Студию создаёт команда Snapbell. Вы задаёте пароль, а с остальным поможет мастер настройки.",
        body: [
          { type: "p", text: "Аккаунты студий создаёт команда Snapbell. Оставьте заявку на странице «Стать партнёром» (или позвоните нам) — мы свяжемся с вами в течение одного рабочего дня." },
          { type: "p", text: "После разговора мы создадим вашу студию и отправим владельцу личную ссылку для установки пароля. Ссылка одноразовая и действует 7 дней — если срок истёк, попросите у нас новую." },
          { type: "p", text: "После входа мастер настройки проведёт вас через шесть коротких шагов. Прогресс сохраняется после каждого из них, так что можно прерваться и вернуться позже." },
          { type: "ul", items: ["Название и логотип студии", "Фирменный цвет (используется в вашем Family Store)", "Направления, с которыми вы работаете", "Подключение Stripe (можно отложить до первой публикации)", "Выбор лаборатории по умолчанию", "Стартовый прайс-лист на основе предложенного"] },
          { type: "p", text: "Нужна помощь? Мы пройдём настройку вместе с вами по телефону и поможем опубликовать первую съёмку." },
        ],
      },
      uz: {
        title: "Studiya hisobini qanday olish mumkin",
        summary: "Studiyani Snapbell jamoasi yaratadi. Siz parol oʻrnatasiz, qolganida sozlash ustasi yordam beradi.",
        body: [
          { type: "p", text: "Studiya hisoblarini Snapbell jamoasi yaratadi. «Hamkor boʻlish» sahifasida soʻrov qoldiring (yoki bizga qoʻngʻiroq qiling) — bir ish kuni ichida siz bilan bogʻlanamiz." },
          { type: "p", text: "Suhbatdan soʻng studiyangizni yaratamiz va egasiga parol oʻrnatish uchun shaxsiy havola yuboramiz. Havola bir martalik va 7 kun amal qiladi — muddati tugasa, bizdan yangisini soʻrang." },
          { type: "p", text: "Tizimga kirganingizdan soʻng sozlash ustasi sizni oltita qisqa qadamdan olib oʻtadi. Har bir qadamdan keyin jarayon saqlanadi, shuning uchun toʻxtab, keyinroq qaytishingiz mumkin." },
          { type: "ul", items: ["Studiya nomi va logotipi", "Brend rangi (Family Store doʻkoningizda ishlatiladi)", "Xizmat koʻrsatadigan yoʻnalishlaringiz", "Stripe hisobini ulash (birinchi eʼlon qilishgacha qoldirish mumkin)", "Standart laboratoriyani tanlash", "Taklif qilingan narxlar roʻyxatidan boshlash"] },
          { type: "p", text: "Yordam kerakmi? Sozlashni telefon orqali siz bilan birga oʻtamiz va birinchi suratga olishni eʼlon qilishga yordam beramiz." },
        ],
      },
    },
  },
  {
    slug: "connect-stripe",
    category: "getting-started",
    updatedAt: "2026-09-18",
    copy: {
      en: {
        title: "Connect Stripe to get paid",
        summary: "How payouts work and what Stripe will ask you for.",
        body: [
          { type: "p", text: "Snapbell uses Stripe Connect so payments go to your own Stripe account. Stripe will ask for your business details, a bank account and identity verification for the owner." },
          { type: "p", text: "If Stripe later needs more information, you'll see a banner in Settings → Payments and we'll email the owner." },
        ],
      },
      ru: {
        title: "Подключите Stripe, чтобы получать деньги",
        summary: "Как работают выплаты и что запросит Stripe.",
        body: [
          { type: "p", text: "Snapbell использует Stripe Connect, поэтому платежи поступают на ваш собственный аккаунт Stripe. Stripe запросит данные о вашем бизнесе, банковский счёт и подтверждение личности владельца." },
          { type: "p", text: "Если позже Stripe понадобится дополнительная информация, вы увидите уведомление в разделе «Настройки → Платежи», а мы отправим письмо владельцу." },
        ],
      },
      uz: {
        title: "Pul olish uchun Stripe hisobini ulang",
        summary: "Toʻlovlar qanday ishlaydi va Stripe sizdan nimalarni soʻraydi.",
        body: [
          { type: "p", text: "Snapbell Stripe Connect xizmatidan foydalanadi, shuning uchun toʻlovlar sizning shaxsiy Stripe hisobingizga tushadi. Stripe biznesingiz haqidagi maʼlumotlarni, bank hisobini va egasining shaxsini tasdiqlashni soʻraydi." },
          { type: "p", text: "Agar keyinroq Stripe qoʻshimcha maʼlumot talab qilsa, «Sozlamalar → Toʻlovlar» boʻlimida xabarnoma koʻrasiz, biz esa egasiga xat yuboramiz." },
        ],
      },
    },
  },
  {
    slug: "create-a-job",
    category: "jobs",
    updatedAt: "2026-10-05",
    copy: {
      en: {
        title: "Create a job and choose an album type",
        summary: "Personal, Team or Open: which one fits your picture day.",
        body: [
          { type: "ul", items: ["Personal: one private album per subject, unlocked with their own code. Best for schools and seniors.", "Team: one shared code for a roster. Parents use Find Me to narrow to their child.", "Open: one link for everyone, no roster needed. Best for events and recitals."] },
          { type: "p", text: "Before saving, use 'Preview what parents see' to check the album exactly as a family will." },
        ],
      },
      ru: {
        title: "Создайте съёмку и выберите тип альбома",
        summary: "Личный, командный или открытый: какой подходит вашему дню съёмки.",
        body: [
          { type: "ul", items: ["Личный: отдельный закрытый альбом для каждого участника, открывается его собственным кодом. Лучше всего подходит для школ и выпускников.", "Командный: один общий код на весь список участников. Родители находят своего ребёнка через поиск по селфи.", "Открытый: одна ссылка для всех, список участников не нужен. Лучше всего подходит для мероприятий и отчётных концертов."] },
          { type: "p", text: "Перед сохранением откройте предпросмотр «Что увидят родители», чтобы проверить альбом именно так, как его увидит семья." },
        ],
      },
      uz: {
        title: "Suratga olish yarating va albom turini tanlang",
        summary: "Shaxsiy, jamoaviy yoki ochiq: qaysi biri suratga olish kuningizga mos keladi.",
        body: [
          { type: "ul", items: ["Shaxsiy: har bir ishtirokchi uchun alohida yopiq albom, uning shaxsiy kodi bilan ochiladi. Maktablar va bitiruvchilar uchun eng yaxshi tanlov.", "Jamoaviy: butun ishtirokchilar roʻyxati uchun bitta umumiy kod. Ota-onalar farzandini selfi orqali qidirish yordamida topadi.", "Ochiq: hamma uchun bitta havola, ishtirokchilar roʻyxati kerak emas. Tadbirlar va hisobot konsertlari uchun eng yaxshi tanlov."] },
          { type: "p", text: "Saqlashdan oldin «Ota-onalar nimani koʻradi» oldindan koʻrishini oching va albomni oila koʻradigan holatda tekshiring." },
        ],
      },
    },
  },
  {
    slug: "import-a-roster",
    category: "jobs",
    updatedAt: "2026-09-29",
    copy: {
      en: {
        title: "Import a roster from a CSV",
        summary: "Map your columns once; we generate access codes for you.",
        body: [
          { type: "p", text: "Upload the CSV the school sends you. Map its columns to first name, last name and grade/team. If the file already has codes, map those too; otherwise Snapbell generates a unique 6-character code for each subject." },
          { type: "p", text: "Rows with problems are listed with the row number so you can fix them and re-import without duplicates." },
        ],
      },
      ru: {
        title: "Импорт списка участников из CSV",
        summary: "Сопоставьте столбцы один раз — коды доступа мы создадим сами.",
        body: [
          { type: "p", text: "Загрузите CSV-файл, который прислала школа. Сопоставьте его столбцы с именем, фамилией и классом или командой. Если в файле уже есть коды, сопоставьте и их; иначе Snapbell создаст для каждого участника уникальный код из 6 символов." },
          { type: "p", text: "Строки с ошибками выводятся с номерами, чтобы вы могли исправить их и импортировать файл повторно без дублей." },
        ],
      },
      uz: {
        title: "Ishtirokchilar roʻyxatini CSV fayldan import qilish",
        summary: "Ustunlarni bir marta moslang — kirish kodlarini biz yaratamiz.",
        body: [
          { type: "p", text: "Maktab yuborgan CSV faylni yuklang. Uning ustunlarini ism, familiya va sinf yoki jamoa bilan moslang. Agar faylda kodlar allaqachon boʻlsa, ularni ham moslang; aks holda Snapbell har bir ishtirokchi uchun 6 belgidan iborat noyob kod yaratadi." },
          { type: "p", text: "Muammoli qatorlar raqami bilan koʻrsatiladi, shuning uchun ularni tuzatib, faylni takroriy yozuvlarsiz qayta import qilishingiz mumkin." },
        ],
      },
    },
  },
  {
    slug: "review-smart-match",
    category: "jobs",
    updatedAt: "2026-10-12",
    copy: {
      en: {
        title: "Review Smart Match results",
        summary: "Accept, reassign or split matches; low-confidence matches never go live.",
        body: [
          { type: "p", text: "Smart Match compares the reference photo from check-in with your uploads. High-confidence matches are applied automatically. Anything below the threshold waits in the review queue and is never shown to parents until you accept it." },
          { type: "ul", items: ["Accept: confirm a match.", "Reassign: move a photo to a different subject.", "Split: separate photos that were grouped together by mistake (twins, for example).", "Bulk accept: confirm a whole subject at once."] },
        ],
      },
      ru: {
        title: "Проверка результатов Smart Match",
        summary: "Принимайте, переназначайте или разделяйте совпадения; совпадения с низкой уверенностью никогда не публикуются.",
        body: [
          { type: "p", text: "Smart Match сравнивает контрольное фото, сделанное при регистрации, с вашими загрузками. Совпадения с высокой уверенностью применяются автоматически. Всё, что ниже порога, ждёт в очереди проверки и не показывается родителям, пока вы его не примете." },
          { type: "ul", items: ["Принять — подтвердить совпадение.", "Переназначить — перенести фото к другому участнику.", "Разделить — разнести фото, которые по ошибке оказались вместе (например, у близнецов).", "Принять всё — подтвердить все совпадения участника сразу."] },
        ],
      },
      uz: {
        title: "Smart Match natijalarini tekshirish",
        summary: "Moslashuvlarni qabul qiling, qayta biriktiring yoki ajrating; ishonchliligi past moslashuvlar hech qachon eʼlon qilinmaydi.",
        body: [
          { type: "p", text: "Smart Match roʻyxatga olishda olingan nazorat suratini siz yuklagan suratlar bilan solishtiradi. Ishonchliligi yuqori moslashuvlar avtomatik qoʻllanadi. Chegaradan past boʻlgan hamma narsa tekshiruv navbatida kutadi va siz qabul qilmaguningizcha ota-onalarga koʻrsatilmaydi." },
          { type: "ul", items: ["Qabul qilish — moslashuvni tasdiqlash.", "Qayta biriktirish — suratni boshqa ishtirokchiga oʻtkazish.", "Ajratish — xato bilan birga qoʻshilgan suratlarni ajratish (masalan, egizaklarnikini).", "Hammasini qabul qilish — ishtirokchining barcha moslashuvlarini birdaniga tasdiqlash."] },
        ],
      },
    },
  },
  {
    slug: "price-sheets-and-packages",
    category: "store",
    updatedAt: "2026-09-21",
    copy: {
      en: {
        title: "Build a price sheet and packages",
        summary: "Set prices per product and see your profit live.",
        body: [
          { type: "p", text: "Each row shows the lab cost, your price and what you keep. If a price doesn't cover your costs, the row is flagged before you can save." },
          { type: "p", text: "Packages bundle products at one price. The Family Store shows parents how much a package saves versus buying items separately." },
        ],
      },
      ru: {
        title: "Создание прайс-листа и пакетов",
        summary: "Устанавливайте цены на товары и сразу видите свою прибыль.",
        body: [
          { type: "p", text: "В каждой строке видны стоимость лаборатории, ваша цена и то, что остаётся вам. Если цена не покрывает ваши расходы, строка будет отмечена ещё до сохранения." },
          { type: "p", text: "Пакеты объединяют несколько товаров по одной цене. Family Store показывает родителям, сколько они экономят на пакете по сравнению с покупкой товаров по отдельности." },
        ],
      },
      uz: {
        title: "Narxlar roʻyxati va toʻplamlar tuzish",
        summary: "Har bir mahsulot narxini belgilang va foydangizni darhol koʻring.",
        body: [
          { type: "p", text: "Har bir qatorda laboratoriya xarajati, sizning narxingiz va sizda qoladigan summa koʻrinadi. Agar narx xarajatlaringizni qoplamasa, qator saqlashdan oldin belgilanadi." },
          { type: "p", text: "Toʻplamlar bir nechta mahsulotni bitta narxda birlashtiradi. Family Store ota-onalarga toʻplam mahsulotlarni alohida sotib olishga nisbatan qancha tejashini koʻrsatadi." },
        ],
      },
    },
  },
  {
    slug: "photo-protection",
    category: "store",
    updatedAt: "2026-08-30",
    copy: {
      en: {
        title: "How photo protection works",
        summary: "Watermarks, identity overlays, blur on focus loss and signed links.",
        body: [
          { type: "p", text: "Originals are never publicly reachable. Parents only ever see watermarked previews served through links that expire. On top of that, you can turn on an overlay with the viewer's name, blur photos when the tab loses focus, and block long-press saving and right-click downloads." },
        ],
      },
      ru: {
        title: "Как работает защита фото",
        summary: "Водяные знаки, подпись с именем зрителя, размытие при уходе со вкладки и подписанные ссылки.",
        body: [
          { type: "p", text: "Оригиналы никогда не доступны публично. Родители видят только превью с водяным знаком, которые открываются по ссылкам с ограниченным сроком действия. Вдобавок можно включить подпись с именем зрителя, размытие фото, когда вкладка теряет фокус, и запрет на сохранение долгим нажатием и скачивание через правый клик." },
        ],
      },
      uz: {
        title: "Suratlarni himoya qilish qanday ishlaydi",
        summary: "Suv belgilari, tomoshabin ismi yozilgan qatlam, boshqa oynaga oʻtganda xiralashtirish va imzolangan havolalar.",
        body: [
          { type: "p", text: "Asl suratlar hech qachon ochiq kirishda boʻlmaydi. Ota-onalar faqat amal qilish muddati cheklangan havolalar orqali ochiladigan, suv belgisi qoʻyilgan oldindan koʻrish suratlarini koʻradi. Bundan tashqari, tomoshabin ismi yozilgan qatlamni, oyna faolligini yoʻqotganda suratlarni xiralashtirishni hamda uzoq bosib saqlash va sichqonchaning oʻng tugmasi orqali yuklab olishni bloklashni yoqishingiz mumkin." },
        ],
      },
    },
  },
  {
    slug: "payouts",
    category: "payments",
    updatedAt: "2026-10-02",
    copy: {
      en: {
        title: "Payouts and when you get paid",
        summary: "Payouts arrive on the schedule you choose. Partner terms are agreed with each studio.",
        body: [
          { type: "p", text: "Partner terms are agreed with each studio individually when we set up your account. Contact us and we'll walk you through partner terms. Sales tax is collected and remitted for you." },
          { type: "p", text: "Payouts arrive on the schedule you choose in Stripe — daily, weekly or monthly. You can see every upcoming payout in Reports." },
        ],
      },
      ru: {
        title: "Выплаты и когда вы получаете деньги",
        summary: "Выплаты приходят по выбранному вами графику. Условия партнёрства согласуются с каждой студией.",
        body: [
          { type: "p", text: "Условия партнёрства мы согласуем с каждой студией индивидуально, когда создаём аккаунт. Свяжитесь с нами — расскажем об условиях партнёрства. Налог с продаж собирается и перечисляется за вас." },
          { type: "p", text: "Выплаты приходят по графику, который вы выбрали в Stripe: ежедневно, еженедельно или ежемесячно. Все предстоящие выплаты видны в разделе «Отчёты»." },
        ],
      },
      uz: {
        title: "Toʻlovlar va pulni qachon olasiz",
        summary: "Toʻlovlar siz tanlagan jadval boʻyicha tushadi. Hamkorlik shartlari har bir studiya bilan alohida kelishiladi.",
        body: [
          { type: "p", text: "Hamkorlik shartlarini hisobingizni yaratayotganda har bir studiya bilan alohida kelishamiz. Biz bilan bogʻlaning — hamkorlik shartlari haqida aytib beramiz. Savdo soligʻi siz uchun yigʻiladi va davlatga oʻtkaziladi." },
          { type: "p", text: "Toʻlovlar Stripe hisobingizda tanlagan jadval boʻyicha tushadi: har kuni, har hafta yoki har oy. Barcha kelgusi toʻlovlarni «Hisobotlar» boʻlimida koʻrishingiz mumkin." },
        ],
      },
    },
  },
  {
    slug: "refunds-and-reprints",
    category: "payments",
    updatedAt: "2026-09-14",
    copy: {
      en: {
        title: "Issue a refund or reprint",
        summary: "Full or partial refunds and lab reprints from the order page.",
        body: [
          { type: "p", text: "Open the order, choose Refund and enter an amount (or the full order). Refunds go back to the parent's original payment method. For damaged prints, choose Reprint, pick the items and a reason; the request goes straight to the lab." },
        ],
      },
      ru: {
        title: "Возврат или перепечатка",
        summary: "Полный или частичный возврат и перепечатка в лаборатории прямо со страницы заказа.",
        body: [
          { type: "p", text: "Откройте заказ, выберите «Возврат» и укажите сумму (или весь заказ). Деньги возвращаются тем же способом, которым платил родитель. Для повреждённых отпечатков выберите «Перепечатка», отметьте товары и укажите причину — запрос сразу уйдёт в лабораторию." },
        ],
      },
      uz: {
        title: "Pulni qaytarish yoki qayta chop etish",
        summary: "Buyurtma sahifasidan toʻliq yoki qisman pulni qaytarish va laboratoriyada qayta chop etish.",
        body: [
          { type: "p", text: "Buyurtmani oching, «Pulni qaytarish» tugmasini tanlang va summani kiriting (yoki butun buyurtmani tanlang). Pul ota-ona toʻlagan usul orqali qaytariladi. Shikastlangan bosma suratlar uchun «Qayta chop etish» tugmasini tanlang, mahsulotlarni belgilang va sababini koʻrsating — soʻrov darhol laboratoriyaga yuboriladi." },
        ],
      },
    },
  },
  {
    slug: "find-my-photos-code",
    category: "parents",
    updatedAt: "2026-10-10",
    copy: {
      en: {
        title: "I can't find my photos — what code do I need?",
        summary: "Where to find your access code and what to do if it doesn't work.",
        body: [
          { type: "p", text: "Your photographer sends a text or email with a link when photos are ready. Tapping the link opens the album directly. If you have a paper card or flyer instead, enter the 6-character code on the Find my photos page." },
          { type: "ul", items: ["Codes aren't case-sensitive, and generated codes never use look-alike characters such as 0 and O or 1 and I.", "If the album isn't published yet, you'll see the date and can ask to be notified.", "If ordering has closed, contact the studio shown on the page."] },
        ],
      },
      ru: {
        title: "Не могу найти фото — какой код нужен?",
        summary: "Где найти код доступа и что делать, если он не работает.",
        body: [
          { type: "p", text: "Когда фото готовы, фотограф присылает SMS или письмо со ссылкой. Нажмите на ссылку — альбом откроется сразу. Если у вас бумажная карточка или листовка, введите код из 6 символов на странице «Найти мои фото»." },
          { type: "ul", items: ["Регистр букв в кодах не важен, а в созданных кодах никогда не встречаются похожие символы, например 0 и O или 1 и I.", "Если альбом ещё не опубликован, вы увидите дату и сможете попросить уведомить вас.", "Если приём заказов закрыт, свяжитесь со студией, указанной на странице."] },
        ],
      },
      uz: {
        title: "Suratlarimni topa olmayapman — qaysi kod kerak?",
        summary: "Kirish kodini qayerdan topish va u ishlamasa nima qilish kerak.",
        body: [
          { type: "p", text: "Suratlar tayyor boʻlganda fotograf havola bilan SMS yoki xat yuboradi. Havolani bossangiz, albom darhol ochiladi. Agar sizda qogʻoz kartochka yoki varaqa boʻlsa, «Suratlarimni topish» sahifasida 6 belgidan iborat kodni kiriting." },
          { type: "ul", items: ["Kodlarda katta-kichik harf farqi yoʻq, yaratilgan kodlarda esa 0 va O yoki 1 va I kabi oʻxshash belgilar hech qachon ishlatilmaydi.", "Agar albom hali eʼlon qilinmagan boʻlsa, sanani koʻrasiz va sizni xabardor qilishni soʻrashingiz mumkin.", "Agar buyurtma qabul qilish yopilgan boʻlsa, sahifada koʻrsatilgan studiyaga murojaat qiling."] },
        ],
      },
    },
  },
  {
    slug: "change-or-cancel-order",
    category: "parents",
    updatedAt: "2026-09-05",
    copy: {
      en: {
        title: "Changing or cancelling an order",
        summary: "What you can change after paying, and who to contact.",
        body: [
          { type: "p", text: "Orders go to the lab quickly, so changes are only possible for a short time. Contact the studio shown on your order confirmation — they can refund or adjust the order from their dashboard. Digital downloads are available immediately from your order page." },
        ],
      },
      ru: {
        title: "Изменение или отмена заказа",
        summary: "Что можно изменить после оплаты и к кому обращаться.",
        body: [
          { type: "p", text: "Заказы быстро уходят в лабораторию, поэтому изменить их можно лишь в течение короткого времени. Свяжитесь со студией, указанной в подтверждении заказа, — она может оформить возврат или изменить заказ в своём кабинете. Цифровые файлы доступны для скачивания сразу на странице заказа." },
        ],
      },
      uz: {
        title: "Buyurtmani oʻzgartirish yoki bekor qilish",
        summary: "Toʻlovdan keyin nimani oʻzgartirish mumkin va kimga murojaat qilish kerak.",
        body: [
          { type: "p", text: "Buyurtmalar laboratoriyaga tez yuboriladi, shuning uchun ularni faqat qisqa vaqt ichida oʻzgartirish mumkin. Buyurtma tasdigʻida koʻrsatilgan studiyaga murojaat qiling — u oʻz kabinetidan pulni qaytarishi yoki buyurtmani oʻzgartirishi mumkin. Raqamli fayllarni buyurtma sahifasidan darhol yuklab olishingiz mumkin." },
        ],
      },
    },
  },
];
