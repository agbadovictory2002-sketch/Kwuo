        import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { rowToCustomer, rowToTxn } from "./lib/mappers";
import AuthScreen from "./components/AuthScreen";
import BusinessOnboarding from "./components/BusinessOnboarding";
import Ledger from "./components/Ledger";
import { INK, PAPER, FontFaces } from "./theme";

export default function App() {
  const [authLoaded, setAuthLoaded] = useState(false);
  const [session, setSession] = useState(null);

  const [bizLoaded, setBizLoaded] = useState(false);
  const [business, setBusiness] = useState(null);
  const [member, setMember] = useState(null);
  const [pendingInvite, setPendingInvite] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [txns, setTxns] = useState([]);
  const [amountsVisible, setAmountsVisible] = useState(
    localStorage.getItem("kwuo-amounts-visible") !== "false"
  );

  useEffect(() => {
    localStorage.setItem("kwuo-amounts-visible", String(amountsVisible));
  }, [amountsVisible]);

  // ---------- auth ----------
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // ---------- find (or offer to join/create) a business for this user ----------
  const loadBusiness = useCallback(async () => {
    if (!session) return;
    setBizLoaded(false);
    const { data: memberships } = await supabase
      .from("business_members")
      .select("*, businesses(*)")
      .eq("user_id", session.user.id)
      .limit(1);

    if (memberships && memberships.length > 0) {
      setMember(memberships[0]);
      setBusiness(memberships[0].businesses);
      setPendingInvite(null);
      setBizLoaded(true);
      return;
    }

    const email = session.user.email;
    const { data: invites } = await supabase
      .from("business_invites")
      .select("*")
      .ilike("email", email)
      .limit(1);

    setPendingInvite(invites && invites.length > 0 ? invites[0] : null);
    setBusiness(null);
    setMember(null);
    setBizLoaded(true);
  }, [session]);

  useEffect(() => {
    if (session) loadBusiness();
  }, [session, loadBusiness]);

  // ---------- load ledger data + realtime sync ----------
  const lastLoadRef = React.useRef(0);

  const loadData = useCallback(async () => {
    if (!business) return;
    lastLoadRef.current = Date.now();
    const [{ data: custRows }, { data: txnRows }] = await Promise.all([
      supabase.from("customers").select("*").eq("business_id", business.id).order("name"),
      supabase.from("transactions").select("*").eq("business_id", business.id).order("date", { ascending: false }),
    ]);
    setCustomers((custRows || []).map(rowToCustomer));
    setTxns((txnRows || []).map(rowToTxn));
  }, [business]);

  // Realtime keeps other devices in sync, but skip the echo of our own
  // just-completed save — reloading twice in a row is what was making
  // every action feel slow.
  const loadDataDebounced = useCallback(() => {
    if (Date.now() - lastLoadRef.current < 1200) return;
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!business) return;
    loadData();

    const channel = supabase
      .channel(`business-${business.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "customers", filter: `business_id=eq.${business.id}` }, loadDataDebounced)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `business_id=eq.${business.id}` }, loadDataDebounced)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [business, loadData, loadDataDebounced]);

  // ---------- CRUD ----------
  async function addCustomer(name, phone) {
    const { data, error } = await supabase
      .from("customers")
      .insert({ business_id: business.id, name: name.trim(), phone: (phone || "").trim() })
      .select()
      .single();
    if (error) { alert(error.message); throw error; }
    await loadData();
    return rowToCustomer(data);
  }

  async function logSale(customerId, amount, note, paidNow) {
    const by = (member && member.display_name) || "";
    const rows = [{ business_id: business.id, customer_id: customerId, type: "sale", amount, note, logged_by_name: by }];
    if (paidNow) rows.push({ business_id: business.id, customer_id: customerId, type: "payment", amount, note: "Paid at point of sale", logged_by_name: by });
    const { error } = await supabase.from("transactions").insert(rows);
    if (error) { alert(error.message); throw error; }
    await loadData();
  }

  async function recordPayment(customerId, amount, note) {
    const by = (member && member.display_name) || "";
    const { error } = await supabase.from("transactions").insert({ business_id: business.id, customer_id: customerId, type: "payment", amount, note, logged_by_name: by });
    if (error) { alert(error.message); throw error; }
    await loadData();
  }

  async function updateTxn(id, updates) {
    const by = (member && member.display_name) || "";
    const { error } = await supabase.from("transactions").update({ amount: updates.amount, note: updates.note, edited_by_name: by }).eq("id", id);
    if (error) { alert(error.message); throw error; }
    await loadData();
  }

  async function deleteTxn(id) {
    const by = (member && member.display_name) || "";
    const { error } = await supabase.from("transactions").update({ deleted: true, deleted_at: new Date().toISOString(), deleted_by_name: by }).eq("id", id);
    if (error) { alert(error.message); throw error; }
    await loadData();
  }

  async function restoreTxn(id) {
    const { error } = await supabase.from("transactions").update({ deleted: false, deleted_at: null, deleted_by_name: null }).eq("id", id);
    if (error) { alert(error.message); throw error; }
    await loadData();
  }

  async function saveBusinessName(name) {
    const { error } = await supabase.from("businesses").update({ name: name.trim() }).eq("id", business.id);
    if (error) { alert(error.message); throw error; }
    setBusiness((b) => ({ ...b, name: name.trim() }));
  }

  async function savePin(pin) {
    const { error } = await supabase.from("businesses").update({ delete_pin: pin || null }).eq("id", business.id);
    if (error) { alert(error.message); throw error; }
    setBusiness((b) => ({ ...b, delete_pin: pin || null }));
  }

  async function saveCurrency(currencyCode) {
    const { error } = await supabase.from("businesses").update({ currency_code: currencyCode }).eq("id", business.id);
    if (error) { alert(error.message); throw error; }
    setBusiness((b) => ({ ...b, currency_code: currencyCode }));
  }

  async function inviteTeammate(email) {
    const { error } = await supabase.from("business_invites").insert({ business_id: business.id, email: email.toLowerCase() });
    return !error;
  }

  async function changeDisplayName(name) {
    const { error } = await supabase.from("business_members").update({ display_name: name }).eq("id", member.id);
    if (error) { alert(error.message); throw error; }
    setMember((m) => ({ ...m, display_name: name }));
  }

  function csvEscape(val) {
    const s = String(val ?? "");
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function exportBackup() {
    try {
      const customerName = (id) => (customers.find((c) => c.id === id) || {}).name || "Unknown";
      const header = ["Date", "Customer", "Type", "Amount", "Note", "Logged by", "Deleted"];
      const rows = [...txns]
        .sort((a, b) => a.date - b.date)
        .map((t) => [
          new Date(t.date).toISOString().slice(0, 16).replace("T", " "),
          customerName(t.customerId),
          t.type === "sale" ? "Sale" : "Payment",
          t.amount,
          t.note || "",
          t.loggedBy || "",
          t.deleted ? "Yes" : "No",
        ]);
      const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n");
      // BOM so Excel opens the ₦ symbol and other characters correctly
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kwuo-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return true;
    } catch (e) {
      return false;
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  // ---------- render ----------
  if (!authLoaded || (session && !bizLoaded)) {
    return (
      <div style={{ background: PAPER, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <FontFaces />
        <div style={{ color: INK, fontFamily: "'IBM Plex Sans', sans-serif", opacity: 0.6 }}>Opening ledger…</div>
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  if (!business) {
    return <BusinessOnboarding user={session.user} pendingInvite={pendingInvite} onDone={loadBusiness} />;
  }

  const deletedTxns = txns.filter((t) => t.deleted).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  const activeTxns = txns; // Ledger filters deleted where needed

  return (
    <Ledger
      business={business}
      member={member}
      customers={customers}
      txns={activeTxns}
      deletedTxns={deletedTxns}
      amountsVisible={amountsVisible}
      setAmountsVisible={setAmountsVisible}
      onAddCustomer={addCustomer}
      onLogSale={logSale}
      onRecordPayment={recordPayment}
      onUpdateTxn={updateTxn}
      onDeleteTxn={deleteTxn}
      onRestoreTxn={restoreTxn}
      onSaveBusinessName={saveBusinessName}
      onSavePin={savePin}
      onSaveCurrency={saveCurrency}
      onInviteTeammate={inviteTeammate}
      onChangeDisplayName={changeDisplayName}
      onExportBackup={exportBackup}
      onSignOut={signOut}
    />
  );
}
