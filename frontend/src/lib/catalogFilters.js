// Shared 9-category catalog filters (mirrors GET /api/catalog) — Bangalore Market Dynamics.

export const DISCIPLINES_CATALOG = [
  {
    category: "Graphics & Design",
    icon: "palette",
    bg: "#FFE3D3",
    subcategories: [
      "Logo & Visual Identity Design",
      "Brand Style Guides & Visual Systems",
      "Packaging, Label & Box Design",
      "Menu, Flyer & Print Collateral Design",
      "Social Media Posts, Stories & Banners",
      "Vector Illustration & Icon Design",
      "Pitch Deck & Investor Presentation Design",
      "UI/UX Interface Design (Figma)",
      "3D Architectural Rendering & Interior Visualization",
      "Merch & Apparel Graphics",
      "Signage, Banners & Environmental Graphics",
      "Architectural and interior design floor plan",
    ],
  },
  {
    category: "Tech & Code",
    icon: "code",
    bg: "#DCEBFF",
    subcategories: [
      "No-Code Website Building (Framer, Webflow, Softr)",
      "Shopify & E-Commerce Store Setup",
      "WordPress Website Building & Customization",
      "Frontend Web Development (React, HTML/CSS, JS)",
      "Backend Development & API Integrations",
      "Mobile App Development (Flutter, React Native)",
      "Database Setup & Management (Airtable, SQL)",
      "Web Performance & Speed Optimization",
      "Custom Web Scrapers & Data Extraction",
      "Domain, Hosting, SSL & Email DNS Setup",
    ],
  },
  {
    category: "Marketing",
    icon: "megaphone",
    bg: "#FFF3C4",
    subcategories: [
      "Local SEO & Google Business Profile Optimization",
      "Hyperlocal Meta Ads (Instagram/Facebook 3–5km Radius)",
      "Google Search & Display Ads",
      "Social Media Account Management",
      "WhatsApp Funnels & Broadcast Marketing",
      "Influencer Outreach & Local Campaign Management",
      "Growth Hacking & Local Lead Generation",
      "Email Marketing Campaigns & Automations",
      "E-Commerce Store & Marketplace Optimization",
      "Performance Marketing Audits & Analytics",
    ],
  },
  {
    category: "Writing",
    icon: "pen",
    bg: "#E5F7E0",
    subcategories: [
      "Instagram Reel & Ad Scriptwriting",
      "Landing Page & Website Copywriting",
      "SEO Blog & Article Writing",
      "WhatsApp Broadcast Copy & Notification Messaging",
      "Brand Storytelling & About Us Copy",
      "Vernacular Translation & Content Adaptation (Kannada, Hindi)",
      "Email Newsletters & Sales Sequences",
      "Product Descriptions for E-Commerce & Zomato/Swiggy",
      "Proofreading, Copy Editing & Formatting",
      "PR, Press Releases & Media Kit Copy",
    ],
  },
  {
    category: "Video",
    icon: "video",
    bg: "#F3E3FF",
    subcategories: [
      "Short-Form Video Editing (Reels, Shorts, TikTok)",
      "YouTube & Long-Form Video Editing",
      "Promo, Commercial & Launch Reel Editing",
      "Color Grading & Correction",
      "Motion Graphics & VFX",
      "Event & Product Launch Videography",
      "Subtitle Styling & Captioning",
      "Food, Cafe & Retail Space Video Shoots",
      "Drone Videography & Aerial Footage",
      "Product Unboxing & UGC Demo Videos",
      "Explainer Video Animation (2D/3D)",
    ],
  },
  {
    category: "AI Services",
    icon: "sparkles",
    bg: "#E0F7F4",
    subcategories: [
      "AI Prompt Engineering & Workflow Setup",
      "Custom AI Chatbot Development (WhatsApp / Web)",
      "Automated Workflow Integrations (Make.com, Zapier)",
      "AI Image & Visual Asset Generation (Midjourney/SD)",
      "AI Voiceover & Audio Cloning Setup",
      "LLM API Connections & Fine-Tuning",
      "AI Avatar & Synthesized Video Generation",
      "AI Copywriting & Prompt Refinement",
      "AI Audit for Small Business Process Automation",
      "Custom AI Agent Development",
    ],
  },
  {
    category: "Music & Audio",
    icon: "music",
    bg: "#FFE0EC",
    subcategories: [
      "Audio Mixing & Sound Mastering",
      "Podcast Audio Editing & Post-Production",
      "Custom Jingles & Brand Audio Idents",
      "Voiceover Recording (English, Kannada, Hindi)",
      "Sound Design & Foley FX",
      "Royalty-Free Background Score Composition",
      "Audio Clean-up & Noise Reduction",
      "Songwriting & Lyrics Writing",
      "Radio & Local Audio Spot Production",
      "Cafe & Venue Playlist Audio Curation",
    ],
  },
  {
    category: "Business",
    icon: "briefcase",
    bg: "#EDEDE4",
    subcategories: [
      "Virtual Assistance & Email Management",
      "Spreadsheet Setup & Data Organization (Excel/Airtable)",
      "Customer Support & Live Chat Management",
      "Invoicing & Local GST Bookkeeping Support",
      "Local Market Research & Competitor Mapping",
      "Mystery Shopping & Physical Store Audits",
      "Offline Poster, Flyer & BTL Asset Distribution",
      "Operations & SOP Standardization",
      "Inventory Cataloging & SKU Tagging",
      "CRM Setup & Lead Pipeline Tracking",
      "POS System Setup for Retail & Cafes",
    ],
  },
  {
    category: "Consulting",
    icon: "users",
    bg: "#DFF0FF",
    subcategories: [
      "Brand Strategy & Positioning Advisory",
      "Business Model & Pricing Strategy",
      "Digital Transformation & Automation Advisory",
      "Social Media Growth & Audit Strategy",
      "Cafe & Restaurant Launch Consulting",
      "Architectural Layout & Space Planning Review",
      "Interior Design Material & Concept Consulting",
      "Financial Planning & Cost Sheet Audits",
      "Go-To-Market (GTM) Strategy",
      "E-Commerce & D2C Audit Consulting",
    ],
  },
  {
    category: "Hyperlocal Specialized (Bangalore Focus)",
    icon: "map-pin",
    bg: "#FFE8D6",
    subcategories: [
      "Wall Mural & Graffiti Concept Design",
      "On-Site Live Reel Creation & Event Coverage",
      "Regional Language Voiceover & Local Adaptations",
      "Local Event Stage & Setup Creative Direction",
      "Real Estate Drone Mapping & 3D Tours",
      "Custom Acrylic & Neon Signboard Design",
      "Local Brand Activation & Experiential Stalls",
    ],
  },
];

