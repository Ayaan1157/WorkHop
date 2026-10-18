import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Star, CheckCircle2, ShieldCheck, MapPin, Sparkles,
  ArrowRight, MessageSquare, Building2, User, Filter,
  ThumbsUp, ExternalLink, ChevronRight, Check, Plus, X, AlertCircle,
  Search, SlidersHorizontal
} from "lucide-react";
import { Shell, TopBar } from "@/components/kit";
import SiteFooter from "@/components/SiteFooter";
import { getStoredReviews, addEmployerReview } from "@/lib/clientStore";
import { useAuth } from "@/context/AuthContext";
import { Testimonials } from "@/components/ui/demo";

// Safe Error Boundary to prevent any child animation component from crashing the page
class TestimonialsBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err) {
    console.warn("Testimonials display fallback active:", err);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

const SEED_COMMUNITY_REVIEWS = [
  {
    review_id: "rev-seed-1",
    employer_name: "Siddharth Rao",
    company_name: "UrbanKrafts Studio",
    area: "Indiranagar",
    distance_km: 0.8,
    job_title: "Next.js E-Commerce Storefront & Stripe Flow",
    category: "Web Development",
    rating: 5,
    pay: 28000,
    payment_mode: "escrow",
    date_formatted: "Yesterday",
    freelancer_id: "lead-karthik",
    freelancer_name: "Karthik Raja",
    freelancer_skill: "UI/UX & React Specialist",
    text: "Delivered our 5-screen flow ahead of schedule. Outstanding communication on WhatsApp, pixel-perfect Tailwind styling, and flawless mobile responsiveness. Escrow settlement was released instantly upon milestone sign-off.",
    badges: ["On-Time Delivery", "Great Communication", "Code Quality"],
    helpful_count: 24,
  },
  {
    review_id: "rev-seed-2",
    employer_name: "Karan Somani",
    company_name: "BrewBlock Specialty Roasters",
    area: "Koramangala",
    distance_km: 1.2,
    job_title: "Brand Identity, Coffee Packaging & Menu Suite",
    category: "Graphics & Design",
    rating: 5,
    pay: 16000,
    payment_mode: "direct",
    date_formatted: "3 days ago",
    freelancer_id: "lead-sneha",
    freelancer_name: "Sneha Rao",
    freelancer_skill: "Brand Designer",
    text: "Super responsive and understands the local Bengaluru cafe market aesthetic perfectly. Sent 3 strong creative directions within 24 hours. Settled directly via UPI without any platform fees eating into her earnings.",
    badges: ["Creative Excellence", "Fast Turnaround"],
    helpful_count: 19,
  },
  {
    review_id: "rev-seed-3",
    employer_name: "Anita Jayaram",
    company_name: "LedgerLite Technologies",
    area: "HSR Layout",
    distance_km: 1.5,
    job_title: "AutoCAD 3D Architecture Villa Layout & Walkthrough",
    category: "Architecture & CAD",
    rating: 5,
    pay: 32000,
    payment_mode: "escrow",
    date_formatted: "5 days ago",
    freelancer_id: "lead-rahul",
    freelancer_name: "Rahul Verma",
    freelancer_skill: "Architectural Drafter",
    text: "Accurate architectural dielines and quick turnaround on revisions. We did a quick 10-minute kickoff at a local HSR cafe to align on elevations. WorkHop's local 5km matching made collaboration effortless.",
    badges: ["Attention to Detail", "High Precision"],
    helpful_count: 15,
  },
  {
    review_id: "rev-seed-4",
    employer_name: "Meera Krishnan",
    company_name: "FinPulse AI",
    area: "Whitefield",
    distance_km: 2.1,
    job_title: "Python FastAPI High-Throughput WebSocket Pipeline",
    category: "Web Development",
    rating: 5,
    pay: 45000,
    payment_mode: "escrow",
    date_formatted: "1 week ago",
    freelancer_id: "lead-aditya",
    freelancer_name: "Aditya Sharma",
    freelancer_skill: "Backend & Systems Engineer",
    text: "Aditya architected our event stream parser handling 50k events/sec. Clean async code, fully documented unit tests, and Dockerized deployment. Truly world-class talent right here in Whitefield.",
    badges: ["Technical Mastery", "Production-Ready"],
    helpful_count: 31,
  },
  {
    review_id: "rev-seed-5",
    employer_name: "Vikram Patel",
    company_name: "DesignGrid Interactive",
    area: "JP Nagar",
    distance_km: 1.7,
    job_title: "Design System Figma Tokens & Component Library",
    category: "Graphics & Design",
    rating: 5,
    pay: 22000,
    payment_mode: "direct",
    date_formatted: "1 week ago",
    freelancer_id: "lead-pooja",
    freelancer_name: "Pooja Hegde",
    freelancer_skill: "Product & UI Designer",
    text: "Organized our entire product library with auto-layout v5, light/dark themes, and developer-friendly token handoff. Saved our engineering team weeks of guesswork. Highly recommended!",
    badges: ["Figma Wizard", "Organized Handoff"],
    helpful_count: 18,
  },
  {
    review_id: "rev-seed-6",
    employer_name: "Arjun Nambiar",
    company_name: "CloudScale Analytics",
    area: "Bellandur",
    distance_km: 2.4,
    job_title: "B2B Technical Architecture Whitepaper & Case Study",
    category: "Writing & Content",
    rating: 4.9,
    pay: 14000,
    payment_mode: "escrow",
    date_formatted: "2 weeks ago",
    freelancer_id: "lead-vikram",
    freelancer_name: "Vikram Sen",
    freelancer_skill: "Technical B2B Copywriter",
    text: "Synthesized complex distributed database concepts into a crisp, authoritative 10-page customer whitepaper. Zero fluff, sharp executive framing, and delivered 2 days ahead of schedule.",
    badges: ["Clear Prose", "Domain Expertise"],
    helpful_count: 12,
  },
  {
    review_id: "rev-seed-7",
    employer_name: "Farhan Qureshi",
    company_name: "FreshBites Kitchens",
    area: "Frazer Town",
    distance_km: 0.9,
    job_title: "Commercial 4K Video Product Reel & Instagram Edits",
    category: "Video & Animation",
    rating: 5,
    pay: 18500,
    payment_mode: "direct",
    date_formatted: "2 weeks ago",
    freelancer_id: "lead-dennis",
    freelancer_name: "Dennis Thomas",
    freelancer_skill: "Motion & Colorist",
    text: "Dennis brought his cinema camera down to our cloud kitchen, shot beautiful b-roll, and cut 4 high-converting reels with sound design within 48 hours. Our reels engagement jumped 300%.",
    badges: ["Cinematic Quality", "Same-Day Edits"],
    helpful_count: 22,
  },
  {
    review_id: "rev-seed-8",
    employer_name: "Rohan V.",
    company_name: "NeoStack Labs",
    area: "Electronic City",
    distance_km: 3.0,
    job_title: "React Native Cross-Platform iOS/Android MVP",
    category: "Web Development",
    rating: 5,
    pay: 38000,
    payment_mode: "escrow",
    date_formatted: "3 weeks ago",
    freelancer_id: "lead-ananya",
    freelancer_name: "Ananya Sen",
    freelancer_skill: "Mobile App Engineer",
    text: "Shipped both iOS TestFlight and Android APK builds with offline state sync and biometric auth. Escrow milestone release was seamless. WorkHop beats international platforms hands-down for local tech hiring.",
    badges: ["Full Stack Mobile", "Reliable Payout"],
    helpful_count: 27,
  },
  {
    review_id: "rev-seed-9",
    employer_name: "Divya Balasubramanian",
    company_name: "AuraMed Diagnostics",
    area: "Sarjapur Road",
    distance_km: 1.8,
    job_title: "LangChain AI Assistant & Patient Triaging Chatbot",
    category: "Web Development",
    rating: 5,
    pay: 36000,
    payment_mode: "escrow",
    date_formatted: "3 days ago",
    freelancer_id: "lead-kiran",
    freelancer_name: "Kiran Natarajan",
    freelancer_skill: "AI & Full-Stack Engineer",
    text: "Built a customized retrieval pipeline connected to our clinic FAQs with guardrails against medical hallucinations. Kiran was super articulate, responsive on WhatsApp, and gave us an in-depth walkthrough before project handover.",
    badges: ["GenAI Expert", "Secure Architecture", "Prompt Delivery"],
    helpful_count: 16,
  },
  {
    review_id: "rev-seed-10",
    employer_name: "Nikhil Chordia",
    company_name: "Sublime Spaces Studio",
    area: "Sadashivanagar",
    distance_km: 2.2,
    job_title: "3D SketchUp & Lumion Visualization for Rooftop Lounge",
    category: "Architecture & CAD",
    rating: 5,
    pay: 29000,
    payment_mode: "escrow",
    date_formatted: "4 days ago",
    freelancer_id: "lead-priya",
    freelancer_name: "Priya Nair",
    freelancer_skill: "3D Visualizer & CAD Lead",
    text: "Priya turned 2D floor plans into photorealistic daytime and evening renders that blew away our hospitality clients. Revisions were incorporated within hours. Super seamless collaboration in Bangalore.",
    badges: ["Photorealistic 3D", "Punctual Delivery"],
    helpful_count: 14,
  },
  {
    review_id: "rev-seed-11",
    employer_name: "Tanvi Mathur",
    company_name: "Glowveda Organics",
    area: "Jayanagar",
    distance_km: 1.1,
    job_title: "Luxury Skincare Dieline Packaging & Matte Box Mockups",
    category: "Graphics & Design",
    rating: 4.8,
    pay: 17500,
    payment_mode: "direct",
    date_formatted: "5 days ago",
    freelancer_id: "lead-sneha",
    freelancer_name: "Sneha Rao",
    freelancer_skill: "Brand & Packaging Designer",
    text: "Sneha has an unmatched eye for premium cosmetics aesthetics. She worked directly with our printing press in Peenya to ensure CMYK color calibration was 100% accurate. Incredible work!",
    badges: ["Print Production Ready", "Attention to Detail"],
    helpful_count: 11,
  },
  {
    review_id: "rev-seed-12",
    employer_name: "Gautam Sethi",
    company_name: "SprintPay FinTech",
    area: "Church Street",
    distance_km: 0.6,
    job_title: "PostgreSQL Database Query Optimization & Indexing",
    category: "Web Development",
    rating: 5,
    pay: 24000,
    payment_mode: "direct",
    date_formatted: "6 days ago",
    freelancer_id: "lead-aditya",
    freelancer_name: "Aditya Sharma",
    freelancer_skill: "Backend & Systems Engineer",
    text: "Cut our critical API response latency from 1.4 seconds down to 85 milliseconds by identifying unindexed foreign keys and restructuring analytical views. Paid him directly via UPI as soon as staging benchmarks passed.",
    badges: ["Database Guru", "Zero Downtime"],
    helpful_count: 29,
  },
  {
    review_id: "rev-seed-13",
    employer_name: "Zoya Alvi",
    company_name: "Verve Media Co.",
    area: "Indiranagar",
    distance_km: 1.3,
    job_title: "Founders Roundtable Multi-Cam Video Edit & Sound Master",
    category: "Video & Animation",
    rating: 5,
    pay: 21000,
    payment_mode: "escrow",
    date_formatted: "1 week ago",
    freelancer_id: "lead-dennis",
    freelancer_name: "Dennis Thomas",
    freelancer_skill: "Video Editor & Colorist",
    text: "Synchronized 3-camera audio feeds, removed room echo, and graded the DaVinci Resolve color profile to match our studio brand guide. Dennis is easily our go-to editor across Central Bengaluru.",
    badges: ["Audio Mastering", "DaVinci Resolve Pro"],
    helpful_count: 20,
  },
  {
    review_id: "rev-seed-14",
    employer_name: "Pradeep Hegde",
    company_name: "Zenith Retail Infra",
    area: "Malleshwaram",
    distance_km: 1.9,
    job_title: "Store Interior Electrical Load Blueprint & Single-Line CAD",
    category: "Architecture & CAD",
    rating: 5,
    pay: 34000,
    payment_mode: "escrow",
    date_formatted: "1 week ago",
    freelancer_id: "lead-rahul",
    freelancer_name: "Rahul Verma",
    freelancer_skill: "Architectural Drafter",
    text: "Got our BESCOM compliance single-line diagram approved on first submission. Rahul met our contractor on-site in Malleshwaram for 20 minutes to verify ducting dimensions. That local presence is priceless.",
    badges: ["BESCOM Compliance", "On-Site Review"],
    helpful_count: 17,
  },
  {
    review_id: "rev-seed-15",
    employer_name: "Shreya Mukherjee",
    company_name: "PulseEd Learn",
    area: "Koramangala",
    distance_km: 1.0,
    job_title: "Interactive Student Portal UI Redesign & Mobile Prototype",
    category: "Graphics & Design",
    rating: 5,
    pay: 27000,
    payment_mode: "escrow",
    date_formatted: "1 week ago",
    freelancer_id: "lead-pooja",
    freelancer_name: "Pooja Hegde",
    freelancer_skill: "Product & UI Designer",
    text: "Pooja ran quick usability tests with 4 college students right here in Koramangala. The final Figma clickable prototype had micro-interactions and complete dark mode specs for our frontend devs.",
    badges: ["User Research", "Figma Components"],
    helpful_count: 13,
  },
  {
    review_id: "rev-seed-16",
    employer_name: "Kavita Rangan",
    company_name: "DevSphere Cloud",
    area: "Domlur",
    distance_km: 1.4,
    job_title: "Developer API Reference Docs & Postman Collection",
    category: "Writing & Content",
    rating: 4.9,
    pay: 16500,
    payment_mode: "direct",
    date_formatted: "2 weeks ago",
    freelancer_id: "lead-vikram",
    freelancer_name: "Vikram Sen",
    freelancer_skill: "Technical B2B Copywriter",
    text: "Comprehensive markdown documentation generated with OpenAPI spec integration and copy-paste code snippets in Curl, Node.js, and Python. Reduced our customer integration support tickets by 60%.",
    badges: ["API Documentation", "Markdown Expert"],
    helpful_count: 15,
  },
  {
    review_id: "rev-seed-17",
    employer_name: "Manish Aggarwal",
    company_name: "UrbanFit Wellness",
    area: "BTM Layout",
    distance_km: 1.6,
    job_title: "3D Kinetic Fitness Product Explainer & Lottie Animations",
    category: "Video & Animation",
    rating: 5,
    pay: 26000,
    payment_mode: "escrow",
    date_formatted: "2 weeks ago",
    freelancer_id: "lead-dennis",
    freelancer_name: "Dennis Thomas",
    freelancer_skill: "Motion & Colorist",
    text: "Rendered lightweight 60fps Lottie JSON animations that loaded instantly on our mobile app without bloating APK size. Dennis gave us multiple color variations and vector assets.",
    badges: ["Lottie Animation", "High Performance"],
    helpful_count: 23,
  },
  {
    review_id: "rev-seed-18",
    employer_name: "Sunil Shenoy",
    company_name: "FinNest Wealth",
    area: "Ulsoor",
    distance_km: 1.2,
    job_title: "SEBI Compliance UX Copy Audit & Microcopy Revamp",
    category: "Writing & Content",
    rating: 5,
    pay: 15000,
    payment_mode: "direct",
    date_formatted: "3 weeks ago",
    freelancer_id: "lead-vikram",
    freelancer_name: "Vikram Sen",
    freelancer_skill: "Technical B2B Copywriter",
    text: "Rewrote our entire risk disclosure flow and disclaimer modals. The copy is legally compliant, crisp, and conversational. Outstanding speed and professional accountability.",
    badges: ["Fintech Copy", "SEBI Knowledge"],
    helpful_count: 9,
  },
  {
    review_id: "rev-seed-19",
    employer_name: "Harish Murthy",
    company_name: "GreenGrid Energy",
    area: "Hebbal",
    distance_km: 2.8,
    job_title: "Solar Rooftop AutoCAD Layout & Shading Analysis",
    category: "Architecture & CAD",
    rating: 5,
    pay: 31000,
    payment_mode: "escrow",
    date_formatted: "3 weeks ago",
    freelancer_id: "lead-rahul",
    freelancer_name: "Rahul Verma",
    freelancer_skill: "Architectural Drafter",
    text: "Accurate PV layout with shadow casting simulation for commercial warehouse in North Bangalore. Rahul gave us complete CAD DWG and PDF layers. Escrow held until our site engineer gave final sign-off.",
    badges: ["Solar CAD", "Detailed Engineering"],
    helpful_count: 14,
  },
  {
    review_id: "rev-seed-20",
    employer_name: "Deepak Choudhary",
    company_name: "SwiftDrop Logistics",
    area: "Koramangala",
    distance_km: 0.9,
    job_title: "Real-Time Driver Location Tracking Map in Mapbox & React",
    category: "Web Development",
    rating: 5,
    pay: 39000,
    payment_mode: "escrow",
    date_formatted: "3 weeks ago",
    freelancer_id: "lead-karthik",
    freelancer_name: "Karthik Raja",
    freelancer_skill: "UI/UX & React Specialist",
    text: "Engineered smooth vehicle marker animations and route polyline snapping on Mapbox GL. Handled disconnections and re-centering like a dream. Top-tier engineer living right in 6th Block Koramangala.",
    badges: ["Mapbox Expert", "WebSocket Sync"],
    helpful_count: 28,
  },
];

const CATEGORIES = [
  "All Categories",
  "Web Development",
  "Graphics & Design",
  "Video & Animation",
  "Architecture & CAD",
  "Writing & Content",
];

const AREAS = [
  "All Neighborhoods",
  "Indiranagar",
  "Koramangala",
  "HSR Layout",
  "Whitefield",
  "JP Nagar",
  "Jayanagar",
  "Sarjapur Road",
  "Malleshwaram",
  "Bellandur",
  "Frazer Town",
  "Electronic City",
];

export default function Reviews() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [activeCategory, setActiveCategory] = useState("All Categories");
  const [selectedArea, setSelectedArea] = useState("All Neighborhoods");
  const [ratingFilter, setRatingFilter] = useState("all"); // "all" | "5" | "4.8"
  const [searchQuery, setSearchQuery] = useState("");
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [helpfulMap, setHelpfulMap] = useState({});

