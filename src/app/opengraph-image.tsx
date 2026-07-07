import { ImageResponse } from "next/og";

export const alt = "Asuka Brewing & Space — Single-Origin Beans, Slow-Roasted";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded social-share card, rendered at build time. Uses the site's warm-honey
// palette so links shared on WhatsApp/Instagram show a proper preview.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(145deg, #0e0905 0%, #241812 55%, #3a2818 100%)",
          padding: "72px 80px",
          color: "#fbf7ed",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 40, height: 2, background: "#e8b870" }} />
          <div
            style={{
              fontSize: 22,
              letterSpacing: 8,
              textTransform: "uppercase",
              color: "#e8b870",
              fontWeight: 600,
            }}
          >
            Est 2025 · Pejaten, Jakarta Selatan
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 132,
              fontWeight: 700,
              letterSpacing: 8,
              lineHeight: 1,
              color: "#fbf7ed",
            }}
          >
            ASUKA
          </div>
          <div
            style={{
              fontSize: 40,
              color: "#e8b870",
              marginTop: 12,
              fontStyle: "italic",
            }}
          >
            Brewing &amp; Space
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 30, color: "rgba(251,247,237,0.82)" }}>
          Single-origin beans · slow-roasted · shipped to your door
        </div>
      </div>
    ),
    { ...size },
  );
}
