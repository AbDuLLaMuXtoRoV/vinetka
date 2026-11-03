import type { Locale } from "@snapbell/sdk";

export type BlogCategory = "sales-tips" | "picture-day" | "product-updates";

export const BLOG_CATEGORY_IDS: readonly BlogCategory[] = ["sales-tips", "picture-day", "product-updates"];

export const blogCategoryLabels: Record<Locale, Record<BlogCategory, string>> = {
  en: { "sales-tips": "Sales tips", "picture-day": "Picture day", "product-updates": "Product updates" },
  ru: { "sales-tips": "Советы по продажам", "picture-day": "День съёмки", "product-updates": "Обновления продукта" },
  uz: { "sales-tips": "Savdo boʻyicha maslahatlar", "picture-day": "Suratga olish kuni", "product-updates": "Mahsulot yangiliklari" },
};

export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "quote"; text: string };

/** A post as the pages render it, in one language. */
export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  author: { name: string; role: string };
  publishedAt: string;
  body: Block[];
}

/** Everything a reader sees in one language. */
export interface BlogCopy {
  title: string;
  excerpt: string;
  authorRole: string;
  body: Block[];
}

/** Language-independent fields plus one copy per locale (a missing locale fails typecheck). */
export interface BlogSource {
  slug: string;
  category: BlogCategory;
  author: string;
  publishedAt: string;
  copy: Record<Locale, BlogCopy>;
}

const ROLE = {
  success: { en: "Customer Success Lead", ru: "Руководитель отдела по работе с клиентами", uz: "Mijozlar bilan ishlash boʻlimi rahbari" },
  product: { en: "Head of Product", ru: "Руководитель продукта", uz: "Mahsulot boʻyicha rahbar" },
  founder: { en: "Co-founder", ru: "Сооснователь", uz: "Hammuassis" },
} satisfies Record<string, Record<Locale, string>>;

