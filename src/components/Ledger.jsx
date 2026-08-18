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
          <MessageCircle size={17} /> Remind
        </button>
      </div>

      <div style={{ padding: "4px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.55, textTransform: "uppercase", letterSpacing: 0.6 }}>
            History {(dateFrom || dateTo) && `· ${filtered.length} shown`}
          </div>
          {txns.length > 0 && (
            <button onClick={() => setShowFilter((s) => !s)} style={{ background: "none", border: "none", color: INK, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, padding: 0 }}>
              <Search size={13} /> {showFilter ? "Hide filter" : "Filter"}
            </button>
          )}
        </div>

        {showFilter && (
          <div style={{ ...cardStyle, display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, color: "#8A8270", marginBottom: 3 }}>From</div>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: "100%", border: "none", fontSize: 13, fontFamily: "inherit" }} />
            </div>
            <div style={{ width: 1, height: 28, background: LINE }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, color: "#8A8270", marginBottom: 3 }}>To</div>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: "100%", border: "none", fontSize: 13, fontFamily: "inherit" }} />
            </div>
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }} style={{ background: "#F1EEE5", border: "none", borderRadius: 8, padding: "6px 8px", flexShrink: 0 }}>
                <X size={13} color={TEXT} />
              </button>
            )}
          </div>
        )}

        {txns.length === 0 ? (
          <EmptyState icon={<Clock size={24} color={INK} />} text="No transactions yet." />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Search size={24} color={INK} />} text="No transactions in that date range." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((t) => (
              <button key={t.id} onClick={() => onEditTxn(t.id)} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", textAlign: "left" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    {t.type === "sale" ? <ShoppingBag size={13} color={RUST} /> : <Check size={13} color={SAGE} />}
                    {t.type === "sale" ? "Sale" : "Payment"}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#8A8270", marginTop: 2 }}>{fmtDate(t.date)}{t.note ? " · " + t.note : ""}{t.loggedBy ? " · " + t.loggedBy : ""}</div>
                </div>
                <div className="num" style={{ fontWeight: 600, fontSize: 14, color: t.type === "sale" ? RUST : SAGE }}>{t.type === "sale" ? "+" : "−"}{amt(t.amount)}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  // ---------- Bottom nav ----------
function BottomNav({ view, setView, onPlus }) {
  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "#fff", borderTop: `1px solid ${LINE}`, display: "flex", alignItems: "center", justifyContent: "space-around", padding: "10px 0 max(10px, env(safe-area-inset-bottom))", zIndex: 100 }}>
      <NavBtn active={view === "dashboard"} icon={<Home size={20} />} label="Home" onClick={() => setView("dashboard")} />
      <button onClick={onPlus} style={{ background: INK, border: "none", borderRadius: 999, width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", marginTop: -26, boxShadow: "0 6px 14px rgba(31,77,58,0.35)" }}>
        <Plus size={24} />
      </button>
      <NavBtn active={view === "customers"} icon={<Users size={20} />} label="Customers" onClick={() => setView("customers")} />
    </div>
  );
}

function NavBtn({ active, icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: active ? INK : "#A39B87", padding: "2px 14px" }}>
      {icon}
      <span style={{ fontSize: 10.5, fontWeight: 600 }}>{label}</span>
    </button>
  );
}