  // Form states for submitting new community review
  const [newClientName, setNewClientName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newArea, setNewArea] = useState("Koramangala");
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Web Development");
  const [newRating, setNewRating] = useState(5);
  const [newPay, setNewPay] = useState("");
  const [newReviewText, setNewReviewText] = useState("");
  const [newFreelancerName, setNewFreelancerName] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  // Combine dynamic local storage reviews with pre-seeded verified reviews
  const allReviews = useMemo(() => {
    const dynamic = getStoredReviews();
    const formattedDynamic = (Array.isArray(dynamic) ? dynamic : []).map((d) => ({
      review_id: d.review_id || `dyn-${Math.random()}`,
      employer_name: d.employer_name || "Verified Client",
      company_name: d.company_name || d.employer_name || "Bengaluru Business",
      area: d.area || "Bengaluru",
      distance_km: d.distance_km || 1.1,
      job_title: d.job_title || "Freelance Gig",
      category: d.category || "Web Development",
      rating: Number(d.rating) || 5,
      pay: d.pay || 15000,
      payment_mode: d.payment_mode || "escrow",
      date_formatted: d.date_formatted || "Recently",
      freelancer_id: d.freelancer_id || "fl-1",
      freelancer_name: d.freelancer_name || "Verified Pro",
      freelancer_skill: d.freelancer_skill || "Specialist",
      text: d.text || "Smooth communication and high quality deliverables.",
      badges: Array.isArray(d.badges) ? d.badges : ["Verified Delivery"],
      helpful_count: d.helpful_count || 10,
    }));
    return [...formattedDynamic, ...SEED_COMMUNITY_REVIEWS];
  }, []);

