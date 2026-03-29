import { useState } from "react";

// ── SVG icon helpers ──────────────────────────────────────────────────────────
const Icon = ({ d, size = 20, stroke = "currentColor", fill = "none", strokeWidth = 1.8, style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d={d} />
  </svg>
);

const STEPS = [
  {
    iconPath: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Set Your Time Period",
    subtitle: "Step 1 of 5",
    content: "Use the **Simulation Date** picker in the left sidebar to travel to any date between January 2000 and December 2024.",
    detail: "Every price, chart, and market commentary will reflect that exact historical moment. Try starting in 2008 to trade through the financial crisis, or 2020 to navigate the COVID crash.",
    visual: (
      <div style={{ background: "#fff", border: "1px solid #e4e2dc", borderRadius: 8, padding: "12px 14px", fontFamily: "DM Mono, monospace", fontSize: 12 }}>
        <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "#a09b93", marginBottom: 6 }}>Simulation Date</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: "#f7f6f2", border: "1px solid #e4e2dc", borderRadius: 6, padding: "6px 12px", fontSize: 13, color: "#18160f" }}>
            10 / 15 / 2008
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a09b93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
      </div>
    ),
  },
  {
    iconPath: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    title: "Find a Stock",
    subtitle: "Step 2 of 5",
    content: "Search for any stock ticker or company name in the **Stock Search** box. Popular stocks for your era appear as quick-select chips below.",
    detail: "Only stocks that actually existed on your simulation date will be suggested. For example, searching in 2005 won't show Tesla (IPO'd 2010) or Meta (IPO'd 2012).",
    visual: (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {["GE", "AAPL", "MSFT", "JPM", "XOM", "KO"].map(s => (
          <span key={s} style={{
            padding: "4px 10px", background: "#f7f6f2", border: "1px solid #e4e2dc",
            borderRadius: 20, fontFamily: "DM Mono, monospace", fontSize: 11, color: "#66625a",
          }}>{s}</span>
        ))}
        <span style={{ padding: "4px 10px", background: "#dcfce7", border: "1px solid #86efac", borderRadius: 20, fontFamily: "DM Mono, monospace", fontSize: 11, color: "#16a34a" }}>
          + more
        </span>
      </div>
    ),
  },
  {
    iconPath: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    title: "Read the Chart & Analysis",
    subtitle: "Step 3 of 5",
    content: "The **Trade tab** shows a 30-day price chart ending on your sim date, along with era-specific market commentary.",
    detail: "The amber dashed line marks your average cost once you own shares. Toggle between Line and Candlestick view. Market briefs only reference events that had already happened.",
    visual: (
      <div style={{ background: "#fff", border: "1px solid #e4e2dc", borderRadius: 8, padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#d97706" }} />
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#a09b93", letterSpacing: 1.5, textTransform: "uppercase" }}>Market Brief · Oct 2008</span>
        </div>
        <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: 12, color: "#66625a", lineHeight: 1.65, margin: 0 }}>
          The global financial crisis is in full swing. Lehman Brothers has collapsed...
        </p>
      </div>
    ),
  },
  {
    iconPath: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Place Your Trade",
    subtitle: "Step 4 of 5",
    content: "Select **Buy** or **Sell**, enter the number of shares, and hit the green button. You start with **$100,000** in simulated cash.",
    detail: "Your portfolio updates instantly. You can hold multiple positions across different tickers. Sell any time by switching to Sell mode with shares you already own.",
    visual: (
      <div style={{ background: "#fff", border: "1px solid #e4e2dc", borderRadius: 8, padding: "12px 14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
          <div style={{ padding: "7px", background: "#dcfce7", border: "1px solid #86efac", borderRadius: 6, textAlign: "center", fontFamily: "DM Mono, monospace", fontSize: 11, color: "#16a34a", fontWeight: 600 }}>BUY</div>
          <div style={{ padding: "7px", background: "#f7f6f2", border: "1px solid #e4e2dc", borderRadius: 6, textAlign: "center", fontFamily: "DM Mono, monospace", fontSize: 11, color: "#a09b93" }}>SELL</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "DM Mono, monospace", fontSize: 11, color: "#66625a", marginBottom: 8 }}>
          <span>Total</span><span style={{ fontWeight: 600, color: "#18160f" }}>$6,472.00</span>
        </div>
        <div style={{ padding: "8px", background: "#16a34a", borderRadius: 6, textAlign: "center", fontFamily: "DM Mono, monospace", fontSize: 11, color: "#fff", letterSpacing: 1 }}>
          BUY AAPL
        </div>
      </div>
    ),
  },
  {
    iconPath: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
    title: "Track Your Performance",
    subtitle: "Step 5 of 5",
    content: "The **Metrics** panel on the right shows your live portfolio value, cash, equity, and total P&L as you move through time.",
    detail: "Change the simulation date to fast-forward or rewind. Watch your portfolio's value change as history unfolds. Head to Portfolio and History tabs to review all positions and trades.",
    visual: (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[
          { l: "Total Value", v: "$104,320.00", big: true },
          { l: "Cash",        v: "$71,200.00",  sub: "71% liquid" },
          { l: "Total P&L",   v: "+$4,320.00",  col: "#16a34a" },
        ].map(m => (
          <div key={m.l} style={{ background: "#f7f6f2", border: "1px solid #e4e2dc", borderRadius: 6, padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#a09b93", letterSpacing: 1.5, textTransform: "uppercase" }}>{m.l}</span>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: m.big ? 14 : 12, fontWeight: m.big ? 600 : 400, color: m.col || "#18160f" }}>{m.v}</div>
              {m.sub && <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#a09b93" }}>{m.sub}</div>}
            </div>
          </div>
        ))}
      </div>
    ),
  },
];

export default function Tutorial({ onClose }) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="tutorial-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div className="tutorial-card" style={{ position: "relative" }}>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16, zIndex: 10,
            width: 28, height: 28, borderRadius: "50%", border: "none",
            background: "rgba(255,255,255,0.15)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", transition: "background .15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Header */}
        <div className="tutorial-header" style={{ background: "var(--t1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={s.iconPath} />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,.45)", marginBottom: 3 }}>
                {s.subtitle}
              </div>
              <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: -.3 }}>
                {s.title}
              </h3>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ display: "flex", gap: 5 }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                onClick={() => setStep(i)}
                style={{
                  height: 3, borderRadius: 2, cursor: "pointer", flex: 1,
                  background: i <= step ? "#fff" : "rgba(255,255,255,.2)",
                  transition: "background .2s",
                }}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="tutorial-body">
          <p style={{ fontFamily: "DM Sans", fontSize: 14, color: "var(--t1)", lineHeight: 1.7, marginBottom: 14 }}>
            {s.content.split("**").map((chunk, i) =>
              i % 2 === 1
                ? <strong key={i} style={{ fontWeight: 600 }}>{chunk}</strong>
                : chunk
            )}
          </p>
          <p style={{ fontFamily: "DM Sans", fontSize: 13, color: "var(--t2)", lineHeight: 1.7, marginBottom: 20 }}>
            {s.detail}
          </p>

          {/* Visual demo */}
          <div style={{ background: "var(--bg)", border: "1px solid var(--b1)", borderRadius: 10, padding: "16px 18px" }}>
            {s.visual}
          </div>
        </div>

        {/* Footer */}
        <div className="tutorial-footer" style={{ flexDirection: "column", alignItems: "center", gap: 16 }}>
          {/* Dot navigation */}
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {STEPS.map((_, i) => (
              <div key={i} className={`tutorial-step-dot ${i === step ? "active" : ""}`} onClick={() => setStep(i)} />
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", width: "100%" }}>
            <button
              className="tut-btn tut-btn-ghost"
              onClick={() => setStep(s => Math.max(0, s - 1))}
              style={{ opacity: step === 0 ? 0 : 1, pointerEvents: step === 0 ? "none" : "auto", minWidth: 88 }}
            >
              ← Back
            </button>
            {!isLast ? (
              <button className="tut-btn tut-btn-primary" onClick={() => setStep(s => s + 1)} style={{ minWidth: 88 }}>
                Next →
              </button>
            ) : (
              <button className="tut-btn tut-btn-primary" onClick={onClose} style={{ background: "var(--green)", minWidth: 88, display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 3l14 9-14 9V3z"/>
                </svg>
                Start Trading
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
