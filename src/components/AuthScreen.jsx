import React, { useState } from "react";
import { Mail } from "lucide-react";
import { supabase } from "../supabaseClient";
import { INK, ACCENT, inputStyle, labelStyle, FontFaces } from "../theme";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    if (!email.trim() || busy) return;
    setBusy(true); setErr("");
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setBusy(false);
    if (error) setErr(error.message); else setSent(true);
  }

  async function verifyCode() {
    if (!code.trim() || busy) return;
    setBusy(true); setErr("");
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setErr(error.message);
  }

  return (
    <div style={{ background: INK, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: 28, color: "#fff" }}>
      <FontFaces />
      <div className="disp" style={{ fontSize: 15, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>Kwuo</div>
      <div className="disp" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.25 }}>Sell. Track. Get paid.</div>

      {!sent ? (
        <>
          <label style={{ ...labelStyle, color: "rgba(255,255,255,0.6)", marginTop: 30 }}>Email address</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" type="email" style={{ ...inputStyle, marginBottom: 6 }} />
          {err && <div style={{ color: "#F3B8A6", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
          <button onClick={sendCode} disabled={busy} style={{ width: "100%", background: ACCENT, color: "#3A2A0A", border: "none", borderRadius: 14, padding: "15px", fontSize: 15.5, fontWeight: 700, marginTop: 10 }}>
            {busy ? "Sending…" : "Send me a code"}
          </button>
        </>
      ) : (
        <>
          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, display: "flex", gap: 12, marginTop: 30, marginBottom: 20 }}>
            <Mail size={20} color={ACCENT} />
            <div style={{ fontSize: 13 }}>Enter the 6-digit code sent to {email}</div>
          </div>
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" inputMode="numeric" style={{ ...inputStyle, fontSize: 22, textAlign: "center", letterSpacing: 6 }} />
          {err && <div style={{ color: "#F3B8A6", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
          <button onClick={verifyCode} disabled={busy} style={{ width: "100%", background: ACCENT, color: "#3A2A0A", border: "none", borderRadius: 14, padding: "15px", fontSize: 15.5, fontWeight: 700 }}>
            {busy ? "Checking…" : "Verify code"}
          </button>
        </>
      )}
    </div>
  );
}
