import { defineMessages, type Locale } from "@snapbell/sdk";

const demoMsgs = defineMessages(
  { text: "Demo: try code SAMPLE (one child's album) or EAGLES (a team album with selfie search). Use any email; the one-time code appears on screen." },
  {
    ru: { text: "Демо: попробуйте код SAMPLE (альбом одного ребёнка) или EAGLES (командный альбом с поиском по селфи). Подойдёт любой email — одноразовый код появится на экране." },
    uz: { text: "Demo: SAMPLE (bitta farzand albomi) yoki EAGLES (selfi orqali qidiruvli jamoaviy albom) kodini sinab koʻring. Istalgan email mos keladi — bir martalik kod ekranda chiqadi." },
  },
);

/** Shown on the public demo deployment (NEXT_PUBLIC_DEMO_MODE=true) and in local development. */
export function DemoNotice({ locale }: { locale: Locale }) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true" && process.env.NODE_ENV === "production") return null;
  return <p className="mt-6 rounded-input bg-accent/15 p-3 text-center text-sm">{demoMsgs[locale].text}</p>;
}