export const blogSources: BlogSource[] = [
  {
    slug: "lift-average-order-without-discounting",
    category: "sales-tips",
    author: "Luis Ferreira",
    publishedAt: "2026-10-08",
    copy: {
      en: {
        title: "Five ways to lift your average order without discounting",
        excerpt: "Discounts train parents to wait. These five store changes raise order values while keeping your prices where they belong.",
        authorRole: ROLE.success.en,
        body: [
          { type: "p", text: "Most studios reach for a promo code the moment sales feel slow. It works once, and then parents learn to wait for the next one. The better lever is the store itself: what families see first, how easy it is to say yes, and how the price is framed." },
          { type: "h2", text: "1. Lead with a bundle built from their favorites" },
          { type: "p", text: "When a parent hearts three photos, the first thing in the shop should be a package that already uses those three. Snapbell's suggested bundle does this automatically. Studios that turn it on see parents start from a $59 package instead of a single $22 print." },
          { type: "h2", text: "2. Show the savings, not the discount" },
          { type: "p", text: "A package that costs $69 and contains $93 of products is a better story than '25% off'. Display the value next to the price and let the math do the selling." },
          { type: "h2", text: "3. Put the digital file inside the middle package" },
          { type: "p", text: "Parents want the file for sharing. Including it in your middle package — not just the top one — moves a large share of buyers up one tier." },
          { type: "h2", text: "4. Keep the deadline visible" },
          { type: "p", text: "A countdown in the album header ('6 days left') does more than any reminder email. It is honest urgency, because the deadline is real: you need to batch the lab order." },
          { type: "h2", text: "5. Make siblings one checkout" },
          { type: "ul", items: ["Group the cart by child so parents can check what they picked for each.", "Charge shipping once per family, not once per album.", "Remind parents in the cart that a sibling's album is waiting."] },
          { type: "p", text: "None of these require a sale. They just remove friction between a parent who loves a photo and a parent who owns it." },
        ],
      },
      ru: {
        title: "Пять способов увеличить средний чек без скидок",
        excerpt: "Скидки приучают родителей ждать. Эти пять изменений в магазине повышают сумму заказа, а ваши цены остаются на своём месте.",
        authorRole: ROLE.success.ru,
        body: [
          { type: "p", text: "Большинство студий хватаются за промокод, как только продажи замедляются. Это срабатывает один раз — а потом родители учатся ждать следующего. Лучший рычаг — сам магазин: что семья видит первым, насколько легко сказать «да» и как подана цена." },
          { type: "h2", text: "1. Начинайте с пакета из избранных фото" },
          { type: "p", text: "Когда родитель отмечает сердечком три фотографии, первым в магазине должен быть пакет, в который уже входят именно они. Предлагаемый пакет в Snapbell собирается автоматически. Студии, которые его включают, видят, что родители начинают с пакета за 59 $, а не с одного отпечатка за 22 $." },
          { type: "h2", text: "2. Показывайте выгоду, а не скидку" },
          { type: "p", text: "Пакет за 69 $, в котором товаров на 93 $, — история получше, чем «скидка 25%». Покажите стоимость рядом с ценой, и арифметика продаст сама." },
          { type: "h2", text: "3. Добавьте цифровой файл в средний пакет" },
          { type: "p", text: "Родителям нужен файл, чтобы делиться фото с близкими. Если включить его в средний пакет, а не только в самый дорогой, заметная часть покупателей перейдёт на уровень выше." },
          { type: "h2", text: "4. Держите срок заказа на виду" },
          { type: "p", text: "Обратный отсчёт в шапке альбома («Осталось 6 дней») работает лучше любого письма-напоминания. Это честная срочность: срок реальный, ведь заказ в лабораторию нужно отправить одной партией." },
          { type: "h2", text: "5. Один заказ на всех детей в семье" },
          { type: "ul", items: ["Группируйте корзину по детям, чтобы родители видели, что выбрали для каждого.", "Берите плату за доставку один раз с семьи, а не за каждый альбом.", "Напоминайте в корзине, что альбом брата или сестры тоже ждёт."] },
          { type: "p", text: "Ни один из этих приёмов не требует распродажи. Они просто убирают преграды между родителем, которому понравилось фото, и родителем, у которого это фото есть." },
        ],
      },
      uz: {
        title: "Chegirmalarsiz oʻrtacha buyurtmani oshirishning beshta usuli",
        excerpt: "Chegirmalar ota-onalarni kutishga oʻrgatadi. Doʻkondagi bu beshta oʻzgarish narxlaringizni tushirmasdan buyurtma summasini oshiradi.",
        authorRole: ROLE.success.uz,
        body: [
          { type: "p", text: "Koʻpchilik studiyalar savdo sekinlashishi bilanoq promokodga yopishadi. Bu bir marta ishlaydi, keyin esa ota-onalar navbatdagisini kutishni oʻrganib oladi. Eng kuchli dastak — doʻkonning oʻzi: oila birinchi navbatda nimani koʻradi, «ha» deyish qanchalik oson va narx qanday taqdim etilgan." },
          { type: "h2", text: "1. Sevimli suratlardan tuzilgan toʻplamdan boshlang" },
          { type: "p", text: "Ota-ona uchta suratni yurakcha bilan belgilasa, doʻkonda birinchi boʻlib aynan shu suratlar kirgan toʻplam chiqishi kerak. Snapbell taklif qiladigan toʻplam buni avtomatik bajaradi. Uni yoqqan studiyalarda ota-onalar 22 dollarlik bitta bosma surat oʻrniga 59 dollarlik toʻplamdan boshlaydi." },
          { type: "h2", text: "2. Chegirmani emas, tejalgan summani koʻrsating" },
          { type: "p", text: "Narxi 69 dollar boʻlgan, ichida 93 dollarlik mahsulot bor toʻplam «25% chegirma»dan koʻra yaxshiroq hikoya. Qiymatni narx yonida koʻrsating, qolganini hisob-kitobning oʻzi sotadi." },
          { type: "h2", text: "3. Raqamli faylni oʻrta toʻplamga qoʻshing" },
          { type: "p", text: "Ota-onalarga suratni yaqinlari bilan boʻlishish uchun fayl kerak. Uni faqat eng qimmat toʻplamga emas, oʻrta toʻplamga ham qoʻshsangiz, xaridorlarning katta qismi bir pogʻona yuqoriga oʻtadi." },
          { type: "h2", text: "4. Buyurtma muddatini koʻzga tashlanadigan joyda tuting" },
          { type: "p", text: "Albom sarlavhasidagi teskari sanoq («6 kun qoldi») har qanday eslatma xatidan koʻra koʻproq foyda beradi. Bu halol shoshilinchlik, chunki muddat haqiqiy: laboratoriyaga buyurtmani bir partiyada yuborish kerak." },
          { type: "h2", text: "5. Aka-uka va opa-singillar uchun bitta buyurtma" },
          { type: "ul", items: ["Savatni farzandlar boʻyicha guruhlang, shunda ota-onalar har biri uchun nima tanlaganini koʻradi.", "Yetkazib berish haqini har bir albom uchun emas, oila uchun bir marta oling.", "Savatda aka-uka yoki opa-singilning albomi ham kutayotganini eslatib qoʻying."] },
          { type: "p", text: "Bularning hech biri chegirmali savdoni talab qilmaydi. Ular shunchaki suratni yoqtirgan ota-ona bilan suratga ega boʻlgan ota-ona oʻrtasidagi toʻsiqlarni olib tashlaydi." },
        ],
      },
    },
  },
  {
    slug: "reminder-schedule-that-works",
    category: "sales-tips",
    author: "Maya Okonkwo",
    publishedAt: "2026-09-24",
    copy: {
      en: {
        title: "The reminder schedule that actually gets parents to order",
        excerpt: "Too few reminders and families forget. Too many and they opt out. Here's the cadence we see working across hundreds of jobs.",
        authorRole: ROLE.product.en,
        body: [
          { type: "p", text: "Every message a parent receives should answer one question: why now? A reminder that says nothing new teaches people to ignore you. Here is the four-message schedule Snapbell sets up by default, and why each one exists." },
          { type: "h2", text: "Publish: the moment photos are ready" },
          { type: "p", text: "Excitement is highest the day photos go live. Send a short text with the child's name and a direct link. No login, no code to type — the link unlocks the album." },
          { type: "h2", text: "Reminder: five days before the deadline" },
          { type: "p", text: "Remind parents what they're missing, and mention school delivery if the job uses bulk shipping. That's a concrete reason to order before the cutoff." },
          { type: "h2", text: "Deadline: the day before" },
          { type: "p", text: "One sentence. 'Ordering for Fall Picture Day closes tomorrow.' Short messages here outperform long ones." },
          { type: "h2", text: "Shipped: when it's on the way" },
          { type: "p", text: "Not a sales message, but it builds the trust that makes next season's publish text get opened." },
          { type: "quote", text: "Quiet hours matter. Snapbell never sends a text between 9 pm and 8 am local time, and every message honors STOP." },
        ],
      },
      ru: {
        title: "График напоминаний, после которого родители действительно заказывают",
        excerpt: "Мало напоминаний — семьи забывают. Слишком много — отписываются. Вот ритм, который работает на сотнях съёмок.",
        authorRole: ROLE.product.ru,
        body: [
          { type: "p", text: "Каждое сообщение родителю должно отвечать на один вопрос: почему именно сейчас? Напоминание, в котором нет ничего нового, приучает людей вас игнорировать. Вот график из четырёх сообщений, который Snapbell настраивает по умолчанию, и зачем нужно каждое из них." },
          { type: "h2", text: "Публикация: в момент, когда фото готовы" },
          { type: "p", text: "Интерес выше всего в день, когда фотографии появляются. Отправьте короткое SMS с именем ребёнка и прямой ссылкой. Без входа и без ввода кода — ссылка сама открывает альбом." },
          { type: "h2", text: "Напоминание: за пять дней до окончания срока" },
          { type: "p", text: "Напомните родителям, что они могут упустить, и упомяните доставку в школу, если в съёмке используется общая отправка. Это конкретная причина заказать до окончания срока." },
          { type: "h2", text: "Срок заказа: за день до окончания" },
          { type: "p", text: "Одно предложение: «Приём заказов по осенней съёмке закрывается завтра». Короткие сообщения здесь работают лучше длинных." },
          { type: "h2", text: "Отправлено: когда заказ в пути" },
          { type: "p", text: "Это не продающее сообщение, но оно создаёт доверие — и SMS о публикации в следующем сезоне откроют." },
          { type: "quote", text: "Тихие часы важны. Snapbell никогда не отправляет SMS с 21:00 до 8:00 по местному времени, и каждое сообщение учитывает ответ STOP." },
        ],
      },
      uz: {
        title: "Ota-onalarni haqiqatan buyurtma berishga undaydigan eslatmalar jadvali",
        excerpt: "Eslatma kam boʻlsa, oilalar unutadi. Haddan tashqari koʻp boʻlsa, obunadan chiqib ketadi. Yuzlab suratga olishlarda oʻzini oqlagan maromni taqdim etamiz.",
        authorRole: ROLE.product.uz,
        body: [
          { type: "p", text: "Ota-onaga yuborilgan har bir xabar bitta savolga javob berishi kerak: nega aynan hozir? Hech qanday yangilik boʻlmagan eslatma odamlarni sizni eʼtiborsiz qoldirishga oʻrgatadi. Quyida Snapbell standart sozlaydigan toʻrt xabarli jadval va har birining vazifasi keltirilgan." },
          { type: "h2", text: "Eʼlon qilish: suratlar tayyor boʻlgan zahoti" },
          { type: "p", text: "Qiziqish suratlar chiqqan kuni eng yuqori boʻladi. Farzandning ismi va toʻgʻridan-toʻgʻri havola bilan qisqa SMS yuboring. Tizimga kirish ham, kod terish ham shart emas — havolaning oʻzi albomni ochadi." },
          { type: "h2", text: "Eslatma: muddat tugashidan besh kun oldin" },
          { type: "p", text: "Ota-onalarga nimadan quruq qolishi mumkinligini eslating va agar suratga olishda umumiy joʻnatish ishlatilsa, maktabga yetkazib berishni tilga oling. Bu muddat tugashidan oldin buyurtma berish uchun aniq sabab." },
          { type: "h2", text: "Buyurtma muddati: oxirgi kundan bir kun oldin" },
          { type: "p", text: "Bitta gap: «Kuzgi suratga olish boʻyicha buyurtmalar ertaga yopiladi». Bu yerda qisqa xabarlar uzunlaridan yaxshiroq ishlaydi." },
          { type: "h2", text: "Joʻnatildi: buyurtma yoʻlga chiqqanda" },
          { type: "p", text: "Bu sotuv xabari emas, lekin u ishonch uygʻotadi — va keyingi mavsumdagi eʼlon haqidagi SMS ochib oʻqiladi." },
          { type: "quote", text: "Sokin soatlar muhim. Snapbell mahalliy vaqt bilan soat 21:00 dan 8:00 gacha hech qachon SMS yubormaydi va har bir xabar STOP javobini hisobga oladi." },
        ],
      },
    },
  },
  {
    slug: "calmer-picture-day-check-in",
    category: "picture-day",
    author: "Hannah Weiss",
    publishedAt: "2026-09-10",
    copy: {
      en: {
        title: "A calmer picture day: our check-in checklist for 400 kids",
        excerpt: "The line moves faster when check-in is boring. A field-tested checklist for running a large school day on time.",
        authorRole: ROLE.founder.en,
        body: [
          { type: "p", text: "The hardest part of a big school day isn't the lighting. It's knowing which of the 400 faces belongs to which name, and doing it without slowing the line." },
          { type: "h2", text: "The night before" },
          { type: "ul", items: ["Import the roster and spot-check five names against the school's list.", "Download the job to every check-in phone so it works without Wi-Fi.", "Print code cards for families who asked for paper."] },
          { type: "h2", text: "At the door" },
          { type: "p", text: "Tap the student's name, take a quick reference photo with the phone, and wave them through. Smart Match uses that reference later — nobody holds a name card in front of their face." },
          { type: "h2", text: "After the last class" },
          { type: "p", text: "The phones sync once they're back online. Upload the camera cards, and matching runs while you drive home. Review only the low-confidence matches; everything else is already sorted." },
        ],
      },
      ru: {
        title: "Спокойный день съёмки: наш чек-лист регистрации на 400 детей",
        excerpt: "Очередь движется быстрее, когда регистрация скучна. Проверенный на практике чек-лист, чтобы большой школьный день прошёл вовремя.",
        authorRole: ROLE.founder.ru,
        body: [
          { type: "p", text: "Самое сложное в большом школьном дне — не свет. А понимать, какое из 400 лиц какому имени принадлежит, и при этом не тормозить очередь." },
          { type: "h2", text: "Накануне вечером" },
          { type: "ul", items: ["Импортируйте список участников и сверьте выборочно пять имён со списком школы.", "Загрузите съёмку на каждый телефон для регистрации, чтобы всё работало без Wi-Fi.", "Распечатайте карточки с кодами для семей, которые просили бумажный вариант."] },
          { type: "h2", text: "У входа" },
          { type: "p", text: "Нажмите на имя ученика, сделайте быстрое контрольное фото на телефон и пропускайте дальше. Позже Smart Match использует это фото — никому не нужно держать табличку с именем перед лицом." },
          { type: "h2", text: "После последнего класса" },
          { type: "p", text: "Телефоны синхронизируются, как только снова появится связь. Загрузите карты памяти камеры — сопоставление пройдёт, пока вы едете домой. Проверяйте только совпадения с низкой уверенностью: всё остальное уже разобрано." },
        ],
      },
      uz: {
        title: "Xotirjam suratga olish kuni: 400 nafar bola uchun roʻyxatga olish chek-listimiz",
        excerpt: "Roʻyxatga olish zerikarli boʻlsa, navbat tezroq yuradi. Katta maktab kunini oʻz vaqtida oʻtkazish uchun amalda sinalgan chek-list.",
        authorRole: ROLE.founder.uz,
        body: [
          { type: "p", text: "Katta maktab kunidagi eng qiyin narsa yorugʻlik emas. Balki 400 ta yuzning qaysi biri qaysi ismga tegishli ekanini bilish va bunda navbatni sekinlashtirmaslik." },
          { type: "h2", text: "Bir kun oldin kechqurun" },
          { type: "ul", items: ["Ishtirokchilar roʻyxatini import qiling va tanlab beshta ismni maktab roʻyxati bilan solishtirib chiqing.", "Suratga olishni roʻyxatga olish uchun ishlatiladigan har bir telefonga yuklab qoʻying, shunda u Wi-Fi boʻlmasa ham ishlaydi.", "Qogʻoz variantini soʻragan oilalar uchun kodli kartochkalarni chop eting."] },
          { type: "h2", text: "Eshik oldida" },
          { type: "p", text: "Oʻquvchining ismiga bosing, telefonda tezkor nazorat suratini oling va oʻtkazib yuboring. Keyinroq Smart Match shu suratdan foydalanadi — hech kim yuzi oldida ism yozilgan kartani ushlab turishi shart emas." },
          { type: "h2", text: "Oxirgi sinfdan keyin" },
          { type: "p", text: "Telefonlar internetga qayta ulanishi bilan sinxronlanadi. Kamera xotira kartalarini yuklang — siz uyga ketayotganingizda moslashtirish bajariladi. Faqat ishonchliligi past moslashuvlarni tekshiring: qolganlari allaqachon saralangan." },
        ],
      },
    },
  },
  {
    slug: "team-photos-when-roster-is-late",
    category: "picture-day",
    author: "Luis Ferreira",
    publishedAt: "2026-08-28",
    copy: {
      en: {
        title: "Shooting team photos when half the roster is late",
        excerpt: "Practices run long, buses arrive early, rosters change. How to keep a sports day moving when nothing goes to plan.",
        authorRole: ROLE.success.en,
        body: [
          { type: "p", text: "Sports days rarely start with the roster you were sent. Kids join late, swap teams or show up in the wrong jersey. A good workflow absorbs that chaos instead of fighting it." },
          { type: "h2", text: "Use team albums, not personal ones" },
          { type: "p", text: "A team album shares one code with everyone on the roster. If a player is missing from the list, parents can still find them with Find Me, and you can add them to the roster afterwards in seconds." },
          { type: "h2", text: "Shoot individuals first" },
          { type: "p", text: "Individuals don't need the whole team. By the time the last players arrive, you're ready for the group photo and nobody has been waiting in the sun." },
          { type: "ul", items: ["Add walk-ups to the roster on the check-in app — it works offline.", "Let Smart Match sort individuals overnight.", "Review only what it flags: low-confidence matches never go live on their own."] },
        ],
      },
      ru: {
        title: "Командная съёмка, когда половина состава опаздывает",
        excerpt: "Тренировки затягиваются, автобусы приезжают раньше, составы меняются. Как не останавливать спортивный день, когда всё идёт не по плану.",
        authorRole: ROLE.success.ru,
        body: [
          { type: "p", text: "Спортивный день редко начинается с того списка участников, который вам прислали. Дети приходят позже, переходят в другие команды или появляются не в той форме. Хороший рабочий процесс поглощает этот хаос, а не борется с ним." },
          { type: "h2", text: "Используйте командные альбомы, а не личные" },
          { type: "p", text: "В командном альбоме один код на всех из списка. Если игрока в списке нет, родители всё равно найдут его через поиск по селфи, а вы за секунды добавите его в список участников позже." },
          { type: "h2", text: "Сначала снимайте индивидуальные фото" },
          { type: "p", text: "Для индивидуальных снимков не нужна вся команда. Когда подъедут последние игроки, вы будете готовы к общему фото, и никому не придётся ждать на солнце." },
          { type: "ul", items: ["Добавляйте пришедших без записи в список прямо в приложении для регистрации — оно работает без интернета.", "Пусть Smart Match разберёт индивидуальные снимки за ночь.", "Проверяйте только то, что он отметит: совпадения с низкой уверенностью никогда не публикуются сами."] },
        ],
      },
      uz: {
        title: "Jamoaning yarmi kechikkanda jamoaviy suratga olish",
        excerpt: "Mashgʻulotlar choʻziladi, avtobuslar erta keladi, tarkiblar oʻzgaradi. Hammasi rejadagidek ketmaganda sport kunini qanday davom ettirish mumkin.",
        authorRole: ROLE.success.uz,
        body: [
          { type: "p", text: "Sport kuni kamdan-kam hollarda sizga yuborilgan ishtirokchilar roʻyxati bilan boshlanadi. Bolalar kechikib keladi, jamoalarini almashtiradi yoki boshqa formada keladi. Yaxshi ish jarayoni bu tartibsizlik bilan kurashmaydi, uni oʻziga singdiradi." },
          { type: "h2", text: "Shaxsiy emas, jamoaviy albomlardan foydalaning" },
          { type: "p", text: "Jamoaviy albomda roʻyxatdagi hamma uchun bitta kod boʻladi. Agar oʻyinchi roʻyxatda boʻlmasa ham, ota-onalar uni selfi orqali qidirish yordamida topadi, siz esa uni keyinroq bir necha soniyada ishtirokchilar roʻyxatiga qoʻshasiz." },
          { type: "h2", text: "Avval yakka suratlarni oling" },
          { type: "p", text: "Yakka suratlar uchun butun jamoa kerak emas. Oxirgi oʻyinchilar yetib kelguncha siz umumiy suratga tayyor boʻlasiz va hech kim quyosh ostida kutib qolmaydi." },
          { type: "ul", items: ["Oldindan yozilmay kelganlarni roʻyxatga olish ilovasida roʻyxatga qoʻshing — u internetsiz ham ishlaydi.", "Yakka suratlarni Smart Match tun davomida saralasin.", "Faqat u belgilagan narsalarni tekshiring: ishonchliligi past moslashuvlar hech qachon oʻz-oʻzidan eʼlon qilinmaydi."] },
        ],
      },
    },
  },
  {
    slug: "introducing-find-me",
    category: "product-updates",
    author: "Maya Okonkwo",
    publishedAt: "2026-08-12",
    copy: {
      en: {
        title: "Find Me: selfie search for team and event albums",
        excerpt: "Parents can now find every photo of their child in a team or open album with one selfie — and the selfie is deleted right after.",
        authorRole: ROLE.product.en,
        body: [
          { type: "p", text: "Team and open albums can hold thousands of photos. Scrolling through them on a phone is how sales get lost. Find Me fixes that: a parent takes a selfie of their child (or uploads a photo), and the album narrows to the matches." },
          { type: "h2", text: "Privacy by design" },
          { type: "ul", items: ["Parents see a clear consent screen before the camera opens.", "The selfie is used once for the search and deleted immediately afterwards.", "Face data from the season is removed by an automatic retention job when the job closes."] },
          { type: "h2", text: "Available today" },
          { type: "p", text: "Find Me is on for every team and open album. Personal albums don't need it — they already show only one child." },
        ],
      },
      ru: {
        title: "Поиск по селфи: найдите своего ребёнка в командных и событийных альбомах",
        excerpt: "Теперь родители могут найти все фото своего ребёнка в командном или открытом альбоме по одному селфи — и селфи сразу же удаляется.",
        authorRole: ROLE.product.ru,
        body: [
          { type: "p", text: "В командных и открытых альбомах могут быть тысячи фотографий. Пролистывать их на телефоне — верный способ потерять продажу. Поиск по селфи решает эту проблему: родитель фотографирует ребёнка (или загружает его фото), и в альбоме остаются только совпадения." },
          { type: "h2", text: "Конфиденциальность заложена в основу" },
          { type: "ul", items: ["Перед тем как откроется камера, родители видят понятный экран согласия.", "Селфи используется один раз для поиска и сразу после этого удаляется.", "Данные о лицах за сезон автоматически удаляются, когда съёмка закрывается."] },
          { type: "h2", text: "Уже доступно" },
          { type: "p", text: "Поиск по селфи включён во всех командных и открытых альбомах. Личным альбомам он не нужен — в них и так только один ребёнок." },
        ],
      },
      uz: {
        title: "Selfi orqali qidirish: jamoaviy va tadbir albomlarida farzandingizni toping",
        excerpt: "Endi ota-onalar jamoaviy yoki ochiq albomdagi farzandining barcha suratlarini bitta selfi orqali topa oladi — selfi esa darhol oʻchiriladi.",
        authorRole: ROLE.product.uz,
        body: [
          { type: "p", text: "Jamoaviy va ochiq albomlarda minglab surat boʻlishi mumkin. Ularni telefonda varaqlash — savdoni yoʻqotishning eng toʻgʻri yoʻli. Selfi orqali qidirish buni hal qiladi: ota-ona farzandini suratga oladi (yoki uning suratini yuklaydi) va albomda faqat mos suratlar qoladi." },
          { type: "h2", text: "Maxfiylik boshidan oʻylab chiqilgan" },
          { type: "ul", items: ["Kamera ochilishidan oldin ota-onalar tushunarli rozilik oynasini koʻradi.", "Selfi qidiruv uchun bir marta ishlatiladi va shundan soʻng darhol oʻchiriladi.", "Mavsum davomidagi yuz maʼlumotlari suratga olish yopilganda avtomatik ravishda oʻchiriladi."] },
          { type: "h2", text: "Bugundan mavjud" },
          { type: "p", text: "Selfi orqali qidirish barcha jamoaviy va ochiq albomlarda yoqilgan. Shaxsiy albomlarga u kerak emas — ularda baribir faqat bitta farzand boʻladi." },
        ],
      },
    },
  },
  {
    slug: "introducing-picture-day-pass",
    category: "product-updates",
    author: "Hannah Weiss",
    publishedAt: "2026-07-30",
    copy: {
      en: {
        title: "Picture Day Pass: let families pre-pay before you shoot",
        excerpt: "Sell credit before picture day, add a bonus, and apply it automatically at checkout. Cash flow before the camera comes out.",
        authorRole: ROLE.founder.en,
        body: [
          { type: "p", text: "Pre-pay used to mean envelopes of cash and a spreadsheet. The Picture Day Pass makes it a two-tap purchase: the parent picks an amount, pays, and gets a text when photos are ready." },
          { type: "h2", text: "How it works" },
          { type: "ul", items: ["Create a Pass offer on any upcoming job with the amounts you want to sell.", "Add an optional bonus — for example, pay $50, get $55 of credit.", "When the album goes live, the credit is applied automatically at checkout."] },
          { type: "p", text: "Studios using the Pass report earlier revenue, higher participation and fewer 'I forgot' messages after the deadline." },
        ],
      },
      ru: {
        title: "Picture Day Pass: семьи оплачивают фото ещё до съёмки",
        excerpt: "Продавайте кредит до дня съёмки, добавляйте бонус и применяйте его автоматически при оформлении заказа. Деньги поступают раньше, чем вы достанете камеру.",
        authorRole: ROLE.founder.ru,
        body: [
          { type: "p", text: "Раньше предоплата означала конверты с наличными и таблицу. Picture Day Pass превращает её в покупку в два касания: родитель выбирает сумму, платит и получает SMS, когда фото готовы." },
          { type: "h2", text: "Как это работает" },
          { type: "ul", items: ["Создайте предложение Picture Day Pass для любой предстоящей съёмки с нужными суммами.", "Добавьте бонус по желанию — например, заплатите 50 $ и получите 55 $ кредита.", "Когда альбом опубликован, кредит автоматически применяется при оформлении заказа."] },
          { type: "p", text: "Студии, использующие Picture Day Pass, отмечают более раннюю выручку, более высокое участие и меньше сообщений «я забыл» после окончания срока." },
        ],
      },
      uz: {
        title: "Picture Day Pass: oilalar suratga olishdan oldin toʻlov qiladi",
        excerpt: "Suratga olish kunidan oldin kredit soting, bonus qoʻshing va uni buyurtmani rasmiylashtirishda avtomatik qoʻllang. Pul kamerani qoʻlga olishingizdan oldin tushadi.",
        authorRole: ROLE.founder.uz,
        body: [
          { type: "p", text: "Ilgari oldindan toʻlov naqd pul solingan konvertlar va jadvalni anglatardi. Picture Day Pass uni ikki bosishda bajariladigan xaridga aylantiradi: ota-ona summani tanlaydi, toʻlaydi va suratlar tayyor boʻlganda SMS oladi." },
          { type: "h2", text: "Bu qanday ishlaydi" },
          { type: "ul", items: ["Har qanday kelgusi suratga olish uchun kerakli summalar bilan Picture Day Pass taklifini yarating.", "Xohlasangiz, bonus qoʻshing — masalan, 50 dollar toʻlang va 55 dollarlik kredit oling.", "Albom eʼlon qilinganda kredit buyurtmani rasmiylashtirishda avtomatik qoʻllanadi."] },
          { type: "p", text: "Picture Day Pass xizmatidan foydalanayotgan studiyalar daromad ertaroq tushishi, ishtirok ortishi va muddat tugaganidan keyin «unutib qoʻyibman» degan xabarlar kamayganini taʼkidlaydi." },
        ],
      },
    },
  },
];
