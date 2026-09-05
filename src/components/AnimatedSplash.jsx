import React from "react";
import { INK, ACCENT } from "../theme";

export default function AnimatedSplash() {
  return (
    <div style={{ background: INK, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <div style={{ position: "relative", width: 96, height: 96, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          className="splash-ring"
          style={{
            position: "absolute", width: 96, height: 96, borderRadius: "50%",
            border: `3px solid ${ACCENT}`, opacity: 0,
            animation: "ringPulse 0.7s 0.05s cubic-bezier(.2,.7,.3,1) forwards",
          }}
        />
        <div
          className="splash-icon"
          style={{
            width: 96, height: 96, borderRadius: 22, background: ACCENT,
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "bouncePop 0.55s cubic-bezier(.34,1.56,.64,1) both",
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
              style={{ animation: "drawCheck 0.35s 0.2s cubic-bezier(.4,0,.2,1) forwards" }}
            />
          </svg>
        </div>
      </div>
      <div
        className="splash-text disp"
        style={{
          color: "#fff", fontSize: 22, fontWeight: 700, letterSpacing: 1,
          marginTop: 18, opacity: 0,
          animation: "quickFadeUp 0.35s 0.4s ease forwards",
        }}
      >
        Kwuo
      </div>
    </div>
  );
}
