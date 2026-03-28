import { useState, useEffect } from "react";
import { grantRole, revokeRole, markExpired, fetchAllProducts } from "../middleware/index";

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
    color: "#f59e0b",
    textShadow: "0 0 20px #f59e0b44",
  },
  roleTag: {
    padding: "0.3rem 1rem",
    borderRadius: "999px",
    background: "#f59e0b20",
    color: "#f59e0b",
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.75rem",
    border: "1px solid #f59e0b40",
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
    color: "#f59e0b",
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
  select: {
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
    cursor: "pointer",
  },
  buttonRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.75rem",
    marginTop: "0.5rem",
  },
  button: (color) => ({
    padding: "0.85rem",
    background: "transparent",
    border: `1px solid ${color}`,
    borderRadius: "8px",
    color: color,
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.85rem",
    cursor: "pointer",
    transition: "all 0.2s",
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
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.75rem",
    color: "#475569",
    textAlign: "left",
    padding: "0.6rem 0.75rem",
    borderBottom: "1px solid #1e1e2e",
    textTransform: "uppercase",
  },
  td: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "0.8rem",
    color: "#94a3b8",
    padding: "0.75rem",
    borderBottom: "1px solid #0f0f17",
  },
  expireBtn: {
    padding: "0.3rem 0.75rem",
    background: "transparent",
    border: "1px solid #ef4444",
    borderRadius: "6px",
    color: "#ef4444",
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.72rem",
    cursor: "pointer",
  },
  emptyState: {
    color: "#334155",
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.85rem",
    textAlign: "center",
    padding: "2rem",
  },
};

export default function AdminPanel({ wallet }) {
  const [address, setAddress]     = useState("");
  const [role, setRole]           = useState("MANUFACTURER");
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleSuccess, setRoleSuccess] = useState("");
  const [roleError, setRoleError]   = useState("");

  const [products, setProducts]   = useState([]);
  const [fetching, setFetching]   = useState(true);
  const [expiring, setExpiring]   = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const all = await fetchAllProducts();
        setProducts(all);
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    }
    load();
  }, []);

  async function handleGrant() {
    if (!address) { setRoleError("Enter an address."); return; }
    setRoleLoading(true);
    setRoleError("");
    setRoleSuccess("");
    try {
      const hash = await grantRole(role, address);
      setRoleSuccess(`✅ Role granted! TX: ${hash}`);
      setAddress("");
    } catch (err) {
      setRoleError(err.message);
    } finally {
      setRoleLoading(false);
    }
  }

  async function handleRevoke() {
    if (!address) { setRoleError("Enter an address."); return; }
    setRoleLoading(true);
    setRoleError("");
    setRoleSuccess("");
    try {
      const hash = await revokeRole(role, address);
      setRoleSuccess(`✅ Role revoked! TX: ${hash}`);
      setAddress("");
    } catch (err) {
      setRoleError(err.message);
    } finally {
      setRoleLoading(false);
    }
  }

  async function handleExpire(productId) {
    setExpiring(productId);
    try {
      await markExpired(productId);
      const all = await fetchAllProducts();
      setProducts(all);
    } catch (err) {
      console.error(err);
    } finally {
      setExpiring(null);
    }
  }

  return (
    <div style={styles.wrapper}>

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>⬡ Admin Panel</h1>
        <span style={styles.roleTag}>⚙ Admin</span>
      </div>

      <div style={styles.grid}>

        {/* Left — Role Management */}
        <div>
          <div style={styles.card}>
            <p style={styles.cardTitle}>// Role Management</p>

            <label style={styles.label}>Wallet Address</label>
            <input
              style={styles.input}
              placeholder="0xAddress..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <label style={styles.label}>Role</label>
            <select
              style={styles.select}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="MANUFACTURER">Manufacturer</option>
              <option value="DISTRIBUTOR">Distributor</option>
              <option value="RETAILER">Retailer</option>
            </select>

            <div style={styles.buttonRow}>
              <button
                style={styles.button("#00ff94")}
                onClick={handleGrant}
                disabled={roleLoading}
              >
                {roleLoading ? "..." : "✅ Grant"}
              </button>
              <button
                style={styles.button("#ef4444")}
                onClick={handleRevoke}
                disabled={roleLoading}
              >
                {roleLoading ? "..." : "✕ Revoke"}
              </button>
            </div>

            {roleSuccess && <p style={styles.success}>{roleSuccess}</p>}
            {roleError   && <p style={styles.error}>⚠ {roleError}</p>}
          </div>
        </div>

        {/* Right — All Products Table */}
        <div>
          <div style={styles.card}>
            <p style={styles.cardTitle}>// All Products</p>

            {fetching ? (
              <p style={styles.emptyState}>Loading...</p>
            ) : products.length === 0 ? (
              <p style={styles.emptyState}>No products found.</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td style={styles.td}>#{p.id}</td>
                      <td style={styles.td}>{p.name}</td>
                      <td style={styles.td}>{p.statusLabel}</td>
                      <td style={styles.td}>
                        {p.status !== 3 && (
                          <button
                            style={styles.expireBtn}
                            onClick={() => handleExpire(p.id)}
                            disabled={expiring === p.id}
                          >
                            {expiring === p.id ? "..." : "Expire"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}