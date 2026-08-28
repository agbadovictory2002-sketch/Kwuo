import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { INK, ACCENT, inputStyle, labelStyle, FontFaces } from "../theme";

export default function AuthScreen() {
  const [mode, setMode] = useState("signup"); // "signup" | "login"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || !password || busy) return;
    if (mode === "signup" && password.length < 6) {
      setErr("Password must be at least 6 characters");
      return;
    }
    setBusy(true); setErr("");
    const { error } =
      mode === "signup"
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setErr(error.message);
    // On success, App.jsx's onAuthStateChange picks up the new session
    // automatically and moves past this screen — nothing else to do here.
  }

  return (
    <div style={{ background: INK, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: 28, color: "#fff" }}>
      <FontFaces />
      <div className="disp" style={{ fontSize: 15, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>Kwuo</div>
      <div className="disp" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.25 }}>Sell. Track. Get paid.</div>
      <div style={{ opacity: 0.75, fontSize: 14, marginTop: 8, marginBottom: 30, maxWidth: 320, lineHeight: 1.5 }}>
        Wholesale order and credit tracking, built for the market floor.
      </div>

      <div style={{ display: "flex", background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: 4, marginBottom: 20 }}>
        <button
          onClick={() => { setMode("signup"); setErr(""); }}
          style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 13.5, background: mode === "signup" ? ACCENT : "transparent", color: mode === "signup" ? "#3A2A0A" : "rgba(255,255,255,0.7)" }}
        >
          Sign Up
        </button>
        <button
          onClick={() => { setMode("login"); setErr(""); }}
          style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 13.5, background: mode === "login" ? ACCENT : "transparent", color: mode === "login" ? "#3A2A0A" : "rgba(255,255,255,0.7)" }}
        >
          Log In
        </button>
      </div>

      <label style={{ ...labelStyle, color: "rgba(255,255,255,0.6)" }}>Email address</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" type="email" style={{ ...inputStyle, marginBottom: 12 }} />

      <label style={{ ...labelStyle, color: "rgba(255,255,255,0.6)" }}>Password</label>
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "signup" ? "At least 6 characters" : "Your password"} type="password" style={{ ...inputStyle, marginBottom: 6 }} onKeyDown={(e) => e.key === "Enter" && submit()} />

      {err && <div style={{ color: "#F3B8A6", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}

      <button onClick={submit} disabled={busy} style={{ width: "100%", background: ACCENT, color: "#3A2A0A", border: "none", borderRadius: 14, padding: "15px", fontSize: 15.5, fontWeight: 700, marginTop: 10, opacity: busy ? 0.7 : 1 }}>
        {busy ? (mode === "signup" ? "Creating account…" : "Signing in…") : (mode === "signup" ? "Create account" : "Log in")}
      </button>
    </div>
  );
}
