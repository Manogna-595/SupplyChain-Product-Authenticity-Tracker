import { useState, useEffect } from "react";
import {
  fetchMyProducts,
  fetchAllProducts,
  signAsReceiver,
  executeTransfer,
} from "../middleware/index";
import ProductTimeline from "./ProductTimeline";

const styles = {
  wrapper: {
    minHeight: "100vh",
    background: "#0a0a0f",
    padding: "2rem",
    fontFamily: "'Inter', sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid #1e1e2e",
  },
  title: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "1.4rem",
    color: "#0ea5e9",
    textShadow: "0 0 20px #0ea5e944",
  },
  roleTag: {
    padding: "0.3rem 1rem",
    borderRadius: "999px",
    background: "#0ea5e920",
    color: "#0ea5e9",
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.75rem",
    border: "1px solid #0ea5e940",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1.5rem",
  },
  card: {
    background: "#111118",
    border: "1px solid #1e1e2e",
    borderRadius: "16px",
    padding: "1.5rem",
    marginBottom: "1.5rem",
  },
  cardTitle: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.9rem",
    color: "#0ea5e9",
    marginBottom: "1.5rem",
    paddingBottom: "0.75rem",
    borderBottom: "1px solid #1e1e2e",
  },
  label: {
    display: "block",
    color: "#64748b",
    fontSize: "0.78rem",
    fontFamily: "'Space Mono', monospace",
    marginBottom: "0.4rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  input: {
    width: "100%",
    padding: "0.75rem 1rem",
    background: "#0a0a0f",
    border: "1px solid #1e1e2e",
    borderRadius: "8px",
    color: "#e2e8f0",
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.85rem",
    marginBottom: "1rem",
    outline: "none",
    boxSizing: "border-box",
  },
  button: (color) => ({
    width: "100%",
    padding: "0.85rem",
    background: "transparent",
    border: `1px solid ${color}`,
    borderRadius: "8px",
    color: color,
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.9rem",
    cursor: "pointer",
    transition: "all 0.2s",
    marginTop: "0.5rem",
  }),
  success: {
    color: "#00ff94",
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.78rem",
    marginTop: "1rem",
    padding: "0.75rem",
    background: "#00ff9411",
    borderRadius: "8px",
    border: "1px solid #00ff9433",
    wordBreak: "break-all",
  },
  error: {
    color: "#ef4444",
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.8rem",
    marginTop: "1rem",
  },
  productItem: (selected) => ({
    padding: "0.85rem",
    background: selected ? "#0ea5e911" : "#0a0a0f",
    border: `1px solid ${selected ? "#0ea5e944" : "#1e1e2e"}`,
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
    marginBottom: "0.75rem",
  }),
  productName: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.85rem",
    color: "#e2e8f0",
    marginBottom: "0.25rem",
  },
  productMeta: {
    fontSize: "0.75rem",
    color: "#475569",
    fontFamily: "'Inter', sans-serif",
  },
  emptyState: {
    color: "#334155",
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.85rem",
    textAlign: "center",
    padding: "2rem",
  },
  sigBox: {
    padding: "0.75rem",
    background: "#0a0a0f",
    border: "1px solid #1e1e2e",
    borderRadius: "8px",
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.7rem",
    color: "#475569",
    wordBreak: "break-all",
    marginTop: "1rem",
  },
};

