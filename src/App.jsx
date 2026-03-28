import { useState } from "react";
import "@fontsource/space-mono";
import "@fontsource/inter";
import ConnectWallet from "./components/ConnectWallet";
import ManufacturerDashboard from "./components/ManufacturerDashboard";
import DistributorDashboard from "./components/DistributorDashboard";
import RetailerDashboard from "./components/RetailerDashboard";
import AdminPanel from "./components/AdminPanel";
import ScannerView from "./components/ScannerView";

const styles = {
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 2rem",
    background: "#111118",
    borderBottom: "1px solid #1e1e2e",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  navLogo: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "1.1rem",
    color: "#00ff94",
    textShadow: "0 0 15px #00ff9444",
  },
  navRight: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  navAddress: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.75rem",
    color: "#475569",
  },
  navRole: {
    padding: "0.3rem 0.75rem",
    borderRadius: "999px",
    background: "#00ff9420",
    color: "#00ff94",
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.75rem",
    border: "1px solid #00ff9440",
  },
  scannerBtn: {
    padding: "0.3rem 0.75rem",
    borderRadius: "999px",
    background: "transparent",
    color: "#475569",
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.75rem",
    border: "1px solid #1e1e2e",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  disconnectBtn: {
    padding: "0.3rem 0.75rem",
    borderRadius: "999px",
    background: "transparent",
    color: "#ef4444",
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.75rem",
    border: "1px solid #ef444440",
    cursor: "pointer",
  },
};

export default function App() {
  const [wallet, setWallet]         = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  // Not connected yet — show connect screen
  if (!wallet) {
    return <ConnectWallet onConnected={setWallet} />;
  }

  // Decide which dashboard to show based on role
  function renderDashboard() {
    if (showScanner)      return <ScannerView />;
    if (wallet.isAdmin)   return <AdminPanel wallet={wallet} />;
    if (wallet.isMfr)     return <ManufacturerDashboard wallet={wallet} />;
    if (wallet.isDist)    return <DistributorDashboard wallet={wallet} />;
    if (wallet.isRetailer) return <RetailerDashboard wallet={wallet} />;

    // No role assigned yet
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Space Mono', monospace",
      }}>
        <p style={{ color: "#475569", fontSize: "1rem" }}>
          ⚠ No role assigned to this wallet.
        </p>
        <p style={{ color: "#334155", fontSize: "0.8rem", marginTop: "0.5rem" }}>
          Ask the admin to grant you a role.
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh" }}>

      {/* Navbar */}
      <nav style={styles.navbar}>
        <span style={styles.navLogo}>⬡ ChainTrack</span>

        <div style={styles.navRight}>

          {/* Scanner toggle */}
          <button
            style={{
              ...styles.scannerBtn,
              ...(showScanner ? {
                color: "#00ff94",
                border: "1px solid #00ff9440",
              } : {}),
            }}
            onClick={() => setShowScanner(!showScanner)}
          >
            {showScanner ? "← Dashboard" : "⬡ Scanner"}
          </button>

          {/* Short address */}
          <span style={styles.navAddress}>
            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
          </span>

          {/* Role badge */}
          <span style={styles.navRole}>{wallet.label}</span>

          {/* Disconnect */}
          <button
            style={styles.disconnectBtn}
            onClick={() => setWallet(null)}
          >
            Disconnect
          </button>

        </div>
      </nav>

      {/* Dashboard */}
      {renderDashboard()}

    </div>
  );
}
