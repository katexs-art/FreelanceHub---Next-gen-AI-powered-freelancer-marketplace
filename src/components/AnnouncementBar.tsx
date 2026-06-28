export default function AnnouncementBar() {
  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 101,
      height: "40px",
      background: "#000",
      borderBottom: "0.5px solid rgba(255,255,255,0.08)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: "#22c55e",
        display: "inline-block",
        flexShrink: 0,
      }} />
      <span style={{
        fontFamily: "monospace",
        fontSize: "11px",
        letterSpacing: "0.1em",
        color: "rgba(255,255,255,0.55)",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}>
        Where consistency becomes growth
      </span>
    </div>
  );
}
