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
        "AI Audio Ads", "AI Sonic Branding",
      ]),
      mk("Create and Grow with AI", [
        "AI Video Creation", "AI UGC Content", "AI Video Avatars",
        "AI Image Editing", "AI Avatar Design", "AI Marketing Strategy",
        "Generative Engine Optimization", "AI Lead Generation",
      ]),
      mk("Run and Learn AI", [
        "AI Workflow Automation", "CRM and Pipeline Automation", "AI Virtual Assistants",
        "AI Strategy and Consulting", "AI Lessons and Training", "AI Prompt Engineering",
        "AI Tools Onboarding", "AI for Business Workshops",
      ]),
    ],
  },
  {
    label: "GoHighLevel",
    columns: [
      mk("Build with GHL", [
        "Full GHL Account Setup", "GHL Sub-Account Setup", "GHL White Label Setup",
        "GHL SaaS Mode", "GHL Snapshot Creation", "GHL CRM Build",
        "GHL Pipeline Setup", "GHL Migration",
      ]),
      mk("Automate with GHL", [
        "Workflow Automation Setup", "Lead Nurture Sequences", "Follow Up Campaigns",
        "SMS Automation", "Email Automation", "Re-engagement Campaigns",
        "Abandoned Lead Recovery", "GHL AI Workflow Setup",
      ]),
      mk("Sell and Grow with GHL", [
        "Sales Funnel Build", "Landing Page Design", "Website Build in GHL",
        "Membership Site Setup", "Course and Community Setup", "Checkout Page Setup",
        "Email Marketing Campaigns", "Review Request Campaigns",
      ]),
      mk("Speak and Connect", [
        "GHL Voice AI Configuration", "GHL AI Employee Setup", "GHL Conversation AI",
        "AI Appointment Booking", "Zapier to GHL Integration", "Stripe Payment Setup in GHL",
        "Google Ads Integration", "Calendar and Booking Setup",
      ]),
    ],
  },
  {
    label: "Digital Marketing",
    columns: [
      mk("Social Media", [
        "Social Media Management", "Social Media Strategy", "Instagram Marketing",
        "TikTok Marketing", "Facebook Marketing", "LinkedIn Marketing",
        "YouTube Marketing", "Pinterest Marketing",
      ]),
      mk("Search and SEO", [
        "SEO Strategy", "On-Page SEO", "Technical SEO",
        "Link Building", "Local SEO", "Google Ads",
        "Keyword Research", "SEO Audits",
      ]),
      mk("Content and Email", [
        "Content Strategy", "Blog Writing", "Email Marketing",
        "Newsletter Setup", "Drip Campaigns", "Copywriting",
        "Brand Messaging", "Content Calendar",
      ]),
      mk("Paid and Analytics", [
        "Facebook Ads", "Google Ads Management", "TikTok Ads",
        "YouTube Ads", "Ad Creatives", "Analytics Setup",
        "Conversion Tracking", "A/B Testing",
      ]),
    ],
  },
  {
    label: "Programming & Tech",
    columns: [
      mk("Web Development", [
        "Full Stack Development", "Frontend Development", "Backend Development",
        "React Development", "Next.js Development", "WordPress Development",
        "Webflow Development", "Shopify Development",
      ]),
      mk("Apps and Software", [
        "Mobile App Development", "iOS Development", "Android Development",
        "Chrome Extension Development", "SaaS Development", "API Development",
        "Database Architecture", "DevOps and Cloud",
      ]),
      mk("Automation", [
        "Zapier Automation", "Make Automation", "n8n Workflows",
        "Python Scripting", "Web Scraping", "Browser Automation",
        "Webhook Setup", "API Integrations",
      ]),
      mk("Support and QA", [
        "Bug Fixes and Improvements", "Code Review", "Technical SEO",
        "Website Speed Optimization", "Security Audits", "Software Testing",
        "Code Documentation", "Tech Consulting",
      ]),
    ],
  },
  {
    label: "Data",
    columns: [
      mk("Analyze with Data", [
        "Data Analytics and Reporting", "Business Intelligence Dashboards", "Data Visualization",
        "Web Analytics", "Predictive Analytics", "AI-Powered Data Analysis",
        "Market Research", "Financial Data Analysis",
      ]),
      mk("Build with Data", [
        "Machine Learning Development", "Deep Learning", "Computer Vision",
        "Natural Language Processing", "AI Model Training", "Data Pipeline and ETL",
        "Database Architecture", "Real-Time Data Pipelines",
      ]),
      mk("Clean and Manage Data", [
        "Data Entry and Processing", "Data Cleaning", "Data Scraping",
        "Data Labeling for AI", "CRM Data Management", "Data Strategy and Consulting",
        "Business Intelligence Strategy", "Data Compliance",
      ]),
    ],
  },
  {
    label: "Business",
    columns: [
      mk("Strategy and Consulting", [
        "Business Strategy", "Business Plan Writing", "Market Research",
        "Competitor Analysis", "Financial Modeling", "Investor Pitch Decks",
        "Business Consulting", "Operations Consulting",
      ]),
      mk("Admin and Support", [
        "Virtual Assistant", "Project Management", "Customer Support Setup",
        "CRM Setup", "HR and Recruiting", "Legal Document Drafting",
        "Accounting and Bookkeeping", "Business Process Documentation",
      ]),
      mk("Sales and Growth", [
        "Sales Strategy", "Lead Generation", "Cold Email Setup",
        "LinkedIn Outreach", "Sales Funnel Consulting", "Revenue Operations",
        "Partnership Development", "Growth Hacking",
      ]),
    ],
  },
  {
    label: "Video & Animation",
    columns: [
      mk("Video Production", [
        "Video Editing", "YouTube Video Editing", "Short Form Video",
        "Video Ads and Commercials", "Corporate Videos", "Documentary Editing",
        "Color Grading", "Video Thumbnails",
      ]),
      mk("Animation", [
        "2D Animation", "3D Animation", "Motion Graphics",
        "Whiteboard Animation", "Logo Animation", "Explainer Videos",
        "Character Animation", "Kinetic Typography",
      ]),
      mk("AI Video", [
        "AI Video Creation", "AI Music Videos", "AI Video Avatars",
        "AI UGC Content", "AI Videography", "AI Visual Effects",
        "AI Generated Content", "Video Script Writing",
      ]),
    ],
  },
  {
    label: "Writing & Content",
    columns: [
      mk("Writing", [
        "Blog Posts and Articles", "Website Copywriting", "Product Descriptions",
        "Press Releases", "Email Copywriting", "Sales Copy",
        "Technical Writing", "Ghostwriting",
      ]),
      mk("Creative Writing", [
        "Scriptwriting", "Storytelling", "Speechwriting",
        "Book Writing", "Resume Writing", "LinkedIn Profiles",
        "Social Media Captions", "UX Writing",
      ]),
      mk("AI Content", [
        "AI Content Editing", "Custom AI Writing Prompts", "AI Scriptwriting",
        "AI SEO Content", "AI Research and Summaries", "AI Translation",
        "AI Social Media Copy", "AI Content Strategy",
      ]),
    ],
  },
  {
    label: "Music & Audio",
    columns: [
      mk("Music", [
        "Music Production", "Beat Making", "Songwriting",
        "Mixing and Mastering", "Jingles and Intros", "Podcast Music",
        "Background Music", "Sound Design",
      ]),
      mk("Voice and AI Audio", [
        "Voice Over", "Podcast Editing", "Audio Ads",
        "AI Voice Synthesis", "Voice Cloning", "Text to Speech",
        "AI Sonic Branding", "Audio Cleanup",
      ]),
    ],
  },
  {
    label: "Design & Creative",
    columns: [
      mk("Brand and Identity", [
        "Logo Design", "Brand Identity", "Brand Style Guide",
        "Business Card Design", "Packaging Design", "Brand Naming",
        "Typography Design", "Color Palette",
      ]),
      mk("Digital Design", [
        "UI and UX Design", "Web Design", "App Design",
        "Social Media Design", "Presentation Design", "Infographic Design",
        "Email Template Design", "Banner Ads",
      ]),
      mk("AI Design", [
        "AI Logo and Brand Identity", "AI Illustration", "AI Social Media Design",
        "AI Presentation Design", "AI Pattern Design", "AI 3D Modeling",
        "ComfyUI Workflows", "Midjourney Art",
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
          font-size: 13px; color: #555; line-height: 2; cursor: pointer; transition: color .12s, font-weight .12s; }
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
