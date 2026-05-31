import { useState, forwardRef, InputHTMLAttributes } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

export const KxField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string }>(
  ({ label, id, ...props }, ref) => {
    const inputId = id || `kx-${label.toLowerCase().replace(/\s+/g, "-")}`;
    return (
      <div>
        <label
          htmlFor={inputId}
          style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#333", marginBottom: 6 }}
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          {...props}
          className={"kx-input " + (props.className || "")}
        />
      </div>
    );
  }
);
KxField.displayName = "KxField";

export function KxPassword({
  label = "Password",
  value,
  onChange,
  required,
  minLength,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#333", marginBottom: 6 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="kx-input"
          style={{ paddingRight: 44 }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          style={{
            position: "absolute",
            right: 12,
            top: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            background: "transparent",
            border: 0,
            color: "#bbb",
            cursor: "pointer",
            padding: 0,
          }}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

export function KxGoogleButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="kx-google-btn">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.83z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" />
      </svg>
      <span>Continue with Google</span>
    </button>
  );
}

export function KxDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
      <div style={{ flex: 1, height: 1, background: "#e5e5e5" }} />
      <span style={{ color: "#bbb", fontSize: 12, letterSpacing: "0.1em" }}>OR</span>
      <div style={{ flex: 1, height: 1, background: "#e5e5e5" }} />
    </div>
  );
}

export function KxSubmit({
  loading,
  children,
}: {
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button type="submit" disabled={loading} className="kx-submit-btn">
      <span>{children}</span>
      <span aria-hidden="true" style={{ marginLeft: 8 }}>→</span>
    </button>
  );
}

export function KxTrustLine() {
  return (
    <div
      style={{
        marginTop: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        fontSize: 12,
        color: "#bbb",
      }}
    >
      <Lock size={12} />
      <span>Your data is secure and encrypted</span>
    </div>
  );
}

/** Global styles for kx auth controls — injected once */
export function KxAuthStyles() {
  return (
    <style>{`
      .kx-input {
        width: 100%;
        background: #fff;
        border: 1px solid #e5e5e5;
        border-radius: 12px;
        height: 52px;
        padding: 0 16px;
        font-size: 15px;
        color: #000;
        outline: none;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .kx-input::placeholder { color: #bbb; }
      .kx-input:focus {
        border-color: #000;
        box-shadow: 0 0 0 3px rgba(0,0,0,0.06);
      }
      .kx-google-btn {
        width: 100%;
        height: 48px;
        border: 1px solid #e5e5e5;
        border-radius: 12px;
        background: #fff;
        color: #333;
        font-size: 14px;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        cursor: pointer;
        transition: background 0.2s ease;
      }
      .kx-google-btn:hover { background: #f8f8f8; }
      .kx-submit-btn {
        width: 100%;
        height: 52px;
        background: #000;
        color: #fff;
        border: 0;
        border-radius: 12px;
        font-size: 15px;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.2s ease;
      }
      .kx-submit-btn:hover { background: #111; }
      .kx-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      .kx-toggle {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4px;
        padding: 4px;
        border: 1px solid #e5e5e5;
        border-radius: 999px;
        background: #fff;
      }
      .kx-toggle button {
        height: 40px;
        border-radius: 999px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
      }
      .kx-toggle .on { background: #000; color: #fff; border: 0; }
      .kx-toggle .off { background: #fff; color: #333; border: 1px solid #e5e5e5; }
    `}</style>
  );
}