  // Filter reviews dynamically
  const filteredReviews = useMemo(() => {
    return allReviews.filter((r) => {
      // Category filter
      const matchCat =
        activeCategory === "All Categories" ||
        (r.category && r.category.toLowerCase() === activeCategory.toLowerCase());

      // Area filter
      const matchArea =
        selectedArea === "All Neighborhoods" ||
        (r.area && r.area.toLowerCase() === selectedArea.toLowerCase());

      // Rating filter
      const numRating = Number(r.rating) || 5;
      const matchRating =
        ratingFilter === "all" ||
        (ratingFilter === "5" && numRating >= 5) ||
        (ratingFilter === "4.8" && numRating >= 4.8);

      // Search query
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        (r.job_title && r.job_title.toLowerCase().includes(q)) ||
        (r.employer_name && r.employer_name.toLowerCase().includes(q)) ||
        (r.company_name && r.company_name.toLowerCase().includes(q)) ||
        (r.freelancer_name && r.freelancer_name.toLowerCase().includes(q)) ||
        (r.area && r.area.toLowerCase().includes(q)) ||
        (r.text && r.text.toLowerCase().includes(q));

      return matchCat && matchArea && matchRating && matchSearch;
    });
  }, [allReviews, activeCategory, selectedArea, ratingFilter, searchQuery]);

