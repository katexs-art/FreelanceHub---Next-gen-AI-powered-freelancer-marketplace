import { Link } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import howitworksHero from "@/assets/howitworks-hero.mp4.asset.json";

const VIDEO_URL = howitworksHero.url;

const scrollTo = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
};

const terms = [
  { term: "Service", was: "formerly Gig", green: false, desc: "A Service is something an Expert offers on Katexs. Need a voice AI built? There is a Service for that. Need a GHL setup? There is a Service for that." },
  { term: "Expert", was: "formerly Seller", green: false, desc: "An Expert is a verified professional who offers their skills on Katexs. Every Expert is manually approved by our team before they can list their Services." },
  { term: "Partner", was: "formerly Buyer", green: false, desc: "A Partner is anyone who hires an Expert on Katexs. Whether you need one thing done or ten things built — you are a Partner." },
  { term: "Project", was: "formerly Order", green: false, desc: "When a Partner hires an Expert and pays — that becomes a Project. Your Project is tracked, monitored, and protected from start to finish." },
  { term: "Proposal", was: "formerly Bid", green: false, desc: "When an Expert wants to work on a Brief they submit a Proposal. It includes their price, delivery time, and why they are the best person for the job." },
  { term: "Brief", was: "formerly Job Posting", green: false, desc: "A Brief is what Partners post when they need something done. Describe your problem, set your budget, and Experts submit Proposals to win the work." },
  { term: "HQ", was: "formerly Dashboard", green: false, desc: "Your HQ is your personal command center on Katexs. Manage your Projects, messages, earnings, and profile all in one place." },
  { term: "River Score", was: "Unique to Katexs", green: true, desc: "River Score is an AI-generated trust score for every Expert. It measures completion rate, review quality, response time, and repeat Partners. The higher the score the better the Expert." },
];

const partnerSteps = [
  { h: "Sign up as a Partner", d: "Go to katexs.com and click Join Free. Enter your name, email, and password. Select Partner when asked who you are. Verify your email. Done — you are in.", e: "Takes 2 minutes" },
  { h: "Tell River what you need", d: "On the homepage type what you need into the River search bar. Just talk normally — like you are texting a friend. Example — I need someone to build me a voice AI caller for my real estate business. River reads it and finds the best Experts for you instantly.", e: "River does the hard part" },
  { h: "Review your Expert matches", d: "River shows you the top 15 Experts for your request. Each Expert has a River Score, their skills, their price, and how fast they deliver. You can message any Expert directly for free before spending a single dollar.", e: "No obligation to buy" },
  { h: "Accept a Proposal and pay", d: "Once you find your Expert they will send you a Proposal with their price and delivery time. When you are happy click Accept Proposal and pay securely. Your money goes into escrow — it is held safely and only released when you approve the work.", e: "100 percent secure escrow" },
  { h: "Review the delivery and release payment", d: "Your Expert delivers the work. You have 3 days to review it. If you are happy click Approve and the Expert gets paid instantly. If something is wrong click Dispute and our team steps in within 24 hours.", e: "3 days to review — no rush" },
];

const expertSteps = [
  { h: "Sign up as an Expert", d: "Go to katexs.com and click Join Free. Enter your name, email, and password. Select Expert when asked who you are. Verify your email.", e: "Takes 2 minutes" },
  { h: "Submit your Expert application", d: "Tell us about yourself. What are your skills? What tools do you use? What have you built before? Upload samples of your work if you have them. The more detail you give the faster you get approved.", e: "Approval within 24 hours" },
  { h: "Get approved and set up your profile", d: "Our team reviews your application within 24 hours. Once approved you can complete your Expert profile — add your photo, write your bio, set your River Score tags, and create your Services.", e: "One time review" },
  { h: "Create your Services", d: "A Service is what you offer. Give it a title, describe exactly what you will deliver, set your price, and choose your delivery time. You can create up to 10 Services. Example Service — I will build a GoHighLevel voice AI caller for your agency in 3 days.", e: "Be specific to win more" },
  { h: "Receive Proposals and pitch Partners", d: "Two things will happen. Partners will find your profile and message you directly. And River will match you to Partners who need your exact skills and alert you instantly. When River matches you — go pitch. Be fast. Be specific. Tell them exactly what you will deliver and why you are the best.", e: "River alerts you instantly" },
  { h: "Deliver and get paid", d: "Complete the Project on time. Submit your delivery inside the platform. The Partner has 3 days to review. Once they approve — your money transfers to your bank account or debit card the same day. No waiting. No holds. Just instant payment.", e: "Same day payout" },
];

