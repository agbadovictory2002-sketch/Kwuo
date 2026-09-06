import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { rowToCustomer, rowToTxn } from "./lib/mappers";
import AuthScreen from "./components/AuthScreen";
import BusinessOnboarding from "./components/BusinessOnboarding";
import Ledger from "./components/Ledger";
import AnimatedSplash from "./components/AnimatedSplash";
import { INK, PAPER, FontFaces } from "./theme";

export default function App() {
  const [authLoaded, setAuthLoaded] = useState(false);
  const [session, setSession] = useState(null);
  const [splashMinTimeUp, setSplashMinTimeUp] = useState(false);

  const [bizLoaded, setBizLoaded] = useState(false);
  const [business, setBusiness] = useState(null);
  const [member, setMember] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const t = setTimeout(() => setSplashMinTimeUp(true), 1300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (business) processOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [business]);

  const [pendingInvite, setPendingInvite] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [txns, setTxns] = useState([]);
  const [amountsVisible, setAmountsVisible] = useState(
    localStorage.getItem("kwuo-amounts-visible") !== "false"
  );

  useEffect(() => {
    localStorage.setItem("kwuo-amounts-visible", String(amountsVisible));
  }, [amountsVisible]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoaded(true);
    }).catch(() => {
      setAuthLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadBusiness = useCallback(async () => {
    if (!session) return;
    setBizLoaded(false);

    if (!navigator.onLine) {
      const cachedBiz = localStorage.getItem("kwuo_cached_business") || localStorage.getItem(`kwuo_business_${session.user.id}`);
      const cachedMem = localStorage.getItem("kwuo_cached_member") || localStorage.getItem(`kwuo_member_${session.user.id}`);
      if (cachedBiz && cachedMem) {
        setBusiness(JSON.parse(cachedBiz));
        setMember(JSON.parse(cachedMem));
        setPendingInvite(null);
      }
      setBizLoaded(true);
      return;
    }

    try {
      const { data: memberships, error } = await supabase
        .from("business_members")
        .select("*, businesses(*)")
        .eq("user_id", session.user.id)
        .limit(1);

      if (error) throw error;

      if (memberships && memberships.length > 0) {
        setMember(memberships[0]);
        setBusiness(memberships[0].businesses);
        setPendingInvite(null);
        localStorage.setItem("kwuo_cached_business", JSON.stringify(memberships[0].businesses));
        localStorage.setItem("kwuo_cached_member", JSON.stringify(memberships[0]));
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
    } catch (e) {
      const cachedBiz = localStorage.getItem("kwuo_cached_business") || localStorage.getItem(`kwuo_business_${session.user.id}`);
      const cachedMem = localStorage.getItem("kwuo_cached_member") || localStorage.getItem(`kwuo_member_${session.user.id}`);
      if (cachedBiz && cachedMem) {
        setBusiness(JSON.parse(cachedBiz));
        setMember(JSON.parse(cachedMem));
      }
      setBizLoaded(true);
    }
  }, [session]);

  useEffect(() => {
    if (session) loadBusiness();
  }, [session, loadBusiness]);

  useEffect(() => {
    if (business && session) {
      localStorage.setItem(`kwuo_business_${session.user.id}`, JSON.stringify(business));
      localStorage.setItem("kwuo_cached_business", JSON.stringify(business));
      if (member) {
        localStorage.setItem(`kwuo_member_${session.user.id}`, JSON.stringify(member));
        localStorage.setItem("kwuo_cached_member", JSON.stringify(member));
      }
    }
  }, [business, member, session]);

  const lastLoadRef = React.useRef(0);

  const loadData = useCallback(async () => {
    if (!business) return;
    lastLoadRef.current = Date.now();
    try {
      const [{ data: custRows }, { data: txnRows }] = await Promise.all([
        supabase.from("customers").select("*").eq("business_id", business.id).order("name"),
        supabase.from("transactions").select("*").eq("business_id", business.id).order("date", { ascending: false }),
      ]);
      const loadedCusts = (custRows || []).map(rowToCustomer);
      const loadedTxns = (txnRows || []).map(rowToTxn);

      setCustomers(loadedCusts);
      setTxns(loadedTxns);

      localStorage.setItem(`kwuo_customers_${business.id}`, JSON.stringify(loadedCusts));
      localStorage.setItem(`kwuo_txns_${business.id}`, JSON.stringify(loadedTxns));
    } catch (e) {
      const cachedCusts = localStorage.getItem(`kwuo_customers_${business.id}`);
      const cachedTxns = localStorage.getItem(`kwuo_txns_${business.id}`);
      if (cachedCusts) setCustomers(JSON.parse(cachedCusts));
      if (cachedTxns) setTxns(JSON.parse(cachedTxns));
    }
  }, [business]);

  const saveOfflineAction = (actionType, payload, tempId = null) => {
    const queueKey = `kwuo_queue_${business.id}`;
    const existingQueue = JSON.parse(localStorage.getItem(queueKey) || "[]");
    existingQueue.push({ type: actionType, payload, tempId, timestamp: Date.now() });
    localStorage.setItem(queueKey, JSON.stringify(existingQueue));
  };

  const processOfflineQueue = async () => {
    if (!business || !navigator.onLine) return;
    const queueKey = `kwuo_queue_${business.id}`;
    let existingQueue = JSON.parse(localStorage.getItem(queueKey) || "[]");
    if (existingQueue.length === 0) return;

    const idMap = {}; 
    const remainingQueue = [];

    for (let i = 0; i < existingQueue.length; i++) {
      const item = existingQueue[i];
      try {
        if (item.type === "ADD_CUSTOMER") {
          const { data, error } = await supabase.from("customers").insert(item.payload).select().single();
          if (error) throw error;
          if (item.tempId) idMap[item.tempId] = data.id;
        } else if (item.type === "INSERT_TXN") {
          const rowsToInsert = item.payload.map(row => {
            if (idMap[row.customer_id]) {
              return { ...row, customer_id: idMap[row.customer_id] };
            }
            return row;
          });
          const { error } = await supabase.from("transactions").insert(rowsToInsert);
          if (error) throw error;
        } else if (item.type === "UPDATE_TXN") {
          const { error } = await supabase.from("transactions").update(item.payload.updates).eq("id", item.payload.id);
          if (error) throw error;
        }
      } catch (err) {
        remainingQueue.push(...existingQueue.slice(i));
        break; 
      }
    }

    if (remainingQueue.length > 0) {
      localStorage.setItem(queueKey, JSON.stringify(remainingQueue));
    } else {
      localStorage.removeItem(queueKey);
    }
    await loadData();
  };

  const loadDataDebounced = useCallback(() => {
    if (Date.now() - lastLoadRef.current < 1200) return;
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!business) return;
    loadData();
    processOfflineQueue();

    const channel = supabase
      .channel(`business-${business.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "customers", filter: `business_id=eq.${business.id}` }, loadDataDebounced)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `business_id=eq.${business.id}` }, loadDataDebounced)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [business, loadData, loadDataDebounced]);

  async function addCustomer(name, phone) {
    const customerPayload = { business_id: business.id, name: name.trim(), phone: (phone || "").trim() };
    const tempId = "local_" + Date.now();
    const newCustObj = { id: tempId, businessId: business.id, name: name.trim(), phone: (phone || "").trim() };

    if (!navigator.onLine) {
      const updatedCusts = [newCustObj, ...customers];
      setCustomers(updatedCusts);
      localStorage.setItem(`kwuo_customers_${business.id}`, JSON.stringify(updatedCusts));
      saveOfflineAction("ADD_CUSTOMER", customerPayload, tempId);
      return newCustObj;
    }

    try {
      const { data, error } = await supabase
        .from("customers")
        .insert(customerPayload)
        .select()
        .single();
      if (error) throw error;
      await loadData();
      return rowToCustomer(data);
    } catch (e) {
      const updatedCusts = [newCustObj, ...customers];
      setCustomers(updatedCusts);
      localStorage.setItem(`kwuo_customers_${business.id}`, JSON.stringify(updatedCusts));
      saveOfflineAction("ADD_CUSTOMER", customerPayload, tempId);
      return newCustObj;
    }
  }

  async function logSale(customerId, amount, note, paidNow) {
    const by = (member && member.display_name) || "";
    const rows = [{ business_id: business.id, customer_id: customerId, type: "sale", amount, note, logged_by_name: by }];
    if (paidNow) rows.push({ business_id: business.id, customer_id: customerId, type: "payment", amount, note: "Paid at point of sale", logged_by_name: by });

    if (!navigator.onLine) {
      saveOfflineAction("INSERT_TXN", rows);
      return;
    }

    try {
      const { error } = await supabase.from("transactions").insert(rows);
      if (error) throw error;
      await loadData();
    } catch (e) {
      saveOfflineAction("INSERT_TXN", rows);
    }
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

    if (!navigator.onLine) {
      saveOfflineAction("INSERT_TXN", rows);
      return;
    }

    try {
      const { error } = await supabase.from("transactions").insert(rows);
      if (error) throw error;
      await loadData();
    } catch (e) {
      saveOfflineAction("INSERT_TXN", rows);
    }
  }

  async function updateTxn(id, updates) {
    const by = (member && member.display_name) || "";
    const updatePayload = { amount: updates.amount, note: updates.note, edited_by_name: by };

    if (!navigator.onLine) {
      saveOfflineAction("UPDATE_TXN", { id, updates: updatePayload });
      return;
    }

    try {
      const { error } = await supabase.from("transactions").update(updatePayload).eq("id", id);
      if (error) throw error;
      await loadData();
    } catch (e) {
      saveOfflineAction("UPDATE_TXN", { id, updates: updatePayload });
    }
  }

  async function deleteTxn(id) {
    const by = (member && member.display_name) || "";
    const updatePayload = { deleted: true, deleted_at: new Date().toISOString(), deleted_by_name: by };

    if (!navigator.onLine) {
      saveOfflineAction("UPDATE_TXN", { id, updates: updatePayload });
      return;
    }

    try {
      const { error } = await supabase.from("transactions").update(updatePayload).eq("id", id);
      if (error) throw error;
      await loadData();
    } catch (e) {
      saveOfflineAction("UPDATE_TXN", { id, updates: updatePayload });
    }
  }

  async function restoreTxn(id) {
    if (!navigator.onLine) {
      alert("You must be online to restore transactions.");
      return;
    }
    const updatePayload = { deleted: false, deleted_at: null, deleted_by_name: null };
    try {
      const { error } = await supabase.from("transactions").update(updatePayload).eq("id", id);
      if (error) throw error;
      await loadData();
    } catch (e) {
      alert("Network problem. Could not restore transaction right now.");
    }
  }

  async function saveBusinessName(name) {
    if (!navigator.onLine) {
      alert("Network problem. Please connect to the internet to change your business name.");
      return;
    }
    try {
      const { error } = await supabase.from("businesses").update({ name: name.trim() }).eq("id", business.id);
      if (error) throw error;
      setBusiness((b) => ({ ...b, name: name.trim() }));
    } catch (e) {
      alert("Network problem. Business name update failed.");
    }
  }

  async function savePin(pin) {
    if (!navigator.onLine) {
      alert("Network problem. Please connect to the internet to change your PIN.");
      return;
    }
    try {
      const { error } = await supabase.from("businesses").update({ delete_pin: pin || null }).eq("id", business.id);
      if (error) throw error;
      setBusiness((b) => ({ ...b, delete_pin: pin || null }));
    } catch (e) {
      alert("Network problem. PIN update failed.");
    }
  }

  async function saveCurrency(currencyCode) {
    if (!navigator.onLine) {
      alert("Network problem. Please connect to the internet to change currency.");
      return;
    }
    try {
      const { error } = await supabase.from("businesses").update({ currency_code: currencyCode }).eq("id", business.id);
      if (error) throw error;
      setBusiness((b) => ({ ...b, currency_code: currencyCode }));
    } catch (e) {
      alert("Network problem. Currency update failed.");
    }
  }

  async function changeDisplayName(name) {
    if (!navigator.onLine) {
      alert("Network problem. Please connect to the internet to change your display name.");
      return;
    }
    try {
      const { error } = await supabase.from("business_members").update({ display_name: name }).eq("id", member.id);
      if (error) throw error;
      setMember((m) => ({ ...m, display_name: name }));
    } catch (e) {
      alert("Network problem. Display name update failed.");
    }
  }

  async function inviteTeammate(email) {
    if (!navigator.onLine) {
      alert("Network problem. You must be online to invite teammates.");
      return false;
    }
    try {
      const { error } = await supabase.from("business_invites").insert({ business_id: business.id, email: email.toLowerCase() });
      if (error) throw error;
      return true;
    } catch (e) {
      alert("Network problem. Teammate invitation failed.");
      return false;
    }
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
    try {
      await supabase.auth.signOut();
    } catch (e) {
      alert("Network problem signing out. Please check your connection.");
    }
  }

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
      <FontFaces />
      {!isOnline && (
        <div style={{ background: "#C4462B", color: "#fff", textAlign: "center", fontSize: "12px", padding: "4px", fontWeight: "600", zIndex: 10000, position: "relative" }}>
          Network problem: You are offline. Changes are saved locally and will sync automatically when online.
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
                  
