import { useState, useEffect, useCallback, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";

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

const fmtUSD  = (n) => `$${(+n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtShrt = (n) => `$${(+n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtPct  = (n) => `${n >= 0 ? "+" : ""}${(+n).toFixed(2)}%`;
const fmtPnL  = (n) => `${n >= 0 ? "+" : "-"}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--b2)"; e.currentTarget.style.color = "var(--t1)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--b1)"; e.currentTarget.style.color = "var(--t2)"; }}
          >
            📖 How it works
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, textAlign: "left" }}>
          {[
            { icon: "🕰", title: "Time Travel", desc: "Set any simulation date from 2000 to 2024 and trade with real historical prices." },
            { icon: "📊", title: "Real Market Data", desc: "Historical OHLCV data from Yahoo Finance. No fabricated prices." },
            { icon: "🧠", title: "Era Intelligence", desc: "Market context calibrated to your chosen period — only events that had occurred." },
            { icon: "💼", title: "Full Portfolio", desc: "Track positions, P&L, and trade history across your session." },
          ].map(f => (
            <div key={f.title} style={{ background: "var(--surf)", border: "1px solid var(--b1)", borderRadius: 10, padding: "16px 18px" }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{f.icon}</div>
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

  // Redirect to login if not authenticated and not guest
  useEffect(() => {
    if (status === "unauthenticated" && !isGuest) {
      router.replace("/");
    }
  }, [status, isGuest, router]);

  const [simDate,    setSimDate]    = useState("2011-10-15");
  const [cash,       setCash]       = useState(STARTING_CASH);
  const [positions,  setPositions]  = useState([]);
  const [trades,     setTrades]     = useState([]);
  const [prices,     setPrices]     = useState({});

  const [query,      setQuery]      = useState("");
  const [results,    setResults]    = useState([]);
  const [showDrop,   setShowDrop]   = useState(false);
  const [selectedSym, setSelectedSym] = useState(null);
  const [stockData,  setStockData]  = useState(null);
  const [chartData,  setChartData]  = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [stockErr,   setStockErr]   = useState("");

  const [orderShares, setOrderShares] = useState(1);
  const [orderSide,   setOrderSide]   = useState("buy");

  const [centerTab,    setCenterTab]    = useState("welcome");
  const [showProfile,  setShowProfile]  = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [flash,        setFlash]        = useState(null);

  const profileRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const pop = (msg, type = "ok") => { setFlash({ msg, type }); setTimeout(() => setFlash(null), 3000); };

  const simYear = parseInt(simDate.slice(0, 4));
  const era = getEra(simYear);
  const suggestions = POPULAR_BY_ERA.filter(s => s.since <= simYear).slice(0, 12);

  // ── Search ──────────────────────────────────────────────────────────────
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

  // ── Load stock ──────────────────────────────────────────────────────────
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

  // ── Trade ───────────────────────────────────────────────────────────────
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

  // ── Portfolio ────────────────────────────────────────────────────────────
  const equity  = positions.reduce((s, p) => s + p.shares * (prices[p.symbol] ?? p.avgCost), 0);
  const total   = cash + equity;
  const pnl     = total - STARTING_CASH;
  const pnlPct  = (pnl / STARTING_CASH) * 100;
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
        {/* Brand with logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }} onClick={() => setCenterTab("welcome")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Anchor" style={{ width: 28, height: 28, objectFit: "contain" }} />
          <span style={{ fontFamily: "Playfair Display, serif", fontSize: 20, fontWeight: 700, letterSpacing: -.5, color: "var(--t1)" }}>
            Anchor
          </span>
          <span className="lbl" style={{ letterSpacing: 2 }}>Paper Trading</span>
        </div>

        {/* Nav tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {[
            { id: "welcome",   label: "Home" },
            { id: "analysis",  label: "Trade" },
            { id: "positions", label: "Portfolio" },
            { id: "history",   label: "History" },
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

        {/* Right: SIM + Profile */}
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
          >
            ?
          </button>

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
                : <span style={{ fontSize: 15, color: "var(--t2)" }}>👤</span>
              }
            </button>

            {showProfile && (
              <div className="profile-menu">
                <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--b1)", background: "var(--bg)", display: "flex", alignItems: "center", gap: 10 }}>
                  {userImg
                    /* eslint-disable-next-line @next/next/no-img-element */
                    ? <img src={userImg} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--b1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👤</div>
                  }
                  <div>
                    <div style={{ fontFamily: "DM Sans", fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{userName || "Guest"}</div>
                    <div className="mono" style={{ fontSize: 9, color: "var(--t3)", marginTop: 1 }}>{fmtShrt(total)} portfolio</div>
                  </div>
                </div>

                {[
                  { icon: "🏠", label: "Home",       action: () => { setCenterTab("welcome");   setShowProfile(false); } },
                  { icon: "📊", label: "Trade",       action: () => { setCenterTab("analysis");  setShowProfile(false); } },
                  { icon: "💼", label: "Portfolio",   action: () => { setCenterTab("positions"); setShowProfile(false); } },
                  { icon: "📋", label: "History",     action: () => { setCenterTab("history");   setShowProfile(false); } },
                  { icon: "📖", label: "Tutorial",    action: () => { setShowTutorial(true);     setShowProfile(false); } },
                ].map(item => (
                  <button key={item.label} className="profile-menu-item" onClick={item.action}>
                    <span className="profile-menu-icon">{item.icon}</span> {item.label}
                  </button>
                ))}

                <div style={{ borderTop: "1px solid var(--b1)", padding: "8px 16px" }}>
                  <div className="lbl" style={{ marginBottom: 6 }}>Portfolio</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--t2)", lineHeight: 1.9 }}>
                    Cash: {fmtUSD(cash)}<br />
                    P&amp;L: <span style={{ color: pnl >= 0 ? "var(--green)" : "var(--red)" }}>{fmtPnL(pnl)}</span><br />
                    Trades: {trades.length}
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--b1)" }}>
                  <button
                    className="profile-menu-item"
                    style={{ color: "var(--red)" }}
                    onClick={() => {
                      setCash(STARTING_CASH); setPositions([]); setTrades([]);
                      setPrices({}); setSelectedSym(null); setStockData(null);
                      setChartData([]); setShowProfile(false); setCenterTab("welcome");
                      pop("Portfolio reset");
                    }}
                  >
                    <span className="profile-menu-icon">🔄</span> Reset Portfolio
                  </button>
                  {!isGuest && (
                    <button
                      className="profile-menu-item"
                      style={{ color: "var(--t2)" }}
                      onClick={() => signOut({ callbackUrl: "/" })}
                    >
                      <span className="profile-menu-icon">↩</span> Sign Out
                    </button>
                  )}
                  {isGuest && (
                    <button
                      className="profile-menu-item"
                      style={{ color: "var(--t2)" }}
                      onClick={() => router.push("/")}
                    >
                      <span className="profile-menu-icon">↩</span> Sign In
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

        {/* ════ LEFT ════ */}
        <aside style={{ width: 218, flexShrink: 0, borderRight: "1px solid var(--b1)", background: "var(--surf)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Date */}
          <div style={{ padding: "13px 13px 11px", borderBottom: "1px solid var(--b1)" }}>
            <div className="lbl" style={{ marginBottom: 7 }}>Simulation Date</div>
            <input type="date" value={simDate} min="2000-01-01" max="2024-12-31" onChange={e => setSimDate(e.target.value)} style={{ fontSize: 12 }} />
          </div>

          {/* Search */}
          <div style={{ padding: "11px 13px 10px", borderBottom: "1px solid var(--b1)", position: "relative" }}>
            <div className="lbl" style={{ marginBottom: 7 }}>Stock Search</div>
            <input
              type="text" placeholder="Ticker or company…" value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => results.length && setShowDrop(true)}
              onBlur={() => setTimeout(() => setShowDrop(false), 150)}
            />
            {showDrop && results.length > 0 && (
              <div style={{
                position: "absolute", top: "calc(100% - 4px)", left: 13, right: 13, zIndex: 100,
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
              <div className="lbl" style={{ marginBottom: 6 }}>Popular in {simYear}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {suggestions.map(s => (
                  <button key={s.symbol} className="suggest-chip" onClick={() => pickSym(s.symbol)}>{s.symbol}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Positions header */}
          <div style={{ padding: "9px 13px 5px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="lbl">Portfolios</span>
            <button style={{ background: "none", border: "1px solid var(--b1)", borderRadius: 5, width: 22, height: 22, cursor: "pointer", fontSize: 14, color: "var(--t2)", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 10px" }}>
            {positions.length === 0 ? (
              <div className="mono" style={{ padding: "12px 4px", fontSize: 10, color: "var(--t3)", textAlign: "center" }}>No positions yet</div>
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

          {/* Order panel */}
          <div style={{ padding: "12px 13px", flexShrink: 0 }}>
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
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                  <span className="lbl" style={{ whiteSpace: "nowrap" }}>Shares</span>
                  <input type="number" min="1" value={orderShares} onChange={e => setOrderShares(Math.max(1, parseInt(e.target.value) || 1))} style={{ fontSize: 12 }} />
                </div>
                <div className="mono" style={{ fontSize: 10, color: "var(--t3)", marginBottom: 8 }}>
                  Total <span style={{ color: "var(--t1)", fontWeight: 500 }}>{fmtUSD(stockData.price * orderShares)}</span>
                  {curPos && <span style={{ marginLeft: 6 }}>· {curPos.shares} held</span>}
                </div>
                <button onClick={trade} style={{
                  width: "100%", padding: "8px 0", border: "none", borderRadius: 7, cursor: "pointer",
                  fontFamily: "DM Mono", fontSize: 11, fontWeight: 500, letterSpacing: .5, textTransform: "uppercase",
                  background: orderSide === "buy" ? "var(--green)" : "var(--red)", color: "#fff", transition: "opacity .15s",
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity = ".82"}
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
          <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg)" }}>

            {centerTab === "welcome" && (
              <WelcomeScreen
                onStart={() => setCenterTab("analysis")}
                onTutorial={() => setShowTutorial(true)}
                simYear={simYear}
                userName={userName}
              />
            )}

            {centerTab === "analysis" && (
              <>
                <div style={{ background: "var(--surf)", borderBottom: "1px solid var(--b1)", padding: "16px 20px 14px", flexShrink: 0 }}>
                  {stockData ? (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                          <span className="serif" style={{ fontSize: 28, fontWeight: 700, letterSpacing: -.5 }}>{stockData.symbol}</span>
                          <span style={{ fontSize: 14, color: "var(--t2)" }}>{stockData.name}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5 }}>
                          <span className="mono" style={{ fontSize: 22, fontWeight: 500 }}>{fmtUSD(stockData.price)}</span>
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
                          <div style={{ background: "var(--bg)", border: "1px solid var(--b1)", borderRadius: 8, padding: "8px 14px", textAlign: "right" }}>
                            <div className="lbl" style={{ marginBottom: 4 }}>Your Position</div>
                            <div className="mono" style={{ fontSize: 11 }}>{curPos.shares} sh @ {fmtUSD(curPos.avgCost)}</div>
                            <div className="mono" style={{ fontSize: 12, color: gn >= 0 ? "var(--green)" : "var(--red)", marginTop: 2 }}>{fmtPnL(gn)}</div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div style={{ marginBottom: 14 }}>
                      <span className="serif" style={{ fontSize: 22, color: loading ? "var(--t2)" : "var(--t3)" }}>
                        {loading ? "Loading…" : stockErr ? "Stock unavailable" : "Select a stock"}
                      </span>
                      {stockErr && <div className="mono" style={{ fontSize: 11, color: "var(--red)", marginTop: 6 }}>{stockErr} — try a different ticker or date.</div>}
                      {!stockErr && !loading && <div className="mono" style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>Search for a ticker or click a suggestion to begin</div>}
                    </div>
                  )}
                  <div style={{ height: 200 }}>
                    {loading ? (
                      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: 20, height: 20, border: "2px solid var(--b1)", borderTopColor: "var(--t1)", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                      </div>
                    ) : (
                      <StockChart data={chartData} chartUp={chartUp} avgCost={curPos ? curPos.avgCost : null} />
                    )}
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
                  {stockData ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--amber)" }} />
                        <span className="lbl">Market Brief · {MONTHS[new Date(simDate).getMonth()]} {simYear}</span>
                      </div>
                      <p style={{ fontFamily: "DM Sans", fontSize: 14, color: "var(--t2)", lineHeight: 1.78, maxWidth: 640, marginBottom: 20 }}>
                        {era.m}{" "}
                        <strong style={{ color: "var(--t1)", fontWeight: 600 }}>{stockData.name} ({stockData.symbol})</strong>{" "}
                        is trading at {fmtUSD(stockData.price)}.{" "}
                        <em>Risk:</em> {era.risk}{" "}
                        <em>Opportunity:</em> {era.opp}
                      </p>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {[
                          { l: "Current Price",  v: fmtUSD(stockData.price) },
                          { l: "Cash Available", v: fmtUSD(cash) },
                          { l: "Position Value", v: curPos ? fmtUSD(curPos.shares * (prices[stockData.symbol] ?? stockData.price)) : "—" },
                          { l: "Data Date",      v: stockData.date },
                        ].map(s => (
                          <div key={s.l} style={{ background: "var(--surf)", border: "1px solid var(--b1)", borderRadius: 8, padding: "10px 14px", minWidth: 112 }}>
                            <div className="lbl" style={{ marginBottom: 4 }}>{s.l}</div>
                            <div className="mono" style={{ fontSize: 13 }}>{s.v}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="mono" style={{ textAlign: "center", padding: "48px 0", color: "var(--t3)", fontSize: 11 }}>
                      {stockErr ? `⚠ ${stockErr}` : "Search for a stock or click a suggestion in the left panel"}
                    </div>
                  )}
                </div>
              </>
            )}

            {centerTab === "positions" && (
              <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
                <h2 className="serif" style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Portfolio</h2>
                {positions.length === 0 ? (
                  <div className="mono" style={{ textAlign: "center", padding: "48px 0", color: "var(--t3)", fontSize: 11 }}>No open positions — head to Trade to get started</div>
                ) : (
                  <table>
                    <thead><tr>{["Symbol","Name","Shares","Avg Cost","Current","Mkt Value","P&L","Return"].map(h => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                      {positions.map(p => {
                        const px = prices[p.symbol] ?? p.avgCost;
                        const gn = (px - p.avgCost) * p.shares;
                        const rt = ((px - p.avgCost) / p.avgCost) * 100;
                        return (
                          <tr key={p.symbol} style={{ cursor: "pointer" }} onClick={() => { pickSym(p.symbol); setCenterTab("analysis"); }}>
                            <td style={{ fontWeight: 500 }}>{p.symbol}</td>
                            <td style={{ color: "var(--t2)", fontSize: 10 }}>{p.name}</td>
                            <td>{p.shares}</td>
                            <td>{fmtUSD(p.avgCost)}</td>
                            <td>{fmtUSD(px)}</td>
                            <td>{fmtUSD(px * p.shares)}</td>
                            <td style={{ color: gn >= 0 ? "var(--green)" : "var(--red)" }}>{fmtPnL(gn)}</td>
                            <td><span className={`pill ${rt >= 0 ? "pill-up" : "pill-dn"}`}>{fmtPct(rt)}</span></td>
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
          </main>

          {/* ── RIGHT SIDEBAR ── */}
          <aside style={{ width: 238, flexShrink: 0, borderLeft: "1px solid var(--b1)", background: "var(--surf)", overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 11 }}>
            <div className="lbl">Metrics</div>
            {[
              { l: "Total Value", v: fmtUSD(total), big: true },
              { l: "Cash",        v: fmtUSD(cash),  sub: `${((cash / total) * 100).toFixed(0)}% liquid` },
              { l: "Equity",      v: fmtUSD(equity),sub: `${positions.length} position${positions.length !== 1 ? "s" : ""}` },
              { l: "Total P&L",   v: fmtPnL(pnl),   sub: fmtPct(pnlPct), col: pnl >= 0 ? "var(--green)" : "var(--red)" },
            ].map(m => (
              <div key={m.l} style={{ background: "var(--bg)", border: "1px solid var(--b1)", borderRadius: 8, padding: "10px 12px" }}>
                <div className="lbl" style={{ marginBottom: 4 }}>{m.l}</div>
                <div className="mono" style={{ fontSize: m.big ? 16 : 13, fontWeight: m.big ? 600 : 400, color: m.col || "var(--t1)" }}>{m.v}</div>
                {m.sub && <div className="mono" style={{ fontSize: 9, color: m.col || "var(--t3)", marginTop: 2 }}>{m.sub}</div>}
              </div>
            ))}
            <hr />
            <div className="lbl">Stock Info</div>
            {stockData ? (
              <div>
                {[
                  { l: "Symbol",    v: stockData.symbol },
                  { l: "Last Price", v: fmtUSD(stockData.price) },
                  { l: "As Of",     v: stockData.date },
                  ...(chartData.length > 1 ? [
                    { l: "30d High", v: fmtUSD(Math.max(...chartData.map(d => d.high || d.close))) },
                    { l: "30d Low",  v: fmtUSD(Math.min(...chartData.map(d => d.low  || d.close))) },
                    { l: "Avg Vol",  v: `${(chartData.reduce((s, d) => s + (d.volume || 0), 0) / chartData.length / 1e6).toFixed(1)}M` },
                  ] : []),
                ].map(s => (
                  <div key={s.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f1f0ea" }}>
                    <span className="mono" style={{ fontSize: 9, color: "var(--t3)" }}>{s.l}</span>
                    <span className="mono" style={{ fontSize: 11 }}>{s.v}</span>
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
