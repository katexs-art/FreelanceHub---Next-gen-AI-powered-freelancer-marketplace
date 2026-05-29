
-- Replace all categories with new buyer-first AI framework
DELETE FROM public.categories;

WITH parents AS (
  INSERT INTO public.categories (name, slug, parent_id, sort_order, is_active)
  VALUES
    ('Build with AI',           'build-with-ai',           NULL, 1, true),
    ('Sound & Speak with AI',   'sound-and-speak-with-ai', NULL, 2, true),
    ('Create with AI',          'create-with-ai',          NULL, 3, true),
    ('Grow with AI',            'grow-with-ai',            NULL, 4, true),
    ('Run with AI',             'run-with-ai',             NULL, 5, true),
    ('Understand AI',           'understand-ai',           NULL, 6, true),
    ('Write with AI',           'write-with-ai',           NULL, 7, true),
    ('Learn AI',                'learn-ai',                NULL, 8, true)
  RETURNING id, slug
)
INSERT INTO public.categories (name, slug, parent_id, sort_order, is_active)
SELECT v.name, v.slug, p.id, v.sort_order, true
FROM parents p
JOIN (VALUES
  -- Build with AI
  ('build-with-ai','AI Websites & Software','ai-websites-and-software',1),
  ('build-with-ai','AI Mobile App Development','ai-mobile-app-development',2),
  ('build-with-ai','AI Chatbot Development','ai-chatbot-development',3),
  ('build-with-ai','AI Agent Building','ai-agent-building',4),
  ('build-with-ai','AI Integrations & API Connections','ai-integrations-and-api-connections',5),
  ('build-with-ai','AI Fine-Tuning & Model Training','ai-fine-tuning-and-model-training',6),
  ('build-with-ai','Vibe Coding & MVP Builds','vibe-coding-and-mvp-builds',7),
  ('build-with-ai','Deployments & DevOps','deployments-and-devops',8),
  ('build-with-ai','Bug Fixes & Improvements','bug-fixes-and-improvements',9),
  ('build-with-ai','Blockchain & AI Development','blockchain-and-ai-development',10),
  -- Sound & Speak with AI
  ('sound-and-speak-with-ai','Voice AI Agents & Callers','voice-ai-agents-and-callers',1),
  ('sound-and-speak-with-ai','Voice Cloning & Custom Voices','voice-cloning-and-custom-voices',2),
  ('sound-and-speak-with-ai','AI Phone Systems & Automation','ai-phone-systems-and-automation',3),
  ('sound-and-speak-with-ai','Conversational AI Builds','conversational-ai-builds',4),
  ('sound-and-speak-with-ai','Text to Speech Production','text-to-speech-production',5),
  ('sound-and-speak-with-ai','Voice Synthesis & Design','voice-synthesis-and-design',6),
  ('sound-and-speak-with-ai','AI Podcast Production','ai-podcast-production',7),
  ('sound-and-speak-with-ai','AI Audio Ads','ai-audio-ads',8),
  ('sound-and-speak-with-ai','AI Sonic Branding','ai-sonic-branding',9),
  ('sound-and-speak-with-ai','GoHighLevel Voice AI Setups','gohighlevel-voice-ai-setups',10),
  -- Create with AI
  ('create-with-ai','AI Video Creation','ai-video-creation',1),
  ('create-with-ai','AI Music Videos','ai-music-videos',2),
  ('create-with-ai','AI UGC Content','ai-ugc-content',3),
  ('create-with-ai','AI Videography','ai-videography',4),
  ('create-with-ai','AI Video Avatars','ai-video-avatars',5),
  ('create-with-ai','AI Visual Effects','ai-visual-effects',6),
  ('create-with-ai','AI Image Editing','ai-image-editing',7),
  ('create-with-ai','AI Avatar Design','ai-avatar-design',8),
  ('create-with-ai','AI Illustration & Art','ai-illustration-and-art',9),
  ('create-with-ai','ComfyUI & Stable Diffusion Workflows','comfyui-and-stable-diffusion-workflows',10),
  ('create-with-ai','AI Logo & Brand Identity','ai-logo-and-brand-identity',11),
  ('create-with-ai','AI 3D Modeling & Design','ai-3d-modeling-and-design',12),
  ('create-with-ai','AI Fashion & Merchandise','ai-fashion-and-merchandise',13),
  -- Grow with AI
  ('grow-with-ai','AI Marketing Strategy','ai-marketing-strategy',1),
  ('grow-with-ai','Generative Engine Optimization (GEO)','generative-engine-optimization-geo',2),
  ('grow-with-ai','AI SEO Content','ai-seo-content',3),
  ('grow-with-ai','AI Ad Bidding & Automation','ai-ad-bidding-and-automation',4),
  ('grow-with-ai','AI-Powered Campaign Management','ai-powered-campaign-management',5),
  ('grow-with-ai','AI Social Media Management','ai-social-media-management',6),
  ('grow-with-ai','AI Influencer & UGC Strategy','ai-influencer-and-ugc-strategy',7),
  ('grow-with-ai','AI Email Marketing','ai-email-marketing',8),
  ('grow-with-ai','AI Lead Generation & Sales','ai-lead-generation-and-sales',9),
  ('grow-with-ai','AI Paid Advertising','ai-paid-advertising',10),
  -- Run with AI
  ('run-with-ai','AI Workflow & Process Automation','ai-workflow-and-process-automation',1),
  ('run-with-ai','CRM & Pipeline Automation','crm-and-pipeline-automation',2),
  ('run-with-ai','GoHighLevel AI Setups','gohighlevel-ai-setups',3),
  ('run-with-ai','Zapier & Make Automation','zapier-and-make-automation',4),
  ('run-with-ai','E-Commerce AI Automation','e-commerce-ai-automation',5),
  ('run-with-ai','Social Media Automation','social-media-automation',6),
  ('run-with-ai','AI Virtual Assistants','ai-virtual-assistants',7),
  ('run-with-ai','AI Customer Experience','ai-customer-experience',8),
  ('run-with-ai','AI Project Management','ai-project-management',9),
  ('run-with-ai','AI Supply Chain & Operations','ai-supply-chain-and-operations',10),
  ('run-with-ai','AI Legal & Compliance Tools','ai-legal-and-compliance-tools',11),
  -- Understand AI
  ('understand-ai','Data Science & Machine Learning','data-science-and-machine-learning',1),
  ('understand-ai','AI Model Fine-Tuning','ai-model-fine-tuning',2),
  ('understand-ai','Data Analytics & Visualization','data-analytics-and-visualization',3),
  ('understand-ai','Data Scraping & Labeling','data-scraping-and-labeling',4),
  ('understand-ai','Data Tagging & Annotation','data-tagging-and-annotation',5),
  ('understand-ai','Model Optimization','model-optimization',6),
  ('understand-ai','AI Research & Reporting','ai-research-and-reporting',7),
  ('understand-ai','Business Intelligence & AI','business-intelligence-and-ai',8),
  -- Write with AI
  ('write-with-ai','AI Content Editing & Strategy','ai-content-editing-and-strategy',1),
  ('write-with-ai','Custom AI Writing Prompts','custom-ai-writing-prompts',2),
  ('write-with-ai','AI Scriptwriting','ai-scriptwriting',3),
  ('write-with-ai','AI Social Media Copywriting','ai-social-media-copywriting',4),
  ('write-with-ai','AI Research & Summaries','ai-research-and-summaries',5),
  ('write-with-ai','AI Translation & Localization','ai-translation-and-localization',6),
  ('write-with-ai','AI SEO Articles & Blog Posts','ai-seo-articles-and-blog-posts',7),
  ('write-with-ai','AI Sales & Ad Copy','ai-sales-and-ad-copy',8),
  ('write-with-ai','AI UX Writing','ai-ux-writing',9),
  -- Learn AI
  ('learn-ai','AI Technology Consulting','ai-technology-consulting',1),
  ('learn-ai','AI Strategy & Advisory','ai-strategy-and-advisory',2),
  ('learn-ai','AI Lessons & Training','ai-lessons-and-training',3),
  ('learn-ai','Generative AI Courses','generative-ai-courses',4),
  ('learn-ai','AI Prompt Engineering','ai-prompt-engineering',5),
  ('learn-ai','AI Tools Onboarding','ai-tools-onboarding',6),
  ('learn-ai','AI for Business Workshops','ai-for-business-workshops',7)
) AS v(parent_slug, name, slug, sort_order)
ON v.parent_slug = p.slug;
