import { useState } from "react";
import { fetchProduct } from "../middleware/index";
import ProductTimeline from "./ProductTimeline";

const styles = {
  wrapper: {
    minHeight: "100vh",
    background: "#0a0a0f",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "3rem 1rem",
    fontFamily: "'Inter', sans-serif",
  },
  title: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "1.8rem",
    color: "#00ff94",
    textShadow: "0 0 20px #00ff9455",
    marginBottom: "0.5rem",
  },
  subtitle: {
    color: "#475569",
    fontSize: "0.85rem",
    marginBottom: "2.5rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  searchBox: {
    display: "flex",
    gap: "0.75rem",
    width: "100%",
    maxWidth: "500px",
    marginBottom: "2rem",
  },
  input: {
    flex: 1,
    padding: "0.85rem 1rem",
    background: "#111118",
    border: "1px solid #1e1e2e",
    borderRadius: "10px",
    color: "#e2e8f0",
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.9rem",
    outline: "none",
  },
  inputFocus: {
    border: "1px solid #00ff9466",
    boxShadow: "0 0 15px #00ff9422",
  },
  button: {
    padding: "0.85rem 1.5rem",
    background: "transparent",
    border: "1px solid #00ff94",
    borderRadius: "10px",
    color: "#00ff94",
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.9rem",
    cursor: "pointer",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
  },
  error: {
    color: "#ef4444",
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.85rem",
    marginBottom: "1rem",
  },
  loading: {
    color: "#475569",
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.85rem",
    marginBottom: "1rem",
  },
  timelineWrapper: {
    width: "100%",
    maxWidth: "500px",
  },
  hint: {
    color: "#1e1e2e",
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.75rem",
    textAlign: "center",
    marginTop: "3rem",
  },
};

export default function ScannerView() {
  const [productId, setProductId]   = useState("");
  const [product, setProduct]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [focused, setFocused]       = useState(false);

  async function handleSearch() {
    if (!productId) return;
    setLoading(true);
    setError("");
    setProduct(null);

    try {
      const result = await fetchProduct(Number(productId));
      setProduct(result);
    } catch (err) {
      setError("Product not found. Check the ID and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSearch();
  }

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>⬡ Verify Product</h2>
      <p style={styles.subtitle}>Enter a product ID to trace its journey</p>

      {/* Search Bar */}
      <div style={styles.searchBox}>
        <input
          style={{
            ...styles.input,
            ...(focused ? styles.inputFocus : {}),
          }}
          type="number"
          placeholder="Enter Product ID..."
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <button
          style={styles.button}
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? "..." : "Search"}
        </button>
      </div>

      {/* States */}
      {error   && <p style={styles.error}>⚠ {error}</p>}
      {loading && <p style={styles.loading}>Fetching from blockchain...</p>}

      {/* Timeline */}
      {product && (
        <div style={styles.timelineWrapper}>
          <ProductTimeline product={product} />
        </div>
      )}

      <p style={styles.hint}>
        Scan a product QR code or enter ID manually
      </p>
    </div>
  );
}