import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ComposedChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Heart, Sparkles, TrendingDown, PiggyBank, CalendarHeart, ChevronUp, ChevronDown,
  Wallet, Plus, Trash2, LayoutDashboard, SlidersHorizontal, LogOut,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import * as db from "./db";

/* ─────────────────────────  palette  ───────────────────────── */
const C = {
  bg1: "#FDF6F4", bg2: "#FBEAF0", bg3: "#F4ECF7",
  card: "#FFFFFF",
  ink: "#4A2C3D", inkSoft: "#8A6E7C", inkFaint: "#B9A2AE",
  pink: "#E87CA6", pinkSoft: "#F7A8C4", blush: "#FBEAF0", blush2: "#FCEEF4",
  sage: "#6FB893", sageSoft: "#C9E8D5", sageFaint: "#EAF6EF",
  debt: "#E89BB0", savings: "#6FB893",
  border: "#F3D9E4", borderSoft: "#F6E6EE",
  amber: "#D9A441", amberSoft: "#F7EAD2",
};

const TYPES = ["credit card", "personal loan", "student loan", "auto loan", "medical", "other"];

const STRATEGIES = [
  { key: "snowball", label: "snowball", blurb: "smallest balance first — fastest first win" },
  { key: "avalanche", label: "avalanche", blurb: "highest rate first — least interest paid" },
  { key: "blend", label: "blend", blurb: "combine snowball + avalanche, your mix" },
  { key: "cashflow", label: "cash flow", blurb: "biggest minimum first — frees monthly room" },
  { key: "interest", label: "interest cost", blurb: "the debt bleeding the most money now" },
  { key: "custom", label: "your way", blurb: "you set the exact order" },
];

/* ─────────────────────────  engine  ───────────────────────── */
function reconcileOrder(customOrder, debts) {
  const ids = debts.map((d) => d.id);
  const kept = customOrder.filter((id) => ids.includes(id));
  const missing = ids.filter((id) => !kept.includes(id));
  return [...kept, ...missing];
}

function ordering(list, key, blendW, customOrder) {
  const arr = [...list];
  const maxApr = Math.max(...arr.map((d) => d.apr), 1);
  const maxBal = Math.max(...arr.map((d) => d.balance), 1);
  if (key === "snowball") return arr.sort((a, b) => a.balance - b.balance);
  if (key === "avalanche") return arr.sort((a, b) => b.apr - a.apr);
  if (key === "cashflow") return arr.sort((a, b) => b.min - a.min);
  if (key === "interest") return arr.sort((a, b) => b.apr * b.balance - a.apr * a.balance);
  if (key === "blend") {
    const w = blendW / 100; // 0 = snowball (balance), 1 = avalanche (rate)
    const score = (d) => w * (d.apr / maxApr) + (1 - w) * (1 - d.balance / maxBal);
    return arr.sort((a, b) => score(b) - score(a));
  }
  if (key === "custom") return arr.sort((a, b) => customOrder.indexOf(a.id) - customOrder.indexOf(b.id));
  return arr;
}

function simulate(debts, extraToDebt, key, blendW, customOrder, savStart, apy, savMonthly, savTarget) {
  let active = debts.map((d) => ({ ...d, bal: d.balance }));
  const budget = active.reduce((s, d) => s + d.min, 0) + extraToDebt;
  let month = 0, totalInterest = 0, sav = savStart, emergencyMonth = null;
  const rows = [];
  const payoff = {};
  if (!active.length) return { months: 0, totalInterest: 0, rows: [], payoff: {}, emergencyMonth: null, budget };
  while (active.some((d) => d.bal > 0.01) && month < 720) {
    month++;
    let avail = budget;
    const pay = {};
    active.forEach((d) => { if (d.bal > 0.01) { const i = d.bal * d.apr / 100 / 12; d.bal += i; totalInterest += i; } });
    const order = ordering(active.filter((d) => d.bal > 0.01), key, blendW, customOrder);
    order.forEach((d) => { const p = Math.min(d.min, d.bal, avail); d.bal -= p; avail -= p; pay[d.id] = (pay[d.id] || 0) + p; });
    const targetId = order[0]?.id;
    for (const d of order) { if (avail <= 0.01) break; const p = Math.min(avail, d.bal); d.bal -= p; avail -= p; pay[d.id] = (pay[d.id] || 0) + p; }
    order.forEach((d) => { if (d.bal <= 0.01 && !payoff[d.id]) payoff[d.id] = month; });
    sav += sav * apy / 100 / 12 + savMonthly;
    if (emergencyMonth === null && sav >= savTarget) emergencyMonth = month;
    const debtRemaining = active.reduce((s, d) => s + Math.max(0, d.bal), 0);
    rows.push({ month, targetId, pay, remain: Object.fromEntries(active.map((d) => [d.id, Math.max(0, d.bal)])), savingsAdded: savMonthly, savings: sav, debtRemaining });
  }
  return { months: month, totalInterest, rows, payoff, emergencyMonth, budget };
}

