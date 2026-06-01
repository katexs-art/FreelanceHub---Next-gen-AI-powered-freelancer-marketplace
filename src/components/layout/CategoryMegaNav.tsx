import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";

type Sub = { label: string; slug: string };
type Column = { heading: string; items: Sub[] };
type Category = { label: string; slug: string; columns: Column[] };

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const mk = (heading: string, items: string[]): Column => ({
  heading,
  items: items.map((label) => ({ label, slug: slugify(label) })),
});

const CATS_RAW: { label: string; columns: Column[] }[] = [
  {
    label: "AI Services",
    columns: [
      mk("Build with AI", [
        "AI Websites and Software", "AI Mobile Apps", "AI Chatbot Development",
        "AI Agent Building", "AI Integrations", "AI Fine-Tuning",
        "Vibe Coding and MVP Builds", "Deployments and DevOps",
      ]),
      mk("Sound and Speak with AI", [
        "Voice AI Agents and Callers", "Voice Cloning and Custom Voices", "AI Phone Systems",
        "Conversational AI Builds", "Text to Speech", "AI Podcast Production",
      ]),
      mk("Create and Grow with AI", [
        "AI Video Creation", "AI UGC Content", "AI Video Avatars",
        "AI Image Editing", "AI Avatar Design", "AI Marketing Strategy",
        "Generative Engine Optimization", "AI Lead Generation",
      ]),
      mk("Run and Learn AI", [
        "AI Workflow Automation", "CRM and Pipeline Automation", "AI Virtual Assistants",
        "AI Strategy and Consulting", "AI Prompt Engineering", "AI Tools Onboarding",
      ]),
    ],
  },
  {
    label: "Voice AI",
    columns: [
      mk("Voice Agents", [
        "Voice AI Agents and Callers", "AI Phone Systems", "Conversational AI Builds",
        "AI Appointment Booking", "Inbound Voice AI", "Outbound Voice AI",
      ]),
      mk("Voices & Audio", [
        "Voice Cloning and Custom Voices", "Text to Speech", "AI Podcast Production",
        "AI Audio Ads", "AI Sonic Branding", "Multilingual Voice AI",
      ]),
    ],
  },
  {
    label: "Automation",
    columns: [
      mk("Workflow Automation", [
        "AI Workflow Automation", "Zapier Automation", "Make Automation",
        "n8n Workflows", "CRM and Pipeline Automation", "Webhook Setup",
      ]),
      mk("Ops & Agents", [
        "AI Virtual Assistants", "AI Agent Building", "Lead Nurture Sequences",
        "Follow Up Campaigns", "Abandoned Lead Recovery", "API Integrations",
      ]),
    ],
  },
  {
    label: "Marketing",
    columns: [
      mk("Growth & Social", [
        "Social Media Management", "Instagram Marketing", "TikTok Marketing",
        "LinkedIn Marketing", "Email Marketing", "AI Lead Generation",
      ]),
      mk("Paid & SEO", [
        "Facebook Ads", "Google Ads Management", "SEO Strategy",
        "Generative Engine Optimization", "Conversion Tracking", "Ad Creatives",
      ]),
    ],
  },
  {
    label: "Development",
    columns: [
      mk("Web & Apps", [
        "Full Stack Development", "React Development", "Next.js Development",
        "Mobile App Development", "AI Mobile Apps", "AI Websites and Software",
      ]),
      mk("AI Builds", [
        "AI Chatbot Development", "AI Integrations", "AI Fine-Tuning",
        "Vibe Coding and MVP Builds", "Deployments and DevOps", "API Development",
      ]),
    ],
  },
  {
    label: "Design",
    columns: [
      mk("Brand & Visual", [
        "Logo Design", "Brand Identity", "UI and UX Design",
        "Web Design", "Presentation Design", "Social Media Design",
      ]),
      mk("AI Design", [
        "AI Logo and Brand Identity", "AI Illustration", "AI Avatar Design",
        "AI Image Editing", "ComfyUI Workflows", "Midjourney Art",
      ]),
    ],
  },
  {
    label: "Data",
    columns: [
      mk("Analyze with Data", [
        "Data Analytics and Reporting", "Business Intelligence Dashboards", "Data Visualization",
        "Web Analytics", "Predictive Analytics", "AI-Powered Data Analysis",
      ]),
      mk("Build with Data", [
        "Machine Learning Development", "Deep Learning", "Computer Vision",
        "Natural Language Processing", "AI Model Training", "Data Pipeline and ETL",
      ]),
      mk("Clean and Manage Data", [
        "Data Entry and Processing", "Data Cleaning", "Data Scraping",
        "Data Labeling for AI", "CRM Data Management", "Data Compliance",
      ]),
    ],
  },
  {
    label: "Business",
    columns: [
      mk("Strategy and Consulting", [
        "Business Strategy", "Business Plan Writing", "Market Research",
        "Competitor Analysis", "Financial Modeling", "Investor Pitch Decks",
      ]),
      mk("Admin and Support", [
        "Virtual Assistant", "Project Management", "Customer Support Setup",
        "CRM Setup", "HR and Recruiting", "Accounting and Bookkeeping",
      ]),
      mk("Sales and Growth", [
        "Sales Strategy", "Lead Generation", "Cold Email Setup",
        "LinkedIn Outreach", "Revenue Operations", "Growth Hacking",
      ]),
    ],
  },
];

