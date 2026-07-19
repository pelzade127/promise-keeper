import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Promise Keeper — remember the people attached to your promises.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F6F2EA",
          fontFamily: "sans-serif",
        }}
      >
        {/* Roots + shoot mark, scaled up */}
        <svg width="140" height="140" viewBox="0 0 64 64">
          <path
            d="M10 40c4-4 10-6 22-6s18 2 22 6v6c0 3-2 5-5 5H15c-3 0-5-2-5-5v-6z"
            fill="#C9923E"
            opacity={0.18}
          />
          <path
            d="M32 34c-3 4-4 7-3 13M32 34c-7 3-10 6-11 11M32 34c7 3 10 6 11 11M32 34c3 5 3 8 1 13M32 34c-1 5-1 8 1 13"
            stroke="#8A6A3B"
            strokeWidth={2.4}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M32 34V17"
            stroke="#2F5D50"
            strokeWidth={2.6}
            strokeLinecap="round"
          />
          <path d="M32 24c-6-1-9-5-9-10 6 0 10 3 11 9z" fill="#2F5D50" />
          <path d="M32 20c6-1 9-5 9-9-6 0-10 2-11 8z" fill="#3E7A64" />
        </svg>

        <div
          style={{
            marginTop: 28,
            fontSize: 72,
            fontWeight: 700,
            color: "#2F5D50",
            letterSpacing: "-0.02em",
          }}
        >
          Promise Keeper
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: 30,
            color: "#6B5B45",
          }}
        >
          Remember the people attached to your promises.
        </div>
      </div>
    ),
    { ...size },
  );
}
