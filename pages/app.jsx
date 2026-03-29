import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import FinancialLiteracy from "../components/FinancialLiteracy";

// ─── Metric tooltip labels ─────────────────────────────────────────────────────
const METRIC_DEFINITIONS = {
  "Price": "Current market price per share",
  "Cash": "Available cash to invest",
  "Position": "Total value of your shares at current price",
  "Shares Held": "Number of shares you own",
  "Avg Cost": "Average price you paid per share",
  "Unrlzd P&L": "Unrealized profit/loss on this position",
  "Total Value": "Cash + equity value",
  "Equity": "Total value of all stock positions",
  "Total P&L": "Total profit or loss across all positions",
  "52w High": "Highest price in the past 52 weeks",
  "52w Low": "Lowest price in the past 52 weeks",
  "Avg Vol": "Average trading volume",
  "P/E": "Price-to-Earnings ratio",
  "P/B": "Price-to-Book ratio",
  "EPS": "Earnings Per Share",
  "Beta": "Stock volatility relative to market",
  "Div Yield": "Annual dividend as % of stock price",
};

function MetricLabel({ label, children }) {
  const def = METRIC_DEFINITIONS[label];
  const [showTooltip, setShowTooltip] = useState(false);

  if (!def) {
    return children || <div className="lbl">{label}</div>;
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div
        className="lbl"
        style={{ cursor: "help", borderBottom: "1px dotted var(--t3)" }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title={def}
      >
        {label}
      </div>
      {showTooltip && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            background: "var(--surf)",
            border: "1px solid var(--b1)",
            borderRadius: 6,
            padding: "6px 10px",
            marginBottom: 6,
            fontSize: 10,
            color: "var(--t2)",
            maxWidth: 140,
            zIndex: 1000,
            whiteSpace: "normal",
            boxShadow: "0 4px 12px rgba(0,0,0,.15)",
            fontFamily: "DM Sans",
            lineHeight: 1.4,
          }}
        >
          {def}
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              width: 0,
              height: 0,
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderTop: "4px solid var(--surf)",
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Drag-to-resize hook (horizontal panels) ──────────────────────────────────
function useDragResize({ initial, min, max, direction = "right" }) {
  const [size, setSize]   = useState(initial);
  const dragging  = useRef(false);
  const startX    = useRef(0);
  const startSize = useRef(0);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current  = true;
    startX.current    = e.clientX;
    startSize.current = size;
    const onMove = (ev) => {
      if (!dragging.current) return;
      const delta = ev.clientX - startX.current;
      const next  = direction === "right" ? startSize.current + delta : startSize.current - delta;
      setSize(Math.min(max, Math.max(min, next)));
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [size, min, max, direction]);

  return [size, { onMouseDown, style: {
    position: "absolute", top: 0, bottom: 0, width: 6, zIndex: 20,
    cursor: "col-resize", background: "transparent",
    ...(direction === "right" ? { right: -3 } : { left: -3 }),
  }}];
}

const StockChart = dynamic(() => import("../components/StockChart"), {
  ssr: false,
  loading: () => (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 20, height: 20, border: "2px solid #e4e2dc", borderTopColor: "#18160f", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
    </div>
  ),
});

const Tutorial = dynamic(() => import("../components/Tutorial"), { ssr: false });

// ─── Constants ────────────────────────────────────────────────────────────────
const STARTING_CASH = 100_000;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const POPULAR_BY_ERA = [
  { symbol: "GE",    name: "General Electric",   since: 1900 },
  { symbol: "KO",    name: "Coca-Cola",           since: 1900 },
  { symbol: "JNJ",   name: "Johnson & Johnson",   since: 1944 },
  { symbol: "XOM",   name: "Exxon Mobil",         since: 1970 },
  { symbol: "IBM",   name: "IBM",                 since: 1915 },
  { symbol: "MCD",   name: "McDonald's",          since: 1966 },
  { symbol: "BA",    name: "Boeing",              since: 1962 },
  { symbol: "WMT",   name: "Walmart",             since: 1972 },
  { symbol: "MSFT",  name: "Microsoft",           since: 1986 },
  { symbol: "AAPL",  name: "Apple",               since: 1980 },
  { symbol: "AMZN",  name: "Amazon",              since: 1997 },
  { symbol: "GOOGL", name: "Alphabet",            since: 2004 },
  { symbol: "META",  name: "Meta",                since: 2012 },
  { symbol: "TSLA",  name: "Tesla",               since: 2010 },
  { symbol: "NFLX",  name: "Netflix",             since: 2002 },
  { symbol: "NVDA",  name: "NVIDIA",              since: 1999 },
  { symbol: "JPM",   name: "JPMorgan Chase",      since: 1978 },
  { symbol: "BAC",   name: "Bank of America",     since: 1973 },
  { symbol: "V",     name: "Visa",                since: 2008 },
  { symbol: "MA",    name: "Mastercard",          since: 2006 },
  { symbol: "PYPL",  name: "PayPal",              since: 2015 },
  { symbol: "UBER",  name: "Uber",                since: 2019 },
  { symbol: "SPOT",  name: "Spotify",             since: 2018 },
  { symbol: "AMD",   name: "AMD",                 since: 1979 },
  { symbol: "INTC",  name: "Intel",               since: 1971 },
  { symbol: "CSCO",  name: "Cisco",               since: 1990 },
  { symbol: "ORCL",  name: "Oracle",              since: 1986 },
  { symbol: "CRM",   name: "Salesforce",          since: 2004 },
  { symbol: "ADBE",  name: "Adobe",               since: 1986 },
  { symbol: "DIS",   name: "Disney",              since: 1957 },
  { symbol: "PFE",   name: "Pfizer",              since: 1944 },
  { symbol: "SPY",   name: "S&P 500 ETF",         since: 1993 },
  { symbol: "QQQ",   name: "Nasdaq 100 ETF",      since: 1999 },
];

const ERAS = [
  { r:[2000,2002], m:"The dot-com bubble has burst. Nasdaq is down over 70% from its peak. The Fed is cutting rates aggressively to stabilize the economy.", risk:"Ongoing valuation compression as speculative tech unwinds.", opp:"Profitable, cash-generating businesses are being thrown out with the bathwater." },
  { r:[2003,2006], m:"Markets are recovering from the dot-com crash. Low interest rates and a housing boom are fueling consumer spending. Corporate earnings are rebounding strongly.", risk:"Rising energy prices and early signs of housing market excess.", opp:"Cyclical recovery trade is well underway; financials and industrials leading." },
  { r:[2007,2007], m:"Cracks are appearing in subprime mortgage lending. Credit markets are tightening and Bear Stearns hedge funds have blown up. Equity markets are near all-time highs.", risk:"Contagion from subprime into broader credit markets is the primary tail risk.", opp:"Defensive sectors — healthcare, consumer staples — offer relative safety." },
  { r:[2008,2009], m:"The global financial crisis is in full swing. Lehman Brothers has collapsed, credit markets are frozen, and the S&P 500 has shed nearly 50% from its peak.", risk:"Systemic risk remains elevated — counterparty exposure is unknowable.", opp:"Generational buying opportunity emerging for those with dry powder and a 3–5 year horizon." },
  { r:[2010,2012], m:"Post-crisis recovery is underway but uneven. The Fed's QE program is suppressing yields. European sovereign debt crisis is the dominant macro overhang.", risk:"Euro-area contagion and a potential double-dip in housing.", opp:"US large-caps are cheap relative to history; dividend payers particularly attractive." },
  { r:[2013,2015], m:"US growth is solid, unemployment is falling, and the bull market is broadening. Fed is winding down QE after the 2013 Taper Tantrum rattled bonds.", risk:"Rate normalization timeline and emerging market capital outflows.", opp:"Technology sector is seeing renewed earnings growth as mobile and cloud adoption accelerates." },
  { r:[2016,2017], m:"Trump's election has triggered a 'reflation trade.' Financials, industrials, and small caps are surging on expectations of deregulation and fiscal stimulus.", risk:"Policy uncertainty and stretched valuations in momentum names.", opp:"Financials benefiting from rate normalization and deregulation expectations." },
  { r:[2018,2019], m:"US-China trade war is the dominant narrative. Tariff escalation is weighing on global supply chains. The Fed raised rates four times in 2018 before pivoting dovish.", risk:"Trade war escalation and slowing global growth, particularly in manufacturing.", opp:"Domestic-focused US companies largely insulated from tariff risk." },
  { r:[2020,2020], m:"COVID-19 triggered the fastest bear market in history. The Fed cut rates to zero and launched unlimited QE. Digital transformation is 5 years ahead of schedule.", risk:"Pandemic trajectory and economic scarring from unemployment shock.", opp:"Remote work, e-commerce, and cloud infrastructure are structural winners." },
  { r:[2021,2021], m:"Vaccine rollout and reopening euphoria are driving a massive cyclical rotation. Meme stocks, SPACs, and crypto signal speculative excess. Inflation is ticking up.", risk:"'Transitory' inflation narrative may be wrong — supply chain disruptions are proving sticky.", opp:"Reopening plays — travel, hospitality, live events — still have meaningful upside." },
  { r:[2022,2022], m:"The Fed is hiking rates at the fastest pace since the 1980s to fight 40-year-high inflation. Both stocks and bonds are selling off simultaneously.", risk:"Hard landing scenario is rising as the yield curve inverts deeply.", opp:"Energy sector is printing cash; value stocks holding up relatively well." },
  { r:[2023,2099], m:"AI mania is driving a narrow rally led by Nvidia and the 'Magnificent 7.' The Fed has paused hiking but rates remain elevated. Soft landing hopes are growing.", risk:"Concentration risk — the S&P 500's returns are driven by fewer than 10 names.", opp:"Generative AI infrastructure buildout creates multi-year capex tailwinds for semiconductors." },
];
const getEra = (yr) => ERAS.find(e => yr >= e.r[0] && yr <= e.r[1]) || ERAS[ERAS.length - 1];

const COMPANY_ERAS = {
  AAPL: [
    { r: [2000, 2006], m: "Apple is riding the massive success of the iPod and iTunes. Steve Jobs is preparing 'a revolutionary mobile phone'." },
    { r: [2007, 2009], m: "The iPhone has just launched, completely disrupting the mobile industry. The App Store is changing software distribution." },
    { r: [2010, 2014], m: "The iPad joins the lineup. Post-Jobs era begins with Tim Cook. China expansion is driving unprecedented revenue growth." },
    { r: [2015, 2099], m: "Apple Watch and AirPods established wearables dominance. Services revenue (App Store, Music, TV) is now a primary growth engine." },
  ],
  MSFT: [
    { r: [2000, 2013], m: "Windows and Office hold monopolies, but Microsoft missed the early mobile and search waves under Steve Ballmer's tenure." },
    { r: [2014, 2099], m: "Satya Nadella has shifted focus to 'Cloud First'. Azure is exploding, and Microsoft is positioning itself as an AI leader with OpenAI." },
  ],
  AMZN: [
    { r: [2000, 2010], m: "Amazon dominates e-commerce and introduced Prime. AWS is quietly launching, building the foundation of modern cloud computing." },
    { r: [2011, 2099], m: "AWS is a massive profit engine. Prime video and logistics dominance are cementing Amazon's moat across multiple industries." },
  ],
  GOOGL: [
    { r: [2000, 2014], m: "Google monopolizes search and digital ads. Android has been acquired and is quickly taking over global smartphone market share." },
    { r: [2015, 2099], m: "Alphabet restructured to separate core search from 'other bets' like Waymo. DeepMind and AI advancements are driving future product vision." },
  ],
  TSLA: [
    { r: [2010, 2016], m: "Tesla successfully brought the Model S and Model X to market, proving EV viability. The massive Gigafactory project is underway." },
    { r: [2017, 2099], m: "The Model 3 achieved mass market scale despite 'production hell'. Tesla is now wildly profitable and leading the autonomous driving race." },
  ],
  META: [
    { r: [2012, 2020], m: "Facebook transitions successfully to mobile. Massive acquisitions of Instagram and WhatsApp cement its global social dominance." },
    { r: [2021, 2099], m: "Rebranded to Meta to focus on the 'Metaverse'. Heavy investments in AI and AR/VR outline Mark Zuckerberg's next decade strategy." },
  ]
};
const getCompanyBrief = (sym, yr) => {
  const briefs = COMPANY_ERAS[sym];
  if (!briefs) return null;
  return briefs.find(e => yr >= e.r[0] && yr <= e.r[1])?.m;
};

const fmtUSD  = (n) => `$${(+n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtShrt = (n) => `$${(+n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtPct  = (n) => `${n >= 0 ? "+" : ""}${(+n).toFixed(2)}%`;
const fmtPnL  = (n) => `${n >= 0 ? "+" : "-"}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Enhanced date picker with month/year nav ─────────────────────────────────
function SimDatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Parse current value
  const [year, month, day] = value.split("-").map(Number);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const setYear  = (y) => onChange(`${y}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`);
  const setMonth = (m) => {
    // Clamp day to valid range for the new month
    const max = new Date(year, m, 0).getDate();
    const d   = Math.min(day, max);
    onChange(`${year}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`);
  };
  const setDay   = (d) => onChange(`${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`);

  const daysInMonth = new Date(year, month, 0).getDate();

  const Y_MIN = 2000, Y_MAX = 2024;
  const prevMonth = () => {
    if (month === 1) { if (year > Y_MIN) { onChange(`${year-1}-12-${String(day).padStart(2,"0")}`); } }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 12) { if (year < Y_MAX) { onChange(`${year+1}-01-${String(day).padStart(2,"0")}`); } }
    else setMonth(month + 1);
  };

  const displayDate = `${MONTHS[month-1]} ${day}, ${year}`;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", background: "var(--surf)", border: "1px solid var(--b1)",
          borderRadius: "var(--r)", padding: "8px 11px", cursor: "pointer",
          fontFamily: "DM Mono, monospace", fontSize: 12, color: "var(--t1)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          transition: "border .15s",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "var(--b2)"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "var(--b1)"}
      >
        <span>{displayDate}</span>
        <span style={{ fontSize: 10, color: "var(--t3)" }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 200,
          background: "var(--surf)", border: "1px solid var(--b1)", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,.12)", padding: "14px 12px",
          animation: "fadeUp .15s ease",
        }}>
          {/* Month navigation */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button onClick={prevMonth} style={navBtnStyle}>‹</button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "DM Sans", fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>
                {MONTHS[month-1]} {year}
              </div>
            </div>
            <button onClick={nextMonth} style={navBtnStyle}>›</button>
          </div>

          {/* Day grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 10 }}>
            {["S","M","T","W","T","F","S"].map((d,i) => (
              <div key={i} style={{ textAlign: "center", fontFamily: "DM Mono, monospace", fontSize: 8, color: "var(--t3)", paddingBottom: 4, letterSpacing: 1 }}>{d}</div>
            ))}
            {/* Leading blanks */}
            {Array.from({ length: new Date(year, month - 1, 1).getDay() }).map((_, i) => <div key={"b"+i} />)}
            {/* Days */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
              <button key={d} onClick={() => { setDay(d); setOpen(false); }} style={{
                width: "100%", aspectRatio: "1", border: "none", borderRadius: 5, cursor: "pointer",
                fontFamily: "DM Mono, monospace", fontSize: 10,
                background: d === day ? "var(--t1)" : "transparent",
                color: d === day ? "#fff" : "var(--t2)",
                transition: "all .1s",
              }}
              onMouseEnter={e => { if (d !== day) e.currentTarget.style.background = "var(--bg)"; }}
              onMouseLeave={e => { if (d !== day) e.currentTarget.style.background = "transparent"; }}
              >{d}</button>
            ))}
          </div>

          {/* Year + Month quick selectors */}
          <div style={{ borderTop: "1px solid var(--b1)", paddingTop: 10 }}>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "var(--t3)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Quick jump</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              {/* Year buttons */}
              {[2000,2004,2008,2012,2016,2020,2024].map(y => (
                <button key={y} onClick={() => setYear(y)} style={{
                  padding: "3px 7px", border: `1px solid ${y === year ? "var(--t1)" : "var(--b1)"}`,
                  borderRadius: 5, cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: 9,
                  background: y === year ? "var(--t1)" : "var(--bg)",
                  color: y === year ? "#fff" : "var(--t2)",
                  transition: "all .12s",
                }}>{y}</button>
              ))}
            </div>
            {/* Month quick row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 3 }}>
              {MONTHS.map((m, i) => (
                <button key={m} onClick={() => setMonth(i+1)} style={{
                  padding: "3px 0", border: `1px solid ${i+1 === month ? "var(--t1)" : "var(--b1)"}`,
                  borderRadius: 5, cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: 9,
                  background: i+1 === month ? "var(--t1)" : "var(--bg)",
                  color: i+1 === month ? "#fff" : "var(--t2)",
                  transition: "all .12s",
                }}>{m}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtnStyle = {
  width: 26, height: 26, border: "1px solid var(--b1)", borderRadius: 6,
  background: "var(--bg)", cursor: "pointer", fontSize: 14, color: "var(--t2)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "DM Sans",
};

// ─── Welcome screen ───────────────────────────────────────────────────────────
function WelcomeScreen({ onStart, onTutorial, simYear, userName }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 60px", background: "var(--bg)", overflowY: "auto" }}>
      <div style={{ maxWidth: 580, width: "100%", textAlign: "center" }}>
        <div style={{ marginBottom: 10 }}>
          <span style={{
            fontFamily: "DM Mono", fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase",
            color: "#92400e", background: "#fef3c7", border: "1px solid #fde68a",
            padding: "3px 10px", borderRadius: 20,
          }}>Simulation · {simYear}</span>
        </div>

        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 42, fontWeight: 700, letterSpacing: -1.5, color: "var(--t1)", margin: "16px 0 12px", lineHeight: 1.15 }}>
          {userName ? `Welcome back, ${userName.split(" ")[0]}.` : "Welcome to Anchor."}
        </h1>
        <p style={{ fontFamily: "DM Sans", fontSize: 15, color: "var(--t2)", lineHeight: 1.75, maxWidth: 420, margin: "0 auto 32px" }}>
          Pick a date in history, find a stock, and start trading with real historical prices — all with zero real money at risk.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 48 }}>
          <button
            onClick={onStart}
            style={{
              background: "var(--t1)", color: "#fff", border: "none", borderRadius: 10,
              padding: "12px 28px", fontFamily: "DM Mono", fontSize: 12, fontWeight: 500,
              letterSpacing: .5, cursor: "pointer", transition: "opacity .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            Start Trading →
          </button>
          <button
            onClick={onTutorial}
            style={{
              background: "var(--surf)", color: "var(--t2)", border: "1px solid var(--b1)",
              borderRadius: 10, padding: "12px 28px", fontFamily: "DM Mono", fontSize: 12,
              fontWeight: 500, letterSpacing: .5, cursor: "pointer", transition: "all .15s",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--b2)"; e.currentTarget.style.color = "var(--t1)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--b1)"; e.currentTarget.style.color = "var(--t2)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:6}}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            How it works
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, textAlign: "left" }}>
          {[
            { iconPath: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", title: "Time Travel", desc: "Set any simulation date from 2000 to 2024 and trade with real historical prices." },
            { iconPath: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", title: "Real Market Data", desc: "Historical OHLCV data from Yahoo Finance. No fabricated prices." },
            { iconPath: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z", title: "Era Intelligence", desc: "Market context calibrated to your chosen period — only events that had occurred." },
            { iconPath: "M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zm-9 5a2 2 0 104 0 2 2 0 00-4 0z", title: "Full Portfolio", desc: "Track positions, P&L, and trade history across your session." },
          ].map(f => (
            <div key={f.title} style={{ background: "var(--surf)", border: "1px solid var(--b1)", borderRadius: 10, padding: "16px 18px" }}>
              <div style={{ marginBottom: 8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={f.iconPath} />
                </svg>
              </div>
              <div style={{ fontFamily: "DM Sans", fontSize: 13, fontWeight: 600, color: "var(--t1)", marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontFamily: "DM Sans", fontSize: 12, color: "var(--t2)", lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function AppPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isGuest = router.query.guest === "true";

  useEffect(() => {
    if (status === "unauthenticated" && !isGuest) router.replace("/");
  }, [status, isGuest, router]);

  const [simDate,     setSimDate]     = useState("2011-10-15");
  const [startingCash,setStartingCash]= useState(STARTING_CASH);
  const [cash,        setCash]        = useState(STARTING_CASH);
  const [positions,   setPositions]   = useState([]);
  const [trades,      setTrades]      = useState([]);
  const [prices,      setPrices]      = useState({});
  const [dateRange,   setDateRange]   = useState(null);

  const [portfolios,   setPortfolios]   = useState([]);
  const [activePortId, setActivePortId] = useState(null);
  const [modal,        setModal]        = useState(null);

  const loadPortfolioIntoState = useCallback((p) => {
    if (!p) {
      setActivePortId(null); setStartingCash(100000); setCash(100000); setPositions([]); setTrades([]); return;
    }
    setActivePortId(p.id);
    setStartingCash(p.startingCash ?? 100000);
    setCash(p.cash ?? 100000);
    setSimDate(p.simDate ?? "2011-10-15");
    setPositions(p.positions ?? []);
    setTrades(p.trades ?? []);
  }, []);

  useEffect(() => {
    if (status === "authenticated" && !isGuest) {
      fetch("/api/portfolio").then(r => r.json()).then(d => {
        if (d.portfolios && d.portfolios.length > 0) {
          setPortfolios(d.portfolios);
          loadPortfolioIntoState(d.portfolios[0]);
        }
      });
    }
  }, [status, isGuest, loadPortfolioIntoState]);

  const autosync = useRef(null);
  useEffect(() => {
    if (!activePortId || status !== "authenticated") return;
    clearTimeout(autosync.current);
    autosync.current = setTimeout(() => {
      fetch("/api/portfolio", {
        method: "PUT",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ id: activePortId, simDate, cash, positions, trades })
      });
    }, 1200);
  }, [simDate, cash, positions, trades, activePortId, status]);

  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState([]);
  const [showDrop,    setShowDrop]    = useState(false);
  const [selectedSym, setSelectedSym] = useState(null);
  const [stockData,   setStockData]   = useState(null);
  const [chartData,   setChartData]   = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [stockErr,    setStockErr]    = useState("");

  const [orderShares, setOrderShares] = useState(1);
  const [orderSide,   setOrderSide]   = useState("buy");

  const [centerTab,    _setCenterTab]   = useState("welcome");
  const [prevTab,      setPrevTab]      = useState("welcome");
  const setCenterTab = useCallback((t) => { if (t !== centerTab) { setPrevTab(centerTab); _setCenterTab(t); } }, [centerTab]);
  const tabIdx = { welcome: 0, analysis: 1, positions: 2, history: 3, learning: 4 };

  const [showProfile,  setShowProfile]  = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [flash,        setFlash]        = useState(null);

  const profileRef = useRef(null);

  // ── Resizable sidebars (horizontal) ───────────────────────────────────────
  const [leftW,  leftHandleProps]  = useDragResize({ initial: 224, min: 170, max: 340, direction: "right" });
  const [rightW, rightHandleProps] = useDragResize({ initial: 242, min: 190, max: 360, direction: "left" });

  useEffect(() => {
    const h = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const pop = (msg, type = "ok") => { setFlash({ msg, type }); setTimeout(() => setFlash(null), 3000); };

  const simYear   = parseInt(simDate.slice(0, 4));
  const era       = getEra(simYear);
  const suggestions = POPULAR_BY_ERA.filter(s => s.since <= simYear).slice(0, 12);

  // ── Filter chart data by date range ──────────────────────────────────────────
  const filteredChartData = useMemo(() => {
    if (!dateRange || !chartData?.length) return chartData;
    
    // Map date labels to fraction of data to show (from the end)
    const rangeFractions = {
      "1W": 1/52,   // ~1 week
      "1M": 1/12,   // ~1 month
      "3M": 3/12,   // ~3 months
      "6M": 6/12,   // ~6 months
      "1Y": 1,      // full year
      "All": 1.5,   // all data (with margin)
    };
    
    const fraction = rangeFractions[dateRange.label] || 1;
    const dataCount = Math.max(1, Math.ceil(chartData.length * fraction));
    const startIdx = Math.max(0, chartData.length - dataCount);
    
    return chartData.slice(startIdx);
  }, [dateRange, chartData]);

  // ── Search ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!query) { setResults([]); setShowDrop(false); return; }
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const d = await r.json();
        const filtered = (d.results || []).filter(res => {
          const found = POPULAR_BY_ERA.find(p => p.symbol === res.symbol);
          return !found || found.since <= simYear;
        });
        setResults(filtered);
        setShowDrop(true);
      } catch { setResults([]); }
    }, 280);
    return () => clearTimeout(t);
  }, [query, simYear]);

  // ── Load stock ──────────────────────────────────────────────────────────────
  const loadStock = useCallback(async (sym, date) => {
    setLoading(true); setStockData(null); setChartData([]); setStockErr("");
    try {
      const r = await fetch(`/api/stock?symbol=${sym}&date=${date}`);
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      const diff = Math.abs((new Date(date) - new Date(d.date)) / 86_400_000);
      if (diff > 10) throw new Error(`No data for ${sym} near ${date}`);
      setStockData(d); setChartData(d.chart || []);
      setPrices(p => ({ ...p, [sym]: d.price }));
    } catch (e) {
      setStockErr(e.message);
      pop(`${sym}: ${e.message}`, "err");
    } finally { setLoading(false); }
  }, []);

  const pickSym = (sym) => {
    setSelectedSym(sym); setQuery(sym); setShowDrop(false);
    loadStock(sym, simDate);
    if (centerTab === "welcome") setCenterTab("analysis");
  };

  useEffect(() => { if (selectedSym) loadStock(selectedSym, simDate); }, [simDate]); // eslint-disable-line

  // ── Trade ───────────────────────────────────────────────────────────────────
  const trade = () => {
    if (!stockData || orderShares <= 0) return;
    const total = stockData.price * orderShares;
    if (orderSide === "buy") {
      if (total > cash) { pop("Insufficient funds", "err"); return; }
      setCash(c => +(c - total).toFixed(2));
      setPositions(prev => {
        const ex = prev.find(p => p.symbol === stockData.symbol);
        if (ex) return prev.map(p => p.symbol === stockData.symbol
          ? { ...p, shares: p.shares + orderShares, avgCost: +((p.avgCost * p.shares + total) / (p.shares + orderShares)).toFixed(4) }
          : p);
        return [...prev, { symbol: stockData.symbol, name: stockData.name, shares: orderShares, avgCost: stockData.price }];
      });
      pop(`Bought ${orderShares} × ${stockData.symbol} @ ${fmtUSD(stockData.price)}`);
    } else {
      const pos = positions.find(p => p.symbol === stockData.symbol);
      if (!pos || pos.shares < orderShares) { pop("Not enough shares", "err"); return; }
      setCash(c => +(c + total).toFixed(2));
      setPositions(prev => prev.map(p => p.symbol === stockData.symbol ? { ...p, shares: p.shares - orderShares } : p).filter(p => p.shares > 0));
      pop(`Sold ${orderShares} × ${stockData.symbol} @ ${fmtUSD(stockData.price)}`);
    }
    setTrades(t => [{ date: simDate, symbol: stockData.symbol, action: orderSide, shares: orderShares, price: stockData.price, total }, ...t]);
  };

  // ── Portfolio ────────────────────────────────────────────────────────────────
  const equity  = positions.reduce((s, p) => s + p.shares * (prices[p.symbol] ?? p.avgCost), 0);
  const total   = cash + equity;
  const pnl     = total - startingCash;
  const pnlPct  = (pnl / startingCash) * 100;
  const curPos  = selectedSym ? positions.find(p => p.symbol === selectedSym) : null;
  const chartUp = chartData.length > 1 ? chartData[chartData.length - 1].close >= chartData[0].close : true;

  const userName = session?.user?.name || (isGuest ? "Guest" : "");
  const userImg  = session?.user?.image || null;

  if ((status === "loading" || status === "unauthenticated") && !isGuest) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ width: 24, height: 24, border: "2px solid var(--b1)", borderTopColor: "var(--t1)", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
      </div>
    );
  }

  return (
    <>
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", backdropFilter: "blur(2px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--bg)", width: 360, borderRadius: 12, padding: 24, boxShadow: "var(--shm)", animation: "fadeUp .2s ease" }}>
            {modal.type === "create_portfolio" && (
               <form onSubmit={async (e) => {
                  e.preventDefault();
                  const name = e.target.pname.value || "New Portfolio";
                  const c = Number(e.target.pcash.value) || 100000;
                  const r = await fetch("/api/portfolio", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ name, startingCash: c }) });
                  const data = await r.json();
                  
                  if (!r.ok || data.error) {
                    pop(data.error === "User not found" ? "Error: Please sign out and sign back in" : `Error: ${data.error || "Failed to create"}`);
                    return;
                  }
                  
                  const { portfolio } = data;
                  setPortfolios([portfolio, ...portfolios]);
                  loadPortfolioIntoState(portfolio);
                  setModal(null);
                  pop("Portfolio created");
               }}>
                 <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Create Portfolio</h3>
                 <label style={{ display: "block", fontSize: 11, color: "var(--t2)", marginBottom: 4 }}>Name</label>
                 <input name="pname" autoFocus style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--b1)", marginBottom: 12 }} />
                 <label style={{ display: "block", fontSize: 11, color: "var(--t2)", marginBottom: 4 }}>Starting Cash</label>
                 <input name="pcash" type="number" defaultValue={100000} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--b1)", marginBottom: 20 }} />
                 <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                   <button type="button" onClick={() => setModal(null)} className="tut-btn tut-btn-ghost">Cancel</button>
                   <button type="submit" className="tut-btn tut-btn-primary">Create</button>
                 </div>
               </form>
            )}
            {modal.type === "rename_portfolio" && (
               <form onSubmit={async (e) => {
                  e.preventDefault();
                  const name = e.target.pname.value;
                  await fetch("/api/portfolio", { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ id: modal.id, name }) });
                  setPortfolios(pfs => pfs.map(p => p.id === modal.id ? { ...p, name } : p));
                  setModal(null);
               }}>
                 <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Rename Portfolio</h3>
                 <input name="pname" defaultValue={modal.name} autoFocus style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--b1)", marginBottom: 20 }} />
                 <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                   <button type="button" onClick={() => setModal(null)} className="tut-btn tut-btn-ghost">Cancel</button>
                   <button type="submit" className="tut-btn tut-btn-primary">Save</button>
                 </div>
               </form>
            )}
            {modal.type === "delete_portfolio" && (
               <div>
                 <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: "var(--red)" }}>Delete Portfolio?</h3>
                 <p style={{ fontSize: 13, color: "var(--t2)", marginBottom: 20 }}>Are you sure you want to delete <strong>{modal.name}</strong>? This action cannot be undone.</p>
                 <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                   <button type="button" onClick={() => setModal(null)} className="tut-btn tut-btn-ghost">Cancel</button>
                   <button onClick={async () => {
                     const r = await fetch("/api/portfolio", { method: "DELETE", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ id: modal.id }) });
                     const data = await r.json();
                     if (!r.ok || data.error) {
                        pop(data.error === "User not found" ? "Error: Please sign out and sign back in" : `Error: ${data.error || "Failed to delete"}`);
                        return;
                     }
                     setPortfolios(pfs => pfs.filter(p => p.id !== modal.id));
                     if (activePortId === modal.id) loadPortfolioIntoState(portfolios.find(p => p.id !== modal.id));
                     setModal(null);
                   }} style={{ background: "var(--red)", color: "#fff", padding: "9px 22px", borderRadius: 8, border: "none" }}>Delete</button>
                 </div>
               </div>
            )}
            {modal.type === "edit_cash" && (
               <form onSubmit={(e) => {
                  e.preventDefault();
                  const num = Number(e.target.pcash.value);
                  if (!isNaN(num)) {
                     setCash(c => c + (num - startingCash));
                     setStartingCash(num);
                  }
                  setModal(null);
                  pop(`Starting cash updated to ${fmtUSD(num)}`);
               }}>
                 <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Edit Starting Cash</h3>
                 <input name="pcash" type="number" defaultValue={startingCash} autoFocus style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--b1)", marginBottom: 20 }} />
                 <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                   <button type="button" onClick={() => setModal(null)} className="tut-btn tut-btn-ghost">Cancel</button>
                   <button type="submit" className="tut-btn tut-btn-primary">Save</button>
                 </div>
               </form>
            )}
          </div>
        </div>
      )}

      {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}

      {flash && (
        <div style={{
          position: "fixed", top: 18, left: "50%", zIndex: 999, whiteSpace: "nowrap",
          background: flash.type === "ok" ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${flash.type === "ok" ? "#bbf7d0" : "#fecaca"}`,
          color: flash.type === "ok" ? "#15803d" : "#dc2626",
          padding: "9px 18px", borderRadius: 8, fontFamily: "DM Mono", fontSize: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,.12)", animation: "flash 3s ease forwards",
        }}>
          {flash.msg}
        </div>
      )}

      {/* ══════ TOP BAR ══════ */}
      <header style={{
        height: 52, background: "var(--surf)", borderBottom: "1px solid var(--b1)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 18px", boxShadow: "var(--sh)", position: "relative", zIndex: 50, flexShrink: 0,
      }}>
        {/* Brand — logo + "Anchor" + "Paper Trading" stacked */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
          onClick={() => setCenterTab("welcome")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Anchor" style={{ width: 28, height: 28, objectFit: "contain" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 0, lineHeight: 1 }}>
            <span style={{ fontFamily: "Playfair Display, serif", fontSize: 18, fontWeight: 700, letterSpacing: -.5, color: "var(--t1)", lineHeight: 1.1 }}>
              Anchor
            </span>
            <span style={{
              fontFamily: "DM Mono, monospace", fontSize: 8, letterSpacing: 2, textTransform: "uppercase",
              color: "#92400e", lineHeight: 1,
            }}>
              Paper Trading
            </span>
          </div>
        </div>

        {/* Nav tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {[
            { id: "welcome",   label: "Home" },
            { id: "analysis",  label: "Trade" },
            { id: "positions", label: "Portfolio" },
            { id: "history",   label: "History" },
            { id: "learning",  label: "Learn" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setCenterTab(t.id)}
              style={{
                background: centerTab === t.id ? "var(--bg)" : "none",
                border: centerTab === t.id ? "1px solid var(--b1)" : "1px solid transparent",
                borderRadius: 7, padding: "5px 14px",
                fontFamily: "DM Sans", fontSize: 13, fontWeight: 500,
                color: centerTab === t.id ? "var(--t1)" : "var(--t3)",
                cursor: "pointer", transition: "all .15s",
              }}
              onMouseEnter={e => { if (centerTab !== t.id) e.currentTarget.style.color = "var(--t2)"; }}
              onMouseLeave={e => { if (centerTab !== t.id) e.currentTarget.style.color = "var(--t3)"; }}
            >{t.label}</button>
          ))}
        </div>

        {/* Right: SIM year + tutorial + profile */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 6,
            padding: "4px 12px", fontFamily: "DM Mono", fontSize: 11, fontWeight: 500, color: "#92400e", letterSpacing: 1,
          }}>
            SIM · {simYear}
          </div>

          <button
            onClick={() => setShowTutorial(true)}
            title="Tutorial"
            style={{
              width: 32, height: 32, borderRadius: 8, border: "1px solid var(--b1)",
              background: "var(--bg)", cursor: "pointer", fontSize: 14, color: "var(--t2)",
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--b2)"; e.currentTarget.style.color = "var(--t1)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--b1)"; e.currentTarget.style.color = "var(--t2)"; }}
          >?</button>

          {/* Profile */}
          <div ref={profileRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowProfile(s => !s)}
              style={{
                width: 34, height: 34, borderRadius: "50%",
                border: "1.5px solid var(--b2)", cursor: "pointer", overflow: "hidden",
                padding: 0, background: "var(--bg)",
                display: "flex", alignItems: "center", justifyContent: "center", transition: "border-color .15s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--t1)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--b2)"}
            >
              {userImg
                /* eslint-disable-next-line @next/next/no-img-element */
                ? <img src={userImg} alt={userName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              }
            </button>

            {showProfile && (
              <div className="profile-menu">
                <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--b1)", background: "var(--bg)", display: "flex", alignItems: "center", gap: 10 }}>
                  {userImg
                    /* eslint-disable-next-line @next/next/no-img-element */
                    ? <img src={userImg} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--b1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </div>
                  }
                  <div>
                    <div style={{ fontFamily: "DM Sans", fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{userName || "Guest"}</div>
                    <div className="mono" style={{ fontSize: 9, color: "var(--t3)", marginTop: 1 }}>{fmtShrt(total)} portfolio</div>
                  </div>
                </div>

                {[
                  { iconPath: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",  label: "Home",       action: () => { setCenterTab("welcome");   setShowProfile(false); } },
                  { iconPath: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", label: "Trade",       action: () => { setCenterTab("analysis");  setShowProfile(false); } },
                  { iconPath: "M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zm-9 5a2 2 0 104 0 2 2 0 00-4 0z", label: "Portfolio",   action: () => { setCenterTab("positions"); setShowProfile(false); } },
                  { iconPath: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", label: "History",     action: () => { setCenterTab("history");   setShowProfile(false); } },
                  { iconPath: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", label: "Tutorial",    action: () => { setShowTutorial(true);     setShowProfile(false); } },
                ].map(item => (
                  <button key={item.label} className="profile-menu-item" onClick={item.action}>
                    <span className="profile-menu-icon">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <path d={item.iconPath} />
                      </svg>
                    </span> {item.label}
                  </button>
                ))}

                <div style={{ borderTop: "1px solid var(--b1)", padding: "8px 16px" }}>
                  <div className="lbl" style={{ marginBottom: 6 }}>Active Portfolio</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--t2)", lineHeight: 1.9 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span>Cash: {fmtUSD(cash)}</span>
                      {!isGuest && (
                        <button 
                          className="portfolio-action-btn"
                          onClick={() => setModal({ type: 'edit_cash' })}
                          style={{ padding: "0 6px", height: "auto" }}
                          title="Edit Starting Cash"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </button>
                      )}
                    </div>
                    P&amp;L: <span style={{ color: pnl >= 0 ? "var(--green)" : "var(--red)" }}>{fmtPnL(pnl)}</span><br />
                    Trades: {trades.length}
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--b1)" }}>
                  <button
                    className="profile-menu-item"
                    style={{ color: "var(--red)" }}
                    onClick={() => {
                      if (activePortId) {
                        setModal({ type: 'delete_portfolio', id: activePortId, name: portfolios.find(p=>p.id===activePortId)?.name || "Portfolio" });
                        setShowProfile(false);
                      } else {
                        setCash(startingCash); setPositions([]); setTrades([]); pop("Portfolio reset");
                      }
                    }}
                  >
                    <span className="profile-menu-icon">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/>
                      </svg>
                    </span> Delete Active Portfolio
                  </button>
                  {!isGuest && (
                    <button
                      className="profile-menu-item"
                      style={{ color: "var(--t2)" }}
                      onClick={() => signOut({ callbackUrl: "/" })}
                    >
                      <span className="profile-menu-icon">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                        </svg>
                      </span> Sign Out
                    </button>
                  )}
                  {isGuest && (
                    <button
                      className="profile-menu-item"
                      style={{ color: "var(--t2)" }}
                      onClick={() => router.push("/")}
                    >
                      <span className="profile-menu-icon">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/>
                        </svg>
                      </span> Sign In
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ══════ MAIN ══════ */}
      <div style={{ display: "flex", height: "calc(100vh - 52px)", overflow: "hidden" }}>

        {/* ════ LEFT SIDEBAR ════ */}
        <aside style={{
          width: leftW, flexShrink: 0, borderRight: "1px solid var(--b1)",
          background: "var(--surf)", display: "flex", flexDirection: "column",
          overflow: "hidden", position: "relative",
        }}>
          <div {...leftHandleProps} />

          {/* ── Section: Date ── */}
          <div style={{ padding: "14px 14px 12px", borderBottom: "1px solid var(--b1)" }}>
            <div className="lbl" style={{ marginBottom: 8 }}>Simulation Date</div>
            <SimDatePicker value={simDate} onChange={setSimDate} />
          </div>

          {/* ── Section: Search ── */}
          <div style={{ padding: "12px 14px 12px", borderBottom: "1px solid var(--b1)", position: "relative" }}>
            <div className="lbl" style={{ marginBottom: 8 }}>Stock Search</div>
            <input
              type="text" placeholder="Ticker or company…" value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => results.length && setShowDrop(true)}
              onBlur={() => setTimeout(() => setShowDrop(false), 150)}
              style={{ fontSize: 12 }}
            />
            {showDrop && results.length > 0 && (
              <div style={{
                position: "absolute", top: "calc(100% - 4px)", left: 14, right: 14, zIndex: 100,
                background: "var(--surf)", border: "1px solid var(--b1)", borderRadius: 8,
                boxShadow: "var(--shm)", maxHeight: 180, overflowY: "auto", animation: "fadeUp .15s ease",
              }}>
                {results.map(r => (
                  <button key={r.symbol} onMouseDown={() => pickSym(r.symbol)}
                    style={{ width: "100%", background: "none", border: "none", borderBottom: "1px solid #f8f7f2", padding: "8px 11px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#faf9f6"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                  >
                    <span className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{r.symbol}</span>
                    <span style={{ fontSize: 10, color: "var(--t3)", maxWidth: 105, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                  </button>
                ))}
              </div>
            )}
            <div style={{ marginTop: 10 }}>
              <div className="lbl" style={{ marginBottom: 7 }}>Popular in {simYear}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {suggestions.map(s => (
                  <button key={s.symbol} className="suggest-chip" onClick={() => pickSym(s.symbol)}>{s.symbol}</button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Section: Positions ── */}
          <div style={{ padding: "10px 14px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="lbl">Positions</span>
            <span className="mono" style={{ fontSize: 9, color: "var(--t3)" }}>{positions.length} open</span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 10px" }}>
            {positions.length === 0 ? (
              <div className="mono" style={{ padding: "14px 4px", fontSize: 10, color: "var(--t3)", textAlign: "center" }}>No positions yet</div>
            ) : positions.map(p => {
              const px  = prices[p.symbol] ?? p.avgCost;
              const gn  = (px - p.avgCost) * p.shares;
              const sel = selectedSym === p.symbol;
              return (
                <button key={p.symbol} onClick={() => pickSym(p.symbol)}
                  style={{
                    width: "100%", textAlign: "left", cursor: "pointer",
                    border: `1px solid ${sel ? "var(--b2)" : "transparent"}`, borderRadius: 7,
                    padding: "8px 9px", marginBottom: 3, background: sel ? "var(--bg)" : "none",
                    display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all .12s",
                  }}
                  onMouseEnter={e => { if (!sel) e.currentTarget.style.background = "var(--bg)"; }}
                  onMouseLeave={e => { if (!sel) e.currentTarget.style.background = "none"; }}
                >
                  <div>
                    <div className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{p.symbol}</div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--t3)", marginTop: 1 }}>{p.shares} sh</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="mono" style={{ fontSize: 11 }}>{fmtUSD(px)}</div>
                    <div className="mono" style={{ fontSize: 10, color: gn >= 0 ? "var(--green)" : "var(--red)", marginTop: 1 }}>{fmtPnL(gn)}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <hr />

          {/* ── Section: Order panel ── */}
          <div style={{ padding: "12px 14px", flexShrink: 0 }}>
            {stockData ? (
              <>
                <div style={{ marginBottom: 9 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{stockData.symbol}</span>
                    <span className="mono" style={{ fontSize: 12, color: "var(--t2)" }}>{fmtUSD(stockData.price)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stockData.name}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 8 }}>
                  {["buy","sell"].map(s => (
                    <button key={s} onClick={() => setOrderSide(s)} style={{
                      padding: "6px 0", cursor: "pointer",
                      border: `1px solid ${orderSide === s ? (s === "buy" ? "#86efac" : "#fca5a5") : "var(--b1)"}`,
                      borderRadius: 7, fontFamily: "DM Mono", fontSize: 11, fontWeight: 500,
                      letterSpacing: .5, textTransform: "uppercase",
                      background: orderSide === s ? (s === "buy" ? "#dcfce7" : "#fee2e2") : "var(--surf)",
                      color: orderSide === s ? (s === "buy" ? "var(--green)" : "var(--red)") : "var(--t3)",
                      transition: "all .12s",
                    }}>{s}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <span className="lbl" style={{ whiteSpace: "nowrap" }}>Shares</span>
                  <div style={{ display: "flex", gap: 0, alignItems: "center", border: "1px solid var(--b1)", borderRadius: 5, background: "var(--bg)" }}>
                    <button onClick={() => setOrderShares(Math.max(1, orderShares - 1))} style={{ padding: "4px 8px", border: "none", borderRight: "1px solid var(--b1)", background: "transparent", color: "var(--t2)", cursor: "pointer", fontSize: 12, transition: "all .12s" }} onMouseEnter={e => { e.currentTarget.style.color = "var(--t1)"; e.currentTarget.style.background = "var(--surf)"; }} onMouseLeave={e => { e.currentTarget.style.color = "var(--t2)"; e.currentTarget.style.background = "transparent"; }}>−</button>
                    <input type="number" min="1" value={orderShares} onChange={e => setOrderShares(Math.max(1, parseInt(e.target.value) || 1))} style={{ padding: "4px 6px", border: "none", background: "transparent", fontSize: 12, width: 45, textAlign: "center" }} />
                    <button onClick={() => setOrderShares(orderShares + 1)} style={{ padding: "4px 8px", border: "none", borderLeft: "1px solid var(--b1)", background: "transparent", color: "var(--t2)", cursor: "pointer", fontSize: 12, transition: "all .12s" }} onMouseEnter={e => { e.currentTarget.style.color = "var(--t1)"; e.currentTarget.style.background = "var(--surf)"; }} onMouseLeave={e => { e.currentTarget.style.color = "var(--t2)"; e.currentTarget.style.background = "transparent"; }}>+</button>
                  </div>
                </div>
                <div className="mono" style={{ fontSize: 10, color: "var(--t3)", marginBottom: 8 }}>
                  Total <span style={{ color: "var(--t1)", fontWeight: 500 }}>{fmtUSD(stockData.price * orderShares)}</span>
                  {curPos && <span style={{ marginLeft: 6 }}>· {curPos.shares} held</span>}
                </div>
                <button onClick={trade} style={{
                  width: "100%", padding: "8px 0", border: "none", borderRadius: 7, cursor: "pointer",
                  fontFamily: "DM Mono", fontSize: 11, fontWeight: 500, letterSpacing: .5, textTransform: "uppercase",
                  background: orderSide === "buy" ? "var(--green)" : "var(--red)", color: "#fff", transition: "all .15s", opacity: "1",
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  {orderSide === "buy" ? "Buy" : "Sell"} {stockData.symbol}
                </button>
              </>
            ) : (
              <div className="mono" style={{ textAlign: "center", padding: "8px 0", fontSize: 10, color: "var(--t3)", lineHeight: 1.6 }}>
                {stockErr ? <span style={{ color: "var(--red)" }}>No data for this ticker / date</span> : "Select a stock to trade"}
              </div>
            )}
          </div>
        </aside>

        {/* ════ CENTER + RIGHT ════ */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Center */}
          <main key={centerTab} style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg)", animation: `slideInFrom${tabIdx[centerTab] > tabIdx[prevTab] ? 'Right' : 'Left'} 0.25s ease-in forwards` }}>

            {centerTab === "welcome" && (
              <WelcomeScreen
                onStart={() => setCenterTab("analysis")}
                onTutorial={() => setShowTutorial(true)}
                simYear={simYear}
                userName={userName}
              />
            )}

            {centerTab === "analysis" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

                {/* ── Stock header row ── */}
                <div style={{ background: "var(--surf)", borderBottom: "1px solid var(--b1)", padding: "14px 20px 10px", flexShrink: 0 }}>
                  {stockData ? (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                          <span className="serif" style={{ fontSize: 26, fontWeight: 700, letterSpacing: -.5 }}>{stockData.symbol}</span>
                          <span style={{ fontSize: 13, color: "var(--t2)" }}>{stockData.name}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                          <span className="mono" style={{ fontSize: 20, fontWeight: 500 }}>{fmtUSD(stockData.price)}</span>
                          {chartData.length > 1 && (() => {
                            const chg = chartData[chartData.length - 1].close - chartData[0].close;
                            const p   = (chg / chartData[0].close) * 100;
                            return <span className={`pill ${chg >= 0 ? "pill-up" : "pill-dn"}`}>{fmtPct(p)} 30d</span>;
                          })()}
                          <span className="mono" style={{ fontSize: 9, color: "var(--t3)", letterSpacing: 1 }}>AS OF {stockData.date}</span>
                        </div>
                      </div>
                      {curPos && (() => {
                        const gn = (stockData.price - curPos.avgCost) * curPos.shares;
                        return (
                          <div style={{ background: "var(--bg)", border: "1px solid var(--b1)", borderRadius: 8, padding: "7px 13px", textAlign: "right" }}>
                            <div className="lbl" style={{ marginBottom: 3 }}>Position</div>
                            <div className="mono" style={{ fontSize: 11 }}>{curPos.shares} sh @ {fmtUSD(curPos.avgCost)}</div>
                            <div className="mono" style={{ fontSize: 12, color: gn >= 0 ? "var(--green)" : "var(--red)", marginTop: 2 }}>{fmtPnL(gn)}</div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div>
                      <span className="serif" style={{ fontSize: 20, color: loading ? "var(--t2)" : "var(--t3)" }}>
                        {loading ? "Loading…" : stockErr ? "Stock unavailable" : "Select a stock"}
                      </span>
                      {!stockErr && !loading && <div className="mono" style={{ fontSize: 11, color: "var(--t3)", marginTop: 3 }}>Search for a ticker or click a suggestion to begin</div>}
                    </div>
                  )}
                </div>

                {/* ── Scrollable content area (chart + analysis + learning) ── */}
                <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "auto" }}>
                  {/* ── Chart — fills space above fixed-height analysis panel ── */}
                  <div style={{ flex: 1, minHeight: 0, background: "var(--surf)", borderBottom: "1px solid var(--b1)", padding: "10px 16px 8px", overflow: "hidden", flexShrink: 0 }}>
                    {loading ? (
                      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: 20, height: 20, border: "2px solid var(--b1)", borderTopColor: "var(--t1)", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                      </div>
                    ) : (
                      <StockChart key={dateRange?.label || "all"} data={filteredChartData} chartUp={chartUp} avgCost={curPos ? curPos.avgCost : null} onDateRangeChange={setDateRange} />
                    )}
                  </div>

                  {/* ── Analysis panel ── */}
                  <div style={{ flexShrink: 0, padding: "14px 20px", background: "var(--surf)", borderTop: "1px solid var(--b1)" }}>
                    {stockData ? (
                      <div style={{ display: "flex", gap: 20 }}>

                        {/* Left col: market brief */}
                        <div style={{ flex: "1 1 340px", minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--amber)", flexShrink: 0 }} />
                            <span className="lbl">Market Brief · {MONTHS[new Date(simDate).getMonth()]} {simYear}</span>
                            {stockData.isLive && (
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                background: "#dcfce7", border: "1px solid #86efac",
                                borderRadius: 20, padding: "1px 8px",
                                fontFamily: "DM Mono", fontSize: 9, color: "#16a34a", letterSpacing: 1,
                              }}>
                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#16a34a", animation: "pulse 2s infinite" }} />
                                LIVE
                              </span>
                            )}
                          </div>
                          <p style={{ fontFamily: "DM Sans", fontSize: 12, color: "var(--t2)", lineHeight: 1.75, marginBottom: 10 }}>
                            {era.m}{" "}
                            {getCompanyBrief(stockData.symbol, simYear) && <span style={{ color: "var(--t1)", fontWeight: 500 }}>{` ${getCompanyBrief(stockData.symbol, simYear)} `}</span>}
                            <strong style={{ color: "var(--t1)", fontWeight: 600 }}>{stockData.name}</strong>{" "}
                            is trading at {fmtUSD(stockData.price)}.{" "}
                            <em>Risk:</em> {era.risk}{" "}
                            <em>Opportunity:</em> {era.opp}
                          </p>
                          {/* Quick stat tiles */}
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                            {[
                              { l: "Price",    v: fmtUSD(stockData.price) },
                              { l: "Cash",     v: fmtUSD(cash) },
                              { l: "Position", v: curPos ? fmtUSD(curPos.shares * (prices[stockData.symbol] ?? stockData.price)) : "—" },
                              curPos           ? { l: "Shares Held", v: curPos.shares } : null,
                              curPos           ? { l: "Avg Cost",    v: fmtUSD(curPos.avgCost) } : null,
                              curPos           ? { l: "Unrlzd P&L",  v: fmtPnL((stockData.price - curPos.avgCost) * curPos.shares) } : null,
                            ].filter(Boolean).map(s => (
                              <div key={s.l} style={{ background: "var(--bg)", border: "1px solid var(--b1)", borderRadius: 7, padding: "6px 11px", minWidth: 80 }}>
                                <MetricLabel label={s.l} />
                                <div className="mono" style={{ fontSize: 11, fontWeight: 500, marginTop: 2 }}>{s.v}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Right col: company profile */}
                        <div style={{ flex: "0 0 220px", flexShrink: 0 }}>
                          {(stockData.sector || stockData.industry) && (
                            <div style={{ marginBottom: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {stockData.sector && (
                                <span style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 20, padding: "2px 9px", fontFamily: "DM Mono", fontSize: 9, color: "#1d4ed8" }}>
                                  {stockData.sector}
                                </span>
                              )}
                              {stockData.industry && (
                                <span style={{ background: "var(--bg)", border: "1px solid var(--b1)", borderRadius: 20, padding: "2px 9px", fontFamily: "DM Mono", fontSize: 9, color: "var(--t3)" }}>
                                  {stockData.industry}
                                </span>
                              )}
                            </div>
                          )}
                          {stockData.description && (
                            <p style={{ fontFamily: "DM Sans", fontSize: 11, color: "var(--t3)", lineHeight: 1.65, marginBottom: 8,
                              display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {stockData.description}
                            </p>
                          )}
                          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                            {[
                              stockData.revenue       ? { l: "Revenue",      v: stockData.revenue }       : null,
                              stockData.grossMargin   ? { l: "Gross Margin", v: stockData.grossMargin }   : null,
                              stockData.eps           ? { l: "EPS (TTM)",    v: stockData.eps }           : null,
                              stockData.dividendYield ? { l: "Div Yield",    v: stockData.dividendYield } : null,
                              stockData.returnOnEquity? { l: "ROE",          v: stockData.returnOnEquity }: null,
                              stockData.debtToEquity  ? { l: "Debt/Eq",      v: stockData.debtToEquity }  : null,
                              stockData.pbRatio       ? { l: "P/B Ratio",    v: stockData.pbRatio }       : null,
                              stockData.avgVolume     ? { l: "Avg Vol",      v: stockData.avgVolume }     : null,
                              stockData.fiftyTwoWeekHigh ? { l: "52W High",  v: stockData.fiftyTwoWeekHigh }: null,
                              stockData.fiftyTwoWeekLow  ? { l: "52W Low",   v: stockData.fiftyTwoWeekLow } : null,
                              stockData.employees     ? { l: "Employees",    v: stockData.employees }     : null,
                            ].filter(Boolean).map(s => (
                              <div key={s.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid var(--b1)" }}>
                                <span className="mono" style={{ fontSize: 9, color: "var(--t3)", position: "relative", cursor: "help" }} title={`${s.l} information`}>{s.l}</span>
                                <span className="mono" style={{ fontSize: 10, fontWeight: 500 }}>{s.v}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    ) : (
                      /* No grey placeholder — show nothing when no stock is selected */
                      stockErr ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 0", color: "var(--red)" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                          </svg>
                          <span className="mono" style={{ fontSize: 11 }}>{stockErr}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              </div>
            )}

            {centerTab === "positions" && (
              <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, alignItems: "center" }}>
                  <h2 className="serif" style={{ fontSize: 24, fontWeight: 700 }}>My Portfolios</h2>
                  {!isGuest && (
                    <button onClick={() => setModal({ type: 'create_portfolio' })} className="tut-btn tut-btn-primary" style={{ padding: "6px 14px", fontSize: 12 }}>+ New Portfolio</button>
                  )}
                </div>
                
                <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16, marginBottom: 24, borderBottom: "1px solid var(--b1)" }}>
                  {portfolios.length === 0 ? (
                    <div className="mono" style={{ fontSize: 11, color: "var(--t3)" }}>No portfolios saved. Create one to get started.</div>
                  ) : (
                    portfolios.map(p => {
                       const isActive = p.id === activePortId;
                       return (
                         <div key={p.id} onClick={() => loadPortfolioIntoState(p)} className="portfolio-tr" style={{ background: isActive ? "var(--surf)" : "var(--bg)", border: isActive ? "2px solid var(--t1)" : "1px solid var(--b1)", borderRadius: 10, padding: 14, minWidth: 200, cursor: "pointer", position: "relative" }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)", marginBottom: 4 }}>{p.name}</div>
                            <div className="mono" style={{ fontSize: 11, color: "var(--t3)" }}>Cash: {fmtUSD(p.cash)}</div>
                            
                            <div className="portfolio-actions" style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4 }}>
                               <button className="portfolio-action-btn" onClick={(e) => { e.stopPropagation(); setModal({ type: 'rename_portfolio', id: p.id, name: p.name }); }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                               </button>
                               <button className="portfolio-action-btn danger" onClick={(e) => { e.stopPropagation(); setModal({ type: 'delete_portfolio', id: p.id, name: p.name }); }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                               </button>
                            </div>
                         </div>
                       );
                    })
                  )}
                </div>

                <h2 className="serif" style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Open Positions</h2>
                {positions.length === 0 ? (
                  <div className="mono" style={{ textAlign: "center", padding: "48px 0", color: "var(--t3)", fontSize: 11 }}>No open positions — head to Trade to get started</div>
                ) : (
                  <table>
                    <thead><tr>{["Symbol","Name","Shares","Avg Cost","Current","Mkt Value","P&L","Return",""].map(h => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                      {positions.map(p => {
                        const px = prices[p.symbol] ?? p.avgCost;
                        const gn = (px - p.avgCost) * p.shares;
                        const rt = ((px - p.avgCost) / p.avgCost) * 100;
                        return (
                          <tr key={p.symbol} className="portfolio-tr" onClick={() => { pickSym(p.symbol); setCenterTab("analysis"); }}>
                            <td style={{ fontWeight: 500 }}>{p.symbol}</td>
                            <td style={{ color: "var(--t2)", fontSize: 10 }}>{p.customName || p.name}</td>
                            <td>{p.shares}</td>
                            <td>{fmtUSD(p.avgCost)}</td>
                            <td>{fmtUSD(px)}</td>
                            <td>{fmtUSD(px * p.shares)}</td>
                            <td style={{ color: gn >= 0 ? "var(--green)" : "var(--red)" }}>{fmtPnL(gn)}</td>
                            <td><span className={`pill ${rt >= 0 ? "pill-up" : "pill-dn"}`}>{fmtPct(rt)}</span></td>
                            <td style={{ textAlign: "right", paddingRight: 4, width: 40 }} onClick={e => e.stopPropagation()}>
                              <div className="portfolio-actions" style={{ display: "flex", gap: 3, justifyContent: "flex-end" }}>
                                <button className="portfolio-action-btn" title="Trade" onClick={(e) => {
                                  e.stopPropagation(); pickSym(p.symbol); setCenterTab("analysis");
                                }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {centerTab === "history" && (
              <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
                <h2 className="serif" style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Trade History</h2>
                {trades.length === 0 ? (
                  <div className="mono" style={{ textAlign: "center", padding: "48px 0", color: "var(--t3)", fontSize: 11 }}>No trades yet</div>
                ) : (
                  <table>
                    <thead><tr>{["Date","Action","Symbol","Shares","Price","Total"].map(h => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                      {trades.map((t, i) => (
                        <tr key={i}>
                          <td>{t.date}</td>
                          <td><span className={`pill ${t.action === "buy" ? "pill-up" : "pill-dn"}`}>{t.action}</span></td>
                          <td style={{ fontWeight: 500 }}>{t.symbol}</td>
                          <td>{t.shares}</td>
                          <td>{fmtUSD(t.price)}</td>
                          <td>{fmtUSD(t.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {centerTab === "learning" && (
              <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
                <FinancialLiteracy />
              </div>
            )}
          </main>

          {/* ── RIGHT SIDEBAR ── */}
          <aside style={{
            width: rightW, flexShrink: 0, borderLeft: "1px solid var(--b1)",
            background: "var(--surf)", overflowY: "auto", padding: 14,
            display: "flex", flexDirection: "column", gap: 11, position: "relative",
          }}>
            <div {...rightHandleProps} />
            <div className="lbl">Metrics</div>
            {[
              { l: "Total Value", v: fmtUSD(total), big: true },
              { l: "Cash",        v: fmtUSD(cash),  sub: `${((cash / total) * 100).toFixed(0)}% liquid` },
              { l: "Equity",      v: fmtUSD(equity), sub: `${positions.length} position${positions.length !== 1 ? "s" : ""}` },
              { l: "Total P&L",   v: fmtPnL(pnl),   sub: fmtPct(pnlPct), col: pnl >= 0 ? "var(--green)" : "var(--red)" },
            ].map(m => (
              <div key={m.l} style={{ background: "var(--bg)", border: "1px solid var(--b1)", borderRadius: 8, padding: "10px 12px" }}>
                <MetricLabel label={m.l} />
                <div className="mono" style={{ fontSize: m.big ? 16 : 13, fontWeight: m.big ? 600 : 400, color: m.col || "var(--t1)", marginTop: 4 }}>{m.v}</div>
                {m.sub && <div className="mono" style={{ fontSize: 9, color: m.col || "var(--t3)", marginTop: 2 }}>{m.sub}</div>}
              </div>
            ))}
            <hr />
            <div className="lbl">Stock Info</div>
            {stockData ? (
              <div>
                {/* Live badge */}
                {stockData.isLive && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8,
                    background: "#dcfce7", border: "1px solid #86efac", borderRadius: 6, padding: "4px 9px" }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#16a34a", flexShrink: 0 }} />
                    <span className="mono" style={{ fontSize: 9, color: "#16a34a", letterSpacing: 1 }}>LIVE DATA</span>
                  </div>
                )}
                {[
                  { l: "Symbol",      v: stockData.symbol },
                  { l: "Last Price",  v: fmtUSD(stockData.price) },
                  { l: "As Of",       v: stockData.date },
                  ...(chartData.length > 1 ? [
                    { l: "52w High",  v: fmtUSD(Math.max(...chartData.map(d => d.high || d.close))) },
                    { l: "52w Low",   v: fmtUSD(Math.min(...chartData.map(d => d.low  || d.close))) },
                    { l: "Avg Vol",   v: `${(chartData.reduce((s, d) => s + (d.volume || 0), 0) / chartData.length / 1e6).toFixed(1)}M` },
                  ] : []),
                  stockData.peRatio          ? { l: "P/E",      v: stockData.peRatio           } : null,
                  stockData.pbRatio          ? { l: "P/B",      v: stockData.pbRatio           } : null,
                  stockData.eps              ? { l: "EPS",      v: stockData.eps               } : null,
                  stockData.beta             ? { l: "Beta",     v: stockData.beta              } : null,
                  stockData.dividendYield    ? { l: "Div Yield",v: stockData.dividendYield     } : null,
                  stockData.marketCap        ? { l: "Mkt Cap",  v: stockData.marketCap         } : null,
                  stockData.sector           ? { l: "Sector",   v: stockData.sector            } : null,
                ].filter(Boolean).map(s => (
                  <div key={s.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--b1)" }}>
                    <span className="mono" style={{ fontSize: 9, color: "var(--t3)", cursor: "help", borderBottom: METRIC_DEFINITIONS[s.l] ? "1px dotted var(--t3)" : "none" }} title={METRIC_DEFINITIONS[s.l] || ""}>{s.l}</span>
                    <span className="mono" style={{ fontSize: 10, maxWidth: 110, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.v}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mono" style={{ fontSize: 10, color: "var(--t3)" }}>No stock selected</div>
            )}
            <hr />
            <div className="lbl">Era · {era.r[0]}–{era.r[1] > 2090 ? "now" : era.r[1]}</div>
            <div style={{ background: "#fefce8", border: "1px solid #fef08a", borderRadius: 8, padding: "11px 12px" }}>
              <p style={{ fontFamily: "DM Sans", fontSize: 11, color: "#78350f", lineHeight: 1.7 }}>{era.m}</p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