const CATEGORIES: Category[] = CATS_RAW.map((c) => ({ ...c, slug: slugify(c.label) }));

export function CategoryMegaNav() {
  const navigate = useNavigate();
  const [open, setOpen] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("keydown", esc);
    };
  }, []);

  const go = (slug: string) => {
    setOpen(null);
    navigate(`/browse?category=${slug}`);
  };

  return (
    <>
      <style>{`
        .kx-catnav-wrap { position: sticky; top: 64px; z-index: 50; background: #fff; }
        .kx-catnav-bar { position: relative; background: #fff; height: 48px; border-bottom: 1px solid #f0f0f0;
          display: flex; align-items: center; padding: 0 40px; gap: 0; overflow-x: auto; }
        .kx-catnav-bar::-webkit-scrollbar { display: none; }
        .kx-catnav-bar { scrollbar-width: none; }
        .kx-catnav-item { background: transparent; border: 0; padding: 0 20px; height: 48px; display: flex; align-items: center;
          font-size: 13px; color: #333; cursor: pointer; white-space: nowrap; border-bottom: 2px solid transparent;
          transition: color .15s, border-color .15s, font-weight .15s; }
        .kx-catnav-item:hover { color: #000; border-bottom-color: #000; }
        .kx-catnav-item.is-open { color: #000; font-weight: 500; border-bottom-color: #000; }
        .kx-catnav-chevron { margin-left: 4px; color: #aaa; }
        .kx-catnav-panel { position: absolute; left: 0; right: 0; top: 48px; background: #fff;
          border-top: 1px solid #f0f0f0; box-shadow: 0 8px 32px rgba(0,0,0,0.08);
          padding: 32px 80px; z-index: 100; }
        .kx-catnav-heading { font-size: 13px; font-weight: 600; color: #000; margin-bottom: 14px; }
        .kx-catnav-sub { display: block; width: 100%; text-align: left; background: transparent; border: 0; padding: 0;
          font-size: 13px; color: #444; line-height: 2; cursor: pointer; transition: color .12s, font-weight .12s; }
        .kx-catnav-sub:hover { color: #000; font-weight: 500; }
      `}</style>
      <div className="kx-catnav-wrap" onMouseLeave={() => setOpen(null)}>
        <div className="kx-catnav-bar">
          {CATEGORIES.map((c) => (
            <button
              key={c.slug}
              type="button"
              className={`kx-catnav-item ${open === c.slug ? "is-open" : ""}`}
              onMouseEnter={() => !isMobile && setOpen(c.slug)}
              onFocus={() => !isMobile && setOpen(c.slug)}
              onClick={() => {
                if (isMobile) {
                  go(c.slug);
                } else {
                  setOpen(open === c.slug ? null : c.slug);
                }
              }}
            >
              {c.label}
              <ChevronDown className="kx-catnav-chevron" size={10} strokeWidth={2} />
            </button>
          ))}
        </div>
        {!isMobile && open &&
          (() => {
            const cat = CATEGORIES.find((c) => c.slug === open);
            if (!cat) return null;
            const n = cat.columns.length;
            return (
              <div
                className="kx-catnav-panel"
                style={{ display: "grid", gridTemplateColumns: `repeat(${n}, 1fr)`, gap: 32 }}
                onMouseEnter={() => setOpen(cat.slug)}
              >
                {cat.columns.map((col) => (
                  <div key={col.heading}>
                    <div className="kx-catnav-heading">{col.heading}</div>
                    {col.items.map((it) => (
                      <button
                        key={it.slug}
                        type="button"
                        className="kx-catnav-sub"
                        onClick={() => go(it.slug)}
                      >
                        {it.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            );
          })()}
      </div>
    </>
  );
}

export default CategoryMegaNav;
