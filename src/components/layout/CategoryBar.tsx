import { Link } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";

type Cat = { label: string; slug: string; emoji?: string; items: string[] };

const slugify = (s: string) =>
  s.toLowerCase()
    .replace(/&/g, "and")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const CATS: Cat[] = [
  {
    label: "Trending", emoji: "🔥", slug: "trending",
    items: [
      "AI Agents", "Voice AI Agents & Callers", "GoHighLevel AI Setups",
      "Vibe Coding & MVP Builds", "AI Chatbot Development",
      "Generative Engine Optimization", "Voice Cloning & Custom Voices",
      "AI Marketing Strategy", "Machine Learning Development",
      "Data Analytics & Reporting",
    ],
  },
  {
    label: "Build with AI", slug: "build-with-ai",
    items: [
      "AI Websites & Software", "AI Mobile App Development", "AI Chatbot Development",
      "AI Agent Building", "AI Integrations & API Connections",
      "AI Fine-Tuning & Model Training", "Vibe Coding & MVP Builds",
      "Deployments & DevOps", "Bug Fixes & Improvements", "Blockchain & AI Development",
    ],
  },
  {
    label: "Sound & Speak with AI", slug: "sound-and-speak-with-ai",
    items: [
      "Voice AI Agents & Callers", "Voice Cloning & Custom Voices",
      "AI Phone Systems & Automation", "Conversational AI Builds",
      "Text to Speech Production", "Voice Synthesis & Design",
      "AI Podcast Production", "AI Audio Ads", "AI Sonic Branding",
      "GoHighLevel Voice AI Setups",
    ],
  },
  {
    label: "Create with AI", slug: "create-with-ai",
    items: [
      "AI Video Creation", "AI Music Videos", "AI UGC Content", "AI Videography",
      "AI Video Avatars", "AI Visual Effects", "AI Image Editing",
      "AI Avatar Design", "AI Illustration & Art",
      "ComfyUI & Stable Diffusion Workflows", "AI Logo & Brand Identity",
      "AI 3D Modeling & Design", "AI Fashion & Merchandise",
    ],
  },
  {
    label: "Grow with AI", slug: "grow-with-ai",
    items: [
      "AI Marketing Strategy", "Generative Engine Optimization (GEO)",
      "AI SEO Content", "AI Ad Bidding & Automation",
      "AI-Powered Campaign Management", "AI Social Media Management",
      "AI Influencer & UGC Strategy", "AI Email Marketing",
      "AI Lead Generation & Sales", "AI Paid Advertising",
    ],
  },
  {
    label: "Run with AI", slug: "run-with-ai",
    items: [
      "AI Workflow & Process Automation", "CRM & Pipeline Automation",
      "GoHighLevel AI Setups", "Zapier & Make Automation",
      "E-Commerce AI Automation", "Social Media Automation",
      "AI Virtual Assistants", "AI Customer Experience",
      "AI Project Management", "AI Supply Chain & Operations",
      "AI Legal & Compliance Tools",
    ],
  },
  {
    label: "Understand AI", slug: "understand-ai",
    items: [
      "Data Science & Machine Learning", "AI Model Fine-Tuning",
      "Data Analytics & Visualization", "Data Scraping & Labeling",
      "Data Tagging & Annotation", "Model Optimization",
      "AI Research & Reporting", "Business Intelligence & AI",
    ],
  },
  {
    label: "Write with AI", slug: "write-with-ai",
    items: [
      "AI Content Editing & Strategy", "Custom AI Writing Prompts",
      "AI Scriptwriting", "AI Social Media Copywriting",
      "AI Research & Summaries", "AI Translation & Localization",
      "AI SEO Articles & Blog Posts", "AI Sales & Ad Copy", "AI UX Writing",
    ],
  },
  {
    label: "Learn AI", slug: "learn-ai",
    items: [
      "AI Technology Consulting", "AI Strategy & Advisory",
      "AI Lessons & Training", "Generative AI Courses",
      "AI Prompt Engineering", "AI Tools Onboarding",
      "AI for Business Workshops",
    ],
  },
  {
    label: "Analyze with Data", slug: "analyze-with-data",
    items: [
      "Data Analytics & Reporting", "Business Intelligence Dashboards",
      "Data Visualization & Charting", "Web Analytics & Tracking",
      "Predictive Analytics Builds", "AI-Powered Data Analysis",
      "Market Research & Insights", "Financial Data Analysis",
    ],
  },
  {
    label: "Build with Data", slug: "build-with-data",
    items: [
      "Machine Learning Development", "Deep Learning & Neural Networks",
      "Computer Vision Solutions", "Natural Language Processing (NLP)",
      "AI Model Training & Fine-Tuning", "Data Pipeline & ETL Engineering",
      "Database Architecture & Design", "APIs & Data Integrations",
      "Real-Time Data Pipelines",
    ],
  },
  {
    label: "Grow with Data", slug: "grow-with-data",
    items: [
      "E-Commerce Data & Analytics", "SEO Data & Keyword Research",
      "Sales & Lead Data Enrichment", "Customer Behavior Analytics",
      "Social Media Data Analysis", "Ad Performance Analytics",
      "Revenue & Conversion Tracking",
    ],
  },
];

export function CategoryBar() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [showArrow, setShowArrow] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const check = () => setShowArrow(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
    check();
    el.addEventListener("scroll", check);
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  return (
    <div
      className="w-full relative"
      style={{ background: "#fff", borderBottom: "1px solid #e5e5e5" }}
    >
      <div
        ref={scrollerRef}
        className="flex items-stretch overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: "none" }}
      >
        {CATS.map((c, i) => (
          <div
            key={c.slug}
            className="relative shrink-0 group"
            onMouseEnter={() => setOpenIdx(i)}
            onMouseLeave={() => setOpenIdx(null)}
          >
            <Link
              to={`/category/${c.slug}`}
              className="flex items-center whitespace-nowrap relative"
              style={{
                fontSize: "13px",
                color: "#222",
                padding: "12px 16px",
                fontWeight: 400,
              }}
            >
              <span className="cat-label">
                {c.emoji && <span className="mr-1">{c.emoji}</span>}
                {c.label}
              </span>
            </Link>
            {openIdx === i && (
              <div
                className="absolute left-0 top-full z-50"
                style={{
                  background: "#fff",
                  border: "1px solid #e5e5e5",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                  padding: "24px",
                  minWidth: "640px",
                }}
              >
                <div
                  className="grid grid-cols-3 gap-x-8 gap-y-1"
                >
                  {c.items.map((item) => (
                    <Link
                      key={item}
                      to={`/search?q=${encodeURIComponent(item)}`}
                      className="dropdown-item"
                      style={{
                        fontSize: "13px",
                        color: "#333",
                        padding: "6px 0",
                        display: "block",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {showArrow && (
        <div
          className="absolute right-0 top-0 bottom-0 flex items-center pr-2 pl-6 pointer-events-none"
          style={{
            background: "linear-gradient(to left, #fff 40%, rgba(255,255,255,0))",
          }}
        >
          <ChevronRight className="h-4 w-4" style={{ color: "#222" }} />
        </div>
      )}
      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .group:hover .cat-label {
          font-weight: 700;
        }
        .group:hover > a::after {
          content: "";
          position: absolute;
          left: 16px;
          right: 16px;
          bottom: 0;
          height: 2px;
          background: #000;
        }
        .dropdown-item:hover {
          font-weight: 700;
          color: #000 !important;
        }
      `}</style>
    </div>
  );
}
