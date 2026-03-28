import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid
} from "recharts";

const fmtUSD = (n) => `$${(+n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function CTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e0da", borderRadius: 6,
      padding: "7px 11px", boxShadow: "0 4px 12px rgba(0,0,0,.08)"
    }}>
      <div style={{ fontSize: 10, color: "#9ca3af", fontFamily: "DM Mono, monospace", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1814", fontFamily: "DM Mono, monospace" }}>
        {fmtUSD(payload[0].value)}
      </div>
    </div>
  );
}

export default function StockChart({ data, chartUp, avgCost }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#d4d0c8" }}>No chart data</span>
      </div>
    );
  }

  const color = chartUp ? "#16a34a" : "#dc2626";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eceae4" vertical={false} />
        <XAxis dataKey="date" hide />
        <YAxis domain={["auto", "auto"]} hide />
        <Tooltip content={<CTooltip />} />
        {avgCost != null && (
          <ReferenceLine
            y={avgCost} stroke="#d97706"
            strokeDasharray="4 3" strokeWidth={1.5}
            label={{ value: "avg cost", position: "insideTopRight", fontSize: 9, fill: "#d97706", fontFamily: "DM Mono" }}
          />
        )}
        <Line
          type="monotone" dataKey="close"
          stroke={color} strokeWidth={2}
          dot={false} activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