/* ─────────────────────────  helpers  ───────────────────────── */
const num = (v) => (Number(v) || 0);
const money = (n) => "$" + Math.round(n).toLocaleString();
function monthLabel(offset) {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
const currentMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const monthsBehindCalc = (anchorStr) => {
  if (!anchorStr) return 0;
  const [ay, am] = anchorStr.split("-").map(Number);
  const n = new Date();
  return Math.max(0, (n.getFullYear() - ay) * 12 + (n.getMonth() + 1 - am));
};
const labelFromStr = (s) => {
  const [y, m] = s.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
};
const addMonthsStr = (s, n) => {
  const [y, m] = s.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

// One month of the plan, given working balances. Used to apply a logged month.
function planStep(debts, savings, p) {
  const clean = debts
    .map((d) => ({ ...d, balance: num(d.balance), apr: num(d.apr), min: num(d.min) }))
    .filter((d) => d.balance > 0.005);
  const totalMin = clean.reduce((s, d) => s + d.min, 0);
  const surplus = Math.max(0, p.income - p.expenses - totalMin);
  const extra = (surplus * p.split) / 100;
  const save = surplus - extra;
  const order = reconcileOrder(p.customOrder, clean);
  const s = simulate(clean, extra, p.strategy, p.blendW, order, savings, p.savApy, save, p.savTarget);
  return { row: s.rows[0] || null, plannedSave: save };
}
function applyPlanned(debts, savings, p) {
  const { row } = planStep(debts, savings, p);
  if (!row) return { debts, savings };
  return {
    debts: debts.map((d) => (row.remain[d.id] !== undefined ? { ...d, balance: row.remain[d.id] } : { ...d, balance: num(d.balance) })),
    savings: row.savings,
  };
}
function applyActual(debts, savings, pays, saved) {
  return {
    debts: debts.map((d) => {
      const bal = num(d.balance);
      if (bal <= 0.005) return d;
      const interest = (bal * num(d.apr)) / 100 / 12;
      return { ...d, balance: Math.max(0, bal + interest - num(pays[d.id])) };
    }),
    savings: savings + num(saved),
  };
}

/* ─────────────────────────  small pieces  ───────────────────────── */
function Field({ label, value, onChange, type = "number", prefix, suffix, placeholder }) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: C.inkSoft, letterSpacing: "0.05em" }}>{label}</label>}
      <div className="flex items-center rounded-2xl px-3 py-2.5" style={{ background: C.blush2, border: `1.5px solid ${C.borderSoft}` }}>
        {prefix && <span className="font-bold mr-1" style={{ color: C.inkFaint }}>{prefix}</span>}
        <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent outline-none font-bold" style={{ color: C.ink }} />
        {suffix && <span className="font-bold ml-1" style={{ color: C.inkFaint }}>{suffix}</span>}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, accent }) {
  return (
    <div className="rounded-3xl p-5" style={{ background: C.card, border: `1px solid ${C.borderSoft}`, boxShadow: "0 8px 28px -18px rgba(232,124,166,0.45)" }}>
      <div className="flex items-center gap-2 mb-2" style={{ color: accent || C.pink }}>
        {icon}<span className="text-xs font-bold uppercase" style={{ letterSpacing: "0.06em", color: C.inkSoft }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'Fraunces', serif", color: C.ink }} className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Welcome({ onAuth }) {
  const [mode, setMode] = useState("create");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (!email || !pw) { setError("please enter your email and password."); return; }
    setError(""); setBusy(true);
    const msg = await onAuth(mode, email.trim(), pw);
    setBusy(false);
    if (msg) setError(msg);
  };
  return (
    <div className="flex items-center justify-center px-5 py-16" style={{ minHeight: "100vh" }}>
      <div className="w-full max-w-md rounded-3xl p-8" style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 28px 70px -34px rgba(232,124,166,0.6)" }}>
        <div className="flex items-center gap-3 mb-7">
          <div className="rounded-2xl p-2.5" style={{ background: C.pinkSoft }}><Heart size={22} color={C.card} fill={C.card} /></div>
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", color: C.ink }} className="text-2xl font-semibold leading-none">bloom</div>
            <div className="text-xs font-semibold" style={{ color: C.inkFaint }}>your debt-freedom co-pilot</div>
          </div>
        </div>
        <h1 style={{ fontFamily: "'Fraunces', serif", color: C.ink }} className="text-3xl font-semibold mb-2">{mode === "create" ? "welcome — let's begin" : "welcome back"}</h1>
        <p className="text-sm font-semibold mb-6" style={{ color: C.inkSoft }}>{mode === "create" ? "a calm plan to get out of debt, at your pace. no bank login, no judgment — your info stays private." : "good to see you. pick up right where you left off."}</p>
        <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: C.inkSoft, letterSpacing: "0.06em" }}>email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@email.com" className="w-full rounded-2xl px-4 py-3 mb-4 font-semibold outline-none" style={{ background: C.blush2, border: `1.5px solid ${C.borderSoft}`, color: C.ink }} />
        <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: C.inkSoft, letterSpacing: "0.06em" }}>password</label>
        <input value={pw} onChange={(e) => setPw(e.target.value)} type="password" placeholder="••••••••" className="w-full rounded-2xl px-4 py-3 mb-2 font-semibold outline-none" style={{ background: C.blush2, border: `1.5px solid ${C.borderSoft}`, color: C.ink }} />
        {mode === "signin" && <div className="text-right mb-2"><button className="text-xs font-bold" style={{ color: C.inkFaint }}>forgot password?</button></div>}
        {error && <div className="rounded-2xl px-4 py-3 mb-3 text-sm font-bold" style={{ background: C.amberSoft, color: C.amber }}>{error}</div>}
        <button onClick={submit} disabled={busy} className="w-full rounded-2xl py-3.5 font-extrabold text-base mb-4 mt-2" style={{ background: C.pink, color: C.card, boxShadow: "0 14px 30px -12px rgba(232,124,166,.7)", opacity: busy ? 0.6 : 1 }}>{busy ? "one moment…" : (mode === "create" ? "create my plan" : "sign in")}</button>
        <div className="text-center text-sm font-semibold" style={{ color: C.inkSoft }}>
          {mode === "create" ? "already have an account? " : "new here? "}
          <button onClick={() => setMode(mode === "create" ? "signin" : "create")} className="font-extrabold" style={{ color: C.pink }}>{mode === "create" ? "sign in" : "create one"}</button>
        </div>
      </div>
    </div>
  );
}

