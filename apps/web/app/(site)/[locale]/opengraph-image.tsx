import { defineMessages, isLocale } from "@snapbell/sdk";
import { ImageResponse } from "next/og";
import { homeMsgs } from "@site/messages/home";

/** The brand name only, so the alt text is right in every language. */
export const alt = "Snapbell";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const taglines = defineMessages(
  { line: "Check-in · Smart Match · Family Store · No monthly fee" },
  {
    ru: { line: "Регистрация · Smart Match · Family Store · Без абонентской платы" },
    uz: { line: "Roʻyxatga olish · Smart Match · Family Store · Oylik toʻlov yoʻq" },
  },
);

/**
 * Default social card for every page, in the page's language. Cyrillic and the
 * Uzbek ʻ are not in the bundled font; next/og fetches Noto Sans for them at render time.
 */
export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "en";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#FAF7F2", padding: 72 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "#F5B700", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 34, height: 34, borderRadius: 17, background: "#1C1B1F" }} />
          </div>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#1C1B1F" }}>snapbell</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: locale === "en" ? 76 : 64, lineHeight: 1.08, color: "#1C1B1F", maxWidth: 1040 }}>{homeMsgs[locale].hero.title}</div>
          <div style={{ fontSize: 32, color: "#6B6770" }}>{taglines[locale].line}</div>
        </div>
        <div style={{ display: "flex", height: 16, width: "100%", borderRadius: 8, background: "#F5B700" }} />
      </div>
    ),
    size,
  );
}
