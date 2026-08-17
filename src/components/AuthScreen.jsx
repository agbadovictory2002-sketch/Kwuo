import React, { useState } from "react";
import { Mail, Check } from "lucide-react";
import { supabase } from "../supabaseClient";
import { INK, ACCENT, PAPER, TEXT, LINE, inputStyle, labelStyle, FontFaces } from "../theme";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendLink() {
    if (!email.trim() || busy) return;
    setBusy(true);
    setErr("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  }

  return (
    <div style={{ background: INK, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: 28, color: "#fff" }}>
      <FontFaces />
      <div className="disp" style={{ fontSize: 15, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>
        Kwuo
      </div>
      <div className="disp" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.25 }}>
        Sell. Track. Get paid.
      </div>
      <div style={{ opacity: 0.75, fontSize: 14, marginTop: 8, marginBottom: 30, maxWidth: 320, lineHeight: 1.5 }}>
        Wholesale order and credit tracking, built for the market floor.
      </div>

      {!sent ? (
        <>
          <label style={{ ...labelStyle, color: "rgba(255,255,255,0.6)" }}>Email address</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@business.com"
            type="email"
            style={{ ...inputStyle, marginBottom: 6 }}
            onKeyDown={(e) => e.key === "Enter" && sendLink()}
          />
          {err && <div style={{ color: "#F3B8A6", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
          <button
            onClick={sendLink}
            disabled={busy}
            style={{ width: "100%", background: ACCENT, color: "#3A2A0A", border: "none", borderRadius: 14, padding: "15px", fontSize: 15.5, fontWeight: 700, marginTop: 10, opacity: busy ? 0.7 : 1 }}
          >
            {busy ? "Sending…" : "Send me a sign-in link"}
          </button>
          <div style={{ fontSize: 12, opacity: 0.55, marginTop: 14, lineHeight: 1.5 }}>
            No password to remember — we'll email you a link that signs you straight in.
          </div>
        </>
      ) : (
        <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <Mail size={20} color={ACCENT} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Check your email</div>
            <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4, lineHeight: 1.5 }}>
              We sent a sign-in link to {email}. Open it on this device to continue.
            </div>
          </div>
        </div>
      )}
    </div>
  );
          }
