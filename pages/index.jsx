import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

const TICKERS = [
  "+AAPL 3.2%","-TSLA 2.1%","+NVDA 5.4%","+MSFT 1.8%","-NFLX 0.8%",
  "+AMZN 0.9%","+META 4.1%","+GOOGL 2.3%","-INTC 1.4%","+SPY 1.2%",
  "+JPM 0.7%","+QQQ 1.9%","+AMD 6.2%","+KO 0.3%","-XOM 0.5%",
];

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/app");
  }, [status, router]);

  if (status === "loading") return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ width: 24, height: 24, border: "2px solid var(--b1)", borderTopColor: "var(--t1)", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>

      {/* ── LEFT: Hero ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "52px 72px", justifyContent: "center" }}>

        {/* Brand — "Paper Trading" pill sits at the baseline of "Anchor" */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 56 }}>
          {/* logo sits slightly above baseline so we use a wrapper */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Anchor" style={{ width: 36, height: 36, objectFit: "contain" }} />
            <span style={{ fontFamily: "Playfair Display, serif", fontSize: 24, fontWeight: 700, letterSpacing: -.5 }}>Anchor</span>
          </div>
          {/* Pill — baseline-aligned with the word "Anchor" */}
          <span style={{
            fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase",
            color: "#92400e", background: "#fef3c7", border: "1px solid #fde68a",
            padding: "3px 10px", borderRadius: 20,
            position: "relative", top: "-1px",   /* fine-tune to sit at cap-height baseline */
          }}>Paper Trading</span>
        </div>

        {/* Hero */}
        <div style={{ maxWidth: 500 }}>
          <h1 style={{
            fontFamily: "Playfair Display, serif", fontSize: 50, fontWeight: 700,
            letterSpacing: -2, lineHeight: 1.1, color: "var(--t1)", marginBottom: 22,
          }}>
            Trade the past.<br />
            <span style={{ color: "var(--green)" }}>Learn</span> for the future.
          </h1>

          <p style={{ fontFamily: "DM Sans", fontSize: 15, color: "var(--t2)", lineHeight: 1.75, marginBottom: 40, maxWidth: 420 }}>
            Choose any date from 2000 to 2024. Trade with real historical prices
            and $100,000 in simulated cash — zero risk, maximum insight.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {[
              ["🕰", "Time-travel to any date from 2000 to 2024"],
              ["📊", "Real historical price data from Yahoo Finance"],
              ["🧠", "Era-accurate market context for each period"],
              ["💼", "Full portfolio tracking with P&L and history"],
            ].map(([icon, text]) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 17, lineHeight: 1 }}>{icon}</span>
                <span style={{ fontFamily: "DM Sans", fontSize: 14, color: "var(--t2)" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ticker tape */}
        <div style={{ marginTop: 52, overflow: "hidden", maxWidth: 520 }}>
          <div style={{
            display: "inline-flex", gap: 8,
            animation: "loginTicker 22s linear infinite", whiteSpace: "nowrap",
          }}>
            {[...TICKERS, ...TICKERS].map((t, i) => {
              const up = t.startsWith("+");
              return (
                <span key={i} style={{
                  fontFamily: "DM Mono, monospace", fontSize: 10,
                  color: up ? "var(--green)" : "var(--red)",
                  background: up ? "#dcfce7" : "#fee2e2",
                  padding: "3px 8px", borderRadius: 5, flexShrink: 0,
                }}>
                  {t.slice(1)}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Sign-in card ── */}
      <div style={{
        width: 420, background: "var(--surf)", borderLeft: "1px solid var(--b1)",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "60px 48px",
      }}>
        <div style={{ width: "100%", maxWidth: 300 }}>

          {/* Circle logo */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-circle.png" alt="Anchor" style={{ width: 68, height: 68, objectFit: "contain" }} />
          </div>

          <h2 style={{
            fontFamily: "Playfair Display, serif", fontSize: 24, fontWeight: 700,
            color: "var(--t1)", textAlign: "center", marginBottom: 8,
          }}>Welcome to Anchor</h2>
          <p style={{ fontFamily: "DM Sans", fontSize: 13, color: "var(--t3)", textAlign: "center", marginBottom: 32, lineHeight: 1.6 }}>
            Sign in to save your portfolio and trade history.
          </p>

          {/* Google button — icon + label perfectly centered */}
          <button
            className="google-btn"
            onClick={() => signIn("google", { callbackUrl: "/app" })}
            style={{ marginBottom: 14 }}
          >
            <GoogleIcon />
            <span style={{ display: "block", lineHeight: "18px" }}>Continue with Google</span>
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 14px" }}>
            <div style={{ flex: 1, height: 1, background: "var(--b1)" }} />
            <span className="mono" style={{ fontSize: 9, color: "var(--t3)" }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "var(--b1)" }} />
          </div>

          {/* Guest */}
          <button
            onClick={() => router.push("/app?guest=true")}
            style={{
              width: "100%", padding: "12px", background: "var(--bg)",
              border: "1px solid var(--b1)", borderRadius: 10,
              fontFamily: "DM Sans", fontSize: 13, color: "var(--t2)",
              cursor: "pointer", transition: "all .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--b2)"; e.currentTarget.style.color = "var(--t1)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--b1)"; e.currentTarget.style.color = "var(--t2)"; }}
          >
            Continue as Guest
          </button>

          <p className="mono" style={{ fontSize: 9, color: "var(--t3)", textAlign: "center", marginTop: 22, lineHeight: 1.8 }}>
            Guest sessions are not saved between visits.<br />
            No real money is ever involved. Simulation only.
          </p>
        </div>
      </div>

      <style>{`@keyframes loginTicker { from{transform:translateX(0)} to{transform:translateX(-50%)} }`}</style>
    </div>
  );
}