function Intro({ onContinue }) {
  const rows = [
    { icon: <Wallet size={18} color={C.pink} />, title: "add your basics", body: "your paycheck, monthly bills, debts, and any savings goals." },
    { icon: <SlidersHorizontal size={18} color={C.pink} />, title: "it's all yours to edit", body: "we've started you with an example so you can see how it works — none of these numbers are real. change anything, rename things, or delete what doesn't fit." },
    { icon: <CalendarHeart size={18} color={C.pink} />, title: "then see your plan", body: "once it matches your real life, tap 'see my plan' and your debt-free date appears." },
  ];
  return (
    <div className="flex items-center justify-center px-5 py-16" style={{ minHeight: "100vh" }}>
      <div className="w-full max-w-lg rounded-3xl p-8" style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 28px 70px -34px rgba(232,124,166,0.6)" }}>
        <div className="inline-flex rounded-2xl p-2.5 mb-5" style={{ background: C.pinkSoft }}><Sparkles size={22} color={C.card} /></div>
        <h1 style={{ fontFamily: "'Fraunces', serif", color: C.ink }} className="text-3xl font-semibold mb-2">let's set up your plan</h1>
        <p className="text-sm font-semibold mb-6" style={{ color: C.inkSoft }}>it only takes a couple of minutes, and you can change everything later — nothing here is locked in.</p>
        <div className="space-y-3 mb-7">
          {rows.map((r, i) => (
            <div key={i} className="flex gap-3 rounded-2xl p-4" style={{ background: C.blush2, border: `1px solid ${C.borderSoft}` }}>
              <div className="rounded-xl p-2 shrink-0 self-start" style={{ background: C.card }}>{r.icon}</div>
              <div>
                <div className="font-extrabold text-sm mb-0.5" style={{ color: C.ink }}>{r.title}</div>
                <div className="text-sm font-semibold" style={{ color: C.inkSoft }}>{r.body}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onContinue} className="w-full rounded-2xl py-3.5 font-extrabold text-base" style={{ background: C.pink, color: C.card, boxShadow: "0 14px 30px -12px rgba(232,124,166,.7)" }}>okay — let's add my info →</button>
      </div>
    </div>
  );
}

/* ─────────────────────────  example data (starting point for new accounts)  ───────────────────────── */
const EXAMPLE_EXPENSES = [
  { id: "x1", name: "Rent", amount: 1250 },
  { id: "x2", name: "Groceries", amount: 400 },
  { id: "x3", name: "Utilities & phone", amount: 220 },
  { id: "x4", name: "Gas & transit", amount: 160 },
  { id: "x5", name: "Everything else", amount: 300 },
];
const EXAMPLE_DEBTS = [
  { id: "cc2", name: "Capital One", type: "credit card", balance: 1150, apr: 27.5, min: 45, due: 5 },
  { id: "cc1", name: "Discover", type: "credit card", balance: 4200, apr: 24.99, min: 120, due: 12 },
  { id: "pl", name: "Upstart loan", type: "personal loan", balance: 3400, apr: 12.9, min: 135, due: 18 },
  { id: "auto", name: "Car loan", type: "auto loan", balance: 11800, apr: 7.2, min: 320, due: 1 },
  { id: "sl", name: "Student loan", type: "student loan", balance: 18500, apr: 5.5, min: 190, due: 22 },
];

/* ─────────────────────────  monthly check-in  ───────────────────────── */
function Reconcile({ months, debts0, savings0, params, onComplete, onClose }) {
  const [workDebts, setWorkDebts] = useState(debts0);
  const [workSav, setWorkSav] = useState(savings0);
  const [idx, setIdx] = useState(0);
  const [mode, setMode] = useState("ask");
  const [pays, setPays] = useState({});
  const [saved, setSaved] = useState("");
  const total = months.length;
  const { row, plannedSave } = planStep(workDebts, workSav, params);
  const visible = workDebts.filter((d) => num(d.balance) > 0.005);

  const advance = (nd, ns) => {
    if (idx + 1 < total) { setWorkDebts(nd); setWorkSav(ns); setIdx(idx + 1); setMode("ask"); }
    else onComplete(nd, ns);
  };
  const confirmPlanned = () => { const r = applyPlanned(workDebts, workSav, params); advance(r.debts, r.savings); };
  const confirmActual = () => { const r = applyActual(workDebts, workSav, pays, saved); advance(r.debts, r.savings); };
  const enterAdjust = () => {
    const init = {}; visible.forEach((d) => { init[d.id] = Math.round(row?.pay[d.id] || 0); });
    setPays(init); setSaved(Math.round(plannedSave)); setMode("adjust");
  };
  const allPlanned = () => {
    let d = workDebts, s = workSav;
    for (let i = idx; i < total; i++) { const r = applyPlanned(d, s, params); d = r.debts; s = r.savings; }
    onComplete(d, s);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(74,44,61,0.35)" }}>
      <div className="w-full max-w-md rounded-3xl p-7 overflow-y-auto" style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 28px 70px -30px rgba(232,124,166,0.7)", maxHeight: "90vh" }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2" style={{ color: C.pink }}>
            <CalendarHeart size={18} /><span className="text-xs font-bold uppercase" style={{ letterSpacing: "0.08em" }}>monthly check-in</span>
          </div>
          {total > 1 && <span className="text-xs font-extrabold" style={{ color: C.inkFaint }}>{idx + 1} of {total}</span>}
        </div>
        <h2 style={{ fontFamily: "'Fraunces', serif", color: C.ink }} className="text-2xl font-semibold mb-2">let's close out {months[idx]}</h2>

        {visible.length === 0 ? (
          <>
            <p className="text-sm font-semibold mb-5" style={{ color: C.sage }}>you're debt-free — there's nothing left to log. amazing.</p>
            <button onClick={() => onComplete(workDebts, workSav)} className="w-full rounded-2xl py-3.5 font-extrabold" style={{ background: C.pink, color: C.card }}>done</button>
          </>
        ) : mode === "ask" ? (
          <>
            <p className="text-sm font-semibold mb-4" style={{ color: C.inkSoft }}>here's what your plan suggested for this month. did it go that way? totally your call — there's no wrong answer.</p>
            <div className="rounded-2xl p-4 mb-5" style={{ background: C.blush2, border: `1px solid ${C.borderSoft}` }}>
              {visible.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-1">
                  <span className="font-bold text-sm">{d.name}</span>
                  <span className="font-extrabold text-sm" style={{ color: C.ink }}>{money(row?.pay[d.id] || 0)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-1 mt-1" style={{ borderTop: `1px solid ${C.borderSoft}` }}>
                <span className="font-bold text-sm" style={{ color: C.sage }}>to savings</span>
                <span className="font-extrabold text-sm" style={{ color: C.sage }}>{money(plannedSave)}</span>
              </div>
            </div>
            <button onClick={confirmPlanned} className="w-full rounded-2xl py-3.5 font-extrabold text-base mb-3" style={{ background: C.pink, color: C.card, boxShadow: "0 14px 30px -12px rgba(232,124,166,.7)" }}>yes, that's what happened</button>
            <button onClick={enterAdjust} className="w-full rounded-2xl py-3 font-extrabold text-sm mb-4" style={{ background: C.blush, color: C.pink, border: `1.5px solid ${C.border}` }}>not exactly — I'll enter the real numbers</button>
            <div className="flex items-center justify-between">
              <button onClick={onClose} className="text-sm font-bold" style={{ color: C.inkFaint }}>I'll do this later</button>
              {total > 1 && <button onClick={allPlanned} className="text-sm font-extrabold" style={{ color: C.pink }}>all {total} went as planned →</button>}
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold mb-4" style={{ color: C.inkSoft }}>no problem — just tell me what actually happened. edit anything; the rest carries over.</p>
            <div className="space-y-3 mb-4">
              {visible.map((d) => (
                <Field key={d.id} label={`paid to ${d.name}`} value={pays[d.id] ?? ""} prefix="$" onChange={(v) => setPays((p) => ({ ...p, [d.id]: v }))} />
              ))}
              <Field label="added to savings" value={saved} prefix="$" onChange={setSaved} />
            </div>
            <button onClick={confirmActual} className="w-full rounded-2xl py-3.5 font-extrabold text-base mb-3" style={{ background: C.pink, color: C.card, boxShadow: "0 14px 30px -12px rgba(232,124,166,.7)" }}>save &amp; continue</button>
            <button onClick={() => setMode("ask")} className="w-full text-sm font-bold" style={{ color: C.inkFaint }}>← back</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────  app  ───────────────────────── */
export default function App() {
  // auth + sync
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSetup, setHasSetup] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [view, setView] = useState("plan");
  const ready = useRef(false); // true once data is loaded, so edits start auto-saving
  const [planMonth, setPlanMonth] = useState(null);   // first month not yet logged (YYYY-MM-01)
  const [reconcileOpen, setReconcileOpen] = useState(false);

  // money inputs
  const [payAmount, setPayAmount] = useState(1700);
  const [payFreq, setPayFreq] = useState("biweekly");
  const [expenses, setExpenses] = useState(EXAMPLE_EXPENSES);
  const [debts, setDebts] = useState(EXAMPLE_DEBTS);
  const [savCurrent, setSavCurrent] = useState(400);
  const [savTarget, setSavTarget] = useState(3000);
  const [savApy, setSavApy] = useState(4);

  // plan controls
  const [strategy, setStrategy] = useState("snowball");
  const [split, setSplit] = useState(70);
  const [blendW, setBlendW] = useState(50);
  const [customOrder, setCustomOrder] = useState(EXAMPLE_DEBTS.map((d) => d.id));
  const [showAll, setShowAll] = useState(false);

  // editors
  const updateDebt = (id, f, v) => setDebts((ds) => ds.map((d) => (d.id === id ? { ...d, [f]: v } : d)));
  const addDebt = () => setDebts((ds) => [...ds, { id: "d" + Date.now(), name: "new debt", type: "credit card", balance: "", apr: "", min: "", due: 1 }]);
  const removeDebt = (id) => {
    setDebts((ds) => ds.filter((d) => d.id !== id));
    if (session) db.deleteDebt(session.user.id, id).catch((e) => console.error("delete debt failed:", e));
  };
  const updateExpense = (id, f, v) => setExpenses((es) => es.map((e) => (e.id === id ? { ...e, [f]: v } : e)));
  const addExpense = () => setExpenses((es) => [...es, { id: "e" + Date.now(), name: "new expense", amount: "" }]);
  const removeExpense = (id) => {
    setExpenses((es) => es.filter((e) => e.id !== id));
    if (session) db.deleteExpense(session.user.id, id).catch((e) => console.error("delete expense failed:", e));
  };

  // derived money
  const monthlyIncome = useMemo(() => {
    const p = num(payAmount);
    if (payFreq === "weekly") return p * 52 / 12;
    if (payFreq === "biweekly") return p * 26 / 12;
    if (payFreq === "semimonthly") return p * 2;
    return p;
  }, [payAmount, payFreq]);
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + num(e.amount), 0), [expenses]);
  const cleanDebts = useMemo(() => debts.map((d) => ({ ...d, balance: num(d.balance), apr: num(d.apr), min: num(d.min) })).filter((d) => d.balance > 0), [debts]);
  const totalMin = useMemo(() => cleanDebts.reduce((s, d) => s + d.min, 0), [cleanDebts]);
  const rawSurplus = monthlyIncome - totalExpenses - totalMin;
  const surplus = Math.max(0, rawSurplus);
  const extraToDebt = surplus * split / 100;
  const toSavings = surplus - extraToDebt;

  const recOrder = useMemo(() => reconcileOrder(customOrder, cleanDebts), [customOrder, cleanDebts]);

  const sim = useMemo(
    () => simulate(cleanDebts, extraToDebt, strategy, blendW, recOrder, num(savCurrent), num(savApy), toSavings, num(savTarget)),
    [cleanDebts, extraToDebt, strategy, blendW, recOrder, savCurrent, savApy, toSavings, savTarget]
  );
  const compare = useMemo(
    () => STRATEGIES.map((s) => ({ ...s, ...simulate(cleanDebts, extraToDebt, s.key, blendW, recOrder, num(savCurrent), num(savApy), toSavings, num(savTarget)) })),
    [cleanDebts, extraToDebt, blendW, recOrder, savCurrent, savApy, toSavings, savTarget]
  );

  // single-winner badges
  const rounded = compare.map((c) => ({ key: c.key, interest: Math.round(c.totalInterest), months: c.months }));
  const liWinner = rounded.reduce((b, c) => (c.interest < b.interest || (c.interest === b.interest && c.months < b.months) ? c : b), rounded[0]);
  const faWinner = rounded.reduce((b, c) => (c.months < b.months || (c.months === b.months && c.interest < b.interest) ? c : b), rounded[0]);

  const chartData = useMemo(() => {
    const pts = [{ month: 0, debt: cleanDebts.reduce((s, d) => s + d.balance, 0), savings: num(savCurrent) }];
    sim.rows.forEach((r) => pts.push({ month: r.month, debt: r.debtRemaining, savings: r.savings }));
    return pts;
  }, [sim, cleanDebts, savCurrent]);

  const hasDebts = cleanDebts.length > 0;
  const finalSavings = chartData[chartData.length - 1].savings;
  const payoffVals = Object.values(sim.payoff).filter(Boolean);
  const firstWin = payoffVals.length ? Math.min(...payoffVals) : 0;
  const firstWinDebt = cleanDebts.find((d) => sim.payoff[d.id] === firstWin);
  const thisMonth = sim.rows[0];
  const visibleRows = showAll ? sim.rows : sim.rows.slice(0, 12);

  const move = (id, dir) => {
    const arr = [...recOrder];
    const i = arr.indexOf(id), j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setCustomOrder(arr);
  };

  const NavBtn = ({ id, icon, label }) => (
    <button onClick={() => setView(id)} className="flex items-center gap-2 rounded-full px-4 py-2 font-extrabold text-sm transition-all"
      style={{ background: view === id ? C.pink : C.card, color: view === id ? C.card : C.inkSoft, border: `1.5px solid ${view === id ? C.pink : C.borderSoft}` }}>
      {icon}{label}
    </button>
  );

  /* ── auth ── */
  const handleAuth = async (mode, email, password) => {
    if (mode === "create") {
      const { data, error } = await db.signUp(email, password);
      if (error) return error.message;
      if (!data.session) return "account created — if email confirmation is on, check your inbox, then sign in.";
      return null;
    }
    const { error } = await db.signIn(email, password);
    return error ? error.message : null;
  };
  const handleSignOut = async () => {
    await db.signOut();
    ready.current = false;
    setHasSetup(false); setShowIntro(false); setView("plan");
    setPlanMonth(null); setReconcileOpen(false);
    setPayAmount(1700); setPayFreq("biweekly");
    setExpenses(EXAMPLE_EXPENSES); setDebts(EXAMPLE_DEBTS);
    setCustomOrder(EXAMPLE_DEBTS.map((d) => d.id));
    setSavCurrent(400); setSavTarget(3000); setSavApy(4);
    setStrategy("snowball"); setSplit(70); setBlendW(50);
  };

  /* ── keep track of who's signed in ── */
  useEffect(() => {
    db.getSession().then((s) => { setSession(s); setAuthReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  /* ── load this user's saved data when they sign in ── */
  useEffect(() => {
    if (!session) { ready.current = false; return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const uid = session.user.id;
        const profile = await db.loadProfile(uid);
        const [dbDebts, dbExpenses] = await Promise.all([db.loadDebts(uid), db.loadExpenses(uid)]);
        if (cancelled) return;
        const engaged = profile.has_setup || dbDebts.length > 0 || dbExpenses.length > 0;
        if (engaged) {
          setPayAmount(profile.pay_amount); setPayFreq(profile.pay_freq);
          setSavCurrent(profile.sav_current); setSavTarget(profile.sav_target); setSavApy(profile.sav_apy);
          setStrategy(profile.strategy); setSplit(profile.split); setBlendW(profile.blend_w);
          setCustomOrder(Array.isArray(profile.custom_order) && profile.custom_order.length ? profile.custom_order : dbDebts.map((d) => d.id));
          setDebts(dbDebts.map((d) => ({ id: d.id, name: d.name, type: d.type, balance: d.balance, apr: d.apr, min: d.min, due: d.due })));
          setExpenses(dbExpenses.map((e) => ({ id: e.id, name: e.name, amount: e.amount })));
          const pm = profile.plan_month || currentMonthStr();
          setPlanMonth(pm);
          setReconcileOpen(monthsBehindCalc(pm) >= 1);
          setHasSetup(true); setShowIntro(false); setView("plan");
        } else {
          // truly brand-new account, nothing saved yet → start from the example so onboarding makes sense
          setDebts(EXAMPLE_DEBTS); setExpenses(EXAMPLE_EXPENSES);
          setCustomOrder(EXAMPLE_DEBTS.map((d) => d.id));
          setHasSetup(false); setShowIntro(true); setView("setup");
        }
        ready.current = true;
      } catch (err) {
        console.error("Could not load your data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session]);

  /* ── auto-save edits (debounced) once data has loaded, plus an immediate flush on tab hide/close ── */
  const latest = useRef(null);
  latest.current = { payAmount, payFreq, savCurrent, savTarget, savApy, strategy, split, blendW, customOrder, hasSetup, planMonth, debts, expenses };

  const flushSave = (uid) => {
    const s = latest.current;
    db.saveProfile(uid, {
      pay_amount: num(s.payAmount), pay_freq: s.payFreq,
      sav_current: num(s.savCurrent), sav_target: num(s.savTarget), sav_apy: num(s.savApy),
      strategy: s.strategy, split: s.split, blend_w: s.blendW, custom_order: s.customOrder,
      has_setup: s.hasSetup, plan_month: s.planMonth,
    }).catch((e) => console.error("save profile failed:", e));
    db.upsertDebts(uid, s.debts).catch((e) => console.error("save debts failed:", e));
    db.upsertExpenses(uid, s.expenses).catch((e) => console.error("save expenses failed:", e));
  };

  useEffect(() => {
    if (!session || !ready.current) return;
    const uid = session.user.id;
    const t = setTimeout(() => flushSave(uid), 800);
    return () => clearTimeout(t);
  }, [session, payAmount, payFreq, savCurrent, savTarget, savApy, strategy, split, blendW, customOrder, hasSetup, debts, expenses, planMonth]);

  // don't lose an in-flight edit if she switches apps, closes the tab, or the phone locks
  useEffect(() => {
    if (!session) return;
    const uid = session.user.id;
    const onHide = () => { if (ready.current && document.visibilityState === "hidden") flushSave(uid); };
    const onPageHide = () => { if (ready.current) flushSave(uid); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [session]);

  // applying a finished check-in: balances/savings move forward, anchor catches up to now
  const finishReconcile = (nd, ns) => {
    setDebts(nd);
    setSavCurrent(Math.round(ns * 100) / 100);
    setPlanMonth(currentMonthStr());
    setReconcileOpen(false);
  };
  const monthsBehind = monthsBehindCalc(planMonth);
  const monthsToLog = Array.from({ length: monthsBehind }, (_, i) => labelFromStr(addMonthsStr(planMonth, i)));

  return (
    <div style={{ background: `linear-gradient(160deg, ${C.bg1} 0%, ${C.bg2} 45%, ${C.bg3} 100%)`, fontFamily: "'Nunito', sans-serif", color: C.ink, minHeight: "100%" }} className="w-full">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Nunito:wght@400;500;600;700;800&display=swap');
        input[type=range]{ -webkit-appearance:none; appearance:none; height:8px; border-radius:999px; outline:none; }
        input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; appearance:none; width:26px; height:26px; border-radius:50%; background:${C.card}; border:3px solid ${C.pink}; box-shadow:0 4px 12px -3px rgba(232,124,166,.6); cursor:pointer; }
        input[type=range]::-moz-range-thumb{ width:22px; height:22px; border-radius:50%; background:${C.card}; border:3px solid ${C.pink}; cursor:pointer; }
        select{ -webkit-appearance:none; appearance:none; }
      `}</style>

      {authReady && !session && <Welcome onAuth={handleAuth} />}

      {session && loading && (
        <div className="flex items-center justify-center" style={{ minHeight: "100vh" }}>
          <div className="text-lg font-extrabold" style={{ color: C.pink, fontFamily: "'Fraunces', serif" }}>loading your plan…</div>
        </div>
      )}

      {session && !loading && showIntro && <Intro onContinue={() => { setShowIntro(false); setHasSetup(true); setView("setup"); }} />}

      {session && !loading && !showIntro && (
        <div className="max-w-5xl mx-auto px-5 py-8">

          {/* header + nav */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl p-2.5" style={{ background: C.pinkSoft }}><Heart size={22} color={C.card} fill={C.card} /></div>
              <div>
                <div style={{ fontFamily: "'Fraunces', serif", color: C.ink }} className="text-2xl font-semibold leading-none">bloom</div>
                <div className="text-xs font-semibold" style={{ color: C.inkFaint }}>your debt-freedom co-pilot</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NavBtn id="plan" icon={<LayoutDashboard size={15} />} label="my plan" />
              <NavBtn id="setup" icon={<SlidersHorizontal size={15} />} label="my info" />
              <button onClick={handleSignOut} title="sign out" className="flex items-center justify-center rounded-full p-2.5 font-extrabold" style={{ background: C.card, color: C.inkFaint, border: `1.5px solid ${C.borderSoft}` }}><LogOut size={15} /></button>
            </div>
          </div>

          {/* ───────────── SETUP / MY INFO ───────────── */}
          {view === "setup" && (
            <>
              <p className="text-sm font-semibold mb-5" style={{ color: C.inkSoft }}>
                {hasSetup ? "edit anything here — your plan updates and saves automatically." : "these are example numbers to start — replace them with yours and your whole plan updates instantly. your info is private to your account and saves as you go."}
              </p>

              {/* surplus summary */}
              <div className="rounded-3xl p-6 mb-5" style={{ background: `linear-gradient(135deg, ${C.blush} 0%, ${C.sageFaint} 100%)`, border: `1px solid ${C.border}` }}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div><div className="text-xs font-bold uppercase mb-1" style={{ color: C.inkSoft }}>monthly income</div><div style={{ fontFamily: "'Fraunces', serif" }} className="text-xl font-semibold">{money(monthlyIncome)}</div></div>
                  <div><div className="text-xs font-bold uppercase mb-1" style={{ color: C.inkSoft }}>− expenses</div><div style={{ fontFamily: "'Fraunces', serif" }} className="text-xl font-semibold">{money(totalExpenses)}</div></div>
                  <div><div className="text-xs font-bold uppercase mb-1" style={{ color: C.inkSoft }}>− minimums</div><div style={{ fontFamily: "'Fraunces', serif" }} className="text-xl font-semibold">{money(totalMin)}</div></div>
                  <div><div className="text-xs font-bold uppercase mb-1" style={{ color: rawSurplus >= 0 ? C.sage : C.amber }}>= left over</div><div style={{ fontFamily: "'Fraunces', serif", color: rawSurplus >= 0 ? C.sage : C.amber }} className="text-xl font-semibold">{money(rawSurplus)}</div></div>
                </div>
              </div>

              {/* income */}
              <div className="rounded-3xl p-6 mb-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <h2 style={{ fontFamily: "'Fraunces', serif" }} className="text-xl font-semibold mb-4">income</h2>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <Field label="take-home per paycheck" value={payAmount} onChange={setPayAmount} prefix="$" />
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: C.inkSoft, letterSpacing: "0.05em" }}>how often you're paid</label>
                    <div className="flex flex-wrap gap-2">
                      {[["weekly", "weekly"], ["biweekly", "every 2 wks"], ["semimonthly", "twice a mo"], ["monthly", "monthly"]].map(([k, lbl]) => (
                        <button key={k} onClick={() => setPayFreq(k)} className="rounded-full px-3.5 py-2 font-bold text-sm" style={{ background: payFreq === k ? C.pink : C.blush2, color: payFreq === k ? C.card : C.inkSoft, border: `1.5px solid ${payFreq === k ? C.pink : C.borderSoft}` }}>{lbl}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-bold" style={{ color: C.inkSoft }}>that's about <span style={{ color: C.pink }}>{money(monthlyIncome)}</span> a month.</div>
              </div>

              {/* expenses */}
              <div className="rounded-3xl p-6 mb-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 style={{ fontFamily: "'Fraunces', serif" }} className="text-xl font-semibold">monthly expenses</h2>
                  <div className="text-sm font-extrabold" style={{ color: C.inkSoft }}>total {money(totalExpenses)}</div>
                </div>
                {expenses.map((e) => (
                  <div key={e.id} className="flex items-end gap-3 mb-3">
                    <Field label="" value={e.name} type="text" onChange={(v) => updateExpense(e.id, "name", v)} />
                    <div style={{ width: 150 }}><Field label="" value={e.amount} prefix="$" onChange={(v) => updateExpense(e.id, "amount", v)} /></div>
                    <button onClick={() => removeExpense(e.id)} className="rounded-2xl p-3 mb-0.5" style={{ background: C.blush }}><Trash2 size={16} color={C.pink} /></button>
                  </div>
                ))}
                <button onClick={addExpense} className="flex items-center gap-2 rounded-full px-4 py-2.5 font-extrabold text-sm mt-1" style={{ background: C.blush, color: C.pink }}><Plus size={16} /> add an expense</button>
              </div>

              {/* debts */}
              <div className="rounded-3xl p-6 mb-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <div className="flex items-center justify-between mb-1">
                  <h2 style={{ fontFamily: "'Fraunces', serif" }} className="text-xl font-semibold">your debts</h2>
                  <div className="text-sm font-extrabold" style={{ color: C.inkSoft }}>{money(cleanDebts.reduce((s, d) => s + d.balance, 0))} · min {money(totalMin)}/mo</div>
                </div>
                <p className="text-sm font-semibold mb-4" style={{ color: C.inkFaint }}>add every card and loan. the APR is the interest rate on your statement.</p>
                {debts.map((d) => (
                  <div key={d.id} className="rounded-2xl p-4 mb-3" style={{ background: C.blush2, border: `1px solid ${C.borderSoft}` }}>
                    <div className="flex items-center justify-between mb-3 gap-3">
                      <div className="flex-1"><Field label="" value={d.name} type="text" onChange={(v) => updateDebt(d.id, "name", v)} /></div>
                      <button onClick={() => removeDebt(d.id)} className="rounded-2xl p-3" style={{ background: C.card }}><Trash2 size={16} color={C.pink} /></button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                      <Field label="balance" value={d.balance} prefix="$" onChange={(v) => updateDebt(d.id, "balance", v)} />
                      <Field label="APR" value={d.apr} suffix="%" onChange={(v) => updateDebt(d.id, "apr", v)} />
                      <Field label="min payment" value={d.min} prefix="$" onChange={(v) => updateDebt(d.id, "min", v)} />
                      <Field label="due day" value={d.due} onChange={(v) => updateDebt(d.id, "due", v)} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: C.inkSoft, letterSpacing: "0.05em" }}>type</label>
                      <div className="flex flex-wrap gap-2">
                        {TYPES.map((t) => (
                          <button key={t} onClick={() => updateDebt(d.id, "type", t)} className="rounded-full px-3 py-1.5 font-bold text-xs" style={{ background: d.type === t ? C.pinkSoft : C.card, color: d.type === t ? C.card : C.inkSoft, border: `1.5px solid ${d.type === t ? C.pinkSoft : C.borderSoft}` }}>{t}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={addDebt} className="flex items-center gap-2 rounded-full px-4 py-2.5 font-extrabold text-sm" style={{ background: C.blush, color: C.pink }}><Plus size={16} /> add a debt</button>
              </div>

              {/* savings */}
              <div className="rounded-3xl p-6 mb-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <h2 style={{ fontFamily: "'Fraunces', serif" }} className="text-xl font-semibold mb-4">savings</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="saved so far" value={savCurrent} prefix="$" onChange={setSavCurrent} />
                  <Field label="emergency fund goal" value={savTarget} prefix="$" onChange={setSavTarget} />
                  <Field label="savings APY" value={savApy} suffix="%" onChange={setSavApy} />
                </div>
              </div>

              <button onClick={() => { setHasSetup(true); setPlanMonth(currentMonthStr()); setView("plan"); }} className="w-full rounded-2xl py-4 font-extrabold text-base" style={{ background: C.pink, color: C.card, boxShadow: "0 14px 30px -12px rgba(232,124,166,.7)" }}>see my plan →</button>
            </>
          )}

          {/* ───────────── PLAN / DASHBOARD ───────────── */}
          {view === "plan" && !hasDebts && (
            <div className="rounded-3xl p-10 text-center" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="inline-flex rounded-2xl p-3 mb-4" style={{ background: C.blush }}><Sparkles size={24} color={C.pink} /></div>
              <h2 style={{ fontFamily: "'Fraunces', serif" }} className="text-2xl font-semibold mb-2">let's add your numbers first</h2>
              <p className="text-sm font-semibold mb-5" style={{ color: C.inkSoft }}>head to <b>my info</b> to enter your income and debts, and your plan will appear here.</p>
              <button onClick={() => setView("setup")} className="rounded-2xl px-6 py-3 font-extrabold" style={{ background: C.pink, color: C.card }}>go to my info</button>
            </div>
          )}

          {view === "plan" && hasDebts && (
            <>
              {monthsBehind >= 1 && (
                <button onClick={() => setReconcileOpen(true)} className="w-full text-left rounded-3xl p-5 mb-5 flex items-center justify-between gap-3" style={{ background: `linear-gradient(135deg, ${C.blush} 0%, ${C.sageFaint} 100%)`, border: `1px solid ${C.border}` }}>
                  <div>
                    <div className="font-extrabold mb-0.5" style={{ color: C.pink }}>ready to close out {labelFromStr(planMonth)}?</div>
                    <p className="text-sm font-semibold" style={{ color: C.inkSoft }}>{monthsBehind > 1 ? `it's been ${monthsBehind} months — let's catch your plan up, one at a time.` : "a quick check-in keeps your debt-free date honest. takes a few seconds."}</p>
                  </div>
                  <span className="rounded-full px-4 py-2 font-extrabold text-sm whitespace-nowrap" style={{ background: C.pink, color: C.card }}>log it</span>
                </button>
              )}

              {rawSurplus <= 0 && (
                <div className="rounded-3xl p-5 mb-5" style={{ background: C.amberSoft, border: `1px solid ${C.amber}` }}>
                  <div className="font-extrabold mb-1" style={{ color: C.amber }}>no extra room right now — and that's okay.</div>
                  <p className="text-sm font-semibold" style={{ color: C.ink }}>your income covers essentials and minimum payments, with nothing left to add. your plan below runs on minimums. when you free up even $25, come back and set the split — it makes a real difference.</p>
                </div>
              )}

              {/* hero */}
              <div className="rounded-3xl p-7 mb-5" style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 24px 60px -32px rgba(232,124,166,0.55)" }}>
                <div className="flex items-center gap-2 mb-1" style={{ color: C.pink }}>
                  <CalendarHeart size={18} /><span className="text-sm font-bold uppercase" style={{ letterSpacing: "0.08em" }}>your freedom date</span>
                </div>
                <div style={{ fontFamily: "'Fraunces', serif", color: C.ink }} className="text-3xl sm:text-5xl font-semibold mb-1">
                  debt-free by <span style={{ color: C.pink }}>{monthLabel(sim.months)}</span>
                </div>
                <p className="text-base font-medium mb-5" style={{ color: C.inkSoft }}>
                  that's {sim.months} months away{firstWinDebt ? ` — and your first debt, ${firstWinDebt.name}, is gone in just ${firstWin}.` : "."} you're on your way.
                </p>
                <div style={{ height: 230 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.debt} stopOpacity={0.35} /><stop offset="100%" stopColor={C.debt} stopOpacity={0.02} /></linearGradient>
                        <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.sage} stopOpacity={0.30} /><stop offset="100%" stopColor={C.sage} stopOpacity={0.02} /></linearGradient>
                      </defs>
                      <CartesianGrid stroke={C.borderSoft} vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: C.inkFaint, fontSize: 12, fontWeight: 700 }} tickFormatter={(m) => (m % 12 === 0 && m > 0 ? `${m / 12}y` : "")} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: C.inkFaint, fontSize: 12, fontWeight: 700 }} tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} axisLine={false} tickLine={false} width={48} />
                      <Tooltip contentStyle={{ borderRadius: 16, border: `1px solid ${C.border}`, fontFamily: "'Nunito', sans-serif", fontWeight: 700 }} labelFormatter={(m) => `month ${m}`} formatter={(v, n) => [money(v), n === "debt" ? "debt left" : "savings"]} />
                      <Area type="monotone" dataKey="debt" stroke={C.debt} strokeWidth={3} fill="url(#gd)" name="debt" />
                      <Area type="monotone" dataKey="savings" stroke={C.sage} strokeWidth={3} fill="url(#gs)" name="savings" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-5 mt-3 text-sm font-bold" style={{ color: C.inkSoft }}>
                  <span className="flex items-center gap-2"><span className="rounded-full" style={{ width: 12, height: 12, background: C.debt }} /> debt going down</span>
                  <span className="flex items-center gap-2"><span className="rounded-full" style={{ width: 12, height: 12, background: C.sage }} /> savings growing</span>
                </div>
              </div>

              {/* stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                <Stat icon={<CalendarHeart size={16} />} label="months left" value={sim.months} />
                <Stat icon={<TrendingDown size={16} />} label="total interest" value={money(sim.totalInterest)} />
                <Stat icon={<PiggyBank size={16} />} label="savings at finish" value={money(finalSavings)} accent={C.sage} />
                <Stat icon={<Sparkles size={16} />} label="first debt gone" value={firstWin ? `${firstWin} mo` : "—"} />
              </div>

              {/* strategy */}
              <div className="rounded-3xl p-6 mb-5" style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 16px 44px -30px rgba(232,124,166,0.5)" }}>
                <h2 style={{ fontFamily: "'Fraunces', serif", color: C.ink }} className="text-xl font-semibold mb-4">pick a strategy</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                  {STRATEGIES.map((s) => {
                    const on = strategy === s.key;
                    return (
                      <button key={s.key} onClick={() => setStrategy(s.key)} className="rounded-2xl px-4 py-4 text-left transition-all" style={{ background: on ? C.pink : C.blush2, border: `1.5px solid ${on ? C.pink : C.borderSoft}`, boxShadow: on ? "0 12px 28px -12px rgba(232,124,166,.6)" : "none" }}>
                        <div className="font-extrabold text-base mb-1" style={{ color: on ? C.card : C.ink }}>{s.label}</div>
                        <div className="text-xs font-semibold leading-snug" style={{ color: on ? "rgba(255,255,255,.9)" : C.inkSoft }}>{s.blurb}</div>
                      </button>
                    );
                  })}
                </div>

                {strategy === "blend" && (
                  <div className="rounded-2xl p-4 mb-5" style={{ background: C.blush2, border: `1px solid ${C.borderSoft}` }}>
                    <div className="text-sm font-extrabold mb-2" style={{ color: C.ink }}>your blend</div>
                    <input type="range" min="0" max="100" step="5" value={blendW} onChange={(e) => setBlendW(+e.target.value)} className="w-full mb-2" style={{ background: `linear-gradient(90deg, ${C.pinkSoft} 0%, ${C.pink} 100%)` }} />
                    <div className="flex justify-between text-xs font-extrabold" style={{ color: C.inkSoft }}>
                      <span>← quick wins (snowball)</span><span>least interest (avalanche) →</span>
                    </div>
                  </div>
                )}

                {strategy === "custom" && (
                  <div className="rounded-2xl p-4 mb-5" style={{ background: C.blush2, border: `1px solid ${C.borderSoft}` }}>
                    <div className="text-sm font-bold mb-3" style={{ color: C.inkSoft }}>your payoff order — extra money goes top to bottom</div>
                    {recOrder.map((id, i) => {
                      const d = cleanDebts.find((x) => x.id === id);
                      if (!d) return null;
                      return (
                        <div key={id} className="flex items-center justify-between rounded-xl px-3 py-2 mb-2" style={{ background: C.card, border: `1px solid ${C.borderSoft}` }}>
                          <div className="flex items-center gap-3">
                            <span className="rounded-full w-6 h-6 flex items-center justify-center text-xs font-extrabold" style={{ background: C.pinkSoft, color: C.card }}>{i + 1}</span>
                            <span className="font-bold text-sm">{d.name}</span>
                            <span className="text-xs font-semibold" style={{ color: C.inkFaint }}>{money(d.balance)} · {d.apr}%</span>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => move(id, -1)} className="rounded-lg p-1.5" style={{ background: C.blush }}><ChevronUp size={16} color={C.pink} /></button>
                            <button onClick={() => move(id, 1)} className="rounded-lg p-1.5" style={{ background: C.blush }}><ChevronDown size={16} color={C.pink} /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* split */}
                <div className="flex items-center gap-2 mb-2" style={{ color: C.ink }}>
                  <Wallet size={16} color={C.pink} /><span className="font-extrabold">your {money(surplus)}/mo, split your way</span>
                </div>
                <input type="range" min="0" max="100" step="5" value={split} onChange={(e) => setSplit(+e.target.value)} disabled={surplus <= 0} className="w-full mb-3" style={{ background: `linear-gradient(90deg, ${C.pink} 0%, ${C.pink} ${split}%, ${C.sageSoft} ${split}%, ${C.sage} 100%)`, opacity: surplus <= 0 ? 0.4 : 1 }} />
                <div className="flex justify-between text-sm font-extrabold">
                  <span style={{ color: C.pink }}>{money(extraToDebt)} → extra to debt</span>
                  <span style={{ color: C.sage }}>{money(toSavings)} → savings</span>
                </div>
              </div>

              {/* this month */}
              {thisMonth && (
                <div className="rounded-3xl p-6 mb-5" style={{ background: `linear-gradient(135deg, ${C.blush} 0%, ${C.sageFaint} 100%)`, border: `1px solid ${C.border}` }}>
                  <div className="flex items-center gap-2 mb-1" style={{ color: C.pink }}>
                    <Sparkles size={16} /><span className="text-sm font-bold uppercase" style={{ letterSpacing: "0.08em" }}>this month, just do this</span>
                  </div>
                  <p className="text-sm font-semibold mb-4" style={{ color: C.inkSoft }}>no math, no guessing — your moves for {monthLabel(0)}.</p>
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    {cleanDebts.map((d) => {
                      const amt = thisMonth.pay[d.id] || 0;
                      const isTarget = thisMonth.targetId === d.id;
                      return (
                        <div key={d.id} className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: C.card, border: `1.5px solid ${isTarget ? C.pink : C.borderSoft}` }}>
                          <div><div className="font-extrabold text-sm">{d.name}</div>{isTarget && <div className="text-xs font-bold" style={{ color: C.pink }}>★ extra goes here</div>}</div>
                          <div style={{ fontFamily: "'Fraunces', serif" }} className="text-lg font-semibold">{money(amt)}</div>
                        </div>
                      );
                    })}
                    {toSavings > 0 && (
                      <div className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: C.sageFaint, border: `1.5px solid ${C.sageSoft}` }}>
                        <div className="font-extrabold text-sm" style={{ color: C.sage }}>move to savings</div>
                        <div style={{ fontFamily: "'Fraunces', serif", color: C.sage }} className="text-lg font-semibold">{money(toSavings)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* comparison */}
              <div className="rounded-3xl p-6 mb-5" style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 16px 44px -30px rgba(232,124,166,0.5)" }}>
                <h2 style={{ fontFamily: "'Fraunces', serif", color: C.ink }} className="text-xl font-semibold mb-1">compare your options</h2>
                <p className="text-sm font-semibold mb-4" style={{ color: C.inkSoft }}>same money, same debts — here's how each path plays out. no wrong choice.</p>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {compare.map((c) => {
                    const on = strategy === c.key;
                    const isLI = c.key === liWinner.key, isFA = c.key === faWinner.key;
                    return (
                      <button key={c.key} onClick={() => setStrategy(c.key)} className="rounded-2xl p-4 text-left transition-all" style={{ background: on ? C.blush : C.blush2, border: `1.5px solid ${on ? C.pink : C.borderSoft}` }}>
                        <div className="font-extrabold mb-2 flex items-center gap-1.5 flex-wrap">
                          {c.label}
                          {isLI && <span className="text-xs rounded-full px-2 py-0.5 font-bold" style={{ background: C.sageSoft, color: C.sage }}>least interest</span>}
                          {isFA && !isLI && <span className="text-xs rounded-full px-2 py-0.5 font-bold" style={{ background: C.pinkSoft, color: C.card }}>fastest</span>}
                          {isFA && isLI && <span className="text-xs rounded-full px-2 py-0.5 font-bold" style={{ background: C.pinkSoft, color: C.card }}>fastest</span>}
                        </div>
                        <div className="text-xs font-bold" style={{ color: C.inkSoft }}>debt-free in</div>
                        <div style={{ fontFamily: "'Fraunces', serif", color: C.ink }} className="text-xl font-semibold mb-1">{c.months} mo</div>
                        <div className="text-xs font-bold" style={{ color: C.inkSoft }}>interest paid</div>
                        <div style={{ fontFamily: "'Fraunces', serif", color: C.pink }} className="text-lg font-semibold">{money(c.totalInterest)}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* schedule */}
              <div className="rounded-3xl p-6 mb-5" style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 16px 44px -30px rgba(232,124,166,0.5)" }}>
                <h2 style={{ fontFamily: "'Fraunces', serif", color: C.ink }} className="text-xl font-semibold mb-1">your month-by-month plan</h2>
                <p className="text-sm font-semibold mb-4" style={{ color: C.inkSoft }}>exactly what to pay, every month, until you're free.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                    <thead>
                      <tr style={{ color: C.inkSoft }}>
                        <th className="text-left font-extrabold py-2 px-2">month</th>
                        {cleanDebts.map((d) => <th key={d.id} className="text-right font-extrabold py-2 px-2 whitespace-nowrap">{d.name}</th>)}
                        <th className="text-right font-extrabold py-2 px-2">saved</th>
                        <th className="text-right font-extrabold py-2 px-2">debt left</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((r, idx) => (
                        <tr key={r.month} style={{ background: idx % 2 ? C.blush2 : "transparent" }}>
                          <td className="py-2 px-2 font-bold whitespace-nowrap" style={{ color: C.inkSoft }}>{monthLabel(r.month - 1)}</td>
                          {cleanDebts.map((d) => {
                            const amt = r.pay[d.id] || 0;
                            const cleared = r.remain[d.id] <= 0.01 && amt > 0;
                            return <td key={d.id} className="py-2 px-2 text-right font-bold whitespace-nowrap" style={{ color: r.targetId === d.id ? C.pink : amt > 0 ? C.ink : C.inkFaint }}>{amt > 0 ? money(amt) : "—"}{cleared && " ✓"}</td>;
                          })}
                          <td className="py-2 px-2 text-right font-bold" style={{ color: C.sage }}>{money(r.savingsAdded)}</td>
                          <td className="py-2 px-2 text-right font-extrabold">{money(r.debtRemaining)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {sim.rows.length > 12 && (
                  <button onClick={() => setShowAll((v) => !v)} className="mt-4 rounded-full px-5 py-2.5 font-extrabold text-sm" style={{ background: C.blush, color: C.pink, border: `1px solid ${C.border}` }}>{showAll ? "show less" : `show all ${sim.rows.length} months`}</button>
                )}
              </div>

              <p className="text-center text-xs font-semibold px-6 pb-4" style={{ color: C.inkFaint }}>
                bloom shows projections based on the numbers you enter. it's a planning companion, not financial advice — your real interest and dates may differ. you're doing the brave part already. 💗
              </p>
            </>
          )}
        </div>
      )}

      {session && !loading && hasSetup && reconcileOpen && monthsBehind >= 1 && (
        <Reconcile
          months={monthsToLog}
          debts0={debts}
          savings0={num(savCurrent)}
          params={{ income: monthlyIncome, expenses: totalExpenses, split, strategy, blendW, customOrder, savApy: num(savApy), savTarget: num(savTarget) }}
          onComplete={finishReconcile}
          onClose={() => setReconcileOpen(false)}
        />
      )}
    </div>
  );
}
