import { useState, useEffect } from "react";
import { mintProduct, fetchMyProducts } from "../middleware/index";
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
    color: "#00ff94",
    textShadow: "0 0 20px #00ff9444",
  },
  roleTag: {
    padding: "0.3rem 1rem",
    borderRadius: "999px",
    background: "#00ff9420",
    color: "#00ff94",
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.75rem",
    border: "1px solid #00ff9440",
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
  },
  cardTitle: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.9rem",
    color: "#00ff94",
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
  button: {
    width: "100%",
    padding: "0.85rem",
    background: "transparent",
    border: "1px solid #00ff94",
    borderRadius: "8px",
    color: "#00ff94",
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.9rem",
    cursor: "pointer",
    transition: "all 0.2s",
    marginTop: "0.5rem",
  },
  success: {
    color: "#00ff94",
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.8rem",
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
  productList: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    maxHeight: "600px",
    overflowY: "auto",
  },
  emptyState: {
    color: "#334155",
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.85rem",
    textAlign: "center",
    padding: "2rem",
  },
  selectedProduct: {
    marginTop: "1.5rem",
  },
};

export default function ManufacturerDashboard({ wallet }) {
  const [name, setName]           = useState("");
  const [location, setLocation]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState("");
  const [error, setError]         = useState("");
  const [products, setProducts]   = useState([]);
  const [selected, setSelected]   = useState(null);
  const [fetching, setFetching]   = useState(true);

  // Load manufacturer's products on mount
  useEffect(() => {
    async function load() {
      try {
        const mine = await fetchMyProducts(wallet.address);
        setProducts(mine);
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    }
    load();
  }, [wallet.address]);

  async function handleMint() {
    if (!name || !location) {
      setError("Please fill in both fields.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { productId, txHash } = await mintProduct(name, location);
      setSuccess(`✅ Product #${productId} minted! TX: ${txHash}`);
      setName("");
      setLocation("");
      // Refresh product list
      const mine = await fetchMyProducts(wallet.address);
      setProducts(mine);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrapper}>

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>⬡ Manufacturer Dashboard</h1>
        <span style={styles.roleTag}>🏭 Manufacturer</span>
      </div>

      <div style={styles.grid}>

        {/* Left — Mint Form */}
        <div>
          <div style={styles.card}>
            <p style={styles.cardTitle}>// Mint New Product</p>

            <label style={styles.label}>Product Name</label>
            <input
              style={styles.input}
              placeholder="e.g. Luxury Watch #42"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <label style={styles.label}>Starting Location</label>
            <input
              style={styles.input}
              placeholder="e.g. Geneva Factory"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />

            <button
              style={styles.button}
              onClick={handleMint}
              disabled={loading}
            >
              {loading ? "Minting..." : "⬡ Mint Product"}
            </button>

            {success && <p style={styles.success}>{success}</p>}
            {error   && <p style={styles.error}>⚠ {error}</p>}
          </div>
        </div>

        {/* Right — Product List */}
        <div>
          <div style={styles.card}>
            <p style={styles.cardTitle}>// My Products</p>

            {fetching ? (
              <p style={styles.emptyState}>Loading...</p>
            ) : products.length === 0 ? (
              <p style={styles.emptyState}>No products yet. Mint one!</p>
            ) : (
              <div style={styles.productList}>
                {products.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: "0.85rem",
                      background: selected?.id === p.id ? "#00ff9411" : "#0a0a0f",
                      border: `1px solid ${selected?.id === p.id ? "#00ff9444" : "#1e1e2e"}`,
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onClick={() => setSelected(p)}
                  >
                    <p style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "0.85rem",
                      color: "#e2e8f0",
                      marginBottom: "0.25rem",
                    }}>
                      #{p.id} — {p.name}
                    </p>
                    <p style={{
                      fontSize: "0.75rem",
                      color: "#475569",
                      fontFamily: "'Inter', sans-serif",
                    }}>
                      {p.statusLabel}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Product Timeline */}
          {selected && (
            <div style={styles.selectedProduct}>
              <ProductTimeline product={selected} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}