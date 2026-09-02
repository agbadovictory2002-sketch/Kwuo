import React from "react";
import { INK, ACCENT } from "../theme";

export default function AnimatedSplash() {
  return (
    <div style={{ background: INK, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div
        className="splash-icon"
        style={{
          width: 96, height: 96, borderRadius: 22, background: ACCENT,
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "popIn 0.5s cubic-bezier(.2,.8,.2,1) both",
        }}
      >
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
          <path
            className="splash-check"
            d="M12 27 L22 37 L40 15"
            stroke={INK}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="140"
            strokeDashoffset="140"
            style={{ animation: "drawCheck 0.6s 0.35s cubic-bezier(.4,0,.2,1) forwards" }}
          />
        </svg>
      </div>
      <div
        className="splash-text disp"
        style={{
          color: "#fff", fontSize: 22, fontWeight: 700, letterSpacing: 1,
          marginTop: 18, opacity: 0,
          animation: "fadeUp 0.5s 0.75s ease forwards",
        }}
      >
        Kwuo
      </div>
    </div>
  );
}
