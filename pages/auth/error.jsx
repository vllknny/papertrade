import { useRouter } from "next/router";

const ERROR_MESSAGES = {
  OAuthSignin: "Could not start Google sign-in. Verify your OAuth client credentials.",
  OAuthCallback: "Google callback failed. Ensure your Authorized redirect URI is correct.",
  OAuthCreateAccount: "Could not create account from Google profile.",
  AccessDenied: "Access denied during sign-in.",
  Configuration: "NextAuth configuration error. Check environment variables.",
};

export default function AuthErrorPage() {
  const router = useRouter();
  const code = typeof router.query.error === "string" ? router.query.error : "Configuration";
  const message = ERROR_MESSAGES[code] || "Authentication failed. Check your Google OAuth setup and try again.";

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        width: "100%",
        maxWidth: 560,
        background: "var(--surf)",
        border: "1px solid var(--b1)",
        borderRadius: 12,
        padding: 28,
      }}>
        <h1 style={{
          fontFamily: "Playfair Display, serif",
          fontSize: 30,
          color: "var(--t1)",
          margin: "0 0 12px",
        }}>
          Google OAuth Setup Error
        </h1>
        <p style={{
          fontFamily: "DM Sans",
          fontSize: 14,
          color: "var(--t2)",
          lineHeight: 1.7,
          margin: "0 0 14px",
        }}>
          {message}
        </p>
        <p style={{
          fontFamily: "DM Mono, monospace",
          fontSize: 11,
          color: "var(--t3)",
          margin: "0 0 18px",
        }}>
          Error code: {code}
        </p>
        <ol style={{
          margin: "0 0 24px 18px",
          padding: 0,
          color: "var(--t2)",
          fontFamily: "DM Sans",
          fontSize: 13,
          lineHeight: 1.8,
        }}>
          <li>Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local.</li>
          <li>In Google Cloud Console, add redirect URI: http://localhost:3000/api/auth/callback/google</li>
          <li>Set NEXTAUTH_URL=http://localhost:3000 and restart the app.</li>
        </ol>
        <button
          onClick={() => router.push("/")}
          style={{
            background: "var(--t1)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "10px 16px",
            fontFamily: "DM Mono, monospace",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Back to Sign In
        </button>
      </div>
    </div>
  );
}