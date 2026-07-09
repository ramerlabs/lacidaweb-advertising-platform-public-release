import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #06B6D4 0%, #10B981 100%)",
          borderRadius: 8,
          fontSize: 22,
          fontWeight: 800,
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        L
      </div>
    ),
    { ...size },
  );
}
