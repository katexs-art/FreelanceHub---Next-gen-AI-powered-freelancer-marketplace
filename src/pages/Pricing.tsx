import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const partnerFeatures = [
  "Free to join — no credit card required",
  "Free to post a Brief",
  "Free to use River AI matching",
  "Free to message any Expert directly",
  "Only pay when you place a Project",
  "5 percent service fee added at checkout",
  "Funds held in secure escrow",
  "3-day review window on every delivery",
  "Full dispute protection",
  "Free to raise a dispute",
];

const expertFeatures = [
  "Free to apply",
  "Free to create your Expert profile",
  "Free to list up to 10 Services",
  "Free to submit Proposals on Briefs",
  "River AI matches you to Partners automatically",
  "10 percent platform fee deducted from earnings",
  "Keep 90 percent of every Project",
  "Paid out within 3 days of Project completion",
  "Instant payout to bank or debit card",
  "No waiting. No holds. No 14-day delays.",
];

const comparison: Array<{ feature: string; partner: string; expert: string }> = [
  { feature: "Join for free", partner: "✓", expert: "✓" },
  { feature: "Post a Brief", partner: "✓", expert: "—" },
  { feature: "Submit Proposals", partner: "—", expert: "✓" },
  { feature: "River AI matching", partner: "✓", expert: "✓" },
  { feature: "Message before buying", partner: "✓", expert: "✓" },
  { feature: "Escrow protection", partner: "✓", expert: "✓" },
  { feature: "3-day review window", partner: "✓", expert: "✓" },
  { feature: "Dispute resolution", partner: "✓", expert: "✓" },
  { feature: "Service fee", partner: "5% added at checkout", expert: "10% deducted from earnings" },
  { feature: "Payout speed", partner: "Instant refund if disputed", expert: "Within 3 days of completion" },
  { feature: "Monthly subscription", partner: "None", expert: "None" },
  { feature: "Hidden fees", partner: "None", expert: "None" },
];

const faqs = [
  {
    q: "When do I get charged as a Partner?",
    a: "You are only charged when you accept a Proposal and place a Project. Browsing, messaging Experts, and posting Briefs are completely free. The 5 percent service fee is added at checkout on top of the agreed Project price.",
  },
  {
    q: "When does the Expert get paid?",
    a: "After you approve the delivery or 3 days pass with no dispute, funds are automatically released to the Expert. They receive their payout to their connected bank account or debit card within the same day funds are released.",
  },
  {
    q: "What happens if I'm not satisfied?",
    a: "You have a full 3-day review window after every delivery. If something is wrong click Raise a Dispute and our team steps in within 24 hours. Your funds stay held in escrow until the dispute is resolved.",
  },
  {
    q: "Are there any monthly fees or subscriptions?",
    a: "No. Katexs is completely free to join for both Partners and Experts. You only pay when a Project is completed. No monthly fees. No subscriptions. No hidden charges.",
  },
  {
    q: "How does escrow work?",
    a: "When you pay for a Project your money goes into a secure escrow account. The Expert cannot access it until you approve the delivery or the 3-day window passes with no dispute. This protects both parties on every transaction.",
  },
  {
    q: "Can I negotiate the price with an Expert?",
    a: "Yes. You can message any Expert directly for free before placing a Project. Discuss scope, negotiate price, and agree on deliverables before any money changes hands.",
  },
];

function Check() {
  return (
    <span
      style={{
        color: "#22c55e",
        fontSize: 14,
        fontWeight: 700,
        marginRight: 12,
        flexShrink: 0,
        lineHeight: "28px",
      }}
      aria-hidden
    >
      ✓
    </span>
  );
}