export default function DistributorDashboard({ wallet }) {
  const [myProducts, setMyProducts]       = useState([]);
  const [allProducts, setAllProducts]     = useState([]);
  const [selected, setSelected]           = useState(null);
  const [fetching, setFetching]           = useState(true);

  // Sign as receiver states
  const [signProductId, setSignProductId] = useState("");
  const [signFrom, setSignFrom]           = useState("");
  const [signature, setSignature]         = useState("");
  const [signLoading, setSignLoading]     = useState(false);
  const [signError, setSignError]         = useState("");

  // Transfer states
  const [txProductId, setTxProductId]     = useState("");
  const [txTo, setTxTo]                   = useState("");
  const [txLocation, setTxLocation]       = useState("");
  const [txSig, setTxSig]                 = useState("");
  const [txLoading, setTxLoading]         = useState(false);
  const [txSuccess, setTxSuccess]         = useState("");
  const [txError, setTxError]             = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [mine, all] = await Promise.all([
          fetchMyProducts(wallet.address),
          fetchAllProducts(),
        ]);
        setMyProducts(mine);
        setAllProducts(all);
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    }
    load();
  }, [wallet.address]);

  async function handleSign() {
    if (!signProductId || !signFrom) {
      setSignError("Fill in both fields.");
      return;
    }
    setSignLoading(true);
    setSignError("");
    setSignature("");
    try {
      const sig = await signAsReceiver(Number(signProductId), signFrom);
      setSignature(sig);
    } catch (err) {
      setSignError(err.message);
    } finally {
      setSignLoading(false);
    }
  }

  async function handleTransfer() {
    if (!txProductId || !txTo || !txLocation || !txSig) {
      setTxError("Fill in all fields.");
      return;
    }
    setTxLoading(true);
    setTxError("");
    setTxSuccess("");
    try {
      const hash = await executeTransfer(
        Number(txProductId),
        txTo,
        txLocation,
        txSig
      );
      setTxSuccess(`✅ Transferred! TX: ${hash}`);
      const mine = await fetchMyProducts(wallet.address);
      setMyProducts(mine);
    } catch (err) {
      setTxError(err.message);
    } finally {
      setTxLoading(false);
    }
  }

  return (
    <div style={styles.wrapper}>

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>⬡ Distributor Dashboard</h1>
        <span style={styles.roleTag}>🚢 Distributor</span>
      </div>

      <div style={styles.grid}>

        {/* Left Column */}
        <div>

          {/* Sign as Receiver */}
          <div style={styles.card}>
            <p style={styles.cardTitle}>// Pre-Sign as Receiver</p>
            <p style={{ color: "#475569", fontSize: "0.8rem", marginBottom: "1rem", lineHeight: "1.6" }}>
              Sign to approve receiving a product before the sender transfers it.
            </p>

            <label style={styles.label}>Product ID</label>
            <input
              style={styles.input}
              type="number"
              placeholder="e.g. 3"
              value={signProductId}
              onChange={(e) => setSignProductId(e.target.value)}
            />

            <label style={styles.label}>Current Owner Address</label>
            <input
              style={styles.input}
              placeholder="0xManufacturerAddress..."
              value={signFrom}
              onChange={(e) => setSignFrom(e.target.value)}
            />

            <button
              style={styles.button("#0ea5e9")}
              onClick={handleSign}
              disabled={signLoading}
            >
              {signLoading ? "Signing..." : "✍ Sign as Receiver"}
            </button>

            {signError && <p style={styles.error}>⚠ {signError}</p>}

            {signature && (
              <div>
                <p style={{ ...styles.label, marginTop: "1rem" }}>
                  Your Signature (share with sender):
                </p>
                <div style={styles.sigBox}>{signature}</div>
              </div>
            )}
          </div>

          {/* Transfer Product */}
          <div style={styles.card}>
            <p style={styles.cardTitle}>// Dispatch to Retailer</p>

            <label style={styles.label}>Product ID</label>
            <input
              style={styles.input}
              type="number"
              placeholder="e.g. 3"
              value={txProductId}
              onChange={(e) => setTxProductId(e.target.value)}
            />

            <label style={styles.label}>Retailer Address</label>
            <input
              style={styles.input}
              placeholder="0xRetailerAddress..."
              value={txTo}
              onChange={(e) => setTxTo(e.target.value)}
            />

            <label style={styles.label}>Location</label>
            <input
              style={styles.input}
              placeholder="e.g. Dubai Port"
              value={txLocation}
              onChange={(e) => setTxLocation(e.target.value)}
            />

            <label style={styles.label}>Retailer's Signature</label>
            <input
              style={styles.input}
              placeholder="0xSignature..."
              value={txSig}
              onChange={(e) => setTxSig(e.target.value)}
            />

            <button
              style={styles.button("#00ff94")}
              onClick={handleTransfer}
              disabled={txLoading}
            >
              {txLoading ? "Transferring..." : "⬡ Dispatch Product"}
            </button>

            {txSuccess && <p style={styles.success}>{txSuccess}</p>}
            {txError   && <p style={styles.error}>⚠ {txError}</p>}
          </div>
        </div>

        {/* Right Column — My Inventory */}
        <div>
          <div style={styles.card}>
            <p style={styles.cardTitle}>// My Inventory</p>
            {fetching ? (
              <p style={styles.emptyState}>Loading...</p>
            ) : myProducts.length === 0 ? (
              <p style={styles.emptyState}>No products in your inventory.</p>
            ) : (
              myProducts.map((p) => (
                <div
                  key={p.id}
                  style={styles.productItem(selected?.id === p.id)}
                  onClick={() => setSelected(p)}
                >
                  <p style={styles.productName}>#{p.id} — {p.name}</p>
                  <p style={styles.productMeta}>{p.statusLabel}</p>
                </div>
              ))
            )}
          </div>

          {selected && <ProductTimeline product={selected} />}
        </div>

      </div>
    </div>
  );
}