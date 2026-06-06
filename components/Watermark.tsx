"use client";

export function Watermark() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none"
      style={{
        backgroundImage: "url(/palmwise-watermark.png)",
        backgroundSize: "340px 340px",
        backgroundRepeat: "repeat",
        opacity: 0.17,
        mixBlendMode: "screen",
        zIndex: 50,
      }}
    />
  );
}
