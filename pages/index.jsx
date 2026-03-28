import { useState, useEffect, useCallback, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

// ─── Utility helpers ─────────────────────────────────────────────────────────
const fmt = (n) =>
  n >= 0
    ? `+$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `-$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtUSD = (n) =>
  `$${(+n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtPct = (n) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

const STARTING_CASH = 100_000;

// ─── Ticker tape component ────────────────────────────────────────────────────
function TickerTape({ positions, prices }) {
  if (!positions.length) return null;
  const items = positions.map((p) => {
    const price = prices[p.symbol] ?? p.avgCost;
    const pct = ((price - p.avgCost) / p.avgCost) * 100;
    return `${p.symbol} ${fmtUSD(price)} ${fmtPct(pct)}`;
  });
  const text = items.join("   ·   ");
  return (
    <div style={{
      background: "#0a0a0a", borderBottom: "1px solid #1e1e1e",
      overflow: "hidden", height: 32, display: "flex", alignItems: "center"
    }}>
      <div style={{
        display: "inline-block", whiteSpace: "nowrap",
        animation: "ticker 20s linear infinite",
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#888"
      }}>
        {text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{text}
      </div>
    </div>
  );
}

// ─── Stock chart ──────────────────────────────────────────────────────────────
function StockChart({ data, symbol, purchasePrice }) {
  if (!data || data.length === 0)
    return <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "#444", fontFamily: "IBM Plex Mono", fontSize: 12 }}>No chart data</div>;

  const first = data[0]?.close ?? 0;
  const last = data[data.length - 1]?.close ?? 0;
  const up = last >= first;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <XAxis dataKey="date" hide />
        <YAxis domain={["auto", "auto"]} hide />
        <Tooltip
          contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 4, fontFamily: "IBM Plex Mono", fontSize: 11 }}
          labelStyle={{ color: "#555" }}
          itemStyle={{ color: up ? "#22c55e" : "#ef4444" }}
          formatter={(v) => [`$${v.toFixed(2)}`, "Close"]}
        />
        {purchasePrice && (
          <ReferenceLine y={purchasePrice} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} />
        )}
        <Line
          type="monotone" dataKey="close"
          stroke={up ? "#22c55e" : "#ef4444"}
          strokeWidth={1.5} dot={false} activeDot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Commentary panel ─────────────────────────────────────────────────────────
function Commentary({ commentary, loading, period }) {
  return (
    <div style={{
      background: "#0d0d0d", border: "1px solid #1e1e1e",
      borderRadius: 8, padding: "16px 20px", marginTop: 12
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
        <span style={{ fontFamily: "IBM Plex Mono", fontSize: 10, color: "#555", letterSpacing: 2, textTransform: "uppercase" }}>
          AI Analyst · {period || "—"}
        </span>
      </div>
      {loading ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: "50%", background: "#f59e0b",
              animation: `pulse 1s ${i * 0.2}s ease-in-out infinite`
            }} />
          ))}
          <span style={{ fontFamily: "IBM Plex Mono", fontSize: 11, color: "#444", marginLeft: 4 }}>
            Analyzing market conditions...
          </span>
        </div>
      ) : (
        <p style={{
          fontFamily: "'Georgia', serif", fontSize: 13, color: "#999",
          lineHeight: 1.7, margin: 0
        }}>
          {commentary || "Select a stock and click Analyze to get period-specific AI commentary."}
        </p>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  // Simulation state
  const [simDate, setSimDate] = useState("2010-06-15");
  const [cash, setCash] = useState(STARTING_CASH);
  const [positions, setPositions] = useState([]); // [{symbol, shares, avgCost, name}]
  const [trades, setTrades] = useState([]);        // [{date, symbol, action, shares, price}]
  const [prices, setPrices] = useState({});        // {symbol: currentPrice}

  // Current lookup
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [stockData, setStockData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [orderShares, setOrderShares] = useState(1);
  const [orderType, setOrderType] = useState("buy");

  // Commentary
  const [commentary, setCommentary] = useState("");
  const [commentaryLoading, setCommentaryLoading] = useState(false);
  const [commentaryPeriod, setCommentaryPeriod] = useState("");

  // UI
  const [activeTab, setActiveTab] = useState("trade"); // trade | portfolio | history
  const [flash, setFlash] = useState(null);

  const searchRef = useRef(null);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const triggerFlash = (msg, type = "success") => {
    setFlash({ msg, type });
    setTimeout(() => setFlash(null), 3000);
  };

  // ── Search ───────────────────────────────────────────────────────────────
  const searchStocks = useCallback(async (q) => {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setSearchResults(data.results || []);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchStocks(query), 300);
    return () => clearTimeout(t);
  }, [query, searchStocks]);

  // ── Load stock ───────────────────────────────────────────────────────────
  const loadStock = useCallback(async (symbol) => {
    setStockLoading(true);
    setStockData(null);
    setChartData([]);
    setCommentary("");
    try {
      const res = await fetch(`/api/stock?symbol=${symbol}&date=${simDate}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStockData(data);
      setChartData(data.chart || []);
      setPrices((p) => ({ ...p, [symbol]: data.price }));
    } catch (e) {
      triggerFlash(`Error: ${e.message}`, "error");
    } finally {
      setStockLoading(false);
    }
  }, [simDate]);

  const selectSymbol = (sym) => {
    setSelectedSymbol(sym);
    setQuery(sym);
    setSearchResults([]);
    loadStock(sym);
  };

  // Reload when date changes
  useEffect(() => {
    if (selectedSymbol) loadStock(selectedSymbol);
  }, [simDate]); // eslint-disable-line

  // ── AI Commentary ─────────────────────────────────────────────────────────
  const fetchCommentary = async () => {
    if (!stockData) return;
    setCommentaryLoading(true);
    try {
      const res = await fetch("/api/commentary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: stockData.symbol,
          name: stockData.name,
          date: simDate,
          price: stockData.price,
          sector: stockData.sector
        })
      });
      const data = await res.json();
      setCommentary(data.commentary || "");
      setCommentaryPeriod(data.period || "");
    } catch (e) {
      setCommentary("Failed to load commentary.");
    } finally {
      setCommentaryLoading(false);
    }
  };

  // ── Trade execution ───────────────────────────────────────────────────────
  const executeTrade = () => {
    if (!stockData || orderShares <= 0) return;
    const price = stockData.price;
    const cost = price * orderShares;

    if (orderType === "buy") {
      if (cost > cash) { triggerFlash("Insufficient funds!", "error"); return; }
      setCash((c) => +(c - cost).toFixed(2));
      setPositions((prev) => {
        const existing = prev.find((p) => p.symbol === stockData.symbol);
        if (existing) {
          return prev.map((p) =>
            p.symbol === stockData.symbol
              ? { ...p, shares: p.shares + orderShares, avgCost: +(((p.avgCost * p.shares) + cost) / (p.shares + orderShares)).toFixed(4) }
              : p
          );
        }
        return [...prev, { symbol: stockData.symbol, name: stockData.name, shares: orderShares, avgCost: price }];
      });
      triggerFlash(`Bought ${orderShares} × ${stockData.symbol} @ ${fmtUSD(price)}`, "success");
    } else {
      const pos = positions.find((p) => p.symbol === stockData.symbol);
      if (!pos || pos.shares < orderShares) { triggerFlash("Not enough shares!", "error"); return; }
      setCash((c) => +(c + cost).toFixed(2));
      setPositions((prev) =>
        prev
          .map((p) => p.symbol === stockData.symbol ? { ...p, shares: p.shares - orderShares } : p)
          .filter((p) => p.shares > 0)
      );
      triggerFlash(`Sold ${orderShares} × ${stockData.symbol} @ ${fmtUSD(price)}`, "success");
    }

    setTrades((t) => [{
      date: simDate, symbol: stockData.symbol, action: orderType,
      shares: orderShares, price, total: cost
    }, ...t]);
  };

  // ── Portfolio calculations ────────────────────────────────────────────────
  const portfolioValue = positions.reduce((sum, p) => {
    const price = prices[p.symbol] ?? p.avgCost;
    return sum + p.shares * price;
  }, 0);
  const totalValue = cash + portfolioValue;
  const totalPnL = totalValue - STARTING_CASH;
  const totalPnLPct = (totalPnL / STARTING_CASH) * 100;

  // ── Render ────────────────────────────────────────────────────────────────
  const currentPos = selectedSymbol ? positions.find((p) => p.symbol === selectedSymbol) : null;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080808; color: #e0e0e0; }
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap');

        @keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes pulse { 0%,100% { opacity:.3; transform:scale(.8) } 50% { opacity:1; transform:scale(1.2) } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes flashIn { 0% { opacity:0; transform:translateY(-16px) } 10%,90% { opacity:1; transform:translateY(0) } 100% { opacity:0 } }

        .tab-btn {
          background: none; border: none; cursor: pointer;
          font-family: 'IBM Plex Mono', monospace; font-size: 11px;
          color: #444; letter-spacing: 1.5px; text-transform: uppercase;
          padding: 8px 16px; transition: color .15s;
        }
        .tab-btn.active { color: #e0e0e0; border-bottom: 1px solid #e0e0e0; }
        .tab-btn:hover { color: #aaa; }

        input[type="text"], input[type="number"], input[type="date"] {
          background: #111; border: 1px solid #1e1e1e; color: #e0e0e0;
          font-family: 'IBM Plex Mono', monospace; font-size: 12px;
          border-radius: 4px; outline: none; transition: border-color .15s;
        }
        input:focus { border-color: #333; }

        .btn {
          border: none; cursor: pointer; border-radius: 4px;
          font-family: 'IBM Plex Mono', monospace; font-size: 12px;
          font-weight: 500; transition: opacity .15s, transform .1s;
        }
        .btn:hover { opacity: .85; }
        .btn:active { transform: scale(.97); }

        .card {
          background: #0d0d0d; border: 1px solid #1a1a1a;
          border-radius: 8px; padding: 20px;
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
      `}</style>

      {/* ── Flash notification ── */}
      {flash && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          zIndex: 999, background: flash.type === "success" ? "#14532d" : "#7f1d1d",
          border: `1px solid ${flash.type === "success" ? "#166534" : "#991b1b"}`,
          color: "#e0e0e0", padding: "10px 20px", borderRadius: 6,
          fontFamily: "IBM Plex Mono", fontSize: 12,
          animation: "flashIn 3s ease forwards"
        }}>
          {flash.msg}
        </div>
      )}

      {/* ── Header ── */}
      <header style={{
        background: "#080808", borderBottom: "1px solid #111",
        padding: "0 32px", display: "flex", alignItems: "center",
        justifyContent: "space-between", height: 56
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontFamily: "Syne", fontSize: 20, fontWeight: 800, letterSpacing: -1 }}>
            PAPERTRADE
          </span>
          <span style={{ fontFamily: "IBM Plex Mono", fontSize: 10, color: "#444", letterSpacing: 2 }}>
            SIMULATOR
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "IBM Plex Mono", fontSize: 10, color: "#444", letterSpacing: 1 }}>TOTAL VALUE</div>
            <div style={{ fontFamily: "Syne", fontSize: 16, fontWeight: 700 }}>{fmtUSD(totalValue)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "IBM Plex Mono", fontSize: 10, color: "#444", letterSpacing: 1 }}>P&amp;L</div>
            <div style={{
              fontFamily: "Syne", fontSize: 16, fontWeight: 700,
              color: totalPnL >= 0 ? "#22c55e" : "#ef4444"
            }}>
              {fmt(totalPnL)} ({fmtPct(totalPnLPct)})
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "IBM Plex Mono", fontSize: 10, color: "#444", letterSpacing: 1 }}>CASH</div>
            <div style={{ fontFamily: "Syne", fontSize: 16, fontWeight: 600 }}>{fmtUSD(cash)}</div>
          </div>
        </div>
      </header>

      {/* ── Ticker tape ── */}
      <TickerTape positions={positions} prices={prices} />

      {/* ── Simulation date bar ── */}
      <div style={{
        background: "#0a0a0a", borderBottom: "1px solid #111",
        padding: "10px 32px", display: "flex", alignItems: "center", gap: 16
      }}>
        <span style={{ fontFamily: "IBM Plex Mono", fontSize: 10, color: "#444", letterSpacing: 2 }}>
          SIM DATE
        </span>
        <input
          type="date"
          value={simDate}
          min="2000-01-01"
          max="2024-12-31"
          onChange={(e) => setSimDate(e.target.value)}
          style={{ padding: "4px 10px", fontSize: 12 }}
        />
        <span style={{ fontFamily: "IBM Plex Mono", fontSize: 10, color: "#333" }}>
          Travel to any date after 2000 · AI will only know what was known then
        </span>
      </div>

      {/* ── Main layout ── */}
      <div style={{ display: "flex", height: "calc(100vh - 130px)" }}>

        {/* ── Left panel ── */}
        <div style={{
          width: 340, borderRight: "1px solid #111", display: "flex",
          flexDirection: "column", padding: 20, gap: 16, overflowY: "auto"
        }}>

          {/* Search */}
          <div style={{ position: "relative" }}>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search stocks…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: "100%", padding: "9px 14px" }}
            />
            {searchResults.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                background: "#111", border: "1px solid #1e1e1e", borderRadius: 4,
                marginTop: 4, maxHeight: 280, overflowY: "auto"
              }}>
                {searchResults.map((r) => (
                  <button
                    key={r.symbol}
                    onClick={() => selectSymbol(r.symbol)}
                    style={{
                      width: "100%", background: "none", border: "none",
                      borderBottom: "1px solid #1a1a1a", padding: "10px 14px",
                      cursor: "pointer", textAlign: "left", display: "flex",
                      justifyContent: "space-between", alignItems: "center",
                      transition: "background .1s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#161616"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                  >
                    <span style={{ fontFamily: "IBM Plex Mono", fontSize: 12, fontWeight: 500, color: "#e0e0e0" }}>
                      {r.symbol}
                    </span>
                    <span style={{ fontFamily: "IBM Plex Mono", fontSize: 10, color: "#555", maxWidth: 160, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stock info */}
          {stockLoading && (
            <div style={{ textAlign: "center", padding: 32 }}>
              <div style={{ fontFamily: "IBM Plex Mono", fontSize: 11, color: "#444" }}>Loading…</div>
            </div>
          )}

          {stockData && !stockLoading && (
            <div style={{ animation: "fadeIn .3s ease" }}>
              <div className="card" style={{ padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: "Syne", fontSize: 22, fontWeight: 800 }}>
                      {stockData.symbol}
                    </div>
                    <div style={{ fontFamily: "IBM Plex Mono", fontSize: 10, color: "#555", marginTop: 2 }}>
                      {stockData.name}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "Syne", fontSize: 22, fontWeight: 700 }}>
                      {fmtUSD(stockData.price)}
                    </div>
                    <div style={{ fontFamily: "IBM Plex Mono", fontSize: 9, color: "#444", marginTop: 2 }}>
                      as of {stockData.date}
                    </div>
                  </div>
                </div>
                <StockChart
                  data={chartData}
                  symbol={stockData.symbol}
                  purchasePrice={currentPos?.avgCost}
                />
              </div>

              {/* Order panel */}
              <div className="card" style={{ marginTop: 12, padding: 16 }}>
                <div style={{ display: "flex", marginBottom: 14, borderBottom: "1px solid #1a1a1a" }}>
                  {["buy", "sell"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setOrderType(t)}
                      className="tab-btn"
                      style={{
                        flex: 1, padding: "8px",
                        color: orderType === t ? (t === "buy" ? "#22c55e" : "#ef4444") : "#444",
                        borderBottom: orderType === t ? `2px solid ${t === "buy" ? "#22c55e" : "#ef4444"}` : "2px solid transparent",
                        textTransform: "uppercase", letterSpacing: 2, fontSize: 11
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                  <label style={{ fontFamily: "IBM Plex Mono", fontSize: 10, color: "#555", whiteSpace: "nowrap" }}>
                    SHARES
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={orderShares}
                    onChange={(e) => setOrderShares(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ flex: 1, padding: "8px 10px" }}
                  />
                </div>

                <div style={{ fontFamily: "IBM Plex Mono", fontSize: 11, color: "#555", marginBottom: 12 }}>
                  Total: <span style={{ color: "#e0e0e0" }}>{fmtUSD(stockData.price * orderShares)}</span>
                  {orderType === "sell" && currentPos && (
                    <span style={{ marginLeft: 8 }}>(have {currentPos.shares})</span>
                  )}
                </div>

                <button
                  className="btn"
                  onClick={executeTrade}
                  style={{
                    width: "100%", padding: "10px",
                    background: orderType === "buy" ? "#14532d" : "#7f1d1d",
                    color: orderType === "buy" ? "#22c55e" : "#ef4444",
                    letterSpacing: 2
                  }}
                >
                  {orderType.toUpperCase()} {stockData.symbol}
                </button>
              </div>

              {/* AI commentary */}
              <div className="card" style={{ marginTop: 12, padding: 0, border: "none" }}>
                <button
                  className="btn"
                  onClick={fetchCommentary}
                  disabled={commentaryLoading}
                  style={{
                    width: "100%", padding: "9px",
                    background: "#111", color: "#f59e0b",
                    border: "1px solid #1e1e1e", letterSpacing: 2, marginBottom: 0
                  }}
                >
                  {commentaryLoading ? "ANALYZING…" : "⚡ AI ANALYST BRIEF"}
                </button>
                <Commentary
                  commentary={commentary}
                  loading={commentaryLoading}
                  period={commentaryPeriod}
                />
              </div>
            </div>
          )}

          {!stockData && !stockLoading && (
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 12, color: "#333"
            }}>
              <div style={{ fontFamily: "IBM Plex Mono", fontSize: 32 }}>📈</div>
              <div style={{ fontFamily: "IBM Plex Mono", fontSize: 11, textAlign: "center", lineHeight: 1.8 }}>
                Search for a stock<br />to begin trading
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Tabs */}
          <div style={{ borderBottom: "1px solid #111", padding: "0 24px", display: "flex" }}>
            {[
              { id: "portfolio", label: "Portfolio" },
              { id: "history", label: "Trade History" },
            ].map((t) => (
              <button
                key={t.id}
                className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

            {/* ── Portfolio tab ── */}
            {activeTab === "portfolio" && (
              <div>
                {/* Summary cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
                  {[
                    { label: "Cash", value: fmtUSD(cash), sub: `${((cash / totalValue) * 100).toFixed(1)}% of portfolio` },
                    { label: "Equity", value: fmtUSD(portfolioValue), sub: `${positions.length} positions` },
                    { label: "Total P&L", value: fmt(totalPnL), sub: fmtPct(totalPnLPct), color: totalPnL >= 0 ? "#22c55e" : "#ef4444" }
                  ].map((c) => (
                    <div key={c.label} className="card">
                      <div style={{ fontFamily: "IBM Plex Mono", fontSize: 9, color: "#555", letterSpacing: 2, marginBottom: 8 }}>
                        {c.label.toUpperCase()}
                      </div>
                      <div style={{ fontFamily: "Syne", fontSize: 20, fontWeight: 700, color: c.color || "#e0e0e0" }}>
                        {c.value}
                      </div>
                      <div style={{ fontFamily: "IBM Plex Mono", fontSize: 10, color: "#444", marginTop: 4 }}>
                        {c.sub}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Positions table */}
                {positions.length === 0 ? (
                  <div style={{
                    textAlign: "center", padding: 60,
                    fontFamily: "IBM Plex Mono", fontSize: 12, color: "#333"
                  }}>
                    No open positions · Start trading to build your portfolio
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                        {["Symbol", "Name", "Shares", "Avg Cost", "Current", "Market Value", "P&L", "P&L %"].map((h) => (
                          <th key={h} style={{
                            textAlign: "left", padding: "8px 12px",
                            fontFamily: "IBM Plex Mono", fontSize: 9, color: "#444",
                            letterSpacing: 1.5, fontWeight: 400
                          }}>{h.toUpperCase()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((p) => {
                        const price = prices[p.symbol] ?? p.avgCost;
                        const mv = price * p.shares;
                        const pnl = (price - p.avgCost) * p.shares;
                        const pnlPct = ((price - p.avgCost) / p.avgCost) * 100;
                        const color = pnl >= 0 ? "#22c55e" : "#ef4444";
                        return (
                          <tr
                            key={p.symbol}
                            style={{ borderBottom: "1px solid #111", cursor: "pointer" }}
                            onClick={() => selectSymbol(p.symbol)}
                            onMouseEnter={(e) => e.currentTarget.style.background = "#0d0d0d"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                          >
                            {[
                              <span style={{ fontFamily: "Syne", fontWeight: 700 }}>{p.symbol}</span>,
                              <span style={{ color: "#555", fontSize: 11 }}>{p.name}</span>,
                              p.shares,
                              fmtUSD(p.avgCost),
                              fmtUSD(price),
                              fmtUSD(mv),
                              <span style={{ color }}>{fmt(pnl)}</span>,
                              <span style={{ color }}>{fmtPct(pnlPct)}</span>
                            ].map((cell, i) => (
                              <td key={i} style={{
                                padding: "12px 12px",
                                fontFamily: "IBM Plex Mono", fontSize: 12
                              }}>{cell}</td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── History tab ── */}
            {activeTab === "history" && (
              <div>
                {trades.length === 0 ? (
                  <div style={{
                    textAlign: "center", padding: 60,
                    fontFamily: "IBM Plex Mono", fontSize: 12, color: "#333"
                  }}>
                    No trades yet · Execute your first trade to see history
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                        {["Date", "Action", "Symbol", "Shares", "Price", "Total"].map((h) => (
                          <th key={h} style={{
                            textAlign: "left", padding: "8px 12px",
                            fontFamily: "IBM Plex Mono", fontSize: 9, color: "#444",
                            letterSpacing: 1.5, fontWeight: 400
                          }}>{h.toUpperCase()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {trades.map((t, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #111" }}>
                          {[
                            t.date,
                            <span style={{ color: t.action === "buy" ? "#22c55e" : "#ef4444", letterSpacing: 1 }}>
                              {t.action.toUpperCase()}
                            </span>,
                            <span style={{ fontFamily: "Syne", fontWeight: 700 }}>{t.symbol}</span>,
                            t.shares,
                            fmtUSD(t.price),
                            fmtUSD(t.total)
                          ].map((cell, j) => (
                            <td key={j} style={{
                              padding: "12px 12px",
                              fontFamily: "IBM Plex Mono", fontSize: 12
                            }}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
