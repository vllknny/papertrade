import { useState } from "react";

const STEPS = [
  {
    icon: "🕰",
    title: "Set Your Time Period",
    subtitle: "Step 1 of 5",
    color: "#fef3c7",
    accent: "#d97706",
    content: "Use the **Simulation Date** picker in the left sidebar to travel to any date between January 2000 and December 2024.",
    detail: "Every price, chart, and market commentary will reflect that exact historical moment. Try starting in 2008 to trade through the financial crisis, or 2020 to navigate the COVID crash.",
    visual: (
      <div style={{ background: "#fff", border: "1px solid #e4e2dc", borderRadius: 8, padding: "12px 14px", fontFamily: "DM Mono, monospace", fontSize: 12 }}>
        <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "#a09b93", marginBottom: 6 }}>Simulation Date</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: "#f7f6f2", border: "1px solid #e4e2dc", borderRadius: 6, padding: "6px 12px", fontSize: 13, color: "#18160f" }}>
            10 / 15 / 2008
          </div>
          <span style={{ fontSize: 18 }}>📅</span>
        </div>
      </div>
    ),
  },
  {
    icon: "🔍",
    title: "Find a Stock",
    subtitle: "Step 2 of 5",
    color: "#f0fdf4",
    accent: "#16a34a",
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
    icon: "📊",
    title: "Read the Chart & Analysis",
    subtitle: "Step 3 of 5",
    color: "#f0f9ff",
    accent: "#0284c7",
    content: "The **Trade tab** shows a 30-day price chart ending on your sim date, along with era-specific market commentary.",
    detail: "The amber dashed line marks your average cost once you own shares. Market briefs are calibrated to the historical period — they only reference events that had already happened.",
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
    icon: "💰",
    title: "Place Your Trade",
    subtitle: "Step 4 of 5",
    color: "#fdf4ff",
    accent: "#9333ea",
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
    icon: "📈",
    title: "Track Your Performance",
    subtitle: "Step 5 of 5",
    color: "#fff7ed",
    accent: "#ea580c",
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
    <div className="tutorial-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tutorial-card">

        {/* Header */}
        <div className="tutorial-header" style={{ background: "var(--t1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 28 }}>{s.icon}</span>
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
          <p style={{
            fontFamily: "DM Sans", fontSize: 14, color: "var(--t1)",
            lineHeight: 1.7, marginBottom: 14,
            dangerouslySetInnerHTML: undefined,
          }}>
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
          <div style={{
            background: "var(--bg)", border: "1px solid var(--b1)",
            borderRadius: 10, padding: "16px 18px",
          }}>
            {s.visual}
          </div>
        </div>

        {/* Footer */}
        <div className="tutorial-footer">
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {STEPS.map((_, i) => (
              <div key={i} className={`tutorial-step-dot ${i === step ? "active" : ""}`} onClick={() => setStep(i)} />
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {step > 0 && (
              <button className="tut-btn tut-btn-ghost" onClick={() => setStep(s => s - 1)}>
                ← Back
              </button>
            )}
            {!isLast ? (
              <button className="tut-btn tut-btn-primary" onClick={() => setStep(s => s + 1)}>
                Next →
              </button>
            ) : (
              <button className="tut-btn tut-btn-primary" onClick={onClose} style={{ background: "var(--green)" }}>
                Start Trading 🚀
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
