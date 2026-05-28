import { useMarketplaceAuth } from "@/hooks/useMarketplaceAuth";
import { AuthShell, btnOutline } from "@/components/marketplace/AuthShell";

export default function DashboardClient() {
  const { profile, signOut } = useMarketplaceAuth();
  return (
    <AuthShell title={`Welcome, ${profile?.full_name || "client"}`} subtitle="Your projects will appear here.">
      <p style={{ color: "#888", fontSize: 14, marginBottom: 20 }}>
        Marketplace browsing, hire flow, project chat, and Stripe checkout ship in the next phase.
      </p>
      <button onClick={signOut} style={btnOutline}>Sign out</button>
    </AuthShell>
  );
}
