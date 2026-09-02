// Shared 9-category catalog filters (mirrors GET /api/catalog) — web port.

export const CATEGORY_VISUALS = {
  ALL: { icon: "grid", bg: "#EDEDE4" },
  "Graphics & Design": { icon: "palette", bg: "#FFE3D3" },
  "Programming & Tech": { icon: "code", bg: "#DCEBFF" },
  "Digital Marketing": { icon: "megaphone", bg: "#FFF3C4" },
  "Writing & Translation": { icon: "pen", bg: "#E5F7E0" },
  "Video & Animation": { icon: "video", bg: "#F3E3FF" },
  "AI Services": { icon: "sparkles", bg: "#E0F7F4" },
  "Music & Audio": { icon: "music", bg: "#FFE0EC" },
  Business: { icon: "briefcase", bg: "#EDEDE4" },
  Consulting: { icon: "users", bg: "#DFF0FF" },
};

export const CATEGORY_SHORT_LABELS = {
  ALL: "All",
  "Graphics & Design": "Graphics & Design",
  "Programming & Tech": "Tech & Code",
  "Digital Marketing": "Marketing",
  "Writing & Translation": "Writing",
  "Video & Animation": "Video",
  "AI Services": "AI Services",
  "Music & Audio": "Music & Audio",
  Business: "Business",
  Consulting: "Consulting",
};

export const CATALOG_CATEGORY_NAMES = [
  "Graphics & Design",
  "Programming & Tech",
  "Digital Marketing",
  "Writing & Translation",
  "Video & Animation",
  "AI Services",
  "Music & Audio",
  "Business",
  "Consulting",
];

export const JOB_CATEGORY_FILTERS = [
  { key: "ALL", label: "ALL", cats: [] },
  { key: "Graphics & Design", label: "GRAPHICS & DESIGN", cats: ["Graphics & Design", "Graphic Design", "Brand Identity", "Illustration", "UI/UX Design", "Packaging", "Interior Design", "Fashion Design", "Landscape Design", "3D Visualization", "AutoCAD", "Product Photography", "Creative"] },
  { key: "Programming & Tech", label: "PROGRAMMING & TECH", cats: ["Programming & Tech", "Frontend Dev", "Mobile Dev", "Shopify Dev", "No-Code Dev", "QA Engineer", "Cybersecurity", "Database", "IT Support", "Tech"] },
  { key: "Digital Marketing", label: "DIGITAL MARKETING", cats: ["Digital Marketing", "SEO", "Social Media", "Performance Marketing", "Email Marketing", "Influencer", "PR", "Growth Hacking", "Brand Strategy", "Marketing"] },
  { key: "Writing & Translation", label: "WRITING & TRANSLATION", cats: ["Writing & Translation", "Content Writing", "Copywriting", "Technical Writing", "UX Copy", "Localization"] },
  { key: "Video & Animation", label: "VIDEO & ANIMATION", cats: ["Video & Animation", "Video Editing", "Videography", "Motion Graphics"] },
  { key: "AI Services", label: "AI SERVICES", cats: ["AI Services", "Data Labeling", "Data Analyst"] },
  { key: "Music & Audio", label: "MUSIC & AUDIO", cats: ["Music & Audio"] },
  { key: "Business", label: "BUSINESS", cats: ["Business", "Chartered Accountant", "Fractional CFO", "Legal", "Business Plan", "HR Recruiter", "EA / VA", "Customer Support", "Sales / CRM", "Scrum / PM", "Supply Chain", "Event Coordinator", "Market Research", "Ops"] },
  { key: "Consulting", label: "CONSULTING", cats: ["Consulting", "Corporate Trainer"] },
];

export const LEAD_CATEGORY_FILTERS = [
  { key: "ALL", label: "ALL", cats: [] },
  { key: "Graphics & Design", label: "GRAPHICS & DESIGN", cats: ["Brand & Logo Designer", "Graphic Designer", "Illustrator / Digital Artist", "UI/UX Designer", "Packaging & Label Designer", "Interior Designer", "Fashion Designer", "Landscape Designer", "Architectural 3D Visualizer / SketchUp Modeler", "AutoCAD Draftsman", "Product Photographer"] },
  { key: "Programming & Tech", label: "PROGRAMMING & TECH", cats: ["Frontend Web Developer", "Mobile App Developer (iOS/Android)", "WordPress / Shopify Developer", "No-Code Developer (FlutterFlow)", "QA Test Engineer", "Cybersecurity Consultant", "Database Administrator", "IT Support & Networking Specialist"] },
  { key: "Digital Marketing", label: "DIGITAL MARKETING", cats: ["SEO Specialist", "Social Media Manager", "Performance Marketer (Meta + Google)", "Email Marketing Specialist", "Influencer Marketing Manager", "PR Consultant", "Growth Hacker", "Brand Strategist"] },
  { key: "Writing & Translation", label: "WRITING & TRANSLATION", cats: ["Content Writer / Blogger", "Copywriter", "Technical Writer", "UI Copywriter / Microcopy Specialist", "Translator / Localization Expert"] },
  { key: "Video & Animation", label: "VIDEO & ANIMATION", cats: ["Video Editor", "Videographer / Reel Shooter", "Motion Graphic Artist"] },
  { key: "AI Services", label: "AI SERVICES", cats: ["Data Annotator / Labeler", "Data Analyst (Tableau / PowerBI)"] },
  { key: "Music & Audio", label: "MUSIC & AUDIO", cats: [] },
  { key: "Business", label: "BUSINESS", cats: ["Chartered Accountant (CA)", "Fractional CFO & Pitch Decks", "Legal Consultant / Contract Writer", "Business Plan Writer", "HR Consultant / Talent Recruiter", "Virtual / Executive Assistant", "Customer Support Executive (On-Demand)", "Sales Pipeline Builder", "Scrum Master / Agile Project Manager", "Supply Chain / Logistics Consultant", "On-Site Event Coordinator", "Market Research Analyst"] },
  { key: "Consulting", label: "CONSULTING", cats: ["Corporate Trainer / Workshop Facilitator"] },
];
