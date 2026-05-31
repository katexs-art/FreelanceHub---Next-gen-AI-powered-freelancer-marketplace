import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

const SKILL_CATALOG = [
  "Voice AI", "GoHighLevel", "ChatGPT", "Claude API", "Zapier", "Make",
  "Python", "React", "Next.js", "Node.js", "Webflow", "Shopify", "WordPress",
  "Midjourney", "Stable Diffusion", "VAPI", "Bland AI", "ElevenLabs", "n8n",
  "Automation", "Chatbot Development", "AI Agents", "Machine Learning",
  "Data Analytics", "SEO", "Digital Marketing", "Facebook Ads", "Google Ads",
  "Video Editing", "Copywriting", "Content Writing", "UI Design", "UX Design",
  "Figma", "Framer", "GoHighLevel Funnels", "GoHighLevel Automation",
  "GoHighLevel Voice AI", "CRM Setup", "Email Marketing", "Sales Funnels",
  "Landing Pages", "AI Video", "Voice Cloning", "Text to Speech",
  "Prompt Engineering", "LLM Development", "API Integration", "Database Design",
  "Supabase", "Firebase", "AWS", "DevOps",
];

interface Props {
  value: string[];
  onChange: (v: string[]) => void;
  max?: number;
}

export function SkillsTagInput({ value, onChange, max = 6 }: Props) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uid = useId().replace(/:/g, "");
  const cls = `kx-skills-${uid}`;

  const atMax = value.length >= max;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const lowerSelected = value.map((v) => v.toLowerCase());
  const q = query.trim();
  const suggestions = q
    ? SKILL_CATALOG.filter(
        (s) => s.toLowerCase().includes(q.toLowerCase()) && !lowerSelected.includes(s.toLowerCase()),
      ).slice(0, 6)
    : [];
  const exactCatalogMatch = q
    ? SKILL_CATALOG.some((s) => s.toLowerCase() === q.toLowerCase())
    : false;
  const alreadySelected = q ? lowerSelected.includes(q.toLowerCase()) : false;
  const showCustomRow = q.length > 0 && suggestions.length === 0 && !exactCatalogMatch && !alreadySelected;

  const addTag = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    if (value.length >= max) return;
    if (lowerSelected.includes(t.toLowerCase())) {
      setQuery("");
      return;
    }
    const canonical = SKILL_CATALOG.find((s) => s.toLowerCase() === t.toLowerCase()) ?? t;
    onChange([...value, canonical]);
    setQuery("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((v) => v !== tag));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0) addTag(suggestions[0]);
      else if (query.trim()) addTag(query);
    } else if (e.key === "Escape") {
      setQuery("");
    } else if (e.key === "Backspace" && !query && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const dropdownOpen = focused && q.length > 0 && (suggestions.length > 0 || showCustomRow);

  return (
    <div>
      <style>{`
        .${cls}-container { background:#fff; border:1.5px solid #CCCCCC; border-radius:12px; padding:10px 14px; min-height:52px; display:flex; flex-wrap:wrap; gap:8px; align-items:center; transition:border-color .15s ease; }
        .${cls}-container.is-focused { border-color:#0A0A0A; }
        .${cls}-input { flex:1; min-width:120px; border:none; outline:none; background:transparent; font-size:14px; color:#0A0A0A; padding:4px 2px; }
        .${cls}-input::placeholder { color:#AAAAAA; }
        .${cls}-x { color:#888; background:transparent; border:none; padding:0; cursor:pointer; font-size:14px; line-height:1; display:inline-flex; align-items:center; }
        .${cls}-x:hover { color:#FFFFFF; }
        .${cls}-row { padding:10px 16px; cursor:pointer; font-size:14px; color:#0A0A0A; }
        .${cls}-row:hover { background:#F7F7F7; }
        .${cls}-custom { padding:10px 16px; cursor:pointer; font-size:13px; color:#666; }
        .${cls}-custom:hover { background:#F7F7F7; }
      `}</style>

      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#333333", marginBottom: 8 }}>
        Required Skills
      </label>
      <p style={{ fontSize: 12, color: "#AAAAAA", marginBottom: 10 }}>
        Add up to 6 skills. Type to search or enter your own.
      </p>

      <div ref={wrapRef} style={{ position: "relative" }}>
        <div
          className={`${cls}-container${focused ? " is-focused" : ""}`}
          onClick={() => {
            if (!atMax) inputRef.current?.focus();
          }}
        >
          {value.map((tag) => (
            <span
              key={tag}
              style={{
                background: "#0A0A0A",
                color: "#FFFFFF",
                fontSize: 12,
                fontWeight: 500,
                padding: "4px 12px",
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                className={`${cls}-x`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
              >
                ×
              </button>
            </span>
          ))}

          {!atMax && (
            <input
              ref={inputRef}
              className={`${cls}-input`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onKeyDown={onKeyDown}
              placeholder={value.length === 0 ? "Type a skill..." : ""}
            />
          )}
        </div>

        {atMax && (
          <p style={{ fontSize: 12, color: "#AAAAAA", marginTop: 8 }}>
            Maximum 6 skills reached
          </p>
        )}

        {dropdownOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: 6,
              background: "#FFFFFF",
              border: "1px solid #EBEBEB",
              borderRadius: 12,
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              maxHeight: 220,
              overflowY: "auto",
              zIndex: 50,
            }}
          >
            {suggestions.map((s) => (
              <div
                key={s}
                className={`${cls}-row`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(s);
                }}
              >
                {s}
              </div>
            ))}
            {showCustomRow && (
              <div
                className={`${cls}-custom`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(query);
                }}
              >
                Add "{query.trim()}" as a custom skill
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