function Card({
  side,
  topBorder,
  label,
  heading,
  subtext,
  fee,
  feeColor,
  feeLabel,
  features,
  example,
  buttonBg,
  buttonText,
  buttonLabel,
  buttonTo,
}: {
  side: "left" | "right";
  topBorder: string;
  label: string;
  heading: string;
  subtext: string;
  fee: string;
  feeColor: string;
  feeLabel: string;
  features: string[];
  example: { line1: string; line2: string; total: string };
  buttonBg: string;
  buttonText: string;
  buttonLabel: string;
  buttonTo: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: "#fff",
        border: "1px solid #e5e5e5",
        borderTop: `4px solid ${topBorder}`,
        borderRadius: 20,
        padding: 40,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "#888",
          marginBottom: 12,
        }}
      >
        {label}
      </div>
      <h2 style={{ fontSize: 28, fontWeight: 500, color: "#000", margin: 0, marginBottom: 8 }}>
        {heading}
      </h2>
      <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, margin: 0, marginBottom: 32 }}>
        {subtext}
      </p>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 72, fontWeight: 500, color: feeColor, lineHeight: 1 }}>{fee}</div>
        <div style={{ fontSize: 14, color: "#888", marginTop: 8, marginBottom: 32 }}>{feeLabel}</div>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {features.map((f) => (
          <li
            key={f}
            style={{
              display: "flex",
              alignItems: "flex-start",
              fontSize: 14,
              color: "#333",
              lineHeight: 2,
            }}
          >
            <Check />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div
        style={{
          background: "#f8f8f8",
          borderRadius: 12,
          padding: 20,
          marginTop: 24,
        }}
      >
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#888",
            marginBottom: 12,
          }}
        >
          Example
        </div>
        <div style={{ fontSize: 13, color: "#555", marginBottom: 6 }}>{example.line1}</div>
        <div style={{ fontSize: 13, color: "#555" }}>{example.line2}</div>
        <div style={{ height: 1, background: "#e5e5e5", margin: "12px 0" }} />
        <div style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>{example.total}</div>
      </div>

      <Link
        to={buttonTo}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: buttonBg,
          color: buttonText,
          borderRadius: 12,
          height: 52,
          fontSize: 15,
          fontWeight: 500,
          marginTop: 32,
          textDecoration: "none",
        }}
      >
        {buttonLabel}
      </Link>
      <span style={{ display: "none" }}>{side}</span>
    </div>
  );
}