export const CATEGORY_VISUALS = {
  ALL: { icon: "grid", bg: "#EDEDE4" },
  "Graphics & Design": { icon: "palette", bg: "#FFE3D3" },
  "Tech & Code": { icon: "code", bg: "#DCEBFF" },
  "Programming & Tech": { icon: "code", bg: "#DCEBFF" },
  Marketing: { icon: "megaphone", bg: "#FFF3C4" },
  "Digital Marketing": { icon: "megaphone", bg: "#FFF3C4" },
  Writing: { icon: "pen", bg: "#E5F7E0" },
  "Writing & Translation": { icon: "pen", bg: "#E5F7E0" },
  Video: { icon: "video", bg: "#F3E3FF" },
  "Video & Animation": { icon: "video", bg: "#F3E3FF" },
  "AI Services": { icon: "sparkles", bg: "#E0F7F4" },
  "Music & Audio": { icon: "music", bg: "#FFE0EC" },
  Business: { icon: "briefcase", bg: "#EDEDE4" },
  Consulting: { icon: "users", bg: "#DFF0FF" },
  "Hyperlocal Specialized (Bangalore Focus)": { icon: "map-pin", bg: "#FFE8D6" },
  "Hyperlocal Specialized": { icon: "map-pin", bg: "#FFE8D6" },
};

