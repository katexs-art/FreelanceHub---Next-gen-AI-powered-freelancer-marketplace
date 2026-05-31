import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/AuthLayout";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
  };

  return (
    <AuthLayout title="Reset password" subtitle="We'll email you a link to reset your password">
      <style>{`
        .fp-card {
          background: #FFFFFF;
          border-radius: 20px;
          padding: 48px;
          max-width: 440px;
          width: 100%;
          box-shadow: 0 8px 40px rgba(0,0,0,0.12);
          box-sizing: border-box;
        }
        .fp-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #333333;
          margin-bottom: 8px;
        }
        .fp-input {
          width: 100%;
          background: #F7F7F7;
          border: 1.5px solid #CCCCCC;
          border-radius: 12px;
          height: 52px;
          padding: 0 16px;
          font-size: 15px;
          color: #0A0A0A;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .fp-input::placeholder { color: #AAAAAA; }
        .fp-input:focus {
          border-color: #0A0A0A;
          background: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(0,0,0,0.06);
        }
        .fp-submit {
          background: #0A0A0A;
          color: #FFFFFF;
          border: none;
          border-radius: 12px;
          height: 52px;
          width: 100%;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .fp-submit:hover { background: #333333; }
        .fp-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .fp-back {
          font-size: 14px;
          color: #888888;
          cursor: pointer;
          text-decoration: none;
          transition: color 0.2s;
        }
        .fp-back:hover { color: #0A0A0A; text-decoration: underline; }
      `}</style>

      <div className="fp-card">
        {sent ? (
          <p style={{ fontSize: 14, color: "#555", textAlign: "center", margin: 0 }}>
            If an account exists for <strong style={{ color: "#0A0A0A" }}>{email}</strong>, a reset link is on its way.
          </p>
        ) : (
          <form onSubmit={submit}>
            <label className="fp-label" htmlFor="fp-email">Email</label>
            <input
              id="fp-email"
              className="fp-input"
              type="email"
              required
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div style={{ height: 20 }} />
            <button type="submit" disabled={loading} className="fp-submit">
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <Link to="/login" className="fp-back">Back to sign in</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