export default function Pricing() {
  return (
    <div style={{ background: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <SEO
        title="Pricing · KATEXS"
        description="Transparent pricing. Partners pay 5% at checkout. Experts keep 90%. No subscriptions. No hidden fees."
      />
      <SiteHeader />

      <main style={{ flex: 1 }}>
        <section style={{ background: "#fff", padding: "80px 24px", textAlign: "center" }}>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#888",
              marginBottom: 16,
            }}
          >
            Transparent pricing
          </div>
          <h1
            style={{
              fontSize: 52,
              fontWeight: 500,
              color: "#000",
              lineHeight: 1.1,
              margin: 0,
              marginBottom: 16,
            }}
          >
            Simple. Fair. No surprises.
          </h1>
          <p
            style={{
              fontSize: 18,
              color: "#666",
              maxWidth: 520,
              margin: "0 auto 48px",
              lineHeight: 1.5,
            }}
          >
            Only pay when work gets done. No subscriptions. No hidden fees. No monthly charges.
          </p>
        </section>

        <section style={{ padding: "0 40px", marginBottom: 80 }}>
          <div
            style={{
              maxWidth: 900,
              margin: "0 auto",
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: "1 1 380px", display: "flex" }}>
              <Card
                side="left"
                topBorder="#000"
                label="For Partners"
                heading="Hire AI Experts"
                subtext="Post your Brief, find your Expert, pay only when you are satisfied."
                fee="5%"
                feeColor="#000"
                feeLabel="service fee per completed Project"
                features={partnerFeatures}
                example={{
                  line1: "Project price $100",
                  line2: "Partner service fee 5%",
                  total: "Total you pay $105",
                }}
                buttonBg="#000"
                buttonText="#fff"
                buttonLabel="Get Started Free"
                buttonTo="/sign-up"
              />
            </div>
            <div style={{ flex: "1 1 380px", display: "flex" }}>
              <Card
                side="right"
                topBorder="#22c55e"
                label="For Experts"
                heading="Earn on Katexs"
                subtext="List your Services, win Projects, get paid fast. Keep 90 percent of everything you earn."
                fee="10%"
                feeColor="#22c55e"
                feeLabel="platform fee per completed Project"
                features={expertFeatures}
                example={{
                  line1: "Project price $100",
                  line2: "Katexs platform fee 10%",
                  total: "You receive $90",
                }}
                buttonBg="#22c55e"
                buttonText="#fff"
                buttonLabel="Apply as an Expert"
                buttonTo="/sign-up"
              />
            </div>
          </div>
        </section>

        <section style={{ background: "#fff", padding: "80px 24px" }}>
          <h2
            style={{
              fontSize: 36,
              fontWeight: 500,
              color: "#000",
              textAlign: "center",
              margin: 0,
              marginBottom: 48,
            }}
          >
            Everything included. No hidden charges.
          </h2>
          <div
            style={{
              maxWidth: 960,
              margin: "0 auto",
              border: "1px solid #f0f0f0",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#000", color: "#fff" }}>
                  <th
                    style={{
                      padding: "20px 24px",
                      fontSize: 13,
                      fontWeight: 500,
                      textAlign: "left",
                    }}
                  >
                    Feature
                  </th>
                  <th
                    style={{
                      padding: "20px 24px",
                      fontSize: 13,
                      fontWeight: 500,
                      textAlign: "center",
                    }}
                  >
                    Partners
                  </th>
                  <th
                    style={{
                      padding: "20px 24px",
                      fontSize: 13,
                      fontWeight: 500,
                      textAlign: "center",
                    }}
                  >
                    Experts
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, i) => (
                  <tr
                    key={row.feature}
                    style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}
                  >
                    <td style={{ padding: "16px 24px", fontSize: 14, color: "#333" }}>
                      {row.feature}
                    </td>
                    <td
                      style={{
                        padding: "16px 24px",
                        fontSize: row.partner === "✓" ? 16 : 14,
                        color:
                          row.partner === "✓"
                            ? "#22c55e"
                            : row.partner === "—"
                              ? "#ccc"
                              : "#333",
                        textAlign: "center",
                      }}
                    >
                      {row.partner}
                    </td>
                    <td
                      style={{
                        padding: "16px 24px",
                        fontSize: row.expert === "✓" ? 16 : 14,
                        color:
                          row.expert === "✓"
                            ? "#22c55e"
                            : row.expert === "—"
                              ? "#ccc"
                              : "#333",
                        textAlign: "center",
                      }}
                    >
                      {row.expert}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section
          style={{
            background: "#fff",
            padding: "80px 24px",
            borderTop: "1px solid #f5f5f5",
          }}
        >
          <h2
            style={{
              fontSize: 36,
              fontWeight: 500,
              color: "#000",
              textAlign: "center",
              margin: 0,
              marginBottom: 48,
            }}
          >
            Common questions
          </h2>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <Accordion type="single" collapsible>
              {faqs.map((item, i) => (
                <AccordionItem
                  key={item.q}
                  value={`item-${i}`}
                  style={{ borderBottom: "1px solid #f0f0f0" }}
                >
                  <AccordionTrigger
                    style={{
                      fontSize: 16,
                      fontWeight: 500,
                      color: "#000",
                      padding: "20px 0",
                    }}
                  >
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent
                    style={{
                      fontSize: 14,
                      color: "#666",
                      lineHeight: 1.7,
                      paddingBottom: 20,
                    }}
                  >
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section style={{ background: "#000", padding: "100px 24px", textAlign: "center" }}>
          <h2
            style={{
              fontSize: 48,
              fontWeight: 500,
              color: "#fff",
              margin: 0,
              marginBottom: 16,
            }}
          >
            Start for free today.
          </h2>
          <p style={{ fontSize: 18, color: "#666", margin: 0, marginBottom: 40 }}>
            No subscription. No credit card. Just results.
          </p>
          <div
            style={{
              display: "flex",
              gap: 16,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              to="/services"
              style={{
                border: "1px solid #fff",
                color: "#fff",
                borderRadius: 999,
                padding: "14px 32px",
                fontSize: 15,
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Hire an Expert
            </Link>
            <Link
              to="/sign-up"
              style={{
                background: "#22c55e",
                color: "#fff",
                borderRadius: 999,
                padding: "14px 32px",
                fontSize: 15,
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Become an Expert
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
