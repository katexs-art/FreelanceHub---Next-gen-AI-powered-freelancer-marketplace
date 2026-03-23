import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm px-6">
        <h2 className="font-heading text-foreground text-center">Create your account</h2>
        <p className="text-small text-foreground-secondary text-center mt-2">Start your free trial today.</p>
        <div className="mt-8 space-y-4">
          <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button className="w-full">Sign Up</Button>
        </div>
        <p className="text-small text-foreground-secondary text-center mt-4">
          Already have an account? <Link to="/login" className="text-foreground hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
};
export default Signup;
