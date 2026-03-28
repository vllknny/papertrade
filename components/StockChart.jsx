import { useState, useMemo } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid, Cell,
} from "recharts";

const fmtUSD = (n) =>
  `$${(+n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Tooltips ──────────────────────────────────────────────────────────────────
function LineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e0da", borderRadius: 6,
      padding: "7px 11px", boxShadow: "0 4px 12px rgba(0,0,0,.08)",
    }}>
      <div style={{ fontSize: 10, color: "#9ca3af", fontFamily: "DM Mono, monospace", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1814", fontFamily: "DM Mono, monospace" }}>
        {fmtUSD(payload[0].value)}
      </div>
    </div>
  );
}

function CandleTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const up = (d.close ?? 0) >= (d.open ?? 0);
  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e0da", borderRadius: 6,
      padding: "8px 12px", boxShadow: "0 4px 12px rgba(0,0,0,.08)",
      fontFamily: "DM Mono, monospace",
    }}>
      <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 5 }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "16px 1fr", gap: "2px 8px", fontSize: 11 }}>
        {[["O", d.open], ["H", d.high], ["L", d.low], ["C", d.close]].map(([k, v]) => (
          v != null && [
            <span key={k + "k"} style={{ color: "#9ca3af" }}>{k}</span>,
            <span key={k + "v"} style={{ color: up ? "#16a34a" : "#dc2626", fontWeight: 600 }}>{fmtUSD(v)}</span>,
          ]
        ))}
      </div>
      {d.volume > 0 && (
        <div style={{ marginTop: 5, fontSize: 9, color: "#9ca3af" }}>
          Vol {(d.volume / 1e6).toFixed(2)}M
        </div>
      )}
    </div>
  );
}

// ── Custom candlestick shape rendered inside a Recharts Bar ───────────────────
function CandleBarShape({ x, width, payload, background, ...rest }) {
  // yAxis is injected by Recharts into composed chart children
  const yAxis = rest.yAxis ?? rest.yAxisMap?.["0"];
  if (!payload || !yAxis?.scale) return null;

  const { open, high, low, close } = payload;
  if (open == null || high == null || low == null || close == null) return null;

  const sc = yAxis.scale;
  const yH = sc(high);
  const yL = sc(low);
  const yO = sc(open);
  const yC = sc(close);

  const up        = close >= open;
  const stroke    = up ? "#16a34a" : "#dc2626";
  const bodyFill  = up ? "#dcfce7" : "#fee2e2";
  const bodyTop   = Math.min(yO, yC);
  const bodyBot   = Math.max(yO, yC);
  const bodyH     = Math.max(bodyBot - bodyTop, 1.5);
  const midX      = x + width / 2;
  const candleW   = Math.max(width * 0.62, 3);

  return (
    <g>
      <line x1={midX} y1={yH}    x2={midX} y2={bodyTop} stroke={stroke} strokeWidth={1.3} />
      <rect
        x={midX - candleW / 2} y={bodyTop} width={candleW} height={bodyH}
        fill={bodyFill} stroke={stroke} strokeWidth={1.3} rx={1}
      />
      <line x1={midX} y1={bodyBot} x2={midX} y2={yL}    stroke={stroke} strokeWidth={1.3} />
    </g>
  );
}

// ── Chart toggle pill ─────────────────────────────────────────────────────────
function ModeToggle({ mode, onChange }) {
  return (
    <div style={{
      display: "inline-flex", background: "var(--bg)", border: "1px solid var(--b1)",
      borderRadius: 6, overflow: "hidden", flexShrink: 0,
    }}>
      {["line", "candle"].map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          style={{
            padding: "3px 10px", border: "none", cursor: "pointer",
            fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: 1,
            textTransform: "uppercase",
            background: mode === m ? "var(--t1)" : "transparent",
            color: mode === m ? "#fff" : "var(--t3)",
            transition: "all .15s",
          }}
        >
          {m === "line" ? "Line" : "Candle"}
        </button>
      ))}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function StockChart({ data, chartUp, avgCost }) {
  const [mode, setMode] = useState("line");

  const chartData = useMemo(() => {
    if (!data?.length) return [];
    return data.map((d) => ({
      ...d,
      close:  d.close  ?? d.price,
      open:   d.open   ?? d.close ?? d.price,
      high:   d.high   ?? d.close ?? d.price,
      low:    d.low    ?? d.close ?? d.price,
      volume: d.volume ?? 0,
    }));
  }, [data]);

  if (!chartData.length) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#d4d0c8" }}>No chart data</span>
      </div>
    );
  }

  const hasOHLC   = chartData[0].open !== chartData[0].close || data?.[0]?.open != null;
  const lineColor = chartUp ? "#16a34a" : "#dc2626";
  const activeMode = (hasOHLC && mode === "candle") ? "candle" : "line";

  // Y domain for candle covers wicks
  const allPrices = chartData.flatMap((d) => [d.high, d.low]);
  const yMin = Math.min(...allPrices) * 0.997;
  const yMax = Math.max(...allPrices) * 1.003;

  const refLine = avgCost != null ? (
    <ReferenceLine
      y={avgCost} stroke="#d97706"
      strokeDasharray="4 3" strokeWidth={1.5}
      label={{ value: "avg", position: "insideTopRight", fontSize: 9, fill: "#d97706", fontFamily: "DM Mono" }}
    />
  ) : null;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header row with toggle */}
      {hasOHLC && (
        <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: 10, paddingBottom: 3, flexShrink: 0 }}>
          <ModeToggle mode={activeMode} onChange={setMode} />
        </div>
      )}

      {/* Chart area */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          {activeMode === "candle" ? (
            <ComposedChart data={chartData} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eceae4" vertical={false} />
              <XAxis dataKey="date" hide />
              <YAxis yAxisId="0" domain={[yMin, yMax]} hide />
              <Tooltip content={<CandleTooltip />} />
              {refLine}
              {/* Ghost line just to anchor domain */}
              <Line yAxisId="0" dataKey="close" stroke="transparent" dot={false} legendType="none" isAnimationActive={false} />
              {/* Each candle rendered as a custom Bar shape */}
              <Bar yAxisId="0" dataKey="close" shape={<CandleBarShape />} isAnimationActive={false} maxBarSize={20}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill="transparent" />
                ))}
              </Bar>
            </ComposedChart>
          ) : (
            <ComposedChart data={chartData} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eceae4" vertical={false} />
              <XAxis dataKey="date" hide />
              <YAxis domain={["auto", "auto"]} hide />
              <Tooltip content={<LineTooltip />} />
              {refLine}
              <Line
                type="monotone" dataKey="close"
                stroke={lineColor} strokeWidth={2}
                dot={false} activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
