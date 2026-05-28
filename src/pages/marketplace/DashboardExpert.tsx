import { useMarketplaceAuth } from "@/hooks/useMarketplaceAuth";
import { AuthShell, btnOutline } from "@/components/marketplace/AuthShell";

export default function DashboardExpert() {
  const { profile, signOut } = useMarketplaceAuth();
  return (
    <AuthShell title={`Welcome, ${profile?.full_name || "expert"}`} subtitle="Your projects and service listings will appear here.">
      <p style={{ color: "#888", fontSize: 14, marginBottom: 20 }}>
        Service management, project chat, and earnings ship in the next phase.
      </p>
      <button onClick={signOut} style={btnOutline}>Sign out</button>
    </AuthShell>
  );
}
