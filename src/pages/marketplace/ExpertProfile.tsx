import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { MarketplaceNav } from "@/components/marketplace/MarketplaceNav";
import { useExpert } from "@/hooks/useExperts";
import { useMarketplaceAuth } from "@/hooks/useMarketplaceAuth";
import { supabase } from "@/integrations/supabase/client";
import { C, FONT, MONO, initialsOf } from "@/lib/marketplace/theme";

export default function ExpertProfile() {
  const { id } = useParams<{ id: string }>();
  const { data: e, services, reviews, loading } = useExpert(id);
  const { user } = useMarketplaceAuth();
  const navigate = useNavigate();
  const [busyServiceId, setBusyServiceId] = useState<string | null>(null);

  async function hire(serviceId: string) {
    if (!user) { navigate("/login"); return; }
    setBusyServiceId(serviceId);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        body: { service_id: serviceId },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      alert(err.message || "Checkout failed. Please try again.");
    } finally {
      setBusyServiceId(null);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.black, color: C.white, fontFamily: FONT }}>
        <MarketplaceNav />
        <div style={{ padding: "5rem", textAlign: "center", color: C.gray }}>Loading expert…</div>
      </div>
    );
  }
  if (!e) {
    return (
      <div style={{ minHeight: "100vh", background: C.black, color: C.white, fontFamily: FONT }}>
        <MarketplaceNav />
        <div style={{ padding: "5rem", textAlign: "center", color: C.gray }}>
          Expert not found. <Link to="/browse" style={{ color: C.neon }}>Browse experts →</Link>
        </div>
      </div>
    );
  }

  const name = e.profiles?.full_name || "Anonymous";

  return (
    <div style={{ minHeight: "100vh", background: C.black, color: C.white, fontFamily: FONT }}>
      <MarketplaceNav />

      <section style={{ padding: "3rem 2.5rem 2rem", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{
            width: 96, height: 96, borderRadius: "50%",
            background: "#111100", border: `1px solid #2a2a00`,
            color: C.neon, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "2rem", fontWeight: 700, overflow: "hidden",
          }}>
            {e.profiles?.avatar_url
              ? <img src={e.profiles.avatar_url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : initialsOf(name)}
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <h1 style={{ fontSize: "2rem", margin: 0, fontWeight: 600 }}>{name}</h1>
              {e.tier === "verified" && <i className="ti ti-circle-check-filled" style={{ color: C.neon, fontSize: "1.4rem" }} />}
            </div>
            <div style={{ color: C.gray, marginBottom: "1rem" }}>{e.specialty || "Expert"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", color: C.gray, fontSize: "0.8rem", fontFamily: MONO }}>
              <span><i className="ti ti-star-filled" style={{ color: C.neon }} /> {Number(e.rating ?? 0).toFixed(1)} ({reviews.length} reviews)</span>
              <span><i className="ti ti-check" /> {e.total_jobs ?? 0} jobs</span>
              <span><i className="ti ti-clock" /> {e.response_time || "—"}</span>
              <span><i className="ti ti-repeat" /> {e.repeat_rate ?? 0}% repeat</span>
            </div>
          </div>
          <div style={{ minWidth: 200, textAlign: "right" }}>
            <div style={{ color: C.gray, fontSize: "0.7rem", fontFamily: MONO }}>STARTING AT</div>
            <div style={{ fontSize: "2rem", fontWeight: 600, color: C.white }}>${e.starting_price ?? 0}</div>
            <Link to={`/login`} style={{
              display: "inline-block", marginTop: 8,
              background: C.neon, color: C.black, borderRadius: 999,
              padding: "0.6rem 1.4rem", textDecoration: "none", fontWeight: 600,
            }}>Contact expert</Link>
          </div>
        </div>
      </section>

      <section style={{ padding: "2.5rem 2.5rem", display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)", gap: "2.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>About</h2>
          <p style={{ color: C.gray, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {e.bio || "This expert hasn't added a bio yet."}
          </p>

          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: "2.5rem", marginBottom: "1rem" }}>Services</h2>
          {services.length === 0 ? (
            <div style={{ color: C.gray, fontSize: "0.85rem" }}>No services listed yet.</div>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {services.map((s) => (
                <div key={s.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "1.2rem", background: C.card }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.title}</div>
                      <div style={{ color: C.gray, fontSize: "0.85rem", marginBottom: 8 }}>{s.description}</div>
                      <div style={{ color: C.gray, fontSize: "0.7rem", fontFamily: MONO }}>
                        DELIVERY {s.delivery_days}D · {s.revisions} REVISIONS
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: 8 }}>${s.price}</div>
                      <button
                        onClick={() => hire(s.id)}
                        disabled={busyServiceId === s.id || user?.id === e.id}
                        title={user?.id === e.id ? "You can't buy your own service" : ""}
                        style={{
                          background: C.neon, color: C.black, border: "none",
                          borderRadius: 999, padding: "0.5rem 1.1rem", fontWeight: 600,
                          cursor: busyServiceId === s.id ? "wait" : "pointer",
                          opacity: user?.id === e.id ? 0.4 : 1,
                        }}
                      >{busyServiceId === s.id ? "Redirecting…" : "Hire now"}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: "2.5rem", marginBottom: "1rem" }}>Reviews</h2>
          {reviews.length === 0 ? (
            <div style={{ color: C.gray, fontSize: "0.85rem" }}>No reviews yet.</div>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {reviews.map((r) => (
                <div key={r.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "1.2rem", background: C.card }}>
                  <div style={{ color: C.neon, fontSize: "0.85rem", marginBottom: 6 }}>
                    {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                  </div>
                  <div style={{ color: C.gray, fontSize: "0.9rem", lineHeight: 1.6 }}>{r.review_text}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "1.2rem", background: C.card }}>
            <div style={{ color: C.gray, fontSize: "0.7rem", fontFamily: MONO, marginBottom: 12 }}>DETAILS</div>
            {[
              ["Experience", e.years_experience || "—"],
              ["Languages", (e.languages || []).join(", ") || "—"],
              ["Delivery", e.delivery_time || "—"],
              ["Tier", e.tier],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: `1px solid ${C.border}`, fontSize: "0.85rem" }}>
                <span style={{ color: C.gray }}>{k}</span>
                <span style={{ color: C.white }}>{v}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
