import { Link } from "react-router-dom";
import { AuthShell, btnOutline } from "@/components/marketplace/AuthShell";
import { useMarketplaceAuth } from "@/hooks/useMarketplaceAuth";

export default function ExpertPending() {
  const { signOut } = useMarketplaceAuth();
  return (
    <AuthShell title="Application under review" subtitle="Thanks for applying to Katexs.">
      <p style={{ color: "#bbb", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
        Our team is reviewing your expert profile. You'll receive an email as soon as you're approved — usually within 24 hours.
        Once active, your profile appears in the marketplace and River AI can match you to clients.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Link to="/" style={{ ...btnOutline, textAlign: "center", textDecoration: "none", display: "block" }}>Back to homepage</Link>
        <button onClick={signOut} style={{ ...btnOutline, opacity: 0.7 }}>Sign out</button>
      </div>
    </AuthShell>
  );
}
