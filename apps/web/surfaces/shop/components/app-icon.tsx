/** Raster version of app/icon.svg for PWA install and the iOS home screen (rendered by next/og). */
export function AppIconArt({ size }: { size: number }) {
  const u = size / 64;
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#f5b700" }}>
      <div style={{ position: "relative", width: 40 * u, height: 34 * u, display: "flex" }}>
        <div style={{ position: "absolute", left: 12 * u, top: 0, width: 16 * u, height: 8 * u, borderRadius: 3 * u, background: "#1c1b1f" }} />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 6 * u,
            width: 40 * u,
            height: 28 * u,
            borderRadius: 6 * u,
            background: "#1c1b1f",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 18 * u, height: 18 * u, borderRadius: 9 * u, background: "#f5b700", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 10 * u, height: 10 * u, borderRadius: 5 * u, background: "#1c1b1f" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
