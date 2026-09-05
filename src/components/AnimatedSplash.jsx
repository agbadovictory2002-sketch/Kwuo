import React, { useState, useEffect } from "react";
import { INK, ACCENT } from "../theme";

export default function AnimatedSplash({ onComplete }) {
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setIsFading(true), 2000);
    const removeTimer = setTimeout(() => onComplete && onComplete(), 2400);
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, [onComplete]);

  return (
    <>
      <style>{`
        @keyframes bouncePop { 0% { transform: scale(0); opacity: 0; } 55% { transform: scale(1.15); opacity: 1; } 75% { transform: scale(0.94); } 100% { transform: scale(1); } }
        @keyframes ringPulse { 0% { transform: scale(0.6); opacity: 0.55; } 100% { transform: scale(2.2); opacity: 0; } }
        @keyframes drawCheck { from { stroke-dashoffset: 140; } to { stroke-dashoffset: 0; } }
        @keyframes quickFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div 
        style={{ 
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
          background: INK, display: "flex", flexDirection: "column", 
          alignItems: "center", justifyContent: "center", overflow: "hidden",
          opacity: isFading ? 0 : 1, transition: "opacity 0.4s ease-out"
        }}
      >
        <div style={{ position: "relative", width: 96, height: 96, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              position: "absolute", width: 96, height: 96, borderRadius: "50%",
              border: `3px solid ${ACCENT}`, opacity: 0,
              animation: "ringPulse 0.7s 0.05s cubic-bezier(.2,.7,.3,1) forwards",
            }}
          />
          <div
            style={{
              width: 96, height: 96, borderRadius: 22, background: ACCENT,
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "bouncePop 0.55s cubic-bezier(.34,1.56,.64,1) both",
            }}
          >
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              <path
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
          className="disp"
          style={{
            color: "#fff", fontSize: 22, fontWeight: 700, letterSpacing: 1,
            marginTop: 18, opacity: 0,
            animation: "quickFadeUp 0.35s 0.4s ease forwards",
          }}
        >
          Kwuo
        </div>
      </div>
    </>
  );
}
