import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm px-6">
        <h2 className="font-heading text-foreground text-center">Welcome back</h2>
        <p className="text-small text-foreground-secondary text-center mt-2">Log in to your account.</p>
        <div className="mt-8 space-y-4">
          <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button className="w-full">Log In</Button>
        </div>
        <p className="text-small text-foreground-secondary text-center mt-4">
          Don't have an account? <Link to="/signup" className="text-foreground hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
};
export default Login;