const mockExperts = [
  { initials: "JM", name: "Jordan M.", score: "98.9", skill: "Voice AI", price: "from $450" },
  { initials: "AK", name: "Amara K.", score: "97.4", skill: "GHL Setup", price: "from $300" },
  { initials: "RP", name: "Ravi P.", score: "96.1", skill: "Automations", price: "from $250" },
];

function StepRow({ n, h, d, e, dark, last }: { n: number; h: string; d: string; e: string; dark?: boolean; last?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "56px 1fr auto", gap: 20, position: "relative", paddingBottom: last ? 0 : 32 }}>
      <div style={{ position: "relative" }}>
        <div style={{ width: 40, height: 40, borderRadius: 999, background: dark ? "#fff" : "#000", color: dark ? "#000" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 500 }}>{n}</div>
        {!last && <div style={{ position: "absolute", left: 19, top: 48, bottom: -32, width: 1, background: dark ? "#1a1a1a" : "#f0f0f0" }} />}
      </div>
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 500, color: dark ? "#fff" : "#000", margin: 0, marginBottom: 8 }}>{h}</h3>
        <p style={{ fontSize: 14, color: dark ? "#888" : "#555", lineHeight: 1.7, margin: 0, maxWidth: 720 }}>{d}</p>
      </div>
      <div style={{ alignSelf: "start" }}>
        <span style={{ display: "inline-block", padding: "6px 14px", borderRadius: 999, fontSize: 12, background: dark ? "#252525" : "#f5f5f5", color: dark ? "#cccccc" : "#444", whiteSpace: "nowrap" }}>{e}</span>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <>
      <style>{`
        .hiw-h1 { font-size: 56px; }
        .hiw-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .hiw-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
        .hiw-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .hiw-river { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
        @media (max-width: 900px) {
          .hiw-h1 { font-size: 36px; }
          .hiw-grid-4 { grid-template-columns: repeat(2, 1fr); }
          .hiw-grid-2, .hiw-grid-3, .hiw-river { grid-template-columns: 1fr; }
        }
        @media (max-width: 560px) {
          .hiw-grid-4 { grid-template-columns: 1fr; }
        }
      `}</style>
      <SiteHeader />
      <main style={{ background: "#fff", color: "#000" }}>
        {/* HERO */}
        <section style={{ position: "relative", minHeight: 500, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: "0 40px" }}>
          <video autoPlay muted loop playsInline style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}>
            <source src={VIDEO_URL} type="video/mp4" />
          </video>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1 }} />
          <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "80px 0" }}>
            <span style={{ display: "inline-block", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 11, letterSpacing: "0.12em", padding: "6px 16px", borderRadius: 999, marginBottom: 24, textTransform: "uppercase" }}>Simple by design</span>
            <h1 className="hiw-h1" style={{ color: "#fff", fontWeight: 500, lineHeight: 1.1, margin: 0, marginBottom: 16 }}>How Katexs Works</h1>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 18, maxWidth: 500, margin: "0 auto" }}>So simple a 9 year old could use it. So powerful it runs your business.</p>
          </div>
        </section>

        {/* TERMINOLOGY */}
        <section style={{ background: "#fff", padding: "80px 40px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#888", marginBottom: 12 }}>Know the language</div>
              <h2 style={{ fontSize: 36, fontWeight: 500, color: "#000", margin: 0, marginBottom: 8 }}>The Katexs glossary</h2>
              <p style={{ fontSize: 15, color: "#888", margin: 0 }}>New here? Learn our terms in 60 seconds.</p>
            </div>
            <div className="hiw-grid-4">
              {terms.map((t) => (
                <div key={t.term} style={{ background: "#fff", border: "0.5px solid #e5e5e5", borderRadius: 16, padding: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 18, fontWeight: 500, color: "#000" }}>{t.term}</span>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: t.green ? "#dcfce7" : "#f5f5f5", color: t.green ? "#15803d" : "#888" }}>{t.was}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, margin: 0 }}>{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TWO PATHS */}
        <section style={{ background: "#fff", padding: "80px 40px", borderTop: "1px solid #f5f5f5" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2 style={{ fontSize: 36, fontWeight: 500, color: "#000", margin: 0, marginBottom: 12 }}>Are you a Partner or an Expert?</h2>
              <p style={{ fontSize: 15, color: "#888", margin: 0 }}>Pick your path — everything is explained step by step below.</p>
            </div>
            <div className="hiw-grid-2">
              <div style={{ borderTop: "3px solid #000", background: "#fff", border: "0.5px solid #e5e5e5", borderRadius: 20, padding: 40 }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#888", marginBottom: 16 }}>I need to hire</div>
                <h3 style={{ fontSize: 28, fontWeight: 500, color: "#000", margin: 0, marginBottom: 12 }}>I am a Partner</h3>
                <p style={{ fontSize: 14, color: "#666", lineHeight: 1.7, marginBottom: 24 }}>I have a problem to solve. I need an AI expert, a GHL specialist, or someone to build something for my business. I want to find the right person fast.</p>
                <button onClick={scrollTo("partner-flow")} style={{ background: "#000", color: "#fff", border: "none", borderRadius: 999, padding: "12px 28px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Show me how to hire</button>
              </div>
              <div style={{ borderTop: "3px solid #22c55e", background: "#fff", border: "0.5px solid #e5e5e5", borderRadius: 20, padding: 40 }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#888", marginBottom: 16 }}>I want to earn</div>
                <h3 style={{ fontSize: 28, fontWeight: 500, color: "#000", margin: 0, marginBottom: 12 }}>I am an Expert</h3>
                <p style={{ fontSize: 14, color: "#666", lineHeight: 1.7, marginBottom: 24 }}>I have skills to offer. I build AI systems, set up GHL, create automations, and deliver results. I want to find clients and get paid for my work.</p>
                <button onClick={scrollTo("expert-flow")} style={{ background: "#22c55e", color: "#fff", border: "none", borderRadius: 999, padding: "12px 28px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Show me how to earn</button>
              </div>
            </div>
          </div>
        </section>

        {/* PARTNER FLOW */}
        <section id="partner-flow" style={{ background: "#fff", padding: "80px 40px", borderTop: "1px solid #f5f5f5" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ marginBottom: 48 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#888", marginBottom: 12 }}>For Partners</div>
              <h2 style={{ fontSize: 36, fontWeight: 500, color: "#000", margin: 0, marginBottom: 8 }}>How to hire an Expert — 5 simple steps</h2>
              <p style={{ fontSize: 15, color: "#888", margin: 0 }}>From idea to delivered — faster than you think.</p>
            </div>
            <div>
              {partnerSteps.map((s, i) => (
                <StepRow key={i} n={i + 1} h={s.h} d={s.d} e={s.e} last={i === partnerSteps.length - 1} />
              ))}
            </div>
          </div>
        </section>

        {/* EXPERT FLOW */}
        <section id="expert-flow" style={{ background: "#0a0a0a", padding: "80px 40px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ marginBottom: 48 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#888", marginBottom: 12 }}>For Experts</div>
              <h2 style={{ fontSize: 36, fontWeight: 500, color: "#fff", margin: 0, marginBottom: 8 }}>How to earn on Katexs — 6 simple steps</h2>
              <p style={{ fontSize: 15, color: "#888", margin: 0 }}>Apply once. Get approved. Start earning.</p>
            </div>
            <div>
              {expertSteps.map((s, i) => (
                <StepRow key={i} n={i + 1} h={s.h} d={s.d} e={s.e} dark last={i === expertSteps.length - 1} />
              ))}
            </div>
          </div>
        </section>

        {/* RIVER AI */}
        <section style={{ background: "#fff", padding: "80px 40px", borderTop: "1px solid #f5f5f5" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }} className="hiw-river">
            <div>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#888", marginBottom: 12 }}>Meet River</div>
              <h2 style={{ fontSize: 36, fontWeight: 500, color: "#000", lineHeight: 1.2, margin: 0, marginBottom: 20 }}>River is the brain behind Katexs.</h2>
              <p style={{ fontSize: 15, color: "#666", lineHeight: 1.7, marginBottom: 32 }}>River is not just a search bar. She is an AI matching engine that reads your request, scores every Expert on the platform, and finds the best match in seconds. She looks at River Score, skills, response time, completion rate, and review quality — all at once. The result is a shortlist of the top 15 Experts for exactly what you need. No browsing. No guessing. Just the right person.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {[
                  { n: "15", l: "Experts matched per search" },
                  { n: "98.9", l: "Highest River Score on platform" },
                  { n: "3 days", l: "Average payment time" },
                  { n: "24hrs", l: "Expert approval time" },
                ].map((r) => (
                  <div key={r.l} style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                    <div style={{ fontSize: 32, fontWeight: 500, color: "#000", minWidth: 100 }}>{r.n}</div>
                    <div style={{ fontSize: 13, color: "#888" }}>{r.l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: "#0a0a0a", borderRadius: 20, padding: 32 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", color: "#888", marginBottom: 16, letterSpacing: "0.12em" }}>River AI — Live search</div>
              <div style={{ background: "#111", border: "0.5px solid #222", borderRadius: 999, padding: "12px 20px", color: "#fff", fontSize: 14 }}>I need a voice AI caller for my real estate agency</div>
              <div style={{ fontSize: 12, color: "#aaaaaa", margin: "16px 0 12px" }}>River found 15 matches</div>
              {mockExperts.map((m) => (
                <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 12, background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 12, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 999, background: "#22c55e", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600 }}>{m.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#fff", fontSize: 13, marginBottom: 4 }}>{m.name}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ background: "#000", color: "#fff", fontSize: 10, padding: "2px 8px", borderRadius: 999 }}>River {m.score}</span>
                      <span style={{ background: "#2a2a2a", border: "1px solid #3a3a3a", color: "#cccccc", fontSize: 10, padding: "2px 8px", borderRadius: 999 }}>{m.skill}</span>
                    </div>
                  </div>
                  <div style={{ color: "#fff", fontSize: 12 }}>{m.price}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TRUST */}
        <section style={{ background: "#fff", padding: "80px 40px", borderTop: "1px solid #f5f5f5" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h2 style={{ fontSize: 36, fontWeight: 500, color: "#000", textAlign: "center", margin: 0, marginBottom: 48 }}>Your money is always safe.</h2>
            <div className="hiw-grid-3">
              {[
                { h: "Escrow protection", d: "When you pay for a Project your money goes into escrow — a secure holding account. The Expert cannot touch it until you approve the delivery. If something goes wrong you get your money back." },
                { h: "3-day review window", d: "After delivery you get 3 full days to review the work. Not happy? Raise a dispute. Our team steps in within 24 hours and makes it right. No questions asked." },
                { h: "Same day Expert payouts", d: "Experts get paid the same day funds are released. No 14-day holds like other platforms. Just instant transfers straight to their bank account or debit card." },
              ].map((c) => (
                <div key={c.h} style={{ background: "#fff", border: "0.5px solid #f0f0f0", borderRadius: 16, padding: 32, textAlign: "center" }}>
                  <h3 style={{ fontSize: 16, fontWeight: 500, color: "#000", margin: 0, marginBottom: 12 }}>{c.h}</h3>
                  <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, margin: 0 }}>{c.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section style={{ background: "#000", padding: "100px 40px", textAlign: "center" }}>
          <h2 style={{ fontSize: 48, fontWeight: 500, color: "#fff", margin: 0, marginBottom: 16 }}>Ready? It takes 2 minutes to start.</h2>
          <p style={{ fontSize: 18, color: "#aaaaaa", marginBottom: 40 }}>Join free as a Partner to hire — or apply as an Expert to earn.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            <Link to="/services" style={{ display: "inline-block", border: "1px solid #fff", color: "#fff", borderRadius: 999, padding: "14px 32px", fontSize: 15, textDecoration: "none" }}>Hire an Expert</Link>
            <Link to="/sign-up" style={{ display: "inline-block", background: "#22c55e", color: "#fff", borderRadius: 999, padding: "14px 32px", fontSize: 15, textDecoration: "none" }}>Become an Expert</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
