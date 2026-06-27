// Stripe integration removed — payment integration coming soon

interface Props {
  method: "stripe_bank" | "paypal" | null;
  paypalEmail: string | null;
  bankCountry: string | null;
  bankLast4: string | null;
  onSaved: () => void;
}

export function PayoutMethodCard(_props: Props) {
  return (
    <section className="bg-background border border-border rounded-xl p-6">
      <h2 className="font-semibold mb-2">Payout method</h2>
      <div style={{ textAlign: "center", padding: "24px 0", color: "#888", fontSize: 14 }}>
        Payment integration coming soon
      </div>
    </section>
  );
}
