import type { Locale, Market } from "@snapbell/sdk";

/** A market tab as the pages render it, in one language. */
export interface MarketContent {
  id: Market;
  label: string;
  headline: string;
  summary: string;
  /** Three bullets for the home page tab. */
  bullets: [string, string, string];
  quote: { text: string; name: string; role: string };
  image: { kind: "portrait" | "group" | "action"; seed: string; alt: string };
  workflow: { albumType: string; shipping: string; products: string[] };
  caseStudy: { studio: string; metric: string; metricLabel: string; story: string };
}

/** Everything a reader sees in one language. */
export interface MarketCopy {
  label: string;
  headline: string;
  summary: string;
  bullets: [string, string, string];
  quote: { text: string; role: string };
  imageAlt: string;
  workflow: { albumType: string; shipping: string; products: string[] };
  caseStudy: { metric: string; metricLabel: string; story: string };
}

export interface MarketSource {
  id: Market;
  image: { kind: "portrait" | "group" | "action"; seed: string };
  quoteName: string;
  studio: string;
  copy: Record<Locale, MarketCopy>;
}

/** Studio names and people below are fictional and used for illustration. */
export const marketSources: MarketSource[] = [
  {
    id: "schools",
    image: { kind: "portrait", seed: "market-schools" },
    quoteName: "Renata Holm",
    studio: "Fernway Portraits",
    copy: {
      en: {
        label: "Schools",
        headline: "Picture day for a whole school, without the paper envelopes",
        summary: "Import the class list, give every student a private code, and let parents order from their phones while you're still packing up the backdrop.",
        bullets: [
          "One private album per student, unlocked with a 6-character code",
          "Class composites and yearbook exports from the same job",
          "Bulk ship to school or send to each home — parents pick at checkout",
        ],
        quote: { text: "We shot 640 kids on Tuesday and had 210 orders by Thursday morning. Nobody touched an envelope.", role: "Owner, Fernway Portraits (illustrative)" },
        imageAlt: "Illustration of a smiling student in front of a mottled portrait backdrop",
        workflow: { albumType: "Personal albums (one per student)", shipping: "Bulk to school or home delivery", products: ["Print packages", "Wallets", "Class composite", "Digital download"] },
        caseStudy: { metric: "+41%", metricLabel: "average order value", story: "Switching from envelopes to a suggested bundle built from each family's favorites lifted the average order from $37 to $52." },
      },
      ru: {
        label: "Школы",
        headline: "День съёмки для всей школы — без бумажных конвертов",
        summary: "Импортируйте список класса, выдайте каждому ученику личный код — и родители закажут фото с телефона, пока вы ещё сворачиваете фон.",
        bullets: [
          "Отдельный закрытый альбом для каждого ученика, открывается кодом из 6 символов",
          "Общие фото класса и экспорт для выпускного альбома из той же съёмки",
          "Общая доставка в школу или доставка на дом — родители выбирают при оформлении заказа",
        ],
        quote: { text: "Во вторник мы сняли 640 детей, а к утру четверга получили 210 заказов. Никто не прикоснулся к конверту.", role: "Владелец, Fernway Portraits (для примера)" },
        imageAlt: "Иллюстрация: улыбающийся ученик на фоне студийного портретного фона",
        workflow: { albumType: "Личные альбомы (по одному на ученика)", shipping: "Общая доставка в школу или доставка на дом", products: ["Пакеты отпечатков", "Фото для кошелька", "Общее фото класса", "Цифровой файл"] },
        caseStudy: { metric: "+41%", metricLabel: "средний чек", story: "Переход от конвертов к предлагаемому пакету из избранных фото каждой семьи поднял средний чек с 37 $ до 52 $." },
      },
      uz: {
        label: "Maktablar",
        headline: "Butun maktab uchun suratga olish kuni — qogʻoz konvertlarsiz",
        summary: "Sinf roʻyxatini import qiling, har bir oʻquvchiga shaxsiy kod bering — siz hali fonni yigʻishtirayotganingizda ota-onalar telefondan buyurtma berib boʻladi.",
        bullets: [
          "Har bir oʻquvchi uchun 6 belgili kod bilan ochiladigan alohida yopiq albom",
          "Bitta suratga olishdan sinf kollaji va bitiruv albomi uchun eksport",
          "Maktabga umumiy yetkazib berish yoki uyga yuborish — ota-onalar buyurtmani rasmiylashtirishda tanlaydi",
        ],
        quote: { text: "Seshanba kuni 640 nafar bolani suratga oldik, payshanba ertalabgacha esa 210 ta buyurtma oldik. Hech kim konvertga qoʻl tekkizmadi.", role: "Egasi, Fernway Portraits (namuna uchun)" },
        imageAlt: "Rasm: dogʻli portret foni oldida jilmayib turgan oʻquvchi",
        workflow: { albumType: "Shaxsiy albomlar (har bir oʻquvchiga bittadan)", shipping: "Maktabga umumiy yoki uyga yetkazib berish", products: ["Bosma surat toʻplamlari", "Hamyonbop suratlar", "Sinf kollaji", "Raqamli fayl"] },
        caseStudy: { metric: "+41%", metricLabel: "oʻrtacha buyurtma qiymati", story: "Konvertlardan har bir oilaning sevimli suratlaridan tuzilgan taklif toʻplamiga oʻtish oʻrtacha buyurtmani 37 dollardan 52 dollarga oshirdi." },
      },
    },
  },
  {
    id: "sports",
    image: { kind: "action", seed: "market-sports" },
    quoteName: "Dev Ramnarine",
    studio: "Sideline Studio Co.",
    copy: {
      en: {
        label: "Sports",
        headline: "Team and action photos that find every player",
        summary: "One code for the whole team. Smart Match sorts individuals, and parents can search with a selfie to pull every action shot of their kid.",
        bullets: [
          "Team albums with a shared code — no per-player paperwork",
          "Find Me selfie search pulls every action shot of one player",
          "Memory mates with the team photo and name, previewed live",
        ],
        quote: { text: "Parents used to scroll 900 game photos. Now they tap Find Me and they're done in ten seconds.", role: "Lead photographer, Sideline Studio Co. (illustrative)" },
        imageAlt: "Illustration of a young soccer player on a green field with a ball",
        workflow: { albumType: "Team albums with Find Me", shipping: "Home delivery or coach pickup", products: ["Memory mate", "Team 8×10", "Player pack", "Download all"] },
        caseStudy: { metric: "3.1×", metricLabel: "more action-shot sales", story: "Selfie search turned the 'too many photos to look through' problem into the league's best-selling product." },
      },
      ru: {
        label: "Спорт",
        headline: "Командные и игровые фото, на которых найдётся каждый игрок",
        summary: "Один код на всю команду. Smart Match разбирает индивидуальные снимки, а родители с помощью селфи находят все игровые кадры своего ребёнка.",
        bullets: [
          "Командные альбомы с общим кодом — никаких бумаг на каждого игрока",
          "Поиск по селфи находит все игровые кадры одного игрока",
          "Памятные коллажи с фото команды и именем, с живым предпросмотром",
        ],
        quote: { text: "Раньше родители пролистывали 900 фото с игры. Теперь они нажимают «Поиск по селфи» и находят всё за десять секунд.", role: "Ведущий фотограф, Sideline Studio Co. (для примера)" },
        imageAlt: "Иллюстрация: юный футболист с мячом на зелёном поле",
        workflow: { albumType: "Командные альбомы с поиском по селфи", shipping: "Доставка на дом или через тренера", products: ["Памятный коллаж", "Фото команды 8×10", "Пакет игрока", "Скачать все"] },
        caseStudy: { metric: "3,1×", metricLabel: "больше продаж игровых кадров", story: "Поиск по селфи превратил проблему «слишком много фото, чтобы всё просмотреть» в самый продаваемый продукт лиги." },
      },
      uz: {
        label: "Sport",
        headline: "Har bir oʻyinchi topiladigan jamoaviy va oʻyin suratlari",
        summary: "Butun jamoa uchun bitta kod. Smart Match yakka suratlarni saralaydi, ota-onalar esa selfi yordamida farzandining barcha oʻyin lavhalarini topadi.",
        bullets: [
          "Umumiy kodli jamoaviy albomlar — har bir oʻyinchi uchun qogʻozbozliksiz",
          "Selfi orqali qidirish bitta oʻyinchining barcha oʻyin lavhalarini topadi",
          "Jamoa surati va ism tushirilgan esdalik kollajlari, jonli oldindan koʻrish bilan",
        ],
        quote: { text: "Ilgari ota-onalar oʻyindagi 900 ta suratni varaqlab chiqishardi. Endi ular «Selfi orqali qidirish» tugmasini bosadi va oʻn soniyada ishni tugatadi.", role: "Bosh fotograf, Sideline Studio Co. (namuna uchun)" },
        imageAlt: "Rasm: yashil maydonda toʻp bilan turgan yosh futbolchi",
        workflow: { albumType: "Selfi orqali qidirish mumkin boʻlgan jamoaviy albomlar", shipping: "Uyga yetkazib berish yoki murabbiy orqali olish", products: ["Esdalik kollaji", "Jamoa surati 8×10", "Oʻyinchi toʻplami", "Hammasini yuklab olish"] },
        caseStudy: { metric: "3,1×", metricLabel: "koʻproq oʻyin lavhalari sotuvi", story: "Selfi orqali qidirish «koʻrib chiqish uchun suratlar juda koʻp» muammosini ligadagi eng koʻp sotiladigan mahsulotga aylantirdi." },
      },
    },
  },
  {
    id: "dance",
    image: { kind: "group", seed: "market-dance" },
    quoteName: "Ines Valcourt",
    studio: "Pirouette Pictures",
    copy: {
      en: {
        label: "Dance",
        headline: "Recital photos sold before the curtain falls",
        summary: "Offer a Picture Day Pass weeks before the recital, then text every family the moment their dancer's photos are ready.",
        bullets: [
          "Open albums for recitals, with Find Me for every costume change",
          "Pre-sell with a Picture Day Pass and bonus credit",
          "Keepsakes like ornaments and buttons with live previews",
        ],
        quote: { text: "Half our recital revenue now comes in before we shoot a single frame.", role: "Owner, Pirouette Pictures (illustrative)" },
        imageAlt: "Illustration of a dance company posed in three rows",
        workflow: { albumType: "Open albums with Find Me", shipping: "Home delivery", products: ["Recital keepsake", "Ornament", "8×10 print", "Digital download"] },
        caseStudy: { metric: "52%", metricLabel: "of revenue pre-sold", story: "A Picture Day Pass with 10% bonus credit, sent three weeks out, filled the calendar and the bank account before recital week." },
      },
      ru: {
        label: "Танцы",
        headline: "Фото с отчётного концерта продаются ещё до того, как опустится занавес",
        summary: "Предложите Picture Day Pass за несколько недель до концерта, а затем отправьте SMS каждой семье в ту же минуту, когда фото их танцора будут готовы.",
        bullets: [
          "Открытые альбомы для концертов с поиском по селфи для каждой смены костюма",
          "Предпродажа через Picture Day Pass с бонусным кредитом",
          "Сувениры вроде ёлочных игрушек и значков — с живым предпросмотром",
        ],
        quote: { text: "Половина нашей выручки с концертов теперь приходит до того, как мы сделаем хоть один кадр.", role: "Владелец, Pirouette Pictures (для примера)" },
        imageAlt: "Иллюстрация: танцевальный коллектив, выстроившийся в три ряда",
        workflow: { albumType: "Открытые альбомы с поиском по селфи", shipping: "Доставка на дом", products: ["Памятный набор с концерта", "Ёлочная игрушка", "Отпечаток 8×10", "Цифровой файл"] },
        caseStudy: { metric: "52%", metricLabel: "выручки получено по предпродаже", story: "Picture Day Pass с бонусом 10%, разосланный за три недели, заполнил и календарь, и банковский счёт ещё до недели концерта." },
      },
      uz: {
        label: "Raqs",
        headline: "Hisobot konserti suratlari parda tushmasdanoq sotiladi",
        summary: "Konsertdan bir necha hafta oldin Picture Day Pass taklif qiling, keyin raqqosingiz suratlari tayyor boʻlgan zahoti har bir oilaga SMS yuboring.",
        bullets: [
          "Konsertlar uchun ochiq albomlar, har bir kostyum almashinuvi uchun selfi orqali qidirish bilan",
          "Picture Day Pass va bonus kredit orqali oldindan sotish",
          "Archa oʻyinchoqlari va nishonlar kabi esdalik buyumlari, jonli oldindan koʻrish bilan",
        ],
        quote: { text: "Endi konsertlardan tushadigan daromadimizning yarmi biror kadr olmasimizdanoq tushadi.", role: "Egasi, Pirouette Pictures (namuna uchun)" },
        imageAlt: "Rasm: uch qatorda turgan raqs jamoasi",
        workflow: { albumType: "Selfi orqali qidirish mumkin boʻlgan ochiq albomlar", shipping: "Uyga yetkazib berish", products: ["Konsert esdaligi", "Archa oʻyinchogʻi", "8×10 bosma surat", "Raqamli fayl"] },
        caseStudy: { metric: "52%", metricLabel: "daromad oldindan sotilgan", story: "Uch hafta oldin yuborilgan 10% bonus kreditli Picture Day Pass konsert haftasidan oldinoq ham taqvimni, ham bank hisobini toʻldirdi." },
      },
    },
  },
  {
    id: "preschool",
    image: { kind: "portrait", seed: "market-preschool" },
    quoteName: "Grace Abernathy",
    studio: "Little Acorn Photo",
    copy: {
      en: {
        label: "Preschool",
        headline: "Gentle sessions, simple ordering for busy parents",
        summary: "Short sessions, small classes and parents who want it done on their phone between pickup and dinner.",
        bullets: [
          "Personal albums sent by text — no app to install",
          "Siblings at the same studio combine into one cart",
          "Free school pickup option keeps shipping costs down",
        ],
        quote: { text: "Parents order from the pickup line. That's the whole story.", role: "Owner, Little Acorn Photo (illustrative)" },
        imageAlt: "Illustration of a preschooler smiling at the camera",
        workflow: { albumType: "Personal albums", shipping: "School pickup or home", products: ["Essentials package", "Magnet with name", "Wallets", "Digital download"] },
        caseStudy: { metric: "68%", metricLabel: "of families ordered", story: "Text-first delivery and a 9-day deadline countdown pushed participation well past the old paper-form average." },
      },
      ru: {
        label: "Детские сады",
        headline: "Бережные съёмки и простой заказ для занятых родителей",
        summary: "Короткие сеансы, небольшие группы и родители, которые хотят всё сделать с телефона — между тем, как забрать ребёнка, и ужином.",
        bullets: [
          "Личные альбомы приходят по SMS — ничего не нужно устанавливать",
          "Заказы для братьев и сестёр в одной студии объединяются в одну корзину",
          "Бесплатный самовывоз из сада снижает расходы на доставку",
        ],
        quote: { text: "Родители заказывают, пока стоят в очереди, чтобы забрать детей. Вот и вся история.", role: "Владелец, Little Acorn Photo (для примера)" },
        imageAlt: "Иллюстрация: малыш из детского сада улыбается в камеру",
        workflow: { albumType: "Личные альбомы", shipping: "Самовывоз из сада или доставка на дом", products: ["Пакет «Основной»", "Магнит с именем", "Фото для кошелька", "Цифровой файл"] },
        caseStudy: { metric: "68%", metricLabel: "семей сделали заказ", story: "Доставка в первую очередь по SMS и обратный отсчёт 9-дневного срока заказа подняли участие намного выше прежнего уровня с бумажными бланками." },
      },
      uz: {
        label: "Bogʻchalar",
        headline: "Yumshoq suratga olish va band ota-onalar uchun oddiy buyurtma",
        summary: "Qisqa seanslar, kichik guruhlar va hamma ishni farzandini olib ketish bilan kechki ovqat oraligʻida telefonda bajarishni xohlaydigan ota-onalar.",
        bullets: [
          "Shaxsiy albomlar SMS orqali yuboriladi — hech narsa oʻrnatish shart emas",
          "Bitta studiyadagi aka-uka va opa-singillar buyurtmalari bitta savatga birlashadi",
          "Bogʻchadan bepul olib ketish imkoniyati yetkazib berish xarajatlarini kamaytiradi",
        ],
        quote: { text: "Ota-onalar bolalarini olib ketish navbatida turib buyurtma berishadi. Butun gap shunda.", role: "Egasi, Little Acorn Photo (namuna uchun)" },
        imageAlt: "Rasm: kameraga jilmayib qarayotgan bogʻcha yoshidagi bola",
        workflow: { albumType: "Shaxsiy albomlar", shipping: "Bogʻchadan olib ketish yoki uyga yetkazib berish", products: ["«Asosiy» toʻplami", "Ismli magnit", "Hamyonbop suratlar", "Raqamli fayl"] },
        caseStudy: { metric: "68%", metricLabel: "oilalar buyurtma bergan", story: "SMS orqali yetkazishga ustuvorlik va 9 kunlik muddatning teskari sanogʻi ishtirokni qogʻoz blankalar davridagi oʻrtacha darajadan ancha oshirdi." },
      },
    },
  },
  {
    id: "seniors",
    image: { kind: "portrait", seed: "market-seniors-2" },
    quoteName: "Tobias Ferrell",
    studio: "Cap & Gown Collective",
    copy: {
      en: {
        label: "Seniors",
        headline: "Senior portraits with the polish families expect",
        summary: "Multiple looks, yearbook-ready exports and premium products — all in a store that carries your brand, not ours.",
        bullets: [
          "Yearbook selection and exports labeled for the school",
          "Retouch add-on offered right inside the customizer",
          "Your logo, your colors, your album domain",
        ],
        quote: { text: "The yearbook export alone saves us two days every January.", role: "Owner, Cap & Gown Collective (illustrative)" },
        imageAlt: "Illustration of a high-school senior portrait",
        workflow: { albumType: "Personal albums", shipping: "Home delivery", products: ["11×14 print", "Retouch add-on", "Announcement cards", "Digital download"] },
        caseStudy: { metric: "$184", metricLabel: "average senior order", story: "Offering retouching as an add-on in the customizer — instead of a separate form — doubled retouch uptake." },
      },
      ru: {
        label: "Выпускники",
        headline: "Портреты выпускников с тем лоском, которого ждут семьи",
        summary: "Несколько образов, экспорт для выпускного альбома и премиальная продукция — всё в магазине под вашим брендом, а не нашим.",
        bullets: [
          "Отбор фото для выпускного альбома и экспорт с подписями для школы",
          "Ретушь как дополнительная опция прямо в редакторе",
          "Ваш логотип, ваши цвета, ваш домен для альбомов",
        ],
        quote: { text: "Один только экспорт для выпускного альбома экономит нам два дня каждый январь.", role: "Владелец, Cap & Gown Collective (для примера)" },
        imageAlt: "Иллюстрация: портрет выпускника старшей школы",
        workflow: { albumType: "Личные альбомы", shipping: "Доставка на дом", products: ["Отпечаток 11×14", "Ретушь (доп. опция)", "Открытки-приглашения", "Цифровой файл"] },
        caseStudy: { metric: "184 $", metricLabel: "средний заказ выпускника", story: "Предложение ретуши как дополнительной опции в редакторе — вместо отдельной формы — вдвое увеличило число заказов ретуши." },
      },
      uz: {
        label: "Bitiruvchilar",
        headline: "Oilalar kutgan nafislikdagi bitiruvchilar portretlari",
        summary: "Bir nechta obraz, bitiruv albomiga tayyor eksport va premium mahsulotlar — barchasi bizning emas, sizning brendingiz ostidagi doʻkonda.",
        bullets: [
          "Bitiruv albomi uchun suratlarni tanlash va maktab uchun belgilangan eksport",
          "Retush qoʻshimcha xizmat sifatida toʻgʻridan-toʻgʻri muharrir ichida taklif qilinadi",
          "Sizning logotipingiz, ranglaringiz va albom domeningiz",
        ],
        quote: { text: "Birgina bitiruv albomi eksporti har yanvarda bizga ikki kunni tejaydi.", role: "Egasi, Cap & Gown Collective (namuna uchun)" },
        imageAlt: "Rasm: yuqori sinf bitiruvchisining portreti",
        workflow: { albumType: "Shaxsiy albomlar", shipping: "Uyga yetkazib berish", products: ["11×14 bosma surat", "Retush (qoʻshimcha xizmat)", "Taklifnoma kartochkalari", "Raqamli fayl"] },
        caseStudy: { metric: "184 $", metricLabel: "bitiruvchining oʻrtacha buyurtmasi", story: "Retushni alohida shakl oʻrniga muharrirda qoʻshimcha xizmat sifatida taklif qilish retush buyurtmalarini ikki baravar oshirdi." },
      },
    },
  },
  {
    id: "events",
    image: { kind: "group", seed: "market-events-3" },
    quoteName: "Marisol Quintero",
    studio: "Brightwater Events",
    copy: {
      en: {
        label: "Events",
        headline: "Tournaments, camps and galas, sorted by face",
        summary: "Hundreds of attendees, thousands of photos and no roster. Open albums with selfie search let everyone find themselves.",
        bullets: [
          "Open albums: one link for the whole event",
          "Find Me selfie search, with consent and instant deletion",
          "Sell downloads the same night the event ends",
        ],
        quote: { text: "We publish the same evening and sell downloads before people have left the parking lot.", role: "Owner, Brightwater Events (illustrative)" },
        imageAlt: "Illustration of a large group of event attendees",
        workflow: { albumType: "Open albums with Find Me", shipping: "Digital first, prints shipped home", products: ["Download all", "Single digital", "8×10 print", "Group photo"] },
        caseStudy: { metric: "6 hrs", metricLabel: "from last frame to first sale", story: "Uploading straight from the venue and publishing an open album the same evening turned events into same-night revenue." },
      },
      ru: {
        label: "Мероприятия",
        headline: "Турниры, лагеря и торжества — с сортировкой по лицам",
        summary: "Сотни участников, тысячи фотографий и никакого списка. Открытые альбомы с поиском по селфи позволяют каждому найти себя.",
        bullets: [
          "Открытые альбомы: одна ссылка на всё мероприятие",
          "Поиск по селфи — с согласием и мгновенным удалением",
          "Продажа цифровых файлов в тот же вечер, когда закончилось мероприятие",
        ],
        quote: { text: "Мы публикуем фото в тот же вечер и продаём файлы ещё до того, как гости разъедутся с парковки.", role: "Владелец, Brightwater Events (для примера)" },
        imageAlt: "Иллюстрация: большая группа участников мероприятия",
        workflow: { albumType: "Открытые альбомы с поиском по селфи", shipping: "Сначала цифровые файлы, отпечатки — доставкой на дом", products: ["Скачать все", "Один цифровой файл", "Отпечаток 8×10", "Групповое фото"] },
        caseStudy: { metric: "6 ч", metricLabel: "от последнего кадра до первой продажи", story: "Загрузка прямо с площадки и публикация открытого альбома в тот же вечер превратили мероприятия в выручку в тот же день." },
      },
      uz: {
        label: "Tadbirlar",
        headline: "Turnirlar, lagerlar va tantanalar — yuzlar boʻyicha saralangan",
        summary: "Yuzlab ishtirokchi, minglab surat va hech qanday roʻyxat yoʻq. Selfi orqali qidirish mumkin boʻlgan ochiq albomlar har kimga oʻzini topish imkonini beradi.",
        bullets: [
          "Ochiq albomlar: butun tadbir uchun bitta havola",
          "Selfi orqali qidirish — rozilik bilan va darhol oʻchirish bilan",
          "Raqamli fayllarni tadbir tugagan kechaning oʻzidayoq sotish",
        ],
        quote: { text: "Suratlarni oʻsha kechaning oʻzida eʼlon qilamiz va odamlar avtoturargohdan chiqib ketmasdanoq fayllarni sotamiz.", role: "Egasi, Brightwater Events (namuna uchun)" },
        imageAlt: "Rasm: tadbir ishtirokchilarining katta guruhi",
        workflow: { albumType: "Selfi orqali qidirish mumkin boʻlgan ochiq albomlar", shipping: "Avval raqamli fayllar, bosma suratlar uyga yuboriladi", products: ["Hammasini yuklab olish", "Bitta raqamli fayl", "8×10 bosma surat", "Guruh surati"] },
        caseStudy: { metric: "6 soat", metricLabel: "oxirgi kadrdan birinchi sotuvgacha", story: "Toʻgʻridan-toʻgʻri tadbir joyidan yuklash va ochiq albomni oʻsha kechaning oʻzida eʼlon qilish tadbirlarni shu kunning oʻzida daromadga aylantirdi." },
      },
    },
  },
];
