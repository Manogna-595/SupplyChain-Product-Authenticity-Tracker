import { STATUS } from "../middleware/index";

const styles = {
  wrapper: {
    padding: "1.5rem",
    background: "#111118",
    borderRadius: "16px",
    border: "1px solid #1e1e2e",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
  },
  productName: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "1.1rem",
    color: "#e2e8f0",
  },
  statusBadge: (status) => ({
    padding: "0.3rem 0.8rem",
    borderRadius: "999px",
    fontSize: "0.75rem",
    fontFamily: "'Space Mono', monospace",
    background: STATUS[status]?.color + "22",
    color: STATUS[status]?.color,
    border: `1px solid ${STATUS[status]?.color}44`,
  }),
  ownerRow: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.72rem",
    color: "#475569",
    marginBottom: "1.5rem",
    wordBreak: "break-all",
  },
  timeline: {
    position: "relative",
    paddingLeft: "1.5rem",
  },
  line: {
    position: "absolute",
    left: "7px",
    top: "8px",
    bottom: "8px",
    width: "2px",
    background: "linear-gradient(to bottom, #00ff94, #0ea5e9)",
  },
  checkpoint: {
    position: "relative",
    marginBottom: "1.5rem",
    paddingLeft: "1rem",
  },
  dot: (isLast) => ({
    position: "absolute",
    left: "-1.5rem",
    top: "6px",
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    background: isLast ? "#00ff94" : "#0ea5e9",
    boxShadow: isLast ? "0 0 10px #00ff9488" : "0 0 6px #0ea5e988",
    border: "2px solid #0a0a0f",
  }),
  location: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.85rem",
    color: "#e2e8f0",
    marginBottom: "0.2rem",
  },
  meta: {
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
};

export default function ProductTimeline({ product }) {
  if (!product) {
    return (
      <div style={styles.wrapper}>
        <p style={styles.emptyState}>No product selected.</p>
      </div>
    );
  }

  const { name, currentOwner, status, checkpoints } = product;

  return (
    <div style={styles.wrapper}>

      {/* Header — product name + status badge */}
      <div style={styles.header}>
        <span style={styles.productName}>⬡ {name}</span>
        <span style={styles.statusBadge(status)}>
          {STATUS[status]?.icon} {STATUS[status]?.label}
        </span>
      </div>

      {/* Current owner */}
      <p style={styles.ownerRow}>
        Current Owner: {currentOwner}
      </p>

      {/* Timeline */}
      {checkpoints.length === 0 ? (
        <p style={styles.emptyState}>No checkpoints yet.</p>
      ) : (
        <div style={styles.timeline}>
          <div style={styles.line} />
          {checkpoints.map((cp, i) => {
            const isLast = i === checkpoints.length - 1;
            return (
              <div key={i} style={styles.checkpoint}>
                <div style={styles.dot(isLast)} />
                <p style={styles.location}>📍 {cp.location}</p>
                <p style={styles.meta}>{cp.date}</p>
                <p style={styles.meta}>
                  Handled by: {cp.handledBy.slice(0, 6)}...{cp.handledBy.slice(-4)}
                </p>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
