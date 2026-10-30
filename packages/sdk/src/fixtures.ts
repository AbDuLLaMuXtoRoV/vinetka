import { generateCode, hashString, mulberry32 } from "./codes";
import { bps } from "./money";
import { SHIPPING_CENTS, splitOrder } from "./pricing";
import type {
  FeatureFlag,
  ID,
  Job,
  Lab,
  LabProduct,
  LabSubmission,
  Match,
  Member,
  MessageLog,
  Order,
  OrderItem,
  OrderStatus,
  Organization,
  Package,
  Parent,
  Pass,
  PassOffer,
  Photo,
  PriceSheet,
  PriceSheetItem,
  ProductCategory,
  Promo,
  ScheduledMessage,
  Studio,
  Subject,
} from "./types";

/**
 * Demo data used to seed the API's in-memory store (and, later, the database).
 * Deterministic for a given `now`, with dates relative to it so deadlines and
 * countdowns always look current.
 */

export const DEMO_CREDENTIALS = {
  owner: { email: "owner@brightside.photo", password: "picture-day" },
  admin: { email: "priya@brightside.photo", password: "picture-day" },
  photographer: { email: "sam@brightside.photo", password: "picture-day" },
  internalAdmin: { email: "admin@snapbell.com", password: "admin-dev-only" },
  parent: { phone: "+15555550123", email: "parent@example.com" },
} as const;

export const DEMO_CODES = {
  /** Personal album: Ava Martinez, Maple Grove Elementary. Used by "See a sample store". */
  personal: "SAMPLE",
  /** Ava's brother Leo, same studio: sibling orders combine in one cart. */
  sibling: "LEOM26",
  /** Team album with Find Me. */
  team: "EAGLES",
  /** Open album, not yet published: shows the date + "notify me". */
  notPublished: "DANCE7",
  /** Expired album. */
  expired: "SENR25",
} as const;

export const DEMO_IDS = {
  studio: "stu_brightside",
  maple: "job_maple_fall",
  eagles: "job_eagles_u12",
  lumen: "job_lumen_recital",
  westbrook: "job_westbrook_seniors",
  mapleSpring: "job_maple_spring",
  parent: "par_demo",
} as const;

export interface DemoData {
  now: string;
  studios: Studio[];
  members: Member[];
  labs: Lab[];
  labProducts: LabProduct[];
  priceSheets: PriceSheet[];
  organizations: Organization[];
  jobs: Job[];
  subjects: Subject[];
  /** thumbUrl/previewUrl are empty: the API signs URLs at read time. */
  photos: Photo[];
  matches: Match[];
  promos: Promo[];
  passOffers: PassOffer[];
  passes: Pass[];
  parents: Parent[];
  /** Which subjects (children) a parent has unlocked, and with which code. */
  parentSubjects: Array<{ parentId: ID; subjectId: ID; albumCode: string }>;
  orders: Order[];
  messages: MessageLog[];
  scheduledMessages: ScheduledMessage[];
  labSubmissions: LabSubmission[];
  flags: FeatureFlag[];
}

const FIRST = [
  "Ava", "Leo", "Mia", "Noah", "Zoe", "Eli", "Lily", "Owen", "Nora", "Theo", "Ruby", "Kai", "Isla", "Jude",
  "Maya", "Finn", "Aria", "Milo", "Ella", "Ezra", "Hazel", "Luca", "Ivy", "Sam", "Nina", "Omar", "Priya",
  "Diego", "Hana", "Tariq", "Amara", "Jonah", "Sofia", "Malik", "Grace", "Ravi",
];
const LAST = [
  "Chen", "Okafor", "Patel", "Nguyen", "Johnson", "Kim", "Garcia", "Rossi", "Haddad", "Silva", "Murphy", "Novak",
  "Ali", "Brown", "Fischer", "Tanaka", "Lopez", "Walker", "Ibrahim", "Cohen", "Moreau", "Larsen", "Kowalski",
];

interface ProductSpec {
  key: string;
  name: string;
  category: ProductCategory;
  aspectRatio: number;
  slots: number;
  customizable: boolean;
  minLongEdgePx: number;
  labCost: number;
  price: number;
}

const PRODUCT_SPECS: ProductSpec[] = [
  { key: "810", name: "8×10 Print", category: "print", aspectRatio: 0.8, slots: 1, customizable: true, minLongEdgePx: 2400, labCost: 210, price: 2200 },
  { key: "57P", name: "5×7 Prints (pair)", category: "print", aspectRatio: 5 / 7, slots: 1, customizable: true, minLongEdgePx: 2100, labCost: 180, price: 1800 },
  { key: "46", name: "4×6 Print", category: "print", aspectRatio: 4 / 6, slots: 1, customizable: true, minLongEdgePx: 1800, labCost: 45, price: 800 },
  { key: "WAL8", name: "Wallets (sheet of 8)", category: "print", aspectRatio: 2.5 / 3.5, slots: 1, customizable: false, minLongEdgePx: 1500, labCost: 160, price: 1600 },
  { key: "1114", name: "11×14 Print", category: "print", aspectRatio: 11 / 14, slots: 1, customizable: true, minLongEdgePx: 3300, labCost: 420, price: 3800 },
  { key: "MAG", name: "Photo Magnet with Name", category: "keepsake", aspectRatio: 3.5 / 5, slots: 1, customizable: true, minLongEdgePx: 1500, labCost: 260, price: 1400 },
  { key: "ORN", name: "Keepsake Ornament", category: "keepsake", aspectRatio: 1, slots: 1, customizable: true, minLongEdgePx: 1200, labCost: 520, price: 2400 },
  { key: "BTN", name: "3\" Photo Button", category: "keepsake", aspectRatio: 1, slots: 1, customizable: true, minLongEdgePx: 900, labCost: 150, price: 1000 },
  { key: "MM", name: "Memory Mate", category: "group", aspectRatio: 0.8, slots: 2, customizable: true, minLongEdgePx: 2400, labCost: 390, price: 2800 },
  { key: "TEAM", name: "8×10 Group Photo", category: "group", aspectRatio: 1.25, slots: 1, customizable: false, minLongEdgePx: 2400, labCost: 210, price: 2000 },
  { key: "DIG1", name: "Digital Download", category: "digital", aspectRatio: 0.8, slots: 1, customizable: false, minLongEdgePx: 0, labCost: 0, price: 1900 },
  { key: "DIGALL", name: "Download All", category: "digital", aspectRatio: 0.8, slots: 0, customizable: false, minLongEdgePx: 0, labCost: 0, price: 5900 },
];

