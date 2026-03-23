import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";

const benefits = [
  "14-day free trial",
  "No setup fees",
  "Cancel anytime",
  "Live in 24 hours",
];

const Signup = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-border" style={{ background: "#08080a" }}>
        <Link to="/" className="text-foreground font-heading font-bold text-[15px] tracking-[-0.03em]">
          Katex<span className="relative">s<span className="absolute -top-0.5 -right-1.5 w-[5px] h-[5px] rounded-full bg-accent-green" /></span>
        </Link>

        <div>
          <h2 className="text-h2 font-bold text-foreground tracking-[-0.03em] mb-3">
            Run your entire business<br />on one platform.
          </h2>
          <p className="text-body text-foreground-secondary max-w-sm mb-8">
            Voice AI, CRM, automations, and a unified inbox — powered by River AI.
          </p>
          <ul className="space-y-3">
            {benefits.map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-small text-foreground-secondary">
                <span className="w-5 h-5 rounded-full bg-accent-green/15 flex items-center justify-center">
                  <Check className="w-3 h-3 text-accent-green" />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-small text-foreground-muted">© 2026 Katexs</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <Link to="/" className="text-foreground font-heading font-bold text-[15px] tracking-[-0.03em]">
              Katex<span className="relative">s<span className="absolute -top-0.5 -right-1.5 w-[5px] h-[5px] rounded-full bg-accent-green" /></span>
            </Link>
          </div>

          <h2 className="text-h2 font-bold text-foreground tracking-[-0.03em]">Create your account</h2>
          <p className="text-small text-foreground-secondary mt-2 mb-8">Start your 14-day free trial. No credit card required.</p>

          <div className="space-y-3">
            <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <Input placeholder="Business name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button className="w-full mt-2">Start free trial →</Button>
          </div>

          <p className="text-small text-foreground-secondary text-center mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-foreground hover:underline">Log in</Link>
          </p>

          <p className="text-[10px] text-foreground-muted text-center mt-4">
            By signing up you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
