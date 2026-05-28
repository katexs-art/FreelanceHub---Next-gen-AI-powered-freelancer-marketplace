import { Link } from "react-router-dom";
import { C, FONT } from "@/lib/marketplace/theme";
import logo from "@/assets/katexs-logo-white.jpg";

export function MarketplaceNav() {
  return (
    <header style={{
      borderBottom: `1px solid ${C.border}`,
      background: C.black,
      padding: "1rem 2rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 50,
    }}>
      <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
        <img src={logo} alt="katexs" style={{ height: 22 }} />
      </Link>
      <nav style={{ display: "flex", gap: "1.5rem", alignItems: "center", fontFamily: FONT, fontSize: "0.82rem" }}>
        <Link to="/browse" style={{ color: C.gray, textDecoration: "none" }}>Browse</Link>
        <Link to="/signup/expert" style={{ color: C.gray, textDecoration: "none" }}>Become an expert</Link>
        <Link to="/login" style={{ color: C.white, textDecoration: "none" }}>Sign in</Link>
        <Link to="/signup" style={{
          background: C.neon, color: C.black, borderRadius: 999, padding: "0.5rem 1.2rem",
          textDecoration: "none", fontWeight: 600,
        }}>Get started</Link>
      </nav>
    </header>
  );
}
