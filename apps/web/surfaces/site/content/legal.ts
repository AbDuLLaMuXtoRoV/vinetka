import type { Locale } from "@snapbell/sdk";

export type LegalKey = "terms" | "terms-parents" | "privacy" | "biometrics" | "cookies" | "data-request";

/** A legal document as the template renders it, in one language. */
export interface LegalDoc {
  key: LegalKey;
  title: string;
  description: string;
  updatedAt: string;
  intro: string;
  sections: Array<{ heading: string; paragraphs: string[] }>;
}

export type LegalCopy = Pick<LegalDoc, "title" | "description" | "intro" | "sections">;

export interface LegalSource {
  updatedAt: string;
  copy: Record<Locale, LegalCopy>;
}

/**
 * DRAFT legal content. Every document, in every language, must be reviewed and
 * replaced by counsel before launch (QA checklist: "Terms, parent terms, privacy,
 * biometrics and cookie pages reviewed by a lawyer"). Kept here as structured
 * content so the CMS adapter can swap it for Sanity documents without touching
 * the template.
 */
export const legalSources: Record<LegalKey, LegalSource> = {
  terms: {
    updatedAt: "2026-10-15",
    copy: {
      en: {
        title: "Studio Terms of Service",
        description: "The agreement between Snapbell and photography studios using the platform.",
        intro: "These terms describe how studios may use Snapbell to run picture days, sell photos and receive payouts.",
        sections: [
          { heading: "1. Accounts", paragraphs: ["You must provide accurate business information and keep your login credentials secure. The account owner is responsible for activity by team members they invite."] },
          { heading: "2. Fees", paragraphs: ["Snapbell charges no monthly fee. A platform fee of 8% applies to the first $250,000 of a studio's sales in a calendar year and 6% to sales above that amount. Card processing fees are passed through at cost.", "Fees are deducted from each order before payout. Sales tax collected on your behalf is remitted as required by law."] },
          { heading: "3. Your content", paragraphs: ["You keep all rights to your photos. You grant Snapbell a limited licence to store, process, watermark and display them solely to provide the service."] },
          { heading: "4. Consent and minors", paragraphs: ["You are responsible for having the right to photograph subjects and for obtaining any consents required by schools, leagues or parents. Biometric matching may only be used where permitted and with the consents described in our Biometrics Policy."] },
          { heading: "5. Termination", paragraphs: ["You may close your account at any time. We may suspend accounts that break these terms. Data export is available for 30 days after closure."] },
        ],
      },
      ru: {
        title: "Условия обслуживания для студий",
        description: "Соглашение между Snapbell и фотостудиями, использующими платформу.",
        intro: "Настоящие условия определяют, как студии могут использовать Snapbell для проведения дней съёмки, продажи фотографий и получения выплат.",
        sections: [
          { heading: "1. Учётные записи", paragraphs: ["Вы обязаны предоставлять достоверные сведения о своей деятельности и обеспечивать сохранность данных для входа. Владелец учётной записи несёт ответственность за действия приглашённых им сотрудников."] },
          { heading: "2. Комиссии", paragraphs: ["Snapbell не взимает абонентскую плату. Комиссия платформы составляет 8% с первых 250 000 долларов США продаж студии за календарный год и 6% с продаж сверх этой суммы. Расходы на обработку платежей по картам передаются по себестоимости.", "Комиссии удерживаются из каждого заказа до выплаты. Налог с продаж, собранный от вашего имени, перечисляется в соответствии с требованиями законодательства."] },
          { heading: "3. Ваш контент", paragraphs: ["Все права на фотографии сохраняются за вами. Вы предоставляете Snapbell ограниченную лицензию на хранение, обработку, нанесение водяных знаков и показ фотографий исключительно в целях предоставления сервиса."] },
          { heading: "4. Согласие и несовершеннолетние", paragraphs: ["Вы несёте ответственность за наличие права фотографировать участников и за получение всех согласий, требуемых школами, лигами или родителями. Биометрическое сопоставление может использоваться только там, где это разрешено, и при наличии согласий, описанных в нашей Политике в отношении биометрических данных."] },
          { heading: "5. Прекращение действия", paragraphs: ["Вы можете закрыть учётную запись в любое время. Мы вправе приостановить учётные записи, нарушающие настоящие условия. Экспорт данных доступен в течение 30 дней после закрытия учётной записи."] },
        ],
      },
      uz: {
        title: "Studiyalar uchun xizmat koʻrsatish shartlari",
        description: "Snapbell va platformadan foydalanuvchi fotostudiyalar oʻrtasidagi kelishuv.",
        intro: "Ushbu shartlar studiyalarning suratga olish kunlarini oʻtkazish, suratlarni sotish va toʻlovlarni olish uchun Snapbell platformasidan qanday foydalanishi mumkinligini belgilaydi.",
        sections: [
          { heading: "1. Hisoblar", paragraphs: ["Siz faoliyatingiz haqida aniq maʼlumot taqdim etishingiz va tizimga kirish maʼlumotlaringiz xavfsizligini taʼminlashingiz shart. Hisob egasi oʻzi taklif qilgan jamoa aʼzolarining harakatlari uchun javobgar hisoblanadi."] },
          { heading: "2. Komissiyalar", paragraphs: ["Snapbell oylik toʻlov olmaydi. Platforma komissiyasi studiyaning kalendar yilidagi dastlabki 250 000 AQSH dollarlik savdosiga 8% va ushbu summadan ortiq savdoga 6% miqdorida qoʻllanadi. Karta orqali toʻlovlarni qayta ishlash xarajatlari tannarxda oʻtkaziladi.", "Komissiyalar toʻlovdan oldin har bir buyurtmadan ushlab qolinadi. Sizning nomingizdan yigʻilgan savdo soligʻi qonun talablariga muvofiq davlatga oʻtkaziladi."] },
          { heading: "3. Sizning kontentingiz", paragraphs: ["Suratlaringizga boʻlgan barcha huquqlar sizda qoladi. Siz Snapbell kompaniyasiga suratlarni faqat xizmat koʻrsatish maqsadida saqlash, qayta ishlash, ularga suv belgisi qoʻyish va namoyish etish uchun cheklangan litsenziya berasiz."] },
          { heading: "4. Rozilik va voyaga yetmaganlar", paragraphs: ["Ishtirokchilarni suratga olish huquqiga ega boʻlish hamda maktablar, ligalar yoki ota-onalar talab qiladigan barcha roziliklarni olish uchun siz javobgarsiz. Biometrik moslashtirishdan faqat ruxsat etilgan hollarda va Biometrik maʼlumotlar siyosatimizda koʻrsatilgan roziliklar mavjud boʻlganda foydalanish mumkin."] },
          { heading: "5. Amal qilishni tugatish", paragraphs: ["Hisobingizni istalgan vaqtda yopishingiz mumkin. Ushbu shartlarni buzgan hisoblarni toʻxtatib qoʻyishga haqlimiz. Maʼlumotlarni eksport qilish hisob yopilganidan keyin 30 kun davomida mavjud boʻladi."] },
        ],
      },
    },
  },
  "terms-parents": {
    updatedAt: "2026-10-15",
    copy: {
      en: {
        title: "Parent & Family Terms",
        description: "Terms for parents and families viewing and buying photos in the Family Store.",
        intro: "These terms apply when you view an album or place an order in a studio's Family Store powered by Snapbell.",
        sections: [
          { heading: "1. Who you're buying from", paragraphs: ["Orders are placed with the photography studio shown in the store. Snapbell provides the technology and processes payment on the studio's behalf."] },
          { heading: "2. Access to albums", paragraphs: ["Albums are private. Access codes and links are for your family only. Please don't share them publicly."] },
          { heading: "3. Orders, refunds and reprints", paragraphs: ["Printed products are made to order. Refunds and reprints are handled by the studio; contact details appear on your order confirmation."] },
          { heading: "4. Photo use", paragraphs: ["Purchased digital downloads may be used for personal, non-commercial purposes. Preview images remain the property of the studio."] },
        ],
      },
      ru: {
        title: "Условия для родителей и семей",
        description: "Условия для родителей и семей, которые просматривают и покупают фотографии в Family Store.",
        intro: "Настоящие условия применяются, когда вы просматриваете альбом или оформляете заказ в Family Store студии, работающем на платформе Snapbell.",
        sections: [
          { heading: "1. У кого вы покупаете", paragraphs: ["Заказы оформляются у фотостудии, указанной в магазине. Snapbell предоставляет технологию и обрабатывает платежи от имени студии."] },
          { heading: "2. Доступ к альбомам", paragraphs: ["Альбомы являются закрытыми. Коды доступа и ссылки предназначены только для вашей семьи. Пожалуйста, не публикуйте их в открытом доступе."] },
          { heading: "3. Заказы, возвраты и перепечатка", paragraphs: ["Печатная продукция изготавливается под заказ. Возвраты и перепечатку осуществляет студия; её контактные данные указаны в подтверждении заказа."] },
          { heading: "4. Использование фотографий", paragraphs: ["Приобретённые цифровые файлы могут использоваться в личных некоммерческих целях. Изображения для предварительного просмотра остаются собственностью студии."] },
        ],
      },
      uz: {
        title: "Ota-onalar va oilalar uchun shartlar",
        description: "Family Store doʻkonida suratlarni koʻradigan va sotib oladigan ota-onalar va oilalar uchun shartlar.",
        intro: "Ushbu shartlar Snapbell platformasida ishlaydigan studiyaning Family Store doʻkonida albomni koʻrganingizda yoki buyurtma berganingizda qoʻllanadi.",
        sections: [
          { heading: "1. Kimdan xarid qilasiz", paragraphs: ["Buyurtmalar doʻkonda koʻrsatilgan fotostudiyaga beriladi. Snapbell texnologiyani taqdim etadi va studiya nomidan toʻlovlarni qayta ishlaydi."] },
          { heading: "2. Albomlarga kirish", paragraphs: ["Albomlar yopiq. Kirish kodlari va havolalar faqat oilangiz uchun moʻljallangan. Iltimos, ularni ommaga ochiq joylarda tarqatmang."] },
          { heading: "3. Buyurtmalar, pulni qaytarish va qayta chop etish", paragraphs: ["Bosma mahsulotlar buyurtma asosida tayyorlanadi. Pulni qaytarish va qayta chop etish masalalarini studiya hal qiladi; uning aloqa maʼlumotlari buyurtma tasdigʻida koʻrsatilgan."] },
          { heading: "4. Suratlardan foydalanish", paragraphs: ["Sotib olingan raqamli fayllardan shaxsiy, notijorat maqsadlarda foydalanish mumkin. Oldindan koʻrish uchun moʻljallangan tasvirlar studiyaning mulki boʻlib qoladi."] },
        ],
      },
    },
  },
  privacy: {
    updatedAt: "2026-10-15",
    copy: {
      en: {
        title: "Privacy Policy",
        description: "What data Snapbell collects, why, and the choices you have.",
        intro: "We collect only what we need to run picture days and deliver orders, and we never sell personal information.",
        sections: [
          { heading: "Information we collect", paragraphs: ["Studios provide rosters (names, grades or teams) and photos. Parents provide contact details, delivery addresses and order information. We collect basic device and usage data to keep the service secure."] },
          { heading: "How we use it", paragraphs: ["To show each family the right photos, process payments, send order and gallery messages you've agreed to, and prevent fraud."] },
          { heading: "Children's information", paragraphs: ["Information about children is provided by studios acting for schools and organisations. We process it only to provide the service and support COPPA and GDPR requests for access and deletion."] },
          { heading: "Your choices", paragraphs: ["You can opt out of texts by replying STOP, unsubscribe from emails at any time, and request a copy or deletion of your data from your account or our data request page."] },
        ],
      },
      ru: {
        title: "Политика конфиденциальности",
        description: "Какие данные собирает Snapbell, зачем и какой у вас есть выбор.",
        intro: "Мы собираем только то, что необходимо для проведения дней съёмки и доставки заказов, и никогда не продаём персональные данные.",
        sections: [
          { heading: "Какую информацию мы собираем", paragraphs: ["Студии предоставляют списки участников (имена, классы или команды) и фотографии. Родители предоставляют контактные данные, адреса доставки и сведения о заказах. Мы собираем базовые данные об устройстве и об использовании сервиса, чтобы обеспечить его безопасность."] },
          { heading: "Как мы её используем", paragraphs: ["Чтобы показывать каждой семье нужные фотографии, обрабатывать платежи, отправлять сообщения о заказах и галереях, на получение которых вы дали согласие, а также предотвращать мошенничество."] },
          { heading: "Информация о детях", paragraphs: ["Информацию о детях предоставляют студии, действующие от имени школ и организаций. Мы обрабатываем её исключительно для предоставления сервиса и выполняем запросы на доступ к данным и их удаление в соответствии с COPPA и GDPR."] },
          { heading: "Ваш выбор", paragraphs: ["Вы можете отказаться от SMS, ответив STOP, в любой момент отписаться от писем, а также запросить копию своих данных или их удаление в своей учётной записи или на нашей странице запроса данных."] },
        ],
      },
      uz: {
        title: "Maxfiylik siyosati",
        description: "Snapbell qanday maʼlumotlarni toʻplaydi, nima uchun va sizda qanday tanlov bor.",
        intro: "Biz faqat suratga olish kunlarini oʻtkazish va buyurtmalarni yetkazib berish uchun zarur boʻlgan maʼlumotlarni toʻplaymiz va shaxsga doir maʼlumotlarni hech qachon sotmaymiz.",
        sections: [
          { heading: "Biz toʻplaydigan maʼlumotlar", paragraphs: ["Studiyalar ishtirokchilar roʻyxatini (ismlar, sinflar yoki jamoalar) va suratlarni taqdim etadi. Ota-onalar aloqa maʼlumotlari, yetkazib berish manzillari va buyurtma maʼlumotlarini taqdim etadi. Xizmat xavfsizligini taʼminlash uchun qurilma va xizmatdan foydalanish haqidagi asosiy maʼlumotlarni toʻplaymiz."] },
          { heading: "Ulardan qanday foydalanamiz", paragraphs: ["Har bir oilaga kerakli suratlarni koʻrsatish, toʻlovlarni qayta ishlash, siz rozilik bergan buyurtma va galereya xabarlarini yuborish hamda firibgarlikning oldini olish uchun."] },
          { heading: "Bolalar haqidagi maʼlumotlar", paragraphs: ["Bolalar haqidagi maʼlumotlarni maktablar va tashkilotlar nomidan ish yurituvchi studiyalar taqdim etadi. Biz ularni faqat xizmat koʻrsatish uchun qayta ishlaymiz va COPPA hamda GDPR talablariga muvofiq maʼlumotlarga kirish va ularni oʻchirish boʻyicha soʻrovlarni bajaramiz."] },
          { heading: "Sizning tanlovingiz", paragraphs: ["STOP deb javob berib SMS xabarlardan voz kechishingiz, istalgan vaqtda elektron xatlardan obunani bekor qilishingiz hamda hisobingizda yoki maʼlumotlar soʻrovi sahifamizda maʼlumotlaringiz nusxasini yoki ularni oʻchirishni soʻrashingiz mumkin."] },
        ],
      },
    },
  },
  biometrics: {
    updatedAt: "2026-10-15",
    copy: {
      en: {
        title: "Biometric Information Policy",
        description: "How face matching and selfie search work, and how long face data is kept.",
        intro: "Snapbell uses face matching to sort photos to the right child and to power optional selfie search. This policy explains what that means.",
        sections: [
          { heading: "What we process", paragraphs: ["Mathematical representations (embeddings) of faces detected in photos and in reference photos taken at check-in. We do not use face data for identification outside the photo job it belongs to."] },
          { heading: "Selfie search consent", paragraphs: ["Before a parent uses Find Me, we show a consent screen. The selfie is used once to search the album and is deleted immediately afterwards."] },
          { heading: "Retention", paragraphs: ["Face data for a job is deleted automatically when the job's season ends, and in any case no later than 12 months after picture day."] },
          { heading: "Disclosure", paragraphs: ["Face data is never sold, leased or traded. It is processed by our infrastructure providers under contract and only to deliver the service."] },
        ],
      },
      ru: {
        title: "Политика в отношении биометрических данных",
        description: "Как работают сопоставление лиц и поиск по селфи и сколько хранятся данные о лицах.",
        intro: "Snapbell использует сопоставление лиц, чтобы распределять фотографии по детям и обеспечивать работу необязательного поиска по селфи. В настоящей политике объясняется, что это означает.",
        sections: [
          { heading: "Что мы обрабатываем", paragraphs: ["Математические представления (векторные описания) лиц, обнаруженных на фотографиях и на контрольных снимках, сделанных при регистрации. Мы не используем данные о лицах для идентификации за пределами съёмки, к которой они относятся."] },
          { heading: "Согласие на поиск по селфи", paragraphs: ["Прежде чем родитель воспользуется поиском по селфи, мы показываем экран согласия. Селфи используется один раз для поиска по альбому и сразу после этого удаляется."] },
          { heading: "Срок хранения", paragraphs: ["Данные о лицах, относящиеся к съёмке, удаляются автоматически по окончании её сезона и в любом случае не позднее чем через 12 месяцев после дня съёмки."] },
          { heading: "Раскрытие", paragraphs: ["Данные о лицах никогда не продаются, не сдаются в аренду и не передаются в обмен на что-либо. Их обрабатывают наши поставщики инфраструктуры на основании договора и исключительно для предоставления сервиса."] },
        ],
      },
      uz: {
        title: "Biometrik maʼlumotlar siyosati",
        description: "Yuzlarni moslashtirish va selfi orqali qidirish qanday ishlaydi hamda yuz maʼlumotlari qancha muddat saqlanadi.",
        intro: "Snapbell suratlarni tegishli farzandga ajratish va ixtiyoriy selfi orqali qidirish funksiyasini taʼminlash uchun yuzlarni moslashtirishdan foydalanadi. Ushbu siyosat buning nimani anglatishini tushuntiradi.",
        sections: [
          { heading: "Nimalarni qayta ishlaymiz", paragraphs: ["Suratlarda va roʻyxatga olishda olingan nazorat suratlarida aniqlangan yuzlarning matematik ifodalari (vektor tavsiflari). Biz yuz maʼlumotlaridan ular tegishli boʻlgan suratga olishdan tashqarida shaxsni aniqlash uchun foydalanmaymiz."] },
          { heading: "Selfi orqali qidirishga rozilik", paragraphs: ["Ota-ona selfi orqali qidirishdan foydalanishidan oldin biz rozilik oynasini koʻrsatamiz. Selfi albomdan qidirish uchun bir marta ishlatiladi va shundan soʻng darhol oʻchiriladi."] },
          { heading: "Saqlash muddati", paragraphs: ["Suratga olishga tegishli yuz maʼlumotlari uning mavsumi tugaganda avtomatik ravishda oʻchiriladi va har qanday holatda ham suratga olish kunidan keyin 12 oydan kechiktirmay oʻchiriladi."] },
          { heading: "Oshkor qilish", paragraphs: ["Yuz maʼlumotlari hech qachon sotilmaydi, ijaraga berilmaydi va ayirboshlanmaydi. Ular shartnoma asosida va faqat xizmat koʻrsatish maqsadida infratuzilma provayderlarimiz tomonidan qayta ishlanadi."] },
        ],
      },
    },
  },
  cookies: {
    updatedAt: "2026-10-15",
    copy: {
      en: {
        title: "Cookie Policy",
        description: "The cookies and similar technologies used on Snapbell sites.",
        intro: "We use a small number of cookies to keep you signed in, remember your cart and understand how our website is used.",
        sections: [
          { heading: "Essential cookies", paragraphs: ["Session and cart cookies that make the Family Store and Studio app work. These can't be switched off."] },
          { heading: "Analytics", paragraphs: ["Privacy-friendly analytics on snapbell.com to count visits and see which pages help studios. The Family Store and Studio app are not indexed by search engines."] },
          { heading: "Managing cookies", paragraphs: ["You can clear or block cookies in your browser settings. Blocking essential cookies will stop the store from working."] },
        ],
      },
      ru: {
        title: "Политика использования файлов cookie",
        description: "Файлы cookie и аналогичные технологии, используемые на сайтах Snapbell.",
        intro: "Мы используем небольшое количество файлов cookie, чтобы вы оставались в системе, ваша корзина сохранялась, а мы понимали, как используется наш сайт.",
        sections: [
          { heading: "Необходимые файлы cookie", paragraphs: ["Файлы cookie сеанса и корзины, без которых не работают Family Store и приложение Studio. Их нельзя отключить."] },
          { heading: "Аналитика", paragraphs: ["Аналитика на snapbell.com, бережно относящаяся к конфиденциальности: она считает посещения и показывает, какие страницы полезны студиям. Family Store и приложение Studio не индексируются поисковыми системами."] },
          { heading: "Управление файлами cookie", paragraphs: ["Вы можете удалить или заблокировать файлы cookie в настройках браузера. Если заблокировать необходимые файлы cookie, магазин перестанет работать."] },
        ],
      },
      uz: {
        title: "Cookie fayllaridan foydalanish siyosati",
        description: "Snapbell saytlarida ishlatiladigan cookie fayllari va shunga oʻxshash texnologiyalar.",
        intro: "Tizimda qolishingiz, savatingiz saqlanishi va saytimizdan qanday foydalanilishini tushunishimiz uchun oz miqdordagi cookie fayllaridan foydalanamiz.",
        sections: [
          { heading: "Zarur cookie fayllari", paragraphs: ["Family Store va Studio ilovasi ishlashi uchun zarur boʻlgan seans va savat cookie fayllari. Ularni oʻchirib boʻlmaydi."] },
          { heading: "Analitika", paragraphs: ["Tashriflarni hisoblash va qaysi sahifalar studiyalarga foydali ekanini koʻrish uchun snapbell.com saytida maxfiylikni hurmat qiladigan analitika. Family Store va Studio ilovasi qidiruv tizimlari tomonidan indekslanmaydi."] },
          { heading: "Cookie fayllarini boshqarish", paragraphs: ["Brauzeringiz sozlamalarida cookie fayllarini tozalashingiz yoki bloklashingiz mumkin. Zarur cookie fayllari bloklansa, doʻkon ishlamay qoladi."] },
        ],
      },
    },
  },
  "data-request": {
    updatedAt: "2026-10-15",
    copy: {
      en: {
        title: "Data Requests",
        description: "Ask for a copy of your data or ask us to delete it.",
        intro: "Parents, guardians and studio users can request access to or deletion of their personal information. We respond within 30 days.",
        sections: [
          { heading: "What you can request", paragraphs: ["A copy of the personal information we hold about you or your child, correction of inaccurate information, or deletion of your account and associated data."] },
          { heading: "Verification", paragraphs: ["To protect your family, we verify requests by sending a one-time code to the phone number or email address on file."] },
        ],
      },
      ru: {
        title: "Запросы о данных",
        description: "Запросите копию своих данных или их удаление.",
        intro: "Родители, опекуны и пользователи студий могут запросить доступ к своим персональным данным или их удаление. Мы отвечаем в течение 30 дней.",
        sections: [
          { heading: "Что можно запросить", paragraphs: ["Копию персональных данных, которые мы храним о вас или вашем ребёнке, исправление неточных сведений или удаление вашей учётной записи и связанных с ней данных."] },
          { heading: "Подтверждение", paragraphs: ["Чтобы защитить вашу семью, мы подтверждаем запросы, отправляя одноразовый код на номер телефона или адрес электронной почты, указанный в учётной записи."] },
        ],
      },
      uz: {
        title: "Maʼlumotlar boʻyicha soʻrovlar",
        description: "Maʼlumotlaringiz nusxasini yoki ularni oʻchirishni soʻrang.",
        intro: "Ota-onalar, vasiylar va studiya foydalanuvchilari oʻz shaxsga doir maʼlumotlariga kirishni yoki ularni oʻchirishni soʻrashi mumkin. Biz 30 kun ichida javob beramiz.",
        sections: [
          { heading: "Nimalarni soʻrash mumkin", paragraphs: ["Siz yoki farzandingiz haqida biz saqlayotgan shaxsga doir maʼlumotlar nusxasini, notoʻgʻri maʼlumotlarni tuzatishni yoki hisobingiz va unga bogʻliq maʼlumotlarni oʻchirishni."] },
          { heading: "Tasdiqlash", paragraphs: ["Oilangizni himoya qilish uchun soʻrovlarni hisobingizda koʻrsatilgan telefon raqami yoki elektron pochta manziliga bir martalik kod yuborish orqali tasdiqlaymiz."] },
        ],
      },
    },
  },
};