// ---------- Modals shell ----------
function Sheet({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,20,15,0.45)", zIndex: 300, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div className="sheet-anim" style={{ animation: "sheetUp .28s cubic-bezier(.2,.8,.2,1)", background: PAPER, width: "100%", maxHeight: "88vh", overflowY: "auto", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: "18px 18px calc(20px + env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 36, height: 4, background: LINE, borderRadius: 99, margin: "0 auto 14px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div className="disp" style={{ fontSize: 19, fontWeight: 700, color: INK_DARK }}>{title}</div>
          <button onClick={onClose} style={{ background: "#F1EEE5", border: "none", borderRadius: 999, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} color={TEXT} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LogSaleModal({ customers, recentItems, preselected, onClose, onSubmit, onCreateCustomer }) {
  const [customerId, setCustomerId] = useState(preselected || "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paidNow, setPaidNow] = useState(false);
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(customers.length === 0);

  const [listening, setListening] = useState(false);
  const [voiceSupported] = useState(() => typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition));
  const [heard, setHeard] = useState("");
  const [voiceResult, setVoiceResult] = useState(null);
  const recognitionRef = React.useRef(null);

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-NG";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setHeard(transcript);
      const result = parseVoiceEntry(transcript, customers);
      setVoiceResult(result);
      if (result.amount) setAmount(String(result.amount));
      if (result.customer) { setCustomerId(result.customer.id); setShowNew(false); }
      else if (customers.length === 0) { setShowNew(true); setNewName(""); }
      if (result.note) setNote(result.note);
      setPaidNow(result.paidNow);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setHeard(""); setVoiceResult(null);
    setListening(true);
    rec.start();
  }

  function stopListening() {
    if (recognitionRef.current) recognitionRef.current.stop();
    setListening(false);
  }

  const sorted = [...customers].sort((a, b) => a.name.localeCompare(b.name));

  async function submit() {
    let cid = customerId;
    if (showNew) {
      if (!newName.trim()) return;
      const c = await onCreateCustomer(newName, "");
      cid = c.id;
    }
    const amt = parseFloat(amount);
    if (!cid || !amt || amt <= 0) return;
    onSubmit(cid, amt, note.trim(), paidNow);
  }

  return (
    <Sheet title="Log a sale" onClose={onClose}>
      {voiceSupported && (
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={listening ? stopListening : startListening}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              background: listening ? RUST : "#F1EEE5", color: listening ? "#fff" : INK,
              border: "none", borderRadius: 14, padding: "14px", fontWeight: 700, fontSize: 14.5,
            }}
          >
            <Mic size={18} /> {listening ? "Listening… tap to stop" : "Speak this sale instead"}
          </button>
          {heard && (
            <div style={{ ...cardStyle, marginTop: 10, background: "#F1EEE5" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#8A8270", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Heard</div>
              <div style={{ fontSize: 13.5, color: TEXT, fontStyle: "italic", marginBottom: 8 }}>"{heard}"</div>
              <div style={{ fontSize: 11.5, color: voiceResult && voiceResult.amount ? SAGE : RUST }}>
                {voiceResult && voiceResult.amount
                  ? `Filled in below — check everything before confirming.`
                  : `Couldn't find an amount — please fill in the fields below.`}
              </div>
            </div>
          )}
        </div>
      )}

      {!showNew ? (
        <>
          <label style={labelStyle}>Customer</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
            <option value="">Select customer…</option>
            {sorted.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={() => setShowNew(true)} style={{ background: "none", border: "none", color: INK, fontSize: 13, fontWeight: 600, padding: "0 0 12px", textAlign: "left" }}>+ New customer instead</button>
        </>
      ) : (
        <>
          <label style={labelStyle}>New customer name</label>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Shop or customer name" style={inputStyle} autoFocus />
          {customers.length > 0 && (
            <button onClick={() => setShowNew(false)} style={{ background: "none", border: "none", color: INK, fontSize: 13, fontWeight: 600, padding: "0 0 12px", textAlign: "left" }}>← Choose existing customer</button>
          )}
        </>
      )}

      <label style={labelStyle}>Amount</label>
      <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" inputMode="decimal" className="num" style={{ ...inputStyle, fontSize: 20, fontWeight: 600 }} />

      <label style={labelStyle}>Note (optional)</label>
      {recentItems && recentItems.length > 0 && (
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginTop: -4 }}>
          {recentItems.map((item) => (
            <button key={item} onClick={() => setNote(item)} style={{ flexShrink: 0, background: note === item ? INK : "#F1EEE5", color: note === item ? "#fff" : "#4A4636", border: "none", borderRadius: 999, padding: "6px 12px", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }}>{item}</button>
          ))}
        </div>
      )}
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 2 cartons indomie" style={inputStyle} />

      <button onClick={() => setPaidNow(!paidNow)} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: "6px 0 18px", width: "100%" }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${paidNow ? INK : LINE}`, background: paidNow ? INK : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {paidNow && <Check size={14} color="#fff" />}
        </div>
        <span style={{ fontSize: 14, textAlign: "left" }}>Paid in full now (cash sale, not credit)</span>
      </button>

      <button onClick={submit} style={{ width: "100%", background: INK, color: "#fff", border: "none", borderRadius: 14, padding: "15px", fontSize: 15.5, fontWeight: 700 }}>
        Confirm {amount ? naira(amount) : ""} {paidNow ? "cash sale" : "on credit"}
      </button>
    </Sheet>
  );
}

function AddCustomerModal({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  return (
    <Sheet title="New customer" onClose={onClose}>
      <label style={labelStyle}>Name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Shop or customer name" style={inputStyle} autoFocus />
      <label style={labelStyle}>Phone (for WhatsApp reminders)</label>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080…" inputMode="tel" style={inputStyle} />
      <button onClick={() => name.trim() && onSubmit(name, phone)} style={{ width: "100%", background: INK, color: "#fff", border: "none", borderRadius: 14, padding: "15px", fontSize: 15.5, fontWeight: 700 }}>
        Add customer
      </button>
    </Sheet>
  );
}

function RecordPaymentModal({ customer, balance, onClose, onSubmit }) {
  const [amount, setAmount] = useState(String(balance));
  const [note, setNote] = useState("");
  return (
    <Sheet title={`Payment from ${customer.name}`} onClose={onClose}>
      <div style={{ fontSize: 13, color: "#6B6455", marginBottom: 14 }}>Current balance: <span className="num" style={{ fontWeight: 600, color: RUST }}>{naira(balance)}</span></div>
      <label style={labelStyle}>Amount received</label>
      <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" className="num" style={{ ...inputStyle, fontSize: 20, fontWeight: 600 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button onClick={() => setAmount(String(balance))} style={{ fontSize: 12.5, background: "#F1EEE5", border: "none", borderRadius: 8, padding: "6px 10px", fontWeight: 600, color: INK }}>Full balance</button>
                  Remind
        </button>
      </div>

      <div style={{ padding: "0 16px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, opacity: 0.55, textTransform: "uppercase", letterSpacing: 0.6 }}>History</div>
        <button onClick={() => setShowFilter((v) => !v)} style={{ background: "none", border: "none", color: INK, fontSize: 12.5, fontWeight: 600, padding: 0 }}>
          {showFilter ? "Hide filter" : "Filter dates"}
        </button>
      </div>

      {showFilter && (
        <div style={{ margin: "0 16px 14px", padding: 12, background: "#fff", borderRadius: 12, border: `1px solid ${LINE}`, display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} />
          </div>
        </div>
      )}

      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 ? (
          <EmptyState icon={<Clock size={24} color={INK} />} text="No transactions logged in this range." />
        ) : (
          filtered.map((t) => (
            <button key={t.id} onClick={() => onEditTxn(t.id)} style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{t.note || (t.type === "sale" ? "Sale" : "Payment")}</div>
                <div style={{ fontSize: 11.5, color: "#8A8270", marginTop: 2 }}>{fmtDate(t.date)}</div>
              </div>
              <div className="num" style={{ fontWeight: 600, fontSize: 14, color: t.type === "sale" ? RUST : SAGE }}>
                {t.type === "sale" ? "+" : "-"}{amt(t.amount)}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ---------- Bottom Navigation ----------
function BottomNav({ view, setView, onPlus }) {
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: `1px solid ${LINE}`, display: "flex", justifyContent: "space-around", alignItems: "center", height: 68, paddingBottom: 6 }}>
      <button onClick={() => setView("dashboard")} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", color: view === "dashboard" ? INK : "#8A8270", gap: 3, fontSize: 11, fontWeight: 600 }}>
        <Home size={20} />
        Home
      </button>

      <button onClick={onPlus} style={{ background: INK, color: "#fff", border: "none", borderRadius: 999, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", marginTop: -20, boxShadow: "0 4px 12px rgba(31,77,58,0.3)" }}>
        <Plus size={24} />
      </button>

      <button onClick={() => setView("customers")} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", color: view === "customers" ? INK : "#8A8270", gap: 3, fontSize: 11, fontWeight: 600 }}>
        <Users size={20} />
        Customers
      </button>
    </div>
  );
}

// ---------- Sheet Wrapper ----------
function Sheet({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", zIndex: 100 }}>
      <div style={{ background: PAPER, width: "100%", maxHeight: "85vh", overflowY: "auto", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="disp" style={{ fontSize: 18, fontWeight: 700, color: INK }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8A8270", padding: 4 }}><X size={20} /></button>
        </div>
        {children}
      </div>
      <div style={{ display: "flex", gap: 10, padding: "16px" }}>
        <button onClick={onLogSale} style={{ flex: 1, background: INK, color: "#fff", border: "none", borderRadius: 12, padding: "12px 8px", fontWeight: 600, fontSize: 13.5, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <ShoppingBag size={17} /> Log sale
        </button>
        <button onClick={onRecordPayment} disabled={balance <= 0} style={{ flex: 1, background: balance > 0 ? "#fff" : "#F1EEE5", color: balance > 0 ? INK : "#B7AF9B", border: `1px solid ${balance > 0 ? INK : LINE}`, borderRadius: 12, padding: "12px 8px", fontWeight: 600, fontSize: 13.5, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <Wallet size={17} /> Record payment
        </button>
        <button onClick={onRemind} disabled={balance <= 0 || !customer.phone} style={{ flex: 1, background: balance > 0 && customer.phone ? ACCENT : "#F1EEE5", color: balance > 0 && customer.phone ? "#3A2A0A" : "#B7AF9B", border: "none", borderRadius: 12, padding: "12px 8px", fontWeight: 600, fontSize: 13.5, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <MessageCircle size={17} /> Remind
        </button>
      </div>

      <div style={{ padding: "0 16px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, opacity: 0.55, textTransform: "uppercase", letterSpacing: 0.6 }}>History</div>
        <button onClick={() => setShowFilter((v) => !v)} style={{ background: "none", border: "none", color: INK, fontSize: 12.5, fontWeight: 600, padding: 0 }}>
          {showFilter ? "Hide filter" : "Filter dates"}
        </button>
      </div>

      {showFilter && (
        <div style={{ margin: "0 16px 14px", padding: 12, background: "#fff", borderRadius: 12, border: `1px solid ${LINE}`, display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} />
          </div>
        </div>
      )}

      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 ? (
          <EmptyState icon={<Clock size={24} color={INK} />} text="No transactions logged in this range." />
        ) : (
          filtered.map((t) => (
            <button key={t.id} onClick={() => onEditTxn(t.id)} style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{t.note || (t.type === "sale" ? "Sale" : "Payment")}</div>
                <div style={{ fontSize: 11.5, color: "#8A8270", marginTop: 2 }}>{fmtDate(t.date)}</div>
              </div>
              <div className="num" style={{ fontWeight: 600, fontSize: 14, color: t.type === "sale" ? RUST : SAGE }}>
                {t.type === "sale" ? "+" : "-"}{amt(t.amount)}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ---------- Bottom Navigation ----------
function BottomNav({ view, setView, onPlus }) {
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: `1px solid ${LINE}`, display: "flex", justifyContent: "space-around", alignItems: "center", height: 68, paddingBottom: 6 }}>
      <button onClick={() => setView("dashboard")} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", color: view === "dashboard" ? INK : "#8A8270", gap: 3, fontSize: 11, fontWeight: 600 }}>
        <Home size={20} />
        Home
      </button>

      <button onClick={onPlus} style={{ background: INK, color: "#fff", border: "none", borderRadius: 999, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", marginTop: -20, boxShadow: "0 4px 12px rgba(31,77,58,0.3)" }}>
        <Plus size={24} />
      </button>

      <button onClick={() => setView("customers")} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", color: view === "customers" ? INK : "#8A8270", gap: 3, fontSize: 11, fontWeight: 600 }}>
        <Users size={20} />
        Customers
      </button>
    </div>
  );
}

// ---------- Sheet Wrapper ----------
function Sheet({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", zIndex: 100 }}>
      <div style={{ background: PAPER, width: "100%", maxHeight: "85vh", overflowY: "auto", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="disp" style={{ fontSize: 18, fontWeight: 700, color: INK }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8A8270", padding: 4 }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------- Log Sale Modal ----------
function LogSaleModal({ customers, recentItems, preselected, onClose, onCreateCustomer, onSubmit }) {
  const [customerId, setCustomerId] = useState(preselected || "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paidNow, setPaidNow] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechErr, setSpeechErr] = useState("");

  const handleVoice = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setSpeechErr("Voice input not supported in this browser.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-NG";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => { setIsRecording(true); setSpeechErr(""); };
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      const parsed = parseVoiceEntry(transcript, customers);
      if (parsed.amount) setAmount(String(parsed.amount));
      if (parsed.customerId) setCustomerId(parsed.customerId);
      if (parsed.note) setNote(parsed.note);
      if (parsed.paidNow !== undefined) setPaidNow(parsed.paidNow);
      setIsRecording(false);
    };
    recognition.onerror = () => { setSpeechErr("Couldn't hear you clearly. Try again."); setIsRecording(false); };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  return (
    <Sheet title="Log a sale" onClose={onClose}>
      <label style={labelStyle}>Customer</label>
      <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} style={{ ...inputStyle, marginBottom: 14 }}>
        <option value="" disabled>Select a customer...</option>
        {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <label style={labelStyle}>Amount</label>
      <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="0" className="num" style={{ ...inputStyle, fontSize: 20, fontWeight: 600, marginBottom: 14 }} />

      <label style={labelStyle}>What was sold? (optional)</label>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 2 bags of cement" style={{ ...inputStyle, marginBottom: 8 }} />
      
      {recentItems.length > 0 && (
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 10, marginBottom: 4 }}>
          {recentItems.map((item, i) => (
            <button key={i} onClick={() => setNote(item)} style={{ background: "#F1EEE5", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, color: INK, whiteSpace: "nowrap" }}>
              {item}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 20px" }}>
        <input type="checkbox" id="paidNow" checked={paidNow} onChange={(e) => setPaidNow(e.target.checked)} style={{ width: 18, height: 18, accentColor: INK }} />
        <label htmlFor="paidNow" style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>Customer paid immediately</label>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={handleVoice} style={{ width: 54, height: 54, borderRadius: 14, background: isRecording ? RUST : "#F1EEE5", color: isRecording ? "#fff" : INK, border: "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Mic size={22} className={isRecording ? "pulse" : ""} />
        </button>
        <button onClick={() => { const amt = parseFloat(amount); if (amt > 0 && customerId) onSubmit(customerId, amt, note.trim(), paidNow); }} disabled={!amount || !customerId} style={{ flex: 1, background: amount && customerId ? INK : "#B7AF9B", color: "#fff", border: "none", borderRadius: 14, fontSize: 15.5, fontWeight: 700 }}>
          Save sale
        </button>
      </div>
      {speechErr && <div style={{ fontSize: 12, color: RUST, marginTop: 8, textAlign: "center" }}>{speechErr}</div>}
    </Sheet>
  );
}

// ---------- Add Customer Modal ----------
function AddCustomerModal({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  return (
    <Sheet title="New customer" onClose={onClose}>
      <label style={labelStyle}>Name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John Doe" style={{ ...inputStyle, marginBottom: 14 }} autoFocus />
      <label style={labelStyle}>Phone (optional)</label>
      <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ""))} inputMode="tel" placeholder="e.g. 08012345678" style={{ ...inputStyle, marginBottom: 20 }} />
      <button onClick={() => { if (name.trim()) onSubmit(name.trim(), phone.trim()); }} disabled={!name.trim()} style={{ width: "100%", background: name.trim() ? INK : "#B7AF9B", color: "#fff", border: "none", borderRadius: 14, padding: "15px", fontSize: 15.5, fontWeight: 700 }}>
        Add customer
      </button>
    </Sheet>
  );
}

// ---------- Record Payment Modal ----------
function RecordPaymentModal({ customer, balance, onClose, onSubmit }) {
  const [amount, setAmount] = useState(String(balance > 0 ? balance : ""));
  const [note, setNote] = useState("");

  return (
    <Sheet title={`Record payment for ${customer.name}`} onClose={onClose}>
      <div style={{ fontSize: 12.5, color: "#8A8270", marginBottom: 12 }}>
        Current balance: <b style={{ color: RUST }}>{naira(balance)}</b>
      </div>
      <label style={labelStyle}>Amount paid</label>
      <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="0" className="num" style={{ ...inputStyle, fontSize: 20, fontWeight: 600, marginBottom: 8 }} autoFocus />
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button onClick={() => setAmount(String(balance))} style={{ fontSize: 12.5, background: "#F1EEE5", border: "none", borderRadius: 8, padding: "6px 10px", fontWeight: 600, color: INK }}>Full amount</button>
        <button onClick={() => setAmount(String(Math.round(balance / 2)))} style={{ fontSize: 12.5, background: "#F1EEE5", border: "none", borderRadius: 8, padding: "6px 10px", fontWeight: 600, color: INK }}>Half</button>
      </div>
      <label style={labelStyle}>Note (optional)</label>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. part payment" style={{ ...inputStyle, marginBottom: 16 }} />
      <button onClick={() => { const amt = parseFloat(amount); if (amt > 0) onSubmit(amt, note.trim()); }} style={{ width: "100%", background: INK, color: "#fff", border: "none", borderRadius: 14, padding: "15px", fontSize: 15.5, fontWeight: 700 }}>
        Record {amount ? naira(amount) : ""} payment
      </button>
    </Sheet>
  );
                }
                                                           

function EditTxnModal({ txn, deletePin, onClose, onSave, onDelete }) {
  const [amount, setAmount] = useState(String(txn.amount));
  const [note, setNote] = useState(txn.note || "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [pinErr, setPinErr] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [, forceTick] = useState(0);
  const locked = lockedUntil > Date.now();
  const canDelete = !locked && (deletePin ? pinInput === deletePin : confirmText.trim().toUpperCase() === "DELETE");

  useEffect(() => {
    if (!locked) return;
    const iv = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(iv);
  }, [locked]);

  function attemptDelete() {
    if (locked) return;
    if (deletePin && pinInput !== deletePin) {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= 5) { setLockedUntil(Date.now() + 30000); setPinErr("Too many wrong attempts. Try again in 30 seconds."); }
      else setPinErr(`Incorrect PIN (${5 - next} attempt${5 - next === 1 ? "" : "s"} left)`);
      setPinInput("");
      return;
    }
    onDelete();
  }

  return (
    <Sheet title={`Edit ${txn.type === "sale" ? "sale" : "payment"}`} onClose={onClose}>
      <div style={{ fontSize: 12.5, color: "#8A8270", marginBottom: 14 }}>{fmtDate(txn.date)}</div>
      <label style={labelStyle}>Amount</label>
      <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" className="num" style={{ ...inputStyle, fontSize: 20, fontWeight: 600 }} />
      <label style={labelStyle}>Note</label>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 2 cartons indomie" style={inputStyle} />
      <button onClick={() => { const amt = parseFloat(amount); if (amt > 0) onSave({ amount: amt, note: note.trim() }); }} style={{ width: "100%", background: INK, color: "#fff", border: "none", borderRadius: 14, padding: "15px", fontSize: 15.5, fontWeight: 700, marginBottom: 10 }}>
        Save changes
      </button>

      {!confirmDelete ? (
        <button onClick={() => setConfirmDelete(true)} style={{ width: "100%", background: "none", border: `1px solid ${RUST}`, color: RUST, borderRadius: 14, padding: "13px", fontSize: 14.5, fontWeight: 600 }}>
          Delete this transaction
        </button>
      ) : (
        <div style={{ ...cardStyle, borderColor: RUST }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 12 }}>
            <AlertCircle size={16} color={RUST} style={{ marginTop: 1, flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: "#6B6455", lineHeight: 1.5 }}>
              Delete this {txn.type === "sale" ? "sale" : "payment"} of {naira(txn.amount)}? This can't be undone.
              {deletePin ? " Enter your PIN to confirm." : (<> Type <b style={{ color: TEXT }}>DELETE</b> below to confirm.</>)}
            </div>
          </div>
          {deletePin ? (
            <>
              <input value={pinInput} onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinErr(""); }} inputMode="numeric" type="password" placeholder="PIN" className="num" disabled={locked} style={{ ...inputStyle, marginBottom: 8, textAlign: "center", letterSpacing: 4, opacity: locked ? 0.5 : 1 }} autoFocus />
              {pinErr && <div style={{ fontSize: 12, color: RUST, marginBottom: 8, textAlign: "center" }}>{locked ? `Too many wrong attempts. Try again in ${Math.ceil((lockedUntil - Date.now()) / 1000)}s.` : pinErr}</div>}
            </>
          ) : (
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type DELETE to confirm" style={{ ...inputStyle, marginBottom: 10, textAlign: "center", fontWeight: 600, letterSpacing: 1 }} autoFocus />
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setConfirmDelete(false); setConfirmText(""); setPinInput(""); setPinErr(""); }} style={{ flex: 1, background: "#F1EEE5", border: "none", borderRadius: 10, padding: "10px", fontWeight: 600, fontSize: 13.5 }}>Cancel</button>
            <button onClick={attemptDelete} disabled={!canDelete} style={{ flex: 1, background: canDelete ? RUST : "#E9C9BE", color: "#fff", border: "none", borderRadius: 10, padding: "10px", fontWeight: 600, fontSize: 13.5 }}>Yes, delete</button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

// ---------- Settings ----------
function SettingsModal({ businessName, plan, member, deletePin, customerCount, txnCount, deletedCount, onClose, onSave, onSavePin, onChangeDisplayName, onInvite, onOpenRecycleBin, onExport, onSignOut }) {
  const [name, setName] = useState(businessName);
  const [editingUser, setEditingUser] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState((member && member.display_name) || "");
  const [editingPin, setEditingPin] = useState(false);
  const [pinAction, setPinAction] = useState("set");
  const [verified, setVerified] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  function startPinFlow(action) {
    setPinAction(action); setEditingPin(true); setVerified(!deletePin);
    setCurrentPin(""); setNewPin(""); setConfirmPin(""); setPinError("");
  }
  function verifyCurrent() {
    if (currentPin === deletePin) { setVerified(true); setPinError(""); } else setPinError("Incorrect PIN");
  }
  function submitNewPin() {
    if (!/^\d{4,6}$/.test(newPin)) { setPinError("PIN must be 4-6 digits"); return; }
    if (newPin !== confirmPin) { setPinError("PINs don't match"); return; }
    onSavePin(newPin); setEditingPin(false);
  }
  function submitRemove() { onSavePin(""); setEditingPin(false); }

  return (
    <Sheet title="Settings" onClose={onClose}>
      <div style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={displayNameInput || "?"} />
          <div>
            <div style={{ fontSize: 11, color: "#8A8270" }}>You're signed in as</div>
            {!editingUser ? (
              <div style={{ fontSize: 14, fontWeight: 600 }}>{displayNameInput || "Not set"} {member && member.role === "owner" && <span style={{ fontSize: 10.5, color: ACCENT, fontWeight: 700 }}>· OWNER</span>}</div>
            ) : (
              <input value={displayNameInput} onChange={(e) => setDisplayNameInput(e.target.value)} placeholder="Your name" style={{ fontSize: 14, fontWeight: 600, border: "none", borderBottom: `1px solid ${LINE}`, outline: "none", background: "none", padding: "2px 0", width: 140 }} autoFocus />
            )}
          </div>
        </div>
        {editingUser ? (
          <button onClick={() => { if (displayNameInput.trim()) { onChangeDisplayName(displayNameInput.trim()); setEditingUser(false); } }} style={{ background: INK, color: "#fff", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600 }}>Save</button>
        ) : (
          <button onClick={() => setEditingUser(true)} style={{ background: "#F1EEE5", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, color: INK }}>Change</button>
        )}
      </div>

      <label style={labelStyle}>Business name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chidera Stores" style={inputStyle} />
      <button onClick={() => onSave(name)} style={{ width: "100%", background: INK, color: "#fff", border: "none", borderRadius: 14, padding: "14px", fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Save</button>

      <div style={{ ...cardStyle, marginBottom: 18, background: plan === "free" ? "#F1EEE5" : "#EAF4EF" }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{plan === "free" ? "Free plan" : "Paid plan"}</div>
        <div style={{ fontSize: 12, color: "#6B6455", marginTop: 3 }}>
          {plan === "free" ? `Up to 20 customers, 1 team. ${customerCount}/20 used.` : "Unlimited customers and team members."}
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <UserPlus size={14} color="#6B6455" />
          <div style={{ fontSize: 13, fontWeight: 600, color: "#6B6455" }}>Invite a teammate</div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="their@email.com" type="email" style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
          <button onClick={() => { if (inviteEmail.trim()) { onInvite(inviteEmail.trim()); setInviteEmail(""); } }} style={{ background: INK, color: "#fff", border: "none", borderRadius: 12, padding: "0 16px", fontWeight: 600, fontSize: 13 }}>Invite</button>
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Lock size={14} color="#6B6455" />
          <div style={{ fontSize: 13, fontWeight: 600, color: "#6B6455" }}>Delete protection</div>
        </div>

        {!editingPin && (
          deletePin ? (
            <div style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13 }}>PIN required to delete a logged sale</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => startPinFlow("change")} style={{ background: "#F1EEE5", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, color: INK }}>Change</button>
                <button onClick={() => startPinFlow("remove")} style={{ background: "#F1EEE5", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, color: RUST }}>Remove</button>
              </div>
            </div>
          ) : (
            <div style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, color: "#6B6455" }}>No PIN set — anyone can delete a sale</div>
              <button onClick={() => startPinFlow("set")} style={{ background: INK, border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, color: "#fff" }}>Set PIN</button>
            </div>
          )
        )}

        {editingPin && !verified && (
          <div style={cardStyle}>
            <div style={{ fontSize: 12.5, marginBottom: 8, color: "#6B6455" }}>Enter your current PIN to continue</div>
            <input value={currentPin} onChange={(e) => { setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinError(""); }} inputMode="numeric" type="password" placeholder="Current PIN" className="num" style={{ ...inputStyle, marginBottom: 8, letterSpacing: 4 }} autoFocus />
            {pinError && <div style={{ fontSize: 12, color: RUST, marginBottom: 8 }}>{pinError}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setEditingPin(false)} style={{ flex: 1, background: "#F1EEE5", border: "none", borderRadius: 10, padding: "10px", fontWeight: 600, fontSize: 13.5 }}>Cancel</button>
              <button onClick={verifyCurrent} style={{ flex: 1, background: INK, color: "#fff", border: "none", borderRadius: 10, padding: "10px", fontWeight: 600, fontSize: 13.5 }}>Continue</button>
            </div>
          </div>
        )}

        {editingPin && verified && pinAction !== "remove" && (
          <div style={cardStyle}>
            <div style={{ fontSize: 12.5, marginBottom: 8, color: "#6B6455" }}>{pinAction === "set" ? "Choose a 4-6 digit PIN" : "Choose a new 4-6 digit PIN"}</div>
            <input value={newPin} onChange={(e) => { setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinError(""); }} inputMode="numeric" type="password" placeholder="New PIN" className="num" style={{ ...inputStyle, marginBottom: 8, letterSpacing: 4 }} autoFocus />
            <input value={confirmPin} onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinError(""); }} inputMode="numeric" type="password" placeholder="Confirm PIN" className="num" style={{ ...inputStyle, marginBottom: 8, letterSpacing: 4 }} />
            {pinError && <div style={{ fontSize: 12, color: RUST, marginBottom: 8 }}>{pinError}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setEditingPin(false)} style={{ flex: 1, background: "#F1EEE5", border: "none", borderRadius: 10, padding: "10px", fontWeight: 600, fontSize: 13.5 }}>Cancel</button>
              <button onClick={submitNewPin} style={{ flex: 1, background: INK, color: "#fff", border: "none", borderRadius: 10, padding: "10px", fontWeight: 600, fontSize: 13.5 }}>Save PIN</button>
            </div>
          </div>
        )}

        {editingPin && verified && pinAction === "remove" && (
          <div style={cardStyle}>
            <div style={{ fontSize: 13, marginBottom: 10, color: "#6B6455" }}>Remove PIN protection? Anyone on the team will be able to delete a logged sale without one.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setEditingPin(false)} style={{ flex: 1, background: "#F1EEE5", border: "none", borderRadius: 10, padding: "10px", fontWeight: 600, fontSize: 13.5 }}>Cancel</button>
              <button onClick={submitRemove} style={{ flex: 1, background: RUST, color: "#fff", border: "none", borderRadius: 10, padding: "10px", fontWeight: 600, fontSize: 13.5 }}>Remove PIN</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 16, marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#6B6455", marginBottom: 10 }}>Data safety</div>
        <button onClick={onOpenRecycleBin} style={{ ...cardStyle, width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, textAlign: "left" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Recently deleted</div>
            <div style={{ fontSize: 11.5, color: "#8A8270", marginTop: 2 }}>Deleted sales are kept here, not erased</div>
          </div>
          <div className="num" style={{ fontSize: 15, fontWeight: 700, color: deletedCount > 0 ? ACCENT : "#B7AF9B" }}>{deletedCount}</div>
        </button>
        <button onClick={onExport} style={{ ...cardStyle, width: "100%", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
          <div style={{ width: 32, height: 32, borderRadius: 999, background: "#F1EEE5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <BookOpen size={15} color={INK} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Download a backup</div>
            <div style={{ fontSize: 11.5, color: "#8A8270", marginTop: 2 }}>Save a copy of everything outside this device</div>
          </div>
        </button>
      </div>

      <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 16, marginTop: 16, display: "flex", gap: 20 }}>
        <div>
          <div className="num" style={{ fontSize: 20, fontWeight: 600, color: INK }}>{customerCount}</div>
          <div style={{ fontSize: 11.5, color: "#8A8270" }}>customers</div>
        </div>
        <div>
          <div className="num" style={{ fontSize: 20, fontWeight: 600, color: INK }}>{txnCount}</div>
          <div style={{ fontSize: 11.5, color: "#8A8270" }}>transactions logged</div>
        </div>
      </div>

      <button onClick={onSignOut} style={{ width: "100%", background: "none", border: `1px solid ${LINE}`, color: "#6B6455", borderRadius: 14, padding: "13px", fontSize: 14, fontWeight: 600, marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <LogOut size={15} /> Sign out
      </button>
    </Sheet>
  );
}

// ---------- Recycle bin ----------
function RecycleBinModal({ items, customers, onClose, onRestore }) {
  const nameFor = (id) => (customers.find((c) => c.id === id) || {}).name || "Unknown customer";
  return (
    <Sheet title="Recently deleted" onClose={onClose}>
      <div style={{ fontSize: 12.5, color: "#6B6455", marginBottom: 14, lineHeight: 1.5 }}>
        Deleted sales and payments land here instead of disappearing. Restore anything removed by mistake — or by someone who shouldn't have.
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<Clock size={24} color={INK} />} text="Nothing deleted yet." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((t) => (
            <div key={t.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{nameFor(t.customerId)}</div>
                <div style={{ fontSize: 11.5, color: "#8A8270", marginTop: 2 }}>{t.type === "sale" ? "Sale" : "Payment"} of {naira(t.amount)} · logged {fmtDate(t.date)}</div>
                <div style={{ fontSize: 11, color: RUST, marginTop: 2 }}>deleted {fmtDate(t.deletedAt || t.date)}{t.deletedBy ? ` by ${t.deletedBy}` : ""}</div>
              </div>
              <button onClick={() => onRestore(t.id)} style={{ background: INK, color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, flexShrink: 0 }}>Restore</button>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
function Toast({ text }) {
  return (
    <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", background: INK_DARK, color: "#fff", padding: "10px 18px", borderRadius: 999, fontSize: 13.5, fontWeight: 600, zIndex: 400, boxShadow: "0 8px 20px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: 6 }}>
      <Check size={15} color={ACCENT} /> {text}
    </div>
  );
}

  