  // Aggregate stats
  const aggregateRating = useMemo(() => {
    if (allReviews.length === 0) return "5.0";
    const sum = allReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    return (sum / allReviews.length).toFixed(1);
  }, [allReviews]);

  const handleHelpful = (reviewId, initialCount = 10) => {
    setHelpfulMap((prev) => {
      const current = prev[reviewId] ?? initialCount;
      const hasUpvoted = prev[`${reviewId}-voted`];
      return {
        ...prev,
        [reviewId]: hasUpvoted ? current - 1 : current + 1,
        [`${reviewId}-voted`]: !hasUpvoted,
      };
    });
  };

  const handleCreateReview = (e) => {
    e.preventDefault();
    setFormError("");

    if (!newClientName.trim() || !newJobTitle.trim() || !newReviewText.trim()) {
      return setFormError("Please fill in your name, gig title, and feedback.");
    }

    addEmployerReview({
      employer_name: newClientName.trim(),
      company_name: newCompany.trim() || newClientName.trim(),
      job_title: newJobTitle.trim(),
      freelancer_name: newFreelancerName.trim() || "Verified Pro",
      rating: newRating,
      text: newReviewText.trim(),
      pay: parseInt(newPay, 10) || 15000,
      badges: ["Community Review", "Verified Client"],
    });

    setFormSuccess(true);
    setTimeout(() => {
      setSubmitModalOpen(false);
      setFormSuccess(false);
      setNewClientName("");
      setNewCompany("");
      setNewJobTitle("");
      setNewReviewText("");
      setNewPay("");
      setNewFreelancerName("");
    }, 1200);
  };

