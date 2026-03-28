import { useState } from "react";
import { connectWallet } from "../middleware/index";

const styles = {
  wrapper: {
    minHeight: "100vh",
    background: "#0a0a0f",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Inter', sans-serif",
  },
  glowTitle: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "2.8rem",
    color: "#00ff94",
    textShadow: "0 0 30px #00ff9466",
    marginBottom: "0.5rem",
    letterSpacing: "-1px",
  },
  subtitle: {
    color: "#64748b",
    fontSize: "1rem",
    marginBottom: "3rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  card: {
    background: "#111118",
    border: "1px solid #1e1e2e",
    borderRadius: "16px",
    padding: "2.5rem",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 0 40px #00ff9411",
  },
  button: {
    width: "100%",
    padding: "1rem",
    background: "transparent",
    border: "1px solid #00ff94",
    borderRadius: "10px",
    color: "#00ff94",
    fontFamily: "'Space Mono', monospace",
    fontSize: "1rem",
    cursor: "pointer",
    transition: "all 0.2s",
    marginBottom: "1rem",
  },
  buttonHover: {
    background: "#00ff9420",
    boxShadow: "0 0 20px #00ff9444",
  },
  error: {
    color: "#ef4444",
    fontSize: "0.85rem",
    marginTop: "1rem",
    textAlign: "center",
    fontFamily: "'Space Mono', monospace",
  },
  roleTag: {
    display: "inline-block",
    padding: "0.3rem 1rem",
    borderRadius: "999px",
    background: "#00ff9420",
    color: "#00ff94",
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.8rem",
    marginBottom: "1.5rem",
    border: "1px solid #00ff9440",
  },
  address: {
    color: "#64748b",
    fontSize: "0.8rem",
    fontFamily: "'Space Mono', monospace",
    textAlign: "center",
    marginBottom: "1.5rem",
    wordBreak: "break-all",
  },
  divider: {
    height: "1px",
    background: "#1e1e2e",
    margin: "1.5rem 0",
  },
};

export default function ConnectWallet({ onConnected }) {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [hovered, setHovered]   = useState(false);

  async function handleConnect() {
    setLoading(true);
    setError("");
    try {
      const wallet = await connectWallet();
      onConnected(wallet);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrapper}>
      <h1 style={styles.glowTitle}>⬡ ChainTrack</h1>
      <p style={styles.subtitle}>Blockchain Supply Chain Tracker</p>

      <div style={styles.card}>
        <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1.5rem", lineHeight: "1.6" }}>
          Connect your MetaMask wallet to access the dashboard.
          Your role is automatically detected from the blockchain.
        </p>

        <div style={styles.divider} />

        <button
          style={{ ...styles.button, ...(hovered ? styles.buttonHover : {}) }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={handleConnect}
          disabled={loading}
        >
          {loading ? "Connecting..." : "⬡ Connect MetaMask"}
        </button>

        {error && <p style={styles.error}>⚠ {error}</p>}

        <p style={{ color: "#334155", fontSize: "0.75rem", textAlign: "center", fontFamily: "'Space Mono', monospace" }}>
          Manufacturer · Distributor · Retailer · Admin
        </p>
      </div>
    </div>
  );
}