// Stripe integration removed — payment integration coming soon
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function Checkout() {
  return (
    <>
      <SiteHeader />
      <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Checkout</h1>
          <p style={{ color: "#888", fontSize: 15 }}>Payment integration coming soon.</p>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
