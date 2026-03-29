import { useState, useMemo } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid, Cell,
} from "recharts";

const fmtUSD  = (n) => `$${(+n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtK    = (n) => n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n.toFixed(0)}`;

// ── Tooltips ──────────────────────────────────────────────────────────────────
function LineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e0da", borderRadius: 6,
      padding: "7px 11px", boxShadow: "0 4px 12px rgba(0,0,0,.09)",
      fontFamily: "DM Mono, monospace",
    }}>
      <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1814" }}>{fmtUSD(payload[0].value)}</div>
    </div>
  );
}

function CandleTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const up = (d.close ?? 0) >= (d.open ?? 0);
  const color = up ? "#16a34a" : "#dc2626";
  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e0da", borderRadius: 7,
      padding: "9px 13px", boxShadow: "0 4px 14px rgba(0,0,0,.1)",
      fontFamily: "DM Mono, monospace", minWidth: 120,
    }}>
      <div style={{ fontSize: 9, color: "#9ca3af", marginBottom: 6, letterSpacing: 1 }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "14px 1fr", rowGap: 3, columnGap: 8, fontSize: 11 }}>
        {[["O", d.open], ["H", d.high], ["L", d.low], ["C", d.close]].map(([k, v]) =>
          v != null ? [
            <span key={k + "k"} style={{ color: "#9ca3af" }}>{k}</span>,
            <span key={k + "v"} style={{ color, fontWeight: k === "C" ? 700 : 500 }}>{fmtUSD(v)}</span>,
          ] : null
        )}
      </div>
      {d.volume > 0 && (
        <div style={{ marginTop: 6, paddingTop: 5, borderTop: "1px solid #f1f0ea", fontSize: 9, color: "#9ca3af" }}>
          Vol&nbsp;{(d.volume / 1e6).toFixed(2)}M
        </div>
      )}
    </div>
  );
}

// ── Custom candlestick bar shape ──────────────────────────────────────────────
function CandleBarShape(props) {
  const { x, width, payload } = props;
  // yAxis injected by recharts – access via yAxisMap or direct yAxis prop
  const yAxis = props.yAxis ?? props.yAxisMap?.["0"];
  if (!payload || !yAxis?.scale) return null;

  const { open, high, low, close } = payload;
  if (open == null || high == null || low == null || close == null) return null;

  const sc       = yAxis.scale;
  const yH       = sc(high);
  const yL       = sc(low);
  const yO       = sc(open);
  const yC       = sc(close);
  const up       = close >= open;
  const stroke   = up ? "#16a34a" : "#dc2626";
  const bodyFill = up ? "#dcfce7" : "#fee2e2";
  const bodyTop  = Math.min(yO, yC);
  const bodyBot  = Math.max(yO, yC);
  const bodyH    = Math.max(bodyBot - bodyTop, 1.5);
  const midX     = x + width / 2;
  const cw       = Math.max(Math.min(width * 0.65, 14), 3);

  return (
    <g>
      {/* Top wick */}
      <line x1={midX} y1={yH} x2={midX} y2={bodyTop} stroke={stroke} strokeWidth={1.5} strokeLinecap="round" />
      {/* Body */}
      <rect x={midX - cw / 2} y={bodyTop} width={cw} height={bodyH}
        fill={bodyFill} stroke={stroke} strokeWidth={1.5} rx={1.5} />
      {/* Bottom wick */}
      <line x1={midX} y1={bodyBot} x2={midX} y2={yL} stroke={stroke} strokeWidth={1.5} strokeLinecap="round" />
    </g>
  );
}

// ── Mode toggle ───────────────────────────────────────────────────────────────
function ModeToggle({ mode, onChange }) {
  return (
    <div style={{
      display: "inline-flex", background: "var(--bg)", border: "1px solid var(--b1)",
      borderRadius: 6, overflow: "hidden",
    }}>
      {[
        { id: "line",   label: "Line" },
        { id: "candle", label: "Candle" },
      ].map(({ id, label }) => (
        <button key={id} onClick={() => onChange(id)} style={{
          padding: "4px 11px", border: "none", cursor: "pointer",
          fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: 1,
          textTransform: "uppercase",
          background: mode === id ? "var(--t1)" : "transparent",
          color: mode === id ? "#fff" : "var(--t3)",
          transition: "all .15s",
        }}>
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
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

  // Detect whether the API returned real OHLC data
  const hasOHLC = data?.some(d => d.open != null && d.open !== d.close);
  const lineColor = chartUp ? "#16a34a" : "#dc2626";
  const activeMode = hasOHLC && mode === "candle" ? "candle" : "line";

  // Y domain: include all wicks
  const allPrices = chartData.flatMap(d => [d.high, d.low, d.close]).filter(Boolean);
  const rawMin = Math.min(...allPrices);
  const rawMax = Math.max(...allPrices);
  const pad    = (rawMax - rawMin) * 0.06;
  const yMin   = rawMin - pad;
  const yMax   = rawMax + pad;

  // X axis ticks — show ~5 evenly spaced dates
  const tickIndices = chartData.length <= 6
    ? chartData.map((_, i) => i)
    : [0,
        Math.round(chartData.length * 0.25),
        Math.round(chartData.length * 0.5),
        Math.round(chartData.length * 0.75),
        chartData.length - 1,
      ];
  const xTicks = tickIndices.map(i => chartData[i]?.date).filter(Boolean);

  const refLine = avgCost != null ? (
    <ReferenceLine
      y={avgCost} stroke="#d97706"
      strokeDasharray="5 3" strokeWidth={1.5}
      label={{ value: "avg", position: "insideTopRight", fontSize: 9, fill: "#d97706", fontFamily: "DM Mono" }}
    />
  ) : null;

  const commonAxes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="#eceae4" vertical={false} />
      <XAxis
        dataKey="date"
        ticks={xTicks}
        tick={{ fontFamily: "DM Mono, monospace", fontSize: 9, fill: "#a09b93" }}
        axisLine={{ stroke: "#e4e2dc" }}
        tickLine={false}
        dy={4}
      />
      <YAxis
        domain={[yMin, yMax]}
        tickFormatter={fmtK}
        tick={{ fontFamily: "DM Mono, monospace", fontSize: 9, fill: "#a09b93" }}
        axisLine={false}
        tickLine={false}
        width={44}
        tickCount={5}
      />
    </>
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Toggle */}
      {hasOHLC && (
        <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: 6, paddingBottom: 4, flexShrink: 0 }}>
          <ModeToggle mode={activeMode} onChange={setMode} />
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          {activeMode === "candle" ? (
            <ComposedChart data={chartData} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
              {commonAxes}
              <Tooltip content={<CandleTooltip />} cursor={{ stroke: "#e4e2dc", strokeWidth: 1 }} />
              {refLine}
              {/* Ghost line to anchor YAxis domain */}
              <Line yAxisId={0} dataKey="close" stroke="transparent" dot={false} legendType="none" isAnimationActive={false} />
              <Bar yAxisId={0} dataKey="close" shape={<CandleBarShape />} isAnimationActive={false} maxBarSize={18}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill="transparent" />
                ))}
              </Bar>
            </ComposedChart>
          ) : (
            <ComposedChart data={chartData} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
              {commonAxes}
              <Tooltip content={<LineTooltip />} cursor={{ stroke: "#e4e2dc", strokeWidth: 1 }} />
              {refLine}
              <Line
                type="monotone" dataKey="close"
                stroke={lineColor} strokeWidth={2}
                dot={false} activeDot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
