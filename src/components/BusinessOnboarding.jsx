import React, { useState } from "react";
import { Store } from "lucide-react";
import { supabase } from "../supabaseClient";
import { INK, ACCENT, inputStyle, labelStyle, FontFaces } from "../theme";

export default function BusinessOnboarding({ user, pendingInvite, onDone }) {
  const [businessName, setBusinessName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function createBusiness() {
    if (!businessName.trim() || !displayName.trim() || busy) return;
    setBusy(true);
    setErr("");
    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .insert({ name: businessName.trim() })
      .select()
      .single();
    if (bizErr) { setErr(bizErr.message); setBusy(false); return; }

    const { error: memErr } = await supabase.from("business_members").insert({
      business_id: biz.id,
      user_id: user.id,
      display_name: displayName.trim(),
      role: "owner",
    });
    setBusy(false);
    if (memErr) { setErr(memErr.message); return; }
    onDone();
  }

  async function acceptInvite() {
    if (!displayName.trim() || busy) return;
    setBusy(true);
    setErr("");
    const { error: memErr } = await supabase.from("business_members").insert({
      business_id: pendingInvite.business_id,
      user_id: user.id,
      display_name: displayName.trim(),
      role: "member",
    });
    if (memErr) { setErr(memErr.message); setBusy(false); return; }
    await supabase.from("business_invites").delete().eq("id", pendingInvite.id);
    setBusy(false);
    onDone();
  }

  return (
    <div style={{ background: INK, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: 28, color: "#fff" }}>
      <FontFaces />
      <Store size={26} color={ACCENT} />
      <div className="disp" style={{ fontSize: 26, fontWeight: 700, marginTop: 10 }}>
        {pendingInvite ? "You've been invited" : "Set up your business"}
      </div>
      <div style={{ opacity: 0.75, fontSize: 14, marginTop: 6, marginBottom: 26, lineHeight: 1.5, maxWidth: 320 }}>
        {pendingInvite
          ? "Join the team already using Kwuo to track sales and credit."
          : "This becomes your shared ledger — invite your team once you're set up."}
      </div>

      <label style={{ ...labelStyle, color: "rgba(255,255,255,0.6)" }}>Your name</label>
      <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Victory" style={{ ...inputStyle, marginBottom: 16 }} />

      {!pendingInvite && (
        <>
          <label style={{ ...labelStyle, color: "rgba(255,255,255,0.6)" }}>Business name</label>
          <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Chidera Stores" style={{ ...inputStyle, marginBottom: 16 }} />
        </>
      )}

      {err && <div style={{ color: "#F3B8A6", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}

      <button
        onClick={pendingInvite ? acceptInvite : createBusiness}
        disabled={busy}
        style={{ width: "100%", background: ACCENT, color: "#3A2A0A", border: "none", borderRadius: 14, padding: "15px", fontSize: 15.5, fontWeight: 700, opacity: busy ? 0.7 : 1 }}
      >
        {busy ? "Setting up…" : pendingInvite ? "Join business" : "Create my business"}
      </button>
    </div>
  );
                                    }
