import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm px-6">
        <Link to="/" className="block text-center font-heading font-[800] text-foreground mb-8" style={{ fontSize: "20px" }}>
          katexs<span style={{ color: "hsl(var(--accent-green))" }}>.</span>
        </Link>
        <h2 className="font-heading text-foreground text-center">Welcome back</h2>
        <p className="text-small text-foreground-secondary text-center mt-2">Log in to your account.</p>
        <div className="mt-8 space-y-4">
          <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          <Button className="w-full" onClick={handleLogin} disabled={loading || !email || !password}>
            {loading ? "Logging in..." : "Log In"}
          </Button>
        </div>
        <p className="text-small text-foreground-secondary text-center mt-4">
          Don't have an account? <Link to="/signup" className="text-foreground hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
};
export default Login;
