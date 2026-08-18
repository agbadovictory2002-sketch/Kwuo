import React, { useState, useEffect, useMemo } from "react";
import {
  Home, Users, Clock, Plus, ArrowLeft, Phone, MessageCircle, Check, X, Search,
  ShoppingBag, Wallet, AlertCircle, Settings, BookOpen, Eye, EyeOff, Lock, LogOut, UserPlus, Mic,
} from "lucide-react";
import {
  INK, INK_DARK, ACCENT, PAPER, TEXT, RUST, SAGE, LINE, CARD,
  cardStyle, inputStyle, labelStyle, FontFaces, naira, fmtDate, waLink,
} from "../theme";
import { parseVoiceEntry } from "../lib/voiceParse";

const AmountVisibilityContext = React.createContext(true);
function useAmt() {
  const visible = React.useContext(AmountVisibilityContext);
  return (n) => (visible ? naira(n) : "₦ • • • •");
}

export default function Ledger({
  business, member, customers, txns, deletedTxns,
  onAddCustomer, onLogSale, onRecordPayment, onUpdateTxn, onDeleteTxn, onRestoreTxn,
  onSaveBusinessName, onSavePin, onInviteTeammate, onChangeDisplayName, onExportBackup, onSignOut,
  amountsVisible, setAmountsVisible,
}) {
  const [view, setView] = useState("dashboard");
  const [activeCustomerId, setActiveCustomerId] = useState(null);
  const [activeTxnId, setActiveTxnId] = useState(null);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2200); }

  const balances = useMemo(() => {
    const map = {};
    for (const c of customers) map[c.id] = 0;
    for (const t of txns) {
      if (t.deleted) continue;
      if (!(t.customerId in map)) continue;
      map[t.customerId] += t.type === "sale" ? t.amount : -t.amount;
    }
    return map;
  }, [customers, txns]);

  const totalOwed = useMemo(() => Object.values(balances).reduce((s, v) => s + Math.max(0, v), 0), [balances]);

  const debtors = useMemo(
    () => customers.map((c) => ({ ...c, balance: balances[c.id] || 0 })).filter((c) => c.balance > 0).sort((a, b) => b.balance - a.balance),
    [customers, balances]
  );

  const todayStats = useMemo(() => {
    const now = new Date();
    let sales = 0, collected = 0;
    for (const t of txns) {
      if (t.deleted) continue;
      if (new Date(t.date).toDateString() !== now.toDateString()) continue;
      if (t.type === "sale") sales += t.amount; else collected += t.amount;
    }
    return { sales, collected, net: sales - collected };
  }, [txns]);

  const recentItems = useMemo(() => {
    const counts = {}, lastSeen = {};
    for (const t of txns) {
      if (t.deleted || t.type !== "sale" || !t.note) continue;
      const key = t.note.trim();
      if (!key || key.length > 40) continue;
      counts[key] = (counts[key] || 0) + 1;
      lastSeen[key] = Math.max(lastSeen[key] || 0, t.date);
    }
    return Object.keys(counts).sort((a, b) => (counts[b] - counts[a]) || (lastSeen[b] - lastSeen[a])).slice(0, 10);
  }, [txns]);

  const activeCustomer = customers.find((c) => c.id === activeCustomerId) || null;
  const freeLimitHit = business.plan === "free" && customers.length >= 20;

  return (
    <AmountVisibilityContext.Provider value={amountsVisible}>
      <div style={{ background: PAPER, minHeight: "100vh", fontFamily: "'IBM Plex Sans', sans-serif", color: TEXT, paddingBottom: 92, position: "relative" }}>
        <FontFaces />

        {view !== "customerDetail" && (
          <TopBar businessName={business.name} amountsVisible={amountsVisible} onToggleAmounts={() => setAmountsVisible((v) => !v)} onSettings={() => setModal("settings")} />
        )}

        {view === "dashboard" && (
          <Dashboard totalOwed={totalOwed} debtors={debtors} today={todayStats} customerCount={customers.length}
            onOpenCustomer={(id) => { setActiveCustomerId(id); setView("customerDetail"); }} />
        )}

        {view === "customers" && (
          <CustomersList customers={customers} balances={balances}
            onOpen={(id) => { setActiveCustomerId(id); setView("customerDetail"); }}
            onAdd={() => (freeLimitHit ? showToast("Free plan limit reached — upgrade for more customers") : setModal("addCustomer"))} />
        )}

        {view === "customerDetail" && activeCustomer && (
          <CustomerDetail
            customer={activeCustomer}
            balance={balances[activeCustomer.id] || 0}
            txns={txns.filter((t) => t.customerId === activeCustomer.id && !t.deleted).sort((a, b) => b.date - a.date)}
            amountsVisible={amountsVisible}
            onToggleAmounts={() => setAmountsVisible((v) => !v)}
            onBack={() => setView("customers")}
            onLogSale={() => setModal("logSale")}
            onRecordPayment={() => setModal("recordPayment")}
            onEditTxn={(id) => { setActiveTxnId(id); setModal("editTxn"); }}
            onRemind={() => {
              const bal = balances[activeCustomer.id] || 0;
              const msg = `Hello ${activeCustomer.name}, this is a reminder of your outstanding balance of ${naira(bal)}. Kindly settle at your earliest convenience. Thank you.`;
              window.open(waLink(activeCustomer.phone, msg), "_blank");
            }}
          />
        )}

        {view !== "customerDetail" && <BottomNav view={view} setView={setView} onPlus={() => setModal("logSale")} />}

        {modal === "logSale" && (
          <LogSaleModal
            customers={customers}
            recentItems={recentItems}
            preselected={view === "customerDetail" ? activeCustomerId : null}
            onClose={() => setModal(null)}
            onCreateCustomer={onAddCustomer}
            onSubmit={async (customerId, amount, note, paidNow) => {
              await onLogSale(customerId, amount, note, paidNow);
              setModal(null);
              showToast(paidNow ? `Logged ${naira(amount)} — paid in full` : `Logged ${naira(amount)} on credit`);
            }}
          />
        )}

        {modal === "addCustomer" && (
          <AddCustomerModal onClose={() => setModal(null)} onSubmit={async (name, phone) => {
            await onAddCustomer(name, phone); setModal(null); showToast(`${name} added`);
          }} />
        )}

        {modal === "recordPayment" && activeCustomer && (
          <RecordPaymentModal customer={activeCustomer} balance={balances[activeCustomer.id] || 0}
            onClose={() => setModal(null)}
            onSubmit={async (amount, note) => { await onRecordPayment(activeCustomer.id, amount, note); setModal(null); showToast(`Payment of ${naira(amount)} recorded`); }} />
        )}

        {modal === "editTxn" && (() => {
          const t = txns.find((x) => x.id === activeTxnId);
          if (!t) return null;
          return (
            <EditTxnModal txn={t} deletePin={business.delete_pin}
              onClose={() => { setModal(null); setActiveTxnId(null); }}
              onSave={async (updates) => { await onUpdateTxn(t.id, updates); setModal(null); setActiveTxnId(null); showToast("Transaction updated"); }}
              onDelete={async () => { await onDeleteTxn(t.id); setModal(null); setActiveTxnId(null); showToast("Transaction deleted"); }}
            />
          );
        })()}

        {modal === "settings" && (
          <SettingsModal
            businessName={business.name} plan={business.plan} member={member} deletePin={business.delete_pin}
            customerCount={customers.length} txnCount={txns.filter((t) => !t.deleted).length} deletedCount={deletedTxns.length}
            onClose={() => setModal(null)}
            onSave={async (name) => { await onSaveBusinessName(name); setModal(null); showToast("Saved"); }}
            onSavePin={async (pin) => { await onSavePin(pin); showToast(pin ? "PIN set" : "PIN removed"); }}
            onChangeDisplayName={async (name) => { await onChangeDisplayName(name); showToast("Updated"); }}
            onInvite={async (email) => { const ok = await onInviteTeammate(email); showToast(ok ? `Invited ${email}` : "Couldn't send invite"); }}
            onOpenRecycleBin={() => setModal("recycleBin")}
            onExport={() => { const ok = onExportBackup(); showToast(ok ? "Backup downloaded" : "Couldn't create backup"); }}
            onSignOut={onSignOut}
          />
        )}

        {modal === "recycleBin" && (
          <RecycleBinModal items={deletedTxns} customers={customers} onClose={() => setModal(null)}
            onRestore={async (id) => { await onRestoreTxn(id); showToast("Transaction restored"); }} />
        )}

        {toast && <Toast text={toast} />}
      </div>
    </AmountVisibilityContext.Provider>
  );
}