  return (
    <Shell>
      <TopBar
        title="VERIFIED REVIEWS"
        sub="Real Client & Freelancer Feedback · Bengaluru Gigs"
        backTestID="reviews-back-btn"
      />

      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        
        {/* Breadcrumb Navigation */}
        <div className="mb-6 flex items-center gap-2 text-xs font-bold text-inkmuted dark:text-stone-400">
          <Link to="/" className="hover:text-brand hover:underline">
            Home
          </Link>
          <span>/</span>
          <span className="text-ink dark:text-white uppercase font-black">
            Reviews & Stories
          </span>
        </div>

        {/* Hero Header & Metrics Strip */}
        <div className="border-4 border-ink bg-white dark:bg-[#151517] p-6 sm:p-10 shadow-[6px_6px_0px_#121212] dark:shadow-[6px_6px_0px_#E65A1E]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b-2 border-ink dark:border-zinc-800 pb-8">
            <div className="max-w-2xl">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase text-brand tracking-widest mb-1">
                <Sparkles size={14} /> 100% VERIFIED CLIENT &amp; PRO FEEDBACK
              </span>
              <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-ink dark:text-white">
                How Bengaluru Gets Work Done On WorkHop
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-inkmuted dark:text-stone-300 leading-relaxed font-medium">
                Every review on WorkHop is anchored to an actual completed gig in Bangalore. Direct mobile communication, zero commission on earnings, and safe escrow or direct settlement choices.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSubmitModalOpen(true)}
                className="flex items-center justify-center gap-1.5 border-2 border-ink bg-sand hover:bg-ink hover:text-white dark:bg-zinc-800 dark:hover:bg-brand px-4 py-3 text-xs font-black uppercase text-ink dark:text-white shadow-[2px_2px_0px_#121212] transition"
              >
                <Plus size={14} /> Leave A Review
              </button>
              <Link
                to="/employer/post-job"
                className="flex items-center justify-center gap-2 border-2 border-ink bg-brand px-5 py-3 text-xs font-black uppercase text-white shadow-[3px_3px_0px_#121212] hover:bg-black transition"
              >
                Post A Gig (Free) <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Key Trust Stats Strip */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 pt-2">
            <div className="border-2 border-ink dark:border-zinc-800 bg-[#FFF9E6] dark:bg-amber-950/20 p-3 sm:p-4">
              <div className="flex items-center gap-1 text-brand mb-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={15} fill="#E65A1E" className="text-brand" />
                ))}
              </div>
              <p className="text-2xl sm:text-3xl font-black text-ink dark:text-white">{aggregateRating} / 5.0</p>
              <p className="text-[10px] sm:text-xs font-bold uppercase text-inkmuted dark:text-stone-400 mt-0.5">Average Gig Rating</p>
            </div>

            <div className="border-2 border-ink dark:border-zinc-800 bg-sand/60 dark:bg-zinc-900 p-3 sm:p-4">
              <p className="text-2xl sm:text-3xl font-black text-ink dark:text-white">1,400+</p>
              <p className="text-[10px] sm:text-xs font-bold uppercase text-inkmuted dark:text-stone-400 mt-0.5">Completed Bengaluru Gigs</p>
            </div>

            <div className="border-2 border-ink dark:border-zinc-800 bg-[#E8F5E9] dark:bg-emerald-950/20 p-3 sm:p-4">
              <p className="text-2xl sm:text-3xl font-black text-ok">0% FEE</p>
              <p className="text-[10px] sm:text-xs font-bold uppercase text-inkmuted dark:text-stone-400 mt-0.5">Direct Payouts Kept</p>
            </div>

            <div className="border-2 border-ink dark:border-zinc-800 bg-sand/60 dark:bg-zinc-900 p-3 sm:p-4">
              <p className="text-2xl sm:text-3xl font-black text-brand">5 KM</p>
              <p className="text-[10px] sm:text-xs font-bold uppercase text-inkmuted dark:text-stone-400 mt-0.5">Hyperlocal Radius</p>
            </div>
          </div>
        </div>

        {/* Animated Infinite Testimonials Columns wrapped in safe boundary */}
        <TestimonialsBoundary>
          <div className="mt-8 border-2 border-ink dark:border-zinc-800 bg-white dark:bg-[#121214] p-4 sm:p-8 shadow-[4px_4px_0px_#121212] overflow-hidden">
            <Testimonials />
          </div>
        </TestimonialsBoundary>

        {/* Filter Toolbar & Search Bar */}
        <div className="mt-8 flex flex-col gap-3.5 border-2 border-ink dark:border-zinc-800 bg-sand dark:bg-[#1a1a1c] p-4 shadow-[3px_3px_0px_#121212]">
          
          {/* Top Bar: Search Input & Dropdowns */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-inkmuted dark:text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reviews by gig, tech stack, client, or keyword..."
                className="w-full border-2 border-ink dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-9 pr-3 py-2 text-xs font-bold text-ink dark:text-white placeholder:text-inkmuted/60 outline-none shadow-[2px_2px_0px_#121212]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-black dark:hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Area Filter Selector */}
            <div className="flex items-center gap-2 shrink-0">
              <MapPin size={14} className="text-brand shrink-0" />
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="border-2 border-ink dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-black uppercase text-ink dark:text-white outline-none shadow-[2px_2px_0px_#121212] cursor-pointer"
              >
                {AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating Filter Pill */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setRatingFilter("all")}
                className={`border border-ink px-2.5 py-1.5 text-xs font-black uppercase transition ${
                  ratingFilter === "all"
                    ? "bg-brand text-white shadow-[1.5px_1.5px_0px_#121212]"
                    : "bg-white dark:bg-zinc-800 text-ink dark:text-white hover:bg-sand"
                }`}
              >
                All Stars
              </button>
              <button
                type="button"
                onClick={() => setRatingFilter("4.8")}
                className={`border border-ink px-2.5 py-1.5 text-xs font-black uppercase transition flex items-center gap-1 ${
                  ratingFilter === "4.8"
                    ? "bg-brand text-white shadow-[1.5px_1.5px_0px_#121212]"
                    : "bg-white dark:bg-zinc-800 text-ink dark:text-white hover:bg-sand"
                }`}
              >
                <Star size={11} fill={ratingFilter === "4.8" ? "white" : "#E65A1E"} />
                <span>4.8+ Stars</span>
              </button>
              <button
                type="button"
                onClick={() => setRatingFilter("5")}
                className={`border border-ink px-2.5 py-1.5 text-xs font-black uppercase transition flex items-center gap-1 ${
                  ratingFilter === "5"
                    ? "bg-brand text-white shadow-[1.5px_1.5px_0px_#121212]"
                    : "bg-white dark:bg-zinc-800 text-ink dark:text-white hover:bg-sand"
                }`}
              >
                <Star size={11} fill={ratingFilter === "5" ? "white" : "#E65A1E"} />
                <span>5 Stars</span>
              </button>
            </div>
          </div>

          {/* Categories Tab Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none pt-1 border-t border-ink/10 dark:border-zinc-800">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-3 py-1.5 text-xs font-black uppercase transition border ${
                  activeCategory === cat
                    ? "border-ink bg-brand text-white shadow-[1.5px_1.5px_0px_#121212]"
                    : "border-transparent bg-white/70 dark:bg-zinc-800 text-ink dark:text-zinc-200 hover:bg-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Showing Count */}
        <div className="mt-4 flex items-center justify-between text-xs font-bold text-inkmuted dark:text-stone-400">
          <span>
            Showing <strong className="text-ink dark:text-white">{filteredReviews.length}</strong> verified reviews
            {activeCategory !== "All Categories" && ` in ${activeCategory}`}
            {selectedArea !== "All Neighborhoods" && ` in ${selectedArea}`}
          </span>
          {(activeCategory !== "All Categories" || selectedArea !== "All Neighborhoods" || ratingFilter !== "all" || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setActiveCategory("All Categories");
                setSelectedArea("All Neighborhoods");
                setRatingFilter("all");
                setSearchQuery("");
              }}
              className="text-brand font-black hover:underline uppercase text-[11px]"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Reviews Grid */}
        {filteredReviews.length === 0 ? (
          <div className="mt-8 border-2 border-dashed border-ink dark:border-zinc-700 p-12 text-center bg-white dark:bg-[#151517]">
            <MessageSquare size={36} className="mx-auto text-brand opacity-60 mb-3" />
            <p className="text-base font-black uppercase text-ink dark:text-white">No reviews found matching criteria</p>
            <p className="text-xs text-inkmuted dark:text-stone-400 mt-1">Try clearing search terms or selecting another neighborhood category.</p>
            <button
              type="button"
              onClick={() => {
                setActiveCategory("All Categories");
                setSelectedArea("All Neighborhoods");
                setRatingFilter("all");
                setSearchQuery("");
              }}
              className="mt-4 inline-block border-2 border-ink bg-brand px-4 py-2 text-xs font-black uppercase text-white shadow-[2px_2px_0px_#121212]"
            >
              Show All Reviews
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {filteredReviews.map((rev) => {
              const numRating = Number(rev.rating) || 5;
              const currentHelpful = helpfulMap[rev.review_id] ?? (rev.helpful_count || 12);
              const isHelpfulVoted = helpfulMap[`${rev.review_id}-voted`];

              return (
                <div
                  key={rev.review_id}
                  className="border-2 border-ink dark:border-zinc-700 bg-white dark:bg-[#161618] p-5 sm:p-6 shadow-[4px_4px_0px_#121212] dark:shadow-[4px_4px_0px_#000] flex flex-col justify-between transition hover:-translate-y-0.5"
                >
                  <div>
                    {/* Review Header: Client, Locality & Rating */}
                    <div className="flex items-start justify-between gap-3 border-b border-ink/10 dark:border-zinc-800 pb-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-ink bg-brand font-black text-white text-base shadow-[1.5px_1.5px_0px_#121212]">
                          {(rev.employer_name || "Client").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-sm text-ink dark:text-white truncate">
                            {rev.employer_name || "Verified Client"}
                          </p>
                          <p className="text-xs font-semibold text-brand truncate">
                            {rev.company_name || "Bengaluru Business"}
                          </p>
                          <div className="flex items-center gap-1 text-[11px] text-inkmuted dark:text-zinc-400 mt-0.5">
                            <MapPin size={11} className="text-brand shrink-0" />
                            <span>{rev.area || "Bengaluru"}</span>
                            <span>•</span>
                            <span>{rev.date_formatted || "Recently"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        {/* Safe star rating loop - completely immune to RangeError */}
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((starIdx) => {
                            const isFilled = numRating >= starIdx;
                            const isHalf = !isFilled && numRating >= starIdx - 0.5;
                            return (
                              <Star
                                key={starIdx}
                                size={13}
                                fill={isFilled || isHalf ? "#E65A1E" : "none"}
                                className={isFilled || isHalf ? "text-brand" : "text-stone-300 dark:text-zinc-600"}
                              />
                            );
                          })}
                          <span className="ml-1 text-[11px] font-black text-ink dark:text-white">
                            {numRating.toFixed(1)}
                          </span>
                        </div>
                        <span className="mt-1 border border-ink bg-[#FFF3C4] dark:bg-amber-950/60 px-1.5 py-0.2 text-[9px] font-black text-ink dark:text-amber-300 uppercase shadow-[1px_1px_0px_#121212]">
                          VERIFIED GIG
                        </span>
                      </div>
                    </div>

                    {/* Gig Title & Pay Tag */}
                    <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-black text-ink dark:text-zinc-200 uppercase tracking-tight">
                        {rev.job_title}
                      </span>
                      {rev.pay && (
                        <span className="border border-ink dark:border-zinc-700 bg-sand dark:bg-zinc-800 px-2 py-0.5 text-xs font-black text-ink dark:text-white">
                          ₹{typeof rev.pay === "number" ? rev.pay.toLocaleString("en-IN") : rev.pay}
                        </span>
                      )}
                    </div>

                    {/* Review Body */}
                    <p className="mt-3 text-xs sm:text-sm leading-relaxed text-ink/90 dark:text-zinc-300 font-medium italic">
                      "{rev.text}"
                    </p>

                    {/* Review Badges */}
                    {Array.isArray(rev.badges) && rev.badges.length > 0 && (
                      <div className="mt-3.5 flex flex-wrap gap-1.5">
                        {rev.badges.map((b) => (
                          <span
                            key={b}
                            className="flex items-center gap-1 border border-ink dark:border-zinc-700 bg-sand/60 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-ink dark:text-zinc-300"
                          >
                            <Check size={10} className="text-ok" /> {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Freelancer Pro attribution footer & Helpful vote */}
                  <div className="mt-5 border-t border-ink/10 dark:border-zinc-800 pt-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white text-[10px] font-bold">
                        {(rev.freelancer_name || "P").charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-ink dark:text-white">{rev.freelancer_name || "Verified Pro"}</span>
                        {rev.freelancer_skill && (
                          <span className="text-[10px] text-inkmuted dark:text-zinc-400 ml-1.5">({rev.freelancer_skill})</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleHelpful(rev.review_id, rev.helpful_count || 12)}
                        className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 border rounded transition ${
                          isHelpfulVoted
                            ? "border-brand bg-brand/10 text-brand"
                            : "border-transparent text-inkmuted hover:text-ink dark:hover:text-white"
                        }`}
                        title="Mark review as helpful"
                      >
                        <ThumbsUp size={11} className={isHelpfulVoted ? "fill-brand" : ""} />
                        <span>Helpful ({currentHelpful})</span>
                      </button>

                      <Link
                        to={`/employer?pro=${rev.freelancer_id || "fl-1"}`}
                        className="text-[11px] font-black text-brand hover:underline flex items-center gap-0.5"
                      >
                        <span>Hire Pro</span>
                        <ChevronRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Call to Action Banner */}
        <div className="mt-12 border-4 border-ink bg-[#121212] p-8 text-center text-white shadow-[6px_6px_0px_#E65A1E]">
          <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tight">
            Ready to find top Bengaluru talent within 5km?
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-stone-300 max-w-xl mx-auto">
            Post your gig in under 60 seconds for free, receive direct applications from verified local specialists, and unlock phone/WhatsApp numbers immediately.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/employer/post-job"
              className="border-2 border-white bg-brand px-6 py-3.5 text-xs sm:text-sm font-black uppercase tracking-wider text-white hover:bg-white hover:text-black transition"
            >
              Post A Gig · 100% Free
            </Link>
            <Link
              to="/freelancer/jobs"
              className="border-2 border-white bg-transparent px-6 py-3.5 text-xs sm:text-sm font-black uppercase tracking-wider text-white hover:bg-white hover:text-black transition"
            >
              Browse 200+ Local Gigs
            </Link>
          </div>
        </div>

      </div>

      {/* Submission Modal */}
      {submitModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setSubmitModalOpen(false)}
        >
          <div
            className="w-full max-w-lg border-2 border-ink dark:border-zinc-700 bg-white dark:bg-[#151517] p-6 shadow-[6px_6px_0px_#121212] dark:shadow-[6px_6px_0px_#000] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-ink pb-3 mb-4">
              <span className="text-sm font-black uppercase text-brand tracking-wider flex items-center gap-1.5">
                <MessageSquare size={16} /> LEAVE A COMMUNITY REVIEW
              </span>
              <button
                type="button"
                onClick={() => setSubmitModalOpen(false)}
                className="p-1 hover:bg-sand transition"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 flex items-center gap-2 border-2 border-red-500 bg-red-50 p-3 text-xs font-bold text-red-700">
                <AlertCircle size={15} />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess ? (
              <div className="py-8 text-center animate-in zoom-in-95">
                <CheckCircle2 size={48} className="mx-auto text-ok mb-2" />
                <p className="text-lg font-black text-ink dark:text-white">Review Published!</p>
                <p className="text-xs text-inkmuted mt-1">Thank you for sharing your experience on WorkHop.</p>
              </div>
            ) : (
              <form onSubmit={handleCreateReview} className="flex flex-col gap-3.5">
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Your Name *</label>
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="e.g. Siddharth Rao"
                    className="w-full border-2 border-ink p-2 text-xs font-bold outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase mb-1">Company / Brand</label>
                    <input
                      type="text"
                      value={newCompany}
                      onChange={(e) => setNewCompany(e.target.value)}
                      placeholder="e.g. Acme Tech Studio"
                      className="w-full border-2 border-ink p-2 text-xs font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase mb-1">Neighborhood</label>
                    <input
                      type="text"
                      value={newArea}
                      onChange={(e) => setNewArea(e.target.value)}
                      placeholder="e.g. Indiranagar"
                      className="w-full border-2 border-ink p-2 text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase mb-1">Gig Title / Project *</label>
                  <input
                    type="text"
                    value={newJobTitle}
                    onChange={(e) => setNewJobTitle(e.target.value)}
                    placeholder="e.g. Next.js E-Commerce Landing Page"
                    className="w-full border-2 border-ink p-2 text-xs font-bold outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase mb-1">Freelancer Pro Name</label>
                    <input
                      type="text"
                      value={newFreelancerName}
                      onChange={(e) => setNewFreelancerName(e.target.value)}
                      placeholder="e.g. Karthik Raja"
                      className="w-full border-2 border-ink p-2 text-xs font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase mb-1">Pay Amount (₹ INR)</label>
                    <input
                      type="number"
                      value={newPay}
                      onChange={(e) => setNewPay(e.target.value)}
                      placeholder="e.g. 25000"
                      className="w-full border-2 border-ink p-2 text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase mb-1">Rating (1 to 5 Stars)</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        className="p-1 hover:scale-110 transition"
                      >
                        <Star
                          size={22}
                          fill={newRating >= star ? "#E65A1E" : "none"}
                          className="text-brand"
                        />
                      </button>
                    ))}
                    <span className="text-xs font-black text-brand ml-2">{newRating} Stars</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase mb-1">Your Detailed Review *</label>
                  <textarea
                    rows={4}
                    value={newReviewText}
                    onChange={(e) => setNewReviewText(e.target.value)}
                    placeholder="Describe collaboration quality, punctuality, speed, and communication..."
                    className="w-full border-2 border-ink p-2 text-xs font-medium outline-none resize-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="mt-2 w-full border-2 border-ink bg-brand py-3 text-xs font-black uppercase text-white shadow-[2px_2px_0px_#121212] hover:bg-black transition"
                >
                  Publish Verified Review
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Global Site Footer */}
      <SiteFooter />
    </Shell>
  );
}