export const CATEGORY_SHORT_LABELS = {
  ALL: "All",
  "Graphics & Design": "Graphics & Design",
  "Tech & Code": "Tech & Code",
  "Programming & Tech": "Tech & Code",
  Marketing: "Marketing",
  "Digital Marketing": "Marketing",
  Writing: "Writing",
  "Writing & Translation": "Writing",
  Video: "Video",
  "Video & Animation": "Video",
  "AI Services": "AI Services",
  "Music & Audio": "Music & Audio",
  Business: "Business",
  Consulting: "Consulting",
  "Hyperlocal Specialized (Bangalore Focus)": "Bangalore Focus",
  "Hyperlocal Specialized": "Bangalore Focus",
};

export const CATALOG_CATEGORY_NAMES = [
  "Graphics & Design",
  "Tech & Code",
  "Marketing",
  "Writing",
  "Video",
  "AI Services",
  "Music & Audio",
  "Business",
  "Consulting",
];

export const JOB_CATEGORY_FILTERS = [
  { key: "ALL", label: "ALL", cats: [] },
  {
    key: "Graphics & Design",
    label: "GRAPHICS & DESIGN",
    cats: [
      "Graphics & Design", "Graphic Design", "Brand Identity", "Illustration", "UI/UX Design", "Packaging", "Interior Design", "Fashion Design", "Landscape Design", "3D Visualization", "AutoCAD", "Product Photography", "Creative",
      "Logo & Visual Identity Design", "Brand Style Guides & Visual Systems", "Packaging, Label & Box Design", "Menu, Flyer & Print Collateral Design", "Social Media Posts, Stories & Banners", "Vector Illustration & Icon Design", "Pitch Deck & Investor Presentation Design", "UI/UX Interface Design (Figma)", "3D Architectural Rendering & Interior Visualization", "Merch & Apparel Graphics", "Signage, Banners & Environmental Graphics", "Architectural and interior design floor plan",
      "Wall Mural & Graffiti Concept Design", "Custom Acrylic & Neon Signboard Design"
    ],
  },
  {
    key: "Tech & Code",
    label: "TECH & CODE",
    cats: [
      "Tech & Code", "Programming & Tech", "Frontend Dev", "Mobile Dev", "Shopify Dev", "No-Code Dev", "QA Engineer", "Cybersecurity", "Database", "IT Support", "Tech", "Web Development",
      "No-Code Website Building (Framer, Webflow, Softr)", "Shopify & E-Commerce Store Setup", "WordPress Website Building & Customization", "Frontend Web Development (React, HTML/CSS, JS)", "Backend Development & API Integrations", "Mobile App Development (Flutter, React Native)", "Database Setup & Management (Airtable, SQL)", "Web Performance & Speed Optimization", "Custom Web Scrapers & Data Extraction", "Domain, Hosting, SSL & Email DNS Setup"
    ],
  },
  {
    key: "Marketing",
    label: "MARKETING",
    cats: [
      "Marketing", "Digital Marketing", "SEO", "Social Media", "Performance Marketing", "Email Marketing", "Influencer", "PR", "Growth Hacking", "Brand Strategy",
      "Local SEO & Google Business Profile Optimization", "Hyperlocal Meta Ads (Instagram/Facebook 3–5km Radius)", "Google Search & Display Ads", "Social Media Account Management", "WhatsApp Funnels & Broadcast Marketing", "Influencer Outreach & Local Campaign Management", "Growth Hacking & Local Lead Generation", "Email Marketing Campaigns & Automations", "E-Commerce Store & Marketplace Optimization", "Performance Marketing Audits & Analytics",
      "Local Brand Activation & Experiential Stalls"
    ],
  },
  {
    key: "Writing",
    label: "WRITING",
    cats: [
      "Writing", "Writing & Translation", "Content Writing", "Copywriting", "Technical Writing", "UX Copy", "Localization",
      "Instagram Reel & Ad Scriptwriting", "Landing Page & Website Copywriting", "SEO Blog & Article Writing", "WhatsApp Broadcast Copy & Notification Messaging", "Brand Storytelling & About Us Copy", "Vernacular Translation & Content Adaptation (Kannada, Hindi)", "Email Newsletters & Sales Sequences", "Product Descriptions for E-Commerce & Zomato/Swiggy", "Proofreading, Copy Editing & Formatting", "PR, Press Releases & Media Kit Copy"
    ],
  },
  {
    key: "Video",
    label: "VIDEO",
    cats: [
      "Video", "Video & Animation", "Video Editing", "Videography", "Motion Graphics",
      "Short-Form Video Editing (Reels, Shorts, TikTok)", "YouTube & Long-Form Video Editing", "Promo, Commercial & Launch Reel Editing", "Color Grading & Correction", "Motion Graphics & VFX", "Event & Product Launch Videography", "Subtitle Styling & Captioning", "Food, Cafe & Retail Space Video Shoots", "Drone Videography & Aerial Footage", "Product Unboxing & UGC Demo Videos", "Explainer Video Animation (2D/3D)",
      "On-Site Live Reel Creation & Event Coverage", "Real Estate Drone Mapping & 3D Tours"
    ],
  },
  {
    key: "AI Services",
    label: "AI SERVICES",
    cats: [
      "AI Services", "Data Labeling", "Data Analyst",
      "AI Prompt Engineering & Workflow Setup", "Custom AI Chatbot Development (WhatsApp / Web)", "Automated Workflow Integrations (Make.com, Zapier)", "AI Image & Visual Asset Generation (Midjourney/SD)", "AI Voiceover & Audio Cloning Setup", "LLM API Connections & Fine-Tuning", "AI Avatar & Synthesized Video Generation", "AI Copywriting & Prompt Refinement", "AI Audit for Small Business Process Automation", "Custom AI Agent Development"
    ],
  },
  {
    key: "Music & Audio",
    label: "MUSIC & AUDIO",
    cats: [
      "Music & Audio",
      "Audio Mixing & Sound Mastering", "Podcast Audio Editing & Post-Production", "Custom Jingles & Brand Audio Idents", "Voiceover Recording (English, Kannada, Hindi)", "Sound Design & Foley FX", "Royalty-Free Background Score Composition", "Audio Clean-up & Noise Reduction", "Songwriting & Lyrics Writing", "Radio & Local Audio Spot Production", "Cafe & Venue Playlist Audio Curation",
      "Regional Language Voiceover & Local Adaptations"
    ],
  },
  {
    key: "Business",
    label: "BUSINESS",
    cats: [
      "Business", "Chartered Accountant", "Fractional CFO", "Legal", "Business Plan", "HR Recruiter", "EA / VA", "Customer Support", "Sales / CRM", "Scrum / PM", "Supply Chain", "Event Coordinator", "Market Research", "Ops",
      "Virtual Assistance & Email Management", "Spreadsheet Setup & Data Organization (Excel/Airtable)", "Customer Support & Live Chat Management", "Invoicing & Local GST Bookkeeping Support", "Local Market Research & Competitor Mapping", "Mystery Shopping & Physical Store Audits", "Offline Poster, Flyer & BTL Asset Distribution", "Operations & SOP Standardization", "Inventory Cataloging & SKU Tagging", "CRM Setup & Lead Pipeline Tracking", "POS System Setup for Retail & Cafes"
    ],
  },
  {
    key: "Consulting",
    label: "CONSULTING",
    cats: [
      "Consulting", "Corporate Trainer",
      "Brand Strategy & Positioning Advisory", "Business Model & Pricing Strategy", "Digital Transformation & Automation Advisory", "Social Media Growth & Audit Strategy", "Cafe & Restaurant Launch Consulting", "Architectural Layout & Space Planning Review", "Interior Design Material & Concept Consulting", "Financial Planning & Cost Sheet Audits", "Go-To-Market (GTM) Strategy", "E-Commerce & D2C Audit Consulting",
      "Local Event Stage & Setup Creative Direction"
    ],
  },
];

