import React from "react";

export const INK = "#1F4D3A";
export const INK_DARK = "#153327";
export const ACCENT = "#E8A33D";
export const PAPER = "#FAF8F3";
export const TEXT = "#1A1A16";
export const RUST = "#C4462B";
export const SAGE = "#7FA98E";
export const LINE = "#DDD6C4";
export const CARD = "#FFFFFF";

export const cardStyle = { background: CARD, border: "1px solid " + LINE, borderRadius: 14, padding: "12px 14px" };
export const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid " + LINE, background: "#fff", fontSize: 15, outline: "none", marginBottom: 12 };
export const labelStyle = { fontSize: 12.5, fontWeight: 600, color: "#6B6455", marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: 0.4 };

export function FontFaces() {
  const css = [
    "@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');",
    "* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }",
    "body { margin: 0; }",
    ".num { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }",
    ".disp { font-family: 'Fraunces', serif; }",
    "button { font-family: inherit; cursor: pointer; }",
    "input, select { font-family: inherit; }",
    "::placeholder { color: #B7AF9B; }",
    "@keyframes riseIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }",
    "@keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }",
    "@media (prefers-reduced-motion: reduce) { .rise-anim, .sheet-anim { animation: none !important; } }",
  ].join("\n");
  return <style>{css}</style>;
}

export function naira(n) {
  const v = Math.round(Number(n) || 0);
  return "₦" + v.toLocaleString("en-NG");
}

export function fmtDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return "Today, " + d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Yesterday, " + d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" }) + ", " + d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
}

export function waLink(phone, text) {
  var digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) digits = "234" + digits.slice(1);
  else if (digits.length === 10) digits = "234" + digits;
  return "https://wa.me/" + digits + "?text=" + encodeURIComponent(text);
}