function iso(base: Date, days: number, hours = 0): string {
  return new Date(base.getTime() + days * 86_400_000 + hours * 3_600_000).toISOString();
}

export function createDemoData(nowInput: Date = new Date()): DemoData {
  // Round to the hour so data is stable within a dev session.
  const now = new Date(Math.floor(nowInput.getTime() / 3_600_000) * 3_600_000);
  const rand = mulberry32(20261030);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)] as T;

  // --- Labs and products --------------------------------------------------
  const labs: Lab[] = [
    { id: "lab_cascade", name: "Cascade Pro Lab", region: "US West", turnaroundDays: 4 },
    { id: "lab_northstar", name: "Northstar Imaging", region: "US Central", turnaroundDays: 5 },
  ];
  const labProducts: LabProduct[] = labs.flatMap((lab, li) =>
    PRODUCT_SPECS.map((p) => ({
      id: `lp_${lab.id.slice(4)}_${p.key.toLowerCase()}`,
      labId: lab.id,
      sku: `${li === 0 ? "CAS" : "NS"}-${p.key}`,
      name: p.name,
      category: p.category,
      aspectRatio: p.aspectRatio,
      slots: p.slots,
      customizable: p.customizable,
      minLongEdgePx: p.minLongEdgePx,
      labCostCents: li === 0 ? p.labCost : Math.round(p.labCost * 1.08),
    })),
  );

  // --- Studios ------------------------------------------------------------
  const baseStudio = (over: Partial<Studio> & Pick<Studio, "id" | "name" | "slug">): Studio => ({
    logoUrl: null,
    brandColor: "#2F6F73",
    markets: ["schools"],
    albumDomain: null,
    defaultLabId: "lab_cascade",
    stripe: { status: "active", accountId: `acct_${over.slug}`, payoutSchedule: "weekly", requirementsDue: [] },
    taxInfo: { legalName: over.name, ein: "12-3456789", address: null },
    onboarding: { completed: ["studio", "brand", "markets", "stripe", "lab", "price_sheet"], done: true },
    bigOrderThresholdCents: 15000,
    ytdSalesCents: 0,
    createdAt: iso(now, -400),
    ...over,
  });
  const studios: Studio[] = [
    baseStudio({
      id: DEMO_IDS.studio,
      name: "Brightside Photo Co.",
      slug: "brightside",
      markets: ["schools", "sports", "dance", "seniors"],
      taxInfo: {
        legalName: "Brightside Photo Co. LLC",
        ein: "84-2219034",
        address: { line1: "418 Alder St", line2: null, city: "Portland", state: "OR", postalCode: "97204", country: "US" },
      },
      ytdSalesCents: 182_400_00,
    }),
    baseStudio({ id: "stu_goldenhour", name: "Golden Hour Sports Photo", slug: "goldenhour", brandColor: "#B45309", markets: ["sports"], ytdSalesCents: 312_000_00, createdAt: iso(now, -720) }),
    baseStudio({
      id: "stu_sprouts",
      name: "Little Sprouts Portraits",
      slug: "sprouts",
      brandColor: "#6B8F71",
      markets: ["preschool"],
      stripe: { status: "pending", accountId: "acct_sprouts", payoutSchedule: "weekly", requirementsDue: ["Bank account", "Owner ID"] },
      onboarding: { completed: ["studio", "brand", "markets"], done: false },
      createdAt: iso(now, -5),
    }),
  ];

  const members: Member[] = [
    { id: "mem_jordan", studioId: DEMO_IDS.studio, name: "Jordan Ellis", email: DEMO_CREDENTIALS.owner.email, role: "owner", status: "active", twoFactorEnabled: false },
    { id: "mem_priya", studioId: DEMO_IDS.studio, name: "Priya Shah", email: DEMO_CREDENTIALS.admin.email, role: "admin", status: "active", twoFactorEnabled: false },
    { id: "mem_sam", studioId: DEMO_IDS.studio, name: "Sam Okafor", email: DEMO_CREDENTIALS.photographer.email, role: "photographer", status: "active", twoFactorEnabled: false },
    { id: "mem_casey", studioId: DEMO_IDS.studio, name: "Casey Lin", email: "casey@brightside.photo", role: "photographer", status: "invited", twoFactorEnabled: false },
    { id: "mem_gh_owner", studioId: "stu_goldenhour", name: "Marcus Reed", email: "marcus@goldenhour.photo", role: "owner", status: "active", twoFactorEnabled: true },
    { id: "mem_sp_owner", studioId: "stu_sprouts", name: "Dana Brooks", email: "dana@littlesprouts.photo", role: "owner", status: "active", twoFactorEnabled: false },
  ];

  // --- Price sheets -------------------------------------------------------
  const itemsFor = (sheetId: string, labId: string, priceBump = 0): PriceSheetItem[] =>
    PRODUCT_SPECS.map((p) => {
      const lp = labProducts.find((x) => x.labId === labId && x.id.endsWith(`_${p.key.toLowerCase()}`))!;
      return {
        id: `${sheetId}_${p.key.toLowerCase()}`,
        labProductId: lp.id,
        sku: lp.sku,
        name: p.name,
        category: p.category,
        aspectRatio: p.aspectRatio,
        slots: p.slots,
        customizable: p.customizable,
        minLongEdgePx: p.minLongEdgePx,
        labCostCents: lp.labCostCents,
        priceCents: p.price + priceBump,
        enabled: true,
        soldOut: false,
      };
    });
  const pkg = (sheetId: string, key: string, name: string, description: string, price: number, lines: Array<[string, number]>, featured = false): Package => ({
    id: `${sheetId}_pkg_${key}`,
    name,
    description,
    priceCents: price,
    lines: lines.map(([k, quantity]) => ({ itemId: `${sheetId}_${k}`, quantity })),
    featured,
    enabled: true,
  });

  const schoolSheet: PriceSheet = {
    id: "ps_fall_schools",
    studioId: DEMO_IDS.studio,
    name: "Fall Schools 2026",
    labId: "lab_cascade",
    labName: "Cascade Pro Lab",
    archived: false,
    items: itemsFor("ps_fall_schools", "lab_cascade").map((i) =>
      i.sku.endsWith("-MM") ? { ...i, enabled: false } : i,
    ),
    packages: [
      pkg("ps_fall_schools", "essentials", "Essentials", "The classic set for the fridge and grandparents.", 3900, [["810", 1], ["57p", 1], ["wal8", 1]]),
      pkg("ps_fall_schools", "family", "Family Favorite", "Prints for the whole family plus the digital file.", 6900, [["810", 1], ["57p", 2], ["wal8", 1], ["dig1", 1]], true),
      pkg("ps_fall_schools", "everything", "Everything", "Every photo as a download, plus a print set.", 9900, [["digall", 1], ["810", 1], ["57p", 1], ["wal8", 1]]),
    ],
    jobsUsing: 0,
    updatedAt: iso(now, -20),
  };
  const sportsSheet: PriceSheet = {
    id: "ps_sports",
    studioId: DEMO_IDS.studio,
    name: "Sports Season 2026",
    labId: "lab_cascade",
    labName: "Cascade Pro Lab",
    archived: false,
    items: itemsFor("ps_sports", "lab_cascade", 200),
    packages: [
      pkg("ps_sports", "player", "Player Pack", "Your athlete, ready for the wall and the wallet.", 3200, [["810", 1], ["wal8", 1], ["46", 1]]),
      pkg("ps_sports", "team", "Team Pack", "Memory Mate, team photo and wallets.", 4500, [["mm", 1], ["team", 1], ["wal8", 1]], true),
    ],
    jobsUsing: 0,
    updatedAt: iso(now, -30),
  };
  const danceSheet: PriceSheet = {
    id: "ps_dance_events",
    studioId: DEMO_IDS.studio,
    name: "Dance & Events",
    labId: "lab_northstar",
    labName: "Northstar Imaging",
    archived: false,
    items: itemsFor("ps_dance_events", "lab_northstar", 100),
    packages: [pkg("ps_dance_events", "recital", "Recital Keepsake", "An 8×10, an ornament and the digital file.", 5500, [["810", 1], ["orn", 1], ["dig1", 1]], true)],
    jobsUsing: 0,
    updatedAt: iso(now, -45),
  };
  const oldSheet: PriceSheet = { ...schoolSheet, id: "ps_seniors_2025", name: "Seniors 2025", archived: false, packages: [], items: itemsFor("ps_seniors_2025", "lab_cascade", 600), updatedAt: iso(now, -200) };
  const priceSheets = [schoolSheet, sportsSheet, danceSheet, oldSheet];

  // --- Organizations ------------------------------------------------------
  const org = (id: string, name: string, type: Organization["type"], contactName: string, contactEmail: string, studioId: string = DEMO_IDS.studio): Organization => ({
    id, studioId, name, type, contactName, contactEmail, contactPhone: "(503) 555-0142", address: null, jobCount: 0, lifetimeSalesCents: 0,
  });
  const organizations: Organization[] = [
    org("org_maple", "Maple Grove Elementary", "school", "Dr. Alicia Rivera", "office@maplegrove.k12.example"),
    org("org_eagles", "Eastside Eagles Soccer Club", "league", "Coach Ben Torres", "registrar@eastsideeagles.example"),
    org("org_lumen", "Lumen Dance Academy", "dance_studio", "Mara Lindqvist", "hello@lumendance.example"),
    org("org_westbrook", "Westbrook High School", "school", "Tom Heller", "yearbook@westbrook.example"),
    org("org_gh_league", "Riverside Youth Baseball", "league", "Ana Diaz", "ana@riversideyb.example", "stu_goldenhour"),
    org("org_sp_tots", "Tiny Steps Preschool", "preschool", "Helen Park", "helen@tinysteps.example", "stu_sprouts"),
  ];

  // --- Jobs ---------------------------------------------------------------
  const defaultProtection = { watermark: true, identityOverlay: true, blurOnFocusLoss: true, blockDownload: true };
  const job = (over: Partial<Job> & Pick<Job, "id" | "name" | "organizationId" | "market" | "date" | "albumType" | "status" | "priceSheetId">): Job => ({
    studioId: DEMO_IDS.studio,
    organizationName: organizations.find((o) => o.id === over.organizationId)!.name,
    shipping: { home: true, schoolPickup: false },
    sharedAccessCode: null,
    publishAt: null,
    deadline: null,
    expiresAt: null,
    protection: defaultProtection,
    downloads: { allowDigital: true, allowDownloadAll: true },
    createdAt: iso(new Date(over.date), -21),
    ...over,
  });
  const jobs: Job[] = [
    job({
      id: DEMO_IDS.maple, name: "Fall Picture Day", organizationId: "org_maple", market: "schools", date: iso(now, -6),
      albumType: "personal", status: "live", priceSheetId: schoolSheet.id, shipping: { home: true, schoolPickup: true },
      publishAt: iso(now, -3), deadline: iso(now, 9), expiresAt: iso(now, 120),
    }),
    job({
      id: DEMO_IDS.eagles, name: "U12 Fall Season", organizationId: "org_eagles", market: "sports", date: iso(now, -4),
      albumType: "team", status: "live", priceSheetId: sportsSheet.id, sharedAccessCode: DEMO_CODES.team,
      publishAt: iso(now, -2), deadline: iso(now, 12), expiresAt: iso(now, 90),
    }),
    job({
      id: DEMO_IDS.lumen, name: "Winter Recital", organizationId: "org_lumen", market: "dance", date: iso(now, 10),
      albumType: "open", status: "draft", priceSheetId: danceSheet.id, sharedAccessCode: DEMO_CODES.notPublished,
      publishAt: iso(now, 13), deadline: iso(now, 30),
    }),
    job({
      id: DEMO_IDS.westbrook, name: "Senior Portraits 2025–26", organizationId: "org_westbrook", market: "seniors", date: iso(now, -150),
      albumType: "personal", status: "closed", priceSheetId: oldSheet.id, publishAt: iso(now, -145), deadline: iso(now, -60), expiresAt: iso(now, -20),
    }),
    job({
      id: DEMO_IDS.mapleSpring, name: "Spring Picture Day", organizationId: "org_maple", market: "schools", date: iso(now, 140),
      albumType: "personal", status: "draft", priceSheetId: schoolSheet.id, createdAt: iso(now, -1),
    }),
    job({
      id: "job_gh_spring", studioId: "stu_goldenhour", name: "Spring League Photos", organizationId: "org_gh_league", market: "sports",
      date: iso(now, -12), albumType: "team", status: "live", priceSheetId: sportsSheet.id, sharedAccessCode: "RVRSDE",
      publishAt: iso(now, -10), deadline: iso(now, 4),
    }),
    job({
      id: "job_sp_fall", studioId: "stu_sprouts", name: "Fall Portraits", organizationId: "org_sp_tots", market: "preschool",
      date: iso(now, 8), albumType: "personal", status: "draft", priceSheetId: schoolSheet.id,
    }),
  ];

  // --- Subjects -----------------------------------------------------------
  const subjects: Subject[] = [];
  const usedCodes = new Set<string>(Object.values(DEMO_CODES));
  const freshCode = () => {
    let c = generateCode(rand);
    while (usedCodes.has(c)) c = generateCode(rand);
    usedCodes.add(c);
    return c;
  };
  const addSubject = (jobId: string, firstName: string, lastName: string, group: string, accessCode?: string) => {
    const s: Subject = {
      id: `sub_${jobId.slice(4)}_${subjects.filter((x) => x.jobId === jobId).length + 1}`,
      jobId, firstName, lastName, group, accessCode: accessCode ?? freshCode(),
      referencePhotoUrl: null, matchedPhotoCount: 0, purchased: false,
    };
    subjects.push(s);
    return s;
  };

  const mapleGroups = ["Grade 2 · Ms. Rivera", "Grade 4 · Mr. Abbott", "Kindergarten · Ms. Cho"];
  addSubject(DEMO_IDS.maple, "Ava", "Martinez", mapleGroups[0]!, DEMO_CODES.personal);
  addSubject(DEMO_IDS.maple, "Leo", "Martinez", mapleGroups[1]!, DEMO_CODES.sibling);
  for (let i = 0; i < 22; i++) addSubject(DEMO_IDS.maple, FIRST[(i + 2) % FIRST.length]!, pick(LAST), mapleGroups[i % 3]!);
  for (let i = 0; i < 14; i++) addSubject(DEMO_IDS.eagles, FIRST[(i * 5 + 3) % FIRST.length]!, pick(LAST), "U12 Eagles", DEMO_CODES.team);
  for (let i = 0; i < 18; i++) addSubject(DEMO_IDS.lumen, FIRST[(i * 7 + 1) % FIRST.length]!, pick(LAST), i < 9 ? "Junior Company" : "Senior Company", DEMO_CODES.notPublished);
  addSubject(DEMO_IDS.westbrook, "Grace", "Okafor", "Class of 2026", DEMO_CODES.expired);
  for (let i = 0; i < 9; i++) addSubject(DEMO_IDS.westbrook, FIRST[(i * 3 + 11) % FIRST.length]!, pick(LAST), "Class of 2026");
  for (let i = 0; i < 12; i++) addSubject("job_gh_spring", FIRST[(i * 2 + 5) % FIRST.length]!, pick(LAST), "Riverside Hawks", "RVRSDE");

  // --- Photos and matches -------------------------------------------------
  const photos: Photo[] = [];
  const matches: Match[] = [];
  let photoSeq = 0;
  const addPhoto = (jobId: string, over: Partial<Photo>): Photo => {
    photoSeq++;
    const portrait = !over.group;
    const p: Photo = {
      id: `ph_${photoSeq.toString().padStart(4, "0")}`,
      jobId,
      filename: `IMG_${(4000 + photoSeq).toString()}.jpg`,
      width: portrait ? 4000 : 6000,
      height: portrait ? 5000 : 4000,
      status: "ready",
      tags: [],
      group: null,
      labels: [],
      subjectIds: [],
      thumbUrl: "",
      previewUrl: "",
      duplicateOfId: null,
      uploadedAt: iso(new Date(jobs.find((j) => j.id === jobId)!.date), 0, 6),
      ...over,
    };
    photos.push(p);
    return p;
  };
  const addMatch = (photo: Photo, subjectId: string, confidence: number, status: Match["status"]) => {
    matches.push({ id: `m_${matches.length + 1}`, jobId: photo.jobId, photoId: photo.id, subjectId, confidence, status });
    if (status === "auto" || status === "accepted") photo.subjectIds.push(subjectId);
  };

  const poses = ["Classic", "Smile", "Fun", "Close-up", "Full length"];
  for (const s of subjects.filter((x) => x.jobId === DEMO_IDS.maple)) {
    const count = s.accessCode === DEMO_CODES.personal ? 5 : 3 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      const photo = addPhoto(DEMO_IDS.maple, { tags: [poses[i]!], labels: i === 0 ? ["Yearbook", "ID card"] : [] });
      addMatch(photo, s.id, 0.95 + rand() * 0.049, "auto");
    }
  }
  for (const g of mapleGroups) {
    const groupPhoto = addPhoto(DEMO_IDS.maple, { tags: ["Group"], group: g });
    for (const s of subjects.filter((x) => x.jobId === DEMO_IDS.maple && x.group === g)) groupPhoto.subjectIds.push(s.id);
  }

  const eaglesSubjects = subjects.filter((x) => x.jobId === DEMO_IDS.eagles);
  addPhoto(DEMO_IDS.eagles, { tags: ["Team"], group: "U12 Eagles", subjectIds: eaglesSubjects.map((s) => s.id) });
  addPhoto(DEMO_IDS.eagles, { tags: ["Team", "Fun"], group: "U12 Eagles", subjectIds: eaglesSubjects.map((s) => s.id) });
  eaglesSubjects.forEach((s, idx) => {
    const solo = addPhoto(DEMO_IDS.eagles, { tags: ["Individual"] });
    // A handful land under the auto-accept threshold and wait in the review queue.
    if (idx % 4 === 3) addMatch(solo, s.id, 0.62 + rand() * 0.2, "review");
    else addMatch(solo, s.id, 0.93 + rand() * 0.06, "auto");
    const action = addPhoto(DEMO_IDS.eagles, { tags: ["Action"], width: 6000, height: 4000 });
    if (idx % 3 === 0) addMatch(action, s.id, 0.55 + rand() * 0.25, "review");
    else addMatch(action, s.id, 0.92 + rand() * 0.07, "auto");
  });
  for (let i = 0; i < 5; i++) addPhoto(DEMO_IDS.eagles, { tags: ["Action"], width: 6000, height: 4000 });
  const firstEagles = photos.find((p) => p.jobId === DEMO_IDS.eagles && p.tags.includes("Individual"))!;
  addPhoto(DEMO_IDS.eagles, { tags: ["Individual"], duplicateOfId: firstEagles.id, filename: firstEagles.filename.replace(".jpg", "-1.jpg") });

  for (const s of subjects.filter((x) => x.jobId === DEMO_IDS.westbrook)) {
    for (const pose of ["Classic", "Outdoor", "Cap & gown"]) {
      addMatch(addPhoto(DEMO_IDS.westbrook, { tags: [pose] }), s.id, 0.97, "accepted");
    }
  }
  for (const s of subjects.filter((x) => x.jobId === "job_gh_spring")) {
    addMatch(addPhoto("job_gh_spring", { tags: ["Individual"] }), s.id, 0.96, "auto");
  }

  for (const s of subjects) {
    s.matchedPhotoCount = photos.filter((p) => p.subjectIds.includes(s.id) && !p.group).length;
  }

  // --- Parents ------------------------------------------------------------
  const parents: Parent[] = [
    {
      id: DEMO_IDS.parent, name: "Elena Martinez", email: DEMO_CREDENTIALS.parent.email, phone: DEMO_CREDENTIALS.parent.phone, locale: "en",
      consent: { smsUpdates: true, marketing: false, biometricsAt: null },
      notifications: { orderUpdates: true, galleryReady: true, deadlineReminders: true, channel: "sms" },
    },
  ];
  const ava = subjects.find((s) => s.accessCode === DEMO_CODES.personal)!;
  const leo = subjects.find((s) => s.accessCode === DEMO_CODES.sibling)!;
  const parentSubjects: DemoData["parentSubjects"] = [
    { parentId: DEMO_IDS.parent, subjectId: ava.id, albumCode: DEMO_CODES.personal },
    { parentId: DEMO_IDS.parent, subjectId: leo.id, albumCode: DEMO_CODES.sibling },
  ];

  // --- Orders -------------------------------------------------------------
  const orders: Order[] = [];
  const messages: MessageLog[] = [];
  const labSubmissions: LabSubmission[] = [];
  let orderSeq = 10400;
  const ytd: Record<string, number> = Object.fromEntries(studios.map((s) => [s.id, s.ytdSalesCents]));

  const makeOrder = (jobId: string, subject: Subject, parent: Parent, daysAgo: number, forceStatus?: OrderStatus) => {
    const j = jobs.find((x) => x.id === jobId)!;
    const studio = studios.find((s) => s.id === j.studioId)!;
    const sheet = priceSheets.find((p) => p.id === j.priceSheetId)!;
    const subjectPhotos = photos.filter((p) => p.subjectIds.includes(subject.id) && !p.group);
    const firstPhoto = subjectPhotos[0]?.id ?? photos.find((p) => p.jobId === jobId)!.id;
    const id = `ord_${orderSeq + 1}`;
    const items: OrderItem[] = [];
    const addLine = (kind: "product" | "package", refId: string, name: string, unit: number, labCost: number, quantity: number, photoIds: string[]) => {
      items.push({
        id: `${id}_li${items.length + 1}`, kind, refId, name, quantity, unitPriceCents: unit, albumCode: subject.accessCode,
        subjectId: subject.id, subjectName: `${subject.firstName} ${subject.lastName}`, photoIds, customization: null,
        lineTotalCents: unit * quantity, labCostCents: labCost * quantity,
      });
    };
    const packages = sheet.packages.filter((p) => p.enabled);
    if (packages.length > 0 && rand() < 0.7) {
      const p = pick(packages);
      const labCost = p.lines.reduce((sum, l) => sum + (sheet.items.find((i) => i.id === l.itemId)?.labCostCents ?? 0) * l.quantity, 0);
      addLine("package", p.id, p.name, p.priceCents, labCost, 1, [firstPhoto]);
    }
    const extras = sheet.items.filter((i) => i.enabled && i.category !== "group");
    const extraCount = items.length === 0 ? 1 + Math.floor(rand() * 2) : Math.floor(rand() * 2);
    for (let k = 0; k < extraCount; k++) {
      const it = pick(extras);
      const photo = subjectPhotos[Math.floor(rand() * Math.max(1, subjectPhotos.length))]?.id ?? firstPhoto;
      addLine("product", it.id, it.name, it.priceCents, it.labCostCents, 1 + (rand() < 0.2 ? 1 : 0), it.slots === 0 ? subjectPhotos.map((p) => p.id) : [photo]);
    }
    const lineItemIds = (li: OrderItem) =>
      li.kind === "package" ? (sheet.packages.find((p) => p.id === li.refId)?.lines.map((l) => l.itemId) ?? []) : [li.refId];
    const physical = items.some((li) =>
      lineItemIds(li).some((itemId) => sheet.items.find((i) => i.id === itemId)?.category !== "digital"),
    );
    const pickup = physical && j.shipping.schoolPickup && rand() < 0.4;
    const subtotal = items.reduce((s, li) => s + li.lineTotalCents, 0);
    const discount = rand() < 0.15 ? bps(subtotal, 1000) : 0;
    const shipping = !physical || pickup ? 0 : SHIPPING_CENTS.home;
    const tax = bps(subtotal - discount + shipping, 600);
    const split = splitOrder({
      subtotalCents: subtotal, discountCents: discount, shippingCents: shipping, taxCents: tax,
      labCostCents: items.reduce((s, li) => s + li.labCostCents, 0), ytdSalesCents: ytd[studio.id],
    });
    ytd[studio.id] = (ytd[studio.id] ?? 0) + split.subtotalCents - split.discountCents;

    const created = iso(now, -daysAgo, -Math.floor(rand() * 10));
    const age = daysAgo;
    let status: OrderStatus = forceStatus ?? (age < 1 ? "paid" : age < 3 ? "at_lab" : age < 7 ? "shipped" : "delivered");
    if (!physical && !forceStatus) status = "delivered";
    const reached = (s: OrderStatus) => ["paid", "at_lab", "shipped", "delivered"].indexOf(s);
    const stage = status === "refunded" || status === "partially_refunded" ? 3 : reached(status);
    const timeline: Order["timeline"] = (["paid", "at_lab", "shipped", "delivered"] as const).map((st, idx) => ({
      status: st,
      at: idx <= stage ? iso(new Date(created), idx * 2) : null,
    }));
    const contact = { name: parent.name ?? "Parent", email: parent.email ?? "parent@example.com", phone: parent.phone };
    const order: Order = {
      id, number: `SB-${++orderSeq}`, studioId: studio.id, studioName: studio.name, jobId, jobName: j.name,
      parentId: parent.id, contact,
      delivery: pickup
        ? { method: "school_pickup", address: null }
        : { method: "home", address: { line1: `${100 + Math.floor(rand() * 900)} ${pick(["Oak", "Cedar", "Birch", "Elm", "Willow"])} St`, line2: null, city: "Portland", state: "OR", postalCode: "97214", country: "US" } },
      items, split, status, timeline,
      tracking: stage >= 2 && physical && !pickup ? { carrier: "USPS", number: `9400 1000 0000 ${Math.floor(1e7 + rand() * 9e7)}`, url: "https://tools.usps.com/go/TrackConfirmAction" } : null,
      downloads: items.some((li) => lineItemIds(li).some((itemId) => sheet.items.find((i) => i.id === itemId)?.category === "digital"))
        ? subjectPhotos.map((p) => ({ name: `${subject.firstName} ${subject.lastName} — ${p.tags[0] ?? "Photo"}.jpg`, url: `/downloads/${id}/${p.id}` }))
        : [],
      refunds: status === "refunded" ? [{ id: `rf_${id}`, amountCents: split.chargedCents, reason: "Duplicate order", createdAt: iso(new Date(created), 1) }]
        : status === "partially_refunded" ? [{ id: `rf_${id}`, amountCents: 1200, reason: "Print arrived scratched", createdAt: iso(new Date(created), 6) }] : [],
      reprints: [],
      messages: [],
      createdAt: created,
    };
    const log = (channel: MessageLog["channel"], template: string, body: string, at: string) => {
      const m: MessageLog = {
        id: `msg_${messages.length + 1}`, studioId: studio.id, channel, to: channel === "sms" ? contact.phone ?? contact.email : contact.email,
        template, body, status: "delivered", jobId, orderId: id, createdAt: at,
      };
      messages.push(m);
      order.messages.push(m);
    };
    log("email", "order_confirmation", `Thanks ${contact.name.split(" ")[0]}! Order ${order.number} is confirmed.`, created);
    if (order.tracking) log("sms", "order_shipped", `${studio.name}: order ${order.number} shipped. Track: ${order.tracking.url}`, timeline[2]!.at!);

    if (physical && status !== "refunded") {
      labSubmissions.push({
        id: `lab_${id}`, orderId: id, orderNumber: order.number, studioName: studio.name, labId: sheet.labId, labName: sheet.labName,
        status: stage >= 2 ? "shipped" : stage === 1 ? "accepted" : "queued", attempts: stage >= 1 ? 1 : 0, lastError: null,
        updatedAt: timeline[Math.min(stage, 2)]!.at ?? created,
      });
    }
    subject.purchased = true;
    orders.push(order);
    return order;
  };

  const randomParent = () => {
    const first = pick(["Elena", "Marcus", "Aisha", "Tom", "Keiko", "Daniel", "Fatima", "Chris", "Lauren", "Jamal", "Sara", "Mateo"]);
    const last = pick(LAST);
    const p: Parent = {
      id: `par_${parents.length + 1}`, name: `${first} ${last}`, email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
      phone: `+1555555${(1000 + parents.length).toString().slice(-4)}`,
      locale: "en",
      consent: { smsUpdates: rand() < 0.8, marketing: rand() < 0.3, biometricsAt: null },
      notifications: { orderUpdates: true, galleryReady: true, deadlineReminders: true, channel: rand() < 0.7 ? "sms" : "email" },
    };
    parents.push(p);
    return p;
  };

  const demoParent = parents[0]!;
  makeOrder(DEMO_IDS.maple, leo, demoParent, 2);
  const mapleOthers = subjects.filter((s) => s.jobId === DEMO_IDS.maple && s.id !== ava.id && s.id !== leo.id);
  mapleOthers.slice(0, 14).forEach((s, i) => {
    const parent = randomParent();
    parentSubjects.push({ parentId: parent.id, subjectId: s.id, albumCode: s.accessCode });
    makeOrder(DEMO_IDS.maple, s, parent, i % 4 === 0 ? 0 : (i * 0.4) % 3, i === 5 ? "refunded" : i === 9 ? "partially_refunded" : undefined);
  });
  eaglesSubjects.slice(0, 8).forEach((s, i) => {
    const parent = randomParent();
    parentSubjects.push({ parentId: parent.id, subjectId: s.id, albumCode: DEMO_CODES.team });
    makeOrder(DEMO_IDS.eagles, s, parent, i < 2 ? 0 : i % 3);
  });
  subjects.filter((s) => s.jobId === DEMO_IDS.westbrook).forEach((s, i) => {
    const parent = randomParent();
    parentSubjects.push({ parentId: parent.id, subjectId: s.id, albumCode: s.accessCode });
    makeOrder(DEMO_IDS.westbrook, s, parent, 140 - i * 6);
    if (i % 2 === 0) makeOrder(DEMO_IDS.westbrook, s, parent, 100 - i * 4);
  });
  subjects.filter((s) => s.jobId === "job_gh_spring").forEach((s, i) => {
    makeOrder("job_gh_spring", s, randomParent(), (i % 10) + 1);
  });
  // One lab submission failed and needs a retry from the internal admin.
  const failed = labSubmissions.find((l) => l.status === "queued");
  if (failed) {
    failed.status = "failed";
    failed.attempts = 3;
    failed.lastError = "Lab rejected SKU CAS-1114: source image below 300 DPI at 11×14.";
  }

  // --- Promos and Picture Day Pass ----------------------------------------
  const promos: Promo[] = [
    { id: "promo_fall10", studioId: DEMO_IDS.studio, code: "FALL10", kind: "percent", value: 1000, minSubtotalCents: 0, startsAt: iso(now, -10), endsAt: iso(now, 20), jobIds: [], usageCount: 9, usageLimit: null, active: true },
    { id: "promo_freeship", studioId: DEMO_IDS.studio, code: "FREESHIP", kind: "free_shipping", value: 0, minSubtotalCents: 4000, startsAt: null, endsAt: null, jobIds: [], usageCount: 21, usageLimit: null, active: true },
    { id: "promo_eagles5", studioId: DEMO_IDS.studio, code: "GOEAGLES", kind: "fixed", value: 500, minSubtotalCents: 2500, startsAt: null, endsAt: iso(now, 12), jobIds: [DEMO_IDS.eagles], usageCount: 3, usageLimit: 50, active: true },
    { id: "promo_spring", studioId: DEMO_IDS.studio, code: "SPRING25", kind: "percent", value: 2500, minSubtotalCents: 0, startsAt: iso(now, -220), endsAt: iso(now, -160), jobIds: [], usageCount: 41, usageLimit: 100, active: false },
  ];
  const passOffers: PassOffer[] = [
    { id: "po_lumen", studioId: DEMO_IDS.studio, jobId: DEMO_IDS.lumen, jobName: "Winter Recital", amountsCents: [2500, 5000, 7500], bonusBps: 1000, endsAt: iso(now, 10), active: true, soldCount: 2 },
    { id: "po_maple", studioId: DEMO_IDS.studio, jobId: DEMO_IDS.maple, jobName: "Fall Picture Day", amountsCents: [3000, 6000], bonusBps: 1000, endsAt: iso(now, -6), active: false, soldCount: 11 },
  ];
  const passes: Pass[] = [
    { id: "pass_1", jobId: DEMO_IDS.lumen, parentId: "par_2", studioId: DEMO_IDS.studio, amountPaidCents: 5000, creditCents: 5500, remainingCents: 5500, createdAt: iso(now, -2) },
    { id: "pass_2", jobId: DEMO_IDS.lumen, parentId: "par_3", studioId: DEMO_IDS.studio, amountPaidCents: 2500, creditCents: 2750, remainingCents: 2750, createdAt: iso(now, -1) },
  ];

  // --- Scheduled messages -------------------------------------------------
  const scheduledMessages: ScheduledMessage[] = [];
  for (const j of jobs.filter((x) => x.studioId === DEMO_IDS.studio && x.publishAt)) {
    const deadline = j.deadline ? new Date(j.deadline) : null;
    const add = (kind: ScheduledMessage["kind"], sendAt: string | null, subject: string, body: string, channel: ScheduledMessage["channel"] = "both") => {
      const sent = sendAt && new Date(sendAt) < now;
      scheduledMessages.push({
        id: `sm_${j.id.slice(4)}_${kind}`, jobId: j.id, kind, channel, sendAt, subject, body, enabled: true,
        sentCount: sent ? 40 + (hashString(j.id + kind) % 80) : 0,
      });
    };
    if (j.id === DEMO_IDS.lumen) {
      add("pass_offer", iso(now, -3), "Pre-pay for recital photos and save 10%", "Lock in recital photos with a Picture Day Pass: pay now, get 10% extra credit. {{pass_link}}");
    }
    add("publish", j.publishAt, "{{child}}'s photos are ready", "{{studio}}: {{child}}'s {{job}} photos are ready to view. {{album_link}}");
    if (deadline) {
      add("reminder", iso(deadline, -5), "Reminder: order {{child}}'s photos", "Don't forget: {{child}}'s photos are waiting. Order by {{deadline}} for free school delivery. {{album_link}}");
      add("deadline", iso(deadline, -1), "Last day tomorrow", "Ordering for {{job}} closes tomorrow. {{album_link}}", "sms");
      add("last_chance", iso(deadline, 0, -6), "Last chance today", "Last chance! Orders for {{job}} close tonight. {{album_link}}", "sms");
    }
    add("shipped", null, "Your order has shipped", "{{studio}}: your order {{order_number}} is on its way. {{tracking_link}}", "sms");
  }
  for (const j of jobs.filter((x) => x.status === "live" && x.studioId === DEMO_IDS.studio)) {
    messages.push({
      id: `msg_${messages.length + 1}`, studioId: DEMO_IDS.studio, channel: "sms", to: "+15555550199", template: "gallery_published",
      body: `Brightside Photo Co.: photos from ${j.name} are ready to view.`, status: "delivered", jobId: j.id, orderId: null, createdAt: j.publishAt!,
    });
  }
  messages.push({
    id: `msg_${messages.length + 1}`, studioId: DEMO_IDS.studio, channel: "sms", to: "+15555550177", template: "gallery_published",
    body: "Brightside Photo Co.: photos from Fall Picture Day are ready to view.", status: "suppressed", jobId: DEMO_IDS.maple, orderId: null, createdAt: jobs[0]!.publishAt!,
  });

  // --- Roll-ups -----------------------------------------------------------
  for (const o of organizations) {
    o.jobCount = jobs.filter((j) => j.organizationId === o.id).length;
    o.lifetimeSalesCents = orders
      .filter((ord) => jobs.find((j) => j.id === ord.jobId)?.organizationId === o.id)
      .reduce((s, ord) => s + ord.split.subtotalCents - ord.split.discountCents, 0);
  }
  for (const sheet of priceSheets) sheet.jobsUsing = jobs.filter((j) => j.priceSheetId === sheet.id).length;

  const flags: FeatureFlag[] = [
    { key: "find_me_selfie_search", description: "Selfie search in Team and Open albums", enabled: true, studioIds: [] },
    { key: "picture_day_pass", description: "Pre-pay Picture Day Pass offers", enabled: true, studioIds: [] },
    { key: "custom_album_domains", description: "Studios can serve albums from their own domain", enabled: false, studioIds: [DEMO_IDS.studio] },
    { key: "lab_northstar", description: "Northstar Imaging as a fulfilment lab", enabled: true, studioIds: [] },
    { key: "ai_retouch", description: "Automatic blemish retouch (v3)", enabled: false, studioIds: [] },
  ];

  return {
    now: now.toISOString(),
    studios, members, labs, labProducts, priceSheets, organizations, jobs, subjects, photos, matches,
    promos, passOffers, passes, parents, parentSubjects, orders, messages, scheduledMessages, labSubmissions, flags,
  };
}