// ---------- Top bar ----------
function TopBar({ businessName, onSettings, amountsVisible, onToggleAmounts }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 0" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
        <span className="disp" style={{ fontSize: 17, fontWeight: 700, color: INK }}>Kwuo</span>
        {businessName && <span style={{ fontSize: 12, color: "#8A8270" }}>· {businessName}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button onClick={onToggleAmounts} style={{ background: "none", border: "none", padding: 6, color: "#8A8270" }} aria-label={amountsVisible ? "Hide amounts" : "Show amounts"}>
          {amountsVisible ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
        <button onClick={onSettings} style={{ background: "none", border: "none", padding: 6, color: "#8A8270" }}>
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
}

// ---------- Dashboard ----------
function Dashboard({ totalOwed, debtors, today, onOpenCustomer, customerCount }) {
  const amt = useAmt();
  return (
    <div style={{ animation: "riseIn .35s ease" }} className="rise-anim">
      <div style={{ background: INK, color: "#fff", padding: "28px 20px 26px", borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <div style={{ fontSize: 13, opacity: 0.75, letterSpacing: 0.4 }}>Total outstanding</div>
        <div className="num disp" style={{ fontSize: 42, fontWeight: 700, marginTop: 4, color: totalOwed > 0 ? ACCENT : "#DFF3E8" }}>{amt(totalOwed)}</div>
        <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>
          {debtors.length === 0 ? "Nobody owes you right now" : `owed by ${debtors.length} of ${customerCount} customer${customerCount === 1 ? "" : "s"}`}
        </div>
      </div>

      <div style={{ padding: "16px 16px 4px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, opacity: 0.55, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>Today</div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ ...cardStyle, flex: 1, textAlign: "center", padding: "12px 6px" }}>
            <div className="num" style={{ fontSize: 16, fontWeight: 600, color: INK }}>{amt(today.sales)}</div>
            <div style={{ fontSize: 10.5, color: "#8A8270", marginTop: 3 }}>sold today</div>
          </div>
          <div style={{ ...cardStyle, flex: 1, textAlign: "center", padding: "12px 6px" }}>
            <div className="num" style={{ fontSize: 16, fontWeight: 600, color: SAGE }}>{amt(today.collected)}</div>
            <div style={{ fontSize: 10.5, color: "#8A8270", marginTop: 3 }}>collected today</div>
          </div>
          <div style={{ ...cardStyle, flex: 1, textAlign: "center", padding: "12px 6px" }}>
            <div className="num" style={{ fontSize: 16, fontWeight: 600, color: today.net > 0 ? RUST : SAGE }}>{amt(Math.abs(today.net))}</div>
            <div style={{ fontSize: 10.5, color: "#8A8270", marginTop: 3 }}>{today.net >= 0 ? "net credit given" : "net credit cleared"}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "18px 16px 8px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, opacity: 0.55, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>Who owes the most</div>
        {debtors.length === 0 ? (
          <EmptyState icon={<Wallet size={26} color={SAGE} />} text="Every balance is settled. Tap + to log your next sale." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {debtors.slice(0, 8).map((c) => <DebtorRow key={c.id} customer={c} onClick={() => onOpenCustomer(c.id)} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function DebtorRow({ customer, onClick }) {
  const amt = useAmt();
  return (
    <button onClick={onClick} style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={customer.name} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{customer.name}</div>
          <div style={{ fontSize: 12, color: "#8A8270" }}>{customer.phone || "no phone on file"}</div>
        </div>
      </div>
      <div className="num" style={{ fontWeight: 600, fontSize: 15, color: RUST }}>{amt(customer.balance)}</div>
    </button>
  );
}

function Avatar({ name }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div style={{ width: 36, height: 36, borderRadius: 999, background: INK, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
      {initial}
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ ...cardStyle, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "30px 20px", gap: 8 }}>
      {icon}
      <div style={{ fontSize: 13.5, color: "#6B6455", lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

// ---------- Customers ----------
function CustomersList({ customers, balances, onOpen, onAdd }) {
  const [q, setQ] = useState("");
  const amt = useAmt();
  const filtered = customers.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div style={{ animation: "riseIn .3s ease" }} className="rise-anim">
      <div style={{ padding: "20px 16px 12px" }}>
        <div className="disp" style={{ fontSize: 24, fontWeight: 700, color: INK_DARK }}>Customers</div>
        <div style={{ position: "relative", marginTop: 14 }}>
          <Search size={16} color="#A39B87" style={{ position: "absolute", left: 12, top: 12 }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customers"
            style={{ width: "100%", padding: "10px 12px 10px 34px", borderRadius: 12, border: `1px solid ${LINE}`, background: "#fff", fontSize: 14, outline: "none" }} />
        </div>
      </div>

      <div style={{ padding: "4px 16px" }}>
        {customers.length === 0 ? (
          <EmptyState icon={<Users size={26} color={INK} />} text="No customers yet. Add your first one to start logging sales." />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Search size={26} color={INK} />} text={`No match for "${q}"`} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((c) => {
              const bal = balances[c.id] || 0;
              return (
                <button key={c.id} onClick={() => onOpen(c.id)} style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar name={c.name} />
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</div>
                  </div>
                  <div className="num" style={{ fontWeight: 600, fontSize: 14, color: bal > 0 ? RUST : SAGE }}>{bal > 0 ? amt(bal) : "settled"}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button onClick={onAdd} style={{ position: "fixed", right: 16, bottom: 92, background: INK, color: "#fff", border: "none", borderRadius: 999, padding: "12px 18px", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 6px 16px rgba(31,77,58,0.3)" }}>
        <Plus size={17} /> New customer
      </button>
    </div>
  );
}

// ---------- Customer detail ----------
function CustomerDetail({ customer, balance, txns, onBack, onLogSale, onRecordPayment, onEditTxn, onRemind, amountsVisible, onToggleAmounts }) {
  const [showFilter, setShowFilter] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const amt = useAmt();

  const filtered = txns.filter((t) => {
    if (dateFrom && t.date < new Date(dateFrom).setHours(0, 0, 0, 0)) return false;
    if (dateTo && t.date > new Date(dateTo).setHours(23, 59, 59, 999)) return false;
    return true;
  });

  return (
    <div style={{ animation: "riseIn .3s ease" }} className="rise-anim">
      <div style={{ background: INK, color: "#fff", padding: "18px 16px 22px", borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "#fff", opacity: 0.85, display: "flex", alignItems: "center", gap: 4, padding: 0, fontSize: 14 }}>
            <ArrowLeft size={16} /> Customers
          </button>
          <button onClick={onToggleAmounts} style={{ background: "none", border: "none", color: "#fff", opacity: 0.75, padding: 4 }} aria-label={amountsVisible ? "Hide amounts" : "Show amounts"}>
            {amountsVisible ? <Eye size={17} /> : <EyeOff size={17} />}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: 999, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18 }}>
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="disp" style={{ fontSize: 20, fontWeight: 700 }}>{customer.name}</div>
            {customer.phone && <div style={{ fontSize: 12.5, opacity: 0.75, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}><Phone size={11} /> {customer.phone}</div>}
          </div>
        </div>
        <div style={{ marginTop: 18, fontSize: 12.5, opacity: 0.75 }}>Balance</div>
        <div className="num" style={{ fontSize: 30, fontWeight: 700, color: balance > 0 ? ACCENT : "#DFF3E8" }}>{amt(balance)}</div>
      </div>

      <div style={{ display: "flex", gap: 10, padding: "16px" }}>
        <button onClick={onLogSale} style={{ flex: 1, background: INK, color: "#fff", border: "none", borderRadius: 12, padding: "12px 8px", fontWeight: 600, fontSize: 13.5, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <ShoppingBag size={17} /> Log sale
        </button>
        <button onClick={onRecordPayment} disabled={balance <= 0} style={{ flex: 1, background: balance > 0 ? "#fff" : "#F1EEE5", color: balance > 0 ? INK : "#B7AF9B", border: `1px solid ${balance > 0 ? INK : LINE}`, borderRadius: 12, padding: "12px 8px", fontWeight: 600, fontSize: 13.5, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <Wallet size={17} /> Record payment
        </button>
        <button onClick={onRemind} disabled={balance <= 0 || !customer.phone} style={{ flex: 1, background: balance > 0 && customer.phone ? ACCENT : "#F1EEE5", color: balance > 0 && customer.phone ? "#3A2A0A" : "#B7AF9B", border: "none", borderRadius: 12, padding: "12px 8px", fontWeight: 600, fontSize: 13.5, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <MessageCircle size={17} />