export const LEAD_CATEGORY_FILTERS = [
  { key: "ALL", label: "ALL", cats: [] },
  {
    key: "Graphics & Design",
    label: "GRAPHICS & DESIGN",
    cats: [
      "Brand & Logo Designer", "Graphic Designer", "Illustrator / Digital Artist", "UI/UX Designer", "Packaging & Label Designer", "Interior Designer", "Fashion Designer", "Landscape Designer", "Architectural 3D Visualizer / SketchUp Modeler", "AutoCAD Draftsman", "Product Photographer",
      "Logo & Visual Identity Design", "Brand Style Guides & Visual Systems", "Packaging, Label & Box Design", "Menu, Flyer & Print Collateral Design", "Social Media Posts, Stories & Banners", "Vector Illustration & Icon Design", "Pitch Deck & Investor Presentation Design", "UI/UX Interface Design (Figma)", "3D Architectural Rendering & Interior Visualization", "Merch & Apparel Graphics", "Signage, Banners & Environmental Graphics", "Architectural and interior design floor plan",
      "Wall Mural & Graffiti Concept Design", "Custom Acrylic & Neon Signboard Design"
    ],
  },
  {
    key: "Tech & Code",
    label: "TECH & CODE",
    cats: [
      "Frontend Web Developer", "Mobile App Developer (iOS/Android)", "WordPress / Shopify Developer", "No-Code Developer (FlutterFlow)", "QA Test Engineer", "Cybersecurity Consultant", "Database Administrator", "IT Support & Networking Specialist",
      "No-Code Website Building (Framer, Webflow, Softr)", "Shopify & E-Commerce Store Setup", "WordPress Website Building & Customization", "Frontend Web Development (React, HTML/CSS, JS)", "Backend Development & API Integrations", "Mobile App Development (Flutter, React Native)", "Database Setup & Management (Airtable, SQL)", "Web Performance & Speed Optimization", "Custom Web Scrapers & Data Extraction", "Domain, Hosting, SSL & Email DNS Setup"
    ],
  },
  {
    key: "Marketing",
    label: "MARKETING",
    cats: [
      "SEO Specialist", "Social Media Manager", "Performance Marketer (Meta + Google)", "Email Marketing Specialist", "Influencer Marketing Manager", "PR Consultant", "Growth Hacker", "Brand Strategist",
      "Local SEO & Google Business Profile Optimization", "Hyperlocal Meta Ads (Instagram/Facebook 3–5km Radius)", "Google Search & Display Ads", "Social Media Account Management", "WhatsApp Funnels & Broadcast Marketing", "Influencer Outreach & Local Campaign Management", "Growth Hacking & Local Lead Generation", "Email Marketing Campaigns & Automations", "E-Commerce Store & Marketplace Optimization", "Performance Marketing Audits & Analytics",
      "Local Brand Activation & Experiential Stalls"
    ],
  },
  {
    key: "Writing",
    label: "WRITING",
    cats: [
      "Content Writer / Blogger", "Copywriter", "Technical Writer", "UI Copywriter / Microcopy Specialist", "Translator / Localization Expert",
      "Instagram Reel & Ad Scriptwriting", "Landing Page & Website Copywriting", "SEO Blog & Article Writing", "WhatsApp Broadcast Copy & Notification Messaging", "Brand Storytelling & About Us Copy", "Vernacular Translation & Content Adaptation (Kannada, Hindi)", "Email Newsletters & Sales Sequences", "Product Descriptions for E-Commerce & Zomato/Swiggy", "Proofreading, Copy Editing & Formatting", "PR, Press Releases & Media Kit Copy"
    ],
  },
  {
    key: "Video",
    label: "VIDEO",
    cats: [
      "Video Editor", "Videographer / Reel Shooter", "Motion Graphic Artist",
      "Short-Form Video Editing (Reels, Shorts, TikTok)", "YouTube & Long-Form Video Editing", "Promo, Commercial & Launch Reel Editing", "Color Grading & Correction", "Motion Graphics & VFX", "Event & Product Launch Videography", "Subtitle Styling & Captioning", "Food, Cafe & Retail Space Video Shoots", "Drone Videography & Aerial Footage", "Product Unboxing & UGC Demo Videos", "Explainer Video Animation (2D/3D)",
      "On-Site Live Reel Creation & Event Coverage", "Real Estate Drone Mapping & 3D Tours"
    ],
  },
  {
    key: "AI Services",
    label: "AI SERVICES",
    cats: [
      "Data Annotator / Labeler", "Data Analyst (Tableau / PowerBI)",
      "AI Prompt Engineering & Workflow Setup", "Custom AI Chatbot Development (WhatsApp / Web)", "Automated Workflow Integrations (Make.com, Zapier)", "AI Image & Visual Asset Generation (Midjourney/SD)", "AI Voiceover & Audio Cloning Setup", "LLM API Connections & Fine-Tuning", "AI Avatar & Synthesized Video Generation", "AI Copywriting & Prompt Refinement", "AI Audit for Small Business Process Automation", "Custom AI Agent Development"
    ],
  },
  {
    key: "Music & Audio",
    label: "MUSIC & AUDIO",
    cats: [
      "Audio Mixing & Sound Mastering", "Podcast Audio Editing & Post-Production", "Custom Jingles & Brand Audio Idents", "Voiceover Recording (English, Kannada, Hindi)", "Sound Design & Foley FX", "Royalty-Free Background Score Composition", "Audio Clean-up & Noise Reduction", "Songwriting & Lyrics Writing", "Radio & Local Audio Spot Production", "Cafe & Venue Playlist Audio Curation",
      "Regional Language Voiceover & Local Adaptations"
    ],
  },
  {
    key: "Business",
    label: "BUSINESS",
    cats: [
      "Chartered Accountant (CA)", "Fractional CFO & Pitch Decks", "Legal Consultant / Contract Writer", "Business Plan Writer", "HR Consultant / Talent Recruiter", "Virtual / Executive Assistant", "Customer Support Executive (On-Demand)", "Sales Pipeline Builder", "Scrum Master / Agile Project Manager", "Supply Chain / Logistics Consultant", "On-Site Event Coordinator", "Market Research Analyst",
      "Virtual Assistance & Email Management", "Spreadsheet Setup & Data Organization (Excel/Airtable)", "Customer Support & Live Chat Management", "Invoicing & Local GST Bookkeeping Support", "Local Market Research & Competitor Mapping", "Mystery Shopping & Physical Store Audits", "Offline Poster, Flyer & BTL Asset Distribution", "Operations & SOP Standardization", "Inventory Cataloging & SKU Tagging", "CRM Setup & Lead Pipeline Tracking", "POS System Setup for Retail & Cafes"
    ],
  },
  {
    key: "Consulting",
    label: "CONSULTING",
    cats: [
      "Corporate Trainer / Workshop Facilitator",
      "Brand Strategy & Positioning Advisory", "Business Model & Pricing Strategy", "Digital Transformation & Automation Advisory", "Social Media Growth & Audit Strategy", "Cafe & Restaurant Launch Consulting", "Architectural Layout & Space Planning Review", "Interior Design Material & Concept Consulting", "Financial Planning & Cost Sheet Audits", "Go-To-Market (GTM) Strategy", "E-Commerce & D2C Audit Consulting",
      "Local Event Stage & Setup Creative Direction"
    ],
  },
];
