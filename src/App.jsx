import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabaseClient";
import { rowToCustomer, rowToTxn } from "./lib/mappers";
import AuthScreen from "./components/AuthScreen";
import BusinessOnboarding from "./components/BusinessOnboarding";
import Ledger from "./components/Ledger";
import AnimatedSplash from "./components/AnimatedSplash";
import { INK, PAPER, FontFaces } from "./theme";

const QUEUE_KEY = "kwuo-offline-queue";

function loadQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; }
}
function saveQueue(q) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {}
}
function isNetworkError(e) {
  return !navigator.onLine || (e && (e.message === "Failed to fetch" || e.name === "TypeError" || e.message === "timeout"));
}
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

export default function App() {
  const [authLoaded, setAuthLoaded] = useState(false);
  const [session, setSession] = useState(null);
  const [splashMinTimeUp, setSplashMinTimeUp] = useState(false);

  const [bizLoaded, setBizLoaded] = useState(false);
  const [business, setBusiness] = useState(null);
  const [member, setMember] = useState(null);
  const [queue, setQueue] = useState(loadQueue());
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const processingRef = useRef(false);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSplashMinTimeUp(true), 850);
    return () => clearTimeout(t);
  }, []);

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

    let hadCache = false;
    try {
      const cachedBiz = localStorage.getItem(`kwuo-business-${session.user.id}`);
      const cachedMem = localStorage.getItem(`kwuo-member-${session.user.id}`);
      if (cachedBiz && cachedMem) {
        setBusiness(JSON.parse(cachedBiz));
        setMember(JSON.parse(cachedMem));
        setBizLoaded(true);
        hadCache = true;
      }
    } catch {}

    if (!hadCache) setBizLoaded(false);

    try {
      const { data: memberships, error } = await withTimeout(
        supabase.from("business_members").select("*, businesses(*)").eq("user_id", session.user.id).limit(1),
        6000
      );
      if (error) throw error;

      if (memberships && memberships.length > 0) {
        setMember(memberships[0]);
        setBusiness(memberships[0].businesses);
        setPendingInvite(null);
        setBizLoaded(true);
        try {
          localStorage.setItem(`kwuo-business-${session.user.id}`, JSON.stringify(memberships[0].businesses));
          localStorage.setItem(`kwuo-member-${session.user.id}`, JSON.stringify(memberships[0]));
        } catch {}
        return;
      }

      if (!hadCache) {
        const email = session.user.email;
        const { data: invites } = await withTimeout(
          supabase.from("business_invites").select("*").ilike("email", email).limit(1),
          6000
        );
        setPendingInvite(invites && invites.length > 0 ? invites[0] : null);
        setBusiness(null);
        setMember(null);
      }
      setBizLoaded(true);
    } catch (e) {
      setBizLoaded(true);
    }
  }, [session]);

  useEffect(() => {
    if (session) loadBusiness();
  }, [session, loadBusiness]);

  // ---------- load ledger data + realtime sync ----------
  const lastLoadRef = React.useRef(0);

  const loadData = useCallback(async () => {
    if (!business) return;
    lastLoadRef.current = Date.now();

    try {
      const cachedCustomers = localStorage.getItem(`kwuo-customers-${business.id}`);
      const cachedTxns = localStorage.getItem(`kwuo-txns-${business.id}`);
      if (cachedCustomers) setCustomers(JSON.parse(cachedCustomers));
      if (cachedTxns) setTxns(JSON.parse(cachedTxns));
    } catch {}

    try {
      const [{ data: custRows, error: custErr }, { data: txnRows, error: txnErr }] = await withTimeout(
        Promise.all([
          supabase.from("customers").select("*").eq("business_id", business.id).order("name"),
          supabase.from("transactions").select("*").eq("business_id", business.id).order("date", { ascending: false }),
        ]),
        8000
      );
      if (custErr || txnErr) throw (custErr || txnErr);
      const loadedCustomers = (custRows || []).map(rowToCustomer);
      const loadedTxns = (txnRows || []).map(rowToTxn);
      setCustomers(loadedCustomers);
      setTxns(loadedTxns);
      try {
        localStorage.setItem(`kwuo-customers-${business.id}`, JSON.stringify(loadedCustomers));
        localStorage.setItem(`kwuo-txns-${business.id}`, JSON.stringify(loadedTxns));
      } catch {}
    } catch (e) {
      // network slow/unreachable — cached data (already shown above) stands as-is
    }
  }, [business]);

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

  // ---------- offline queue ----------
  const enqueue = useCallback((action) => {
    setQueue((q) => {
      const next = [...q, { ...action, qid: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())) }];
      saveQueue(next);
      return next;
    });
  }, []);

  const flushQueue = useCallback(async () => {
    if (processingRef.current || !navigator.onLine || !business) return;
    processingRef.current = true;
    setSyncing(true);
    let q = loadQueue();
    const idMap = {};
    let changed = false;

    while (q.length > 0) {
      const item = q[0];
      try {
        if (item.type === "addCustomer") {
          const { data, error } = await supabase
            .from("customers")
            .insert({ business_id: business.id, name: item.name, phone: item.phone })
            .select()
            .single();
          if (error) throw error;
          idMap[item.tempId] = data.id;
        } else if (item.type === "insertTxns") {
          const rows = item.rows.map((r) => ({ ...r, customer_id: idMap[r.customer_id] || r.customer_id }));
          const { error } = await supabase.from("transactions").insert(rows);
          if (error) throw error;
        }
        q = q.slice(1);
        changed = true;
      } catch (e) {
        break;
      }
    }

    saveQueue(q);
    setQueue(q);
    processingRef.current = false;
    setSyncing(false);
    if (changed) await loadData();
  }, [business, loadData]);

  useEffect(() => {
    if (!business) return;
    flushQueue();
    const onOnline = () => flushQueue();
    window.addEventListener("online", onOnline);
    const iv = setInterval(flushQueue, 20000);
    return () => { window.removeEventListener("online", onOnline); clearInterval(iv); };
  }, [business, flushQueue]);

  async function insertTxnRows(rows) {
    const withIds = rows.map((r) => ({ ...r, id: r.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())), date: r.date || new Date().toISOString() }));
    if (navigator.onLine) {
      try {
        const { error } = await supabase.from("transactions").insert(withIds);
        if (!error) { await loadData(); return; }
        alert(error.message);
        throw error;
      } catch (e) {
        if (!isNetworkError(e)) throw e;
      }
    }
    setTxns((t) => [...t, ...withIds.map((r) => ({ ...rowToTxn(r), pending: true }))]);
    enqueue({ type: "insertTxns", rows: withIds });
  }

  // ---------- CRUD ----------
  async function addCustomer(name, phone) {
    const trimmedName = name.trim();
    const trimmedPhone = (phone || "").trim();
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from("customers")
          .insert({ business_id: business.id, name: trimmedName, phone: trimmedPhone })
          .select()
          .single();
        if (!error) { await loadData(); return rowToCustomer(data); }
        alert(error.message);
        throw error;
      } catch (e) {
        if (!isNetworkError(e)) throw e;
      }
    }
    const tempId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
    const optimistic = { id: tempId, name: trimmedName, phone: trimmedPhone, createdAt: Date.now(), pending: true };
    setCustomers((cs) => [...cs, optimistic]);
    enqueue({ type: "addCustomer", tempId, name: trimmedName, phone: trimmedPhone });
    return optimistic;
  }

  async function logSale(customerId, amount, note, paidNow) {
    const by = (member && member.display_name) || "";
    const rows = [{ business_id: business.id, customer_id: customerId, type: "sale", amount, note, logged_by_name: by }];
    if (paidNow) rows.push({ business_id: business.id, customer_id: customerId, type: "payment", amount, note: "Paid at point of sale", logged_by_name: by });
    await insertTxnRows(rows);
  }

  async function recordPayment(customerId, amount, note, startSaleId) {
    const by = (member && member.display_name) || "";
    const openSales = txns
      .filter((t) => !t.deleted && t.type === "sale" && t.customerId === customerId)
      .map((s) => {
        const paid = txns
          .filter((t) => !t.deleted && t.type === "payment" && t.appliesToSaleId === s.id)
          .reduce((sum, p) => sum + p.amount, 0);
        return { ...s, remaining: s.amount - paid };
      })
      .filter((s) => s.remaining > 0.009)
      .sort((a, b) => a.date - b.date);

    let order = openSales;
    if (startSaleId) {
      const chosen = openSales.find((s) => s.id === startSaleId);
      if (chosen) order = [chosen, ...openSales.filter((s) => s.id !== startSaleId)];
    }

    let remainingAmt = amount;
    const rows = [];
    for (const sale of order) {
      if (remainingAmt <= 0) break;
      const applyAmt = Math.min(remainingAmt, sale.remaining);
      rows.push({ business_id: business.id, customer_id: customerId, type: "payment", amount: applyAmt, note, applies_to_sale_id: sale.id, logged_by_name: by });
      remainingAmt -= applyAmt;
    }
    if (remainingAmt > 0.009) {
      rows.push({ business_id: business.id, customer_id: customerId, type: "payment", amount: remainingAmt, note, applies_to_sale_id: null, logged_by_name: by });
    }
    await insertTxnRows(rows);
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
  if (!authLoaded || !splashMinTimeUp || (session && !bizLoaded)) {
    return <AnimatedSplash />;
  }

  if (!session) return <AuthScreen />;

  if (!business) {
    return <BusinessOnboarding user={session.user} pendingInvite={pendingInvite} onDone={loadBusiness} />;
  }

  const deletedTxns = txns.filter((t) => t.deleted).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  const activeTxns = txns;

  return (
    <>
      {!isOnline && (
        <div style={{ background: "#C4462B", color: "#fff", textAlign: "center", fontSize: 12, padding: "5px 8px", fontWeight: 600, position: "relative", zIndex: 1000 }}>
          Offline — changes save on this phone and sync automatically once you're back online.
        </div>
      )}
      <Ledger
        business={business}
        member={member}
        customers={customers}
        txns={activeTxns}
        deletedTxns={deletedTxns}
        amountsVisible={amountsVisible}
        setAmountsVisible={setAmountsVisible}
        pendingSyncCount={queue.length}
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
    </>
  );
            }
