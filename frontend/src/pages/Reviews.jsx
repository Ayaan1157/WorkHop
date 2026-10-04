import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Star, CheckCircle2, ShieldCheck, MapPin, Sparkles,
  ArrowRight, MessageSquare, Building2, User, Filter,
  ThumbsUp, ExternalLink, ChevronRight, Check, Plus, X, AlertCircle
} from "lucide-react";
import { Shell, TopBar } from "@/components/kit";
import SiteFooter from "@/components/SiteFooter";
import { getStoredReviews, addEmployerReview } from "@/lib/clientStore";
import { useAuth } from "@/context/AuthContext";

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

export default function Reviews() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [activeCategory, setActiveCategory] = useState("All Categories");
  const [ratingFilter, setRatingFilter] = useState("all"); // "all" | "5"
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

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
    const formattedDynamic = dynamic.map((d) => ({
      review_id: d.review_id || `dyn-${Math.random()}`,
      employer_name: d.employer_name || "Verified Client",
      company_name: d.company_name || d.employer_name || "Bengaluru Business",
      area: d.area || "Bengaluru",
      distance_km: d.distance_km || 1.1,
      job_title: d.job_title || "Freelance Gig",
      category: d.category || "Web Development",
      rating: Number(d.rating) || 5,
      pay: d.pay || 12000,
      payment_mode: d.payment_mode || "escrow",
      date_formatted: d.date_formatted || "Recently",
      freelancer_id: d.freelancer_id || "fl-1",
      freelancer_name: d.freelancer_name || "Verified Pro",
      freelancer_skill: d.freelancer_skill || "Specialist",
      text: d.text || "Smooth communication and high quality deliverables.",
      badges: d.badges || ["Verified Delivery"],
    }));
    return [...formattedDynamic, ...SEED_COMMUNITY_REVIEWS];
  }, []);

  const filteredReviews = useMemo(() => {
    return allReviews.filter((r) => {
      const matchCat =
        activeCategory === "All Categories" ||
        r.category?.toLowerCase() === activeCategory.toLowerCase();
      const matchRating = ratingFilter === "all" || r.rating >= 5;
      return matchCat && matchRating;
    });
  }, [allReviews, activeCategory, ratingFilter]);

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
        sub="Real Client &amp; Freelancer Feedback · Bengaluru Gigs"
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
            Reviews
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
              <p className="text-2xl sm:text-3xl font-black text-ink dark:text-white">4.9 / 5.0</p>
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

        {/* Filter Toolbar */}
        <div className="mt-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-2 border-ink dark:border-zinc-800 bg-sand dark:bg-[#1a1a1c] p-3.5 shadow-[3px_3px_0px_#121212]">
          {/* Categories Tab Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
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

          {/* Rating Filter Pill */}
          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            <span className="text-[11px] font-bold text-inkmuted dark:text-zinc-400 uppercase">Rating:</span>
            <button
              type="button"
              onClick={() => setRatingFilter((f) => (f === "5" ? "all" : "5"))}
              className={`border border-ink px-2.5 py-1 text-xs font-black uppercase transition flex items-center gap-1 ${
                ratingFilter === "5"
                  ? "bg-brand text-white"
                  : "bg-white dark:bg-zinc-800 text-ink dark:text-white hover:bg-sand"
              }`}
            >
              <Star size={12} fill={ratingFilter === "5" ? "white" : "#E65A1E"} />
              <span>5 Stars Only</span>
            </button>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {filteredReviews.map((rev) => (
            <div
              key={rev.review_id}
              className="border-2 border-ink dark:border-zinc-700 bg-white dark:bg-[#161618] p-5 sm:p-6 shadow-[4px_4px_0px_#121212] dark:shadow-[4px_4px_0px_#000] flex flex-col justify-between transition hover:-translate-y-0.5"
            >
              <div>
                {/* Review Header: Client, Locality & Rating */}
                <div className="flex items-start justify-between gap-3 border-b border-ink/10 dark:border-zinc-800 pb-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-ink bg-brand font-black text-white text-base shadow-[1.5px_1.5px_0px_#121212]">
                      {rev.employer_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-sm text-ink dark:text-white truncate">
                        {rev.employer_name}
                      </p>
                      <p className="text-xs font-semibold text-brand truncate">
                        {rev.company_name}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-inkmuted dark:text-zinc-400 mt-0.5">
                        <MapPin size={11} className="text-brand shrink-0" />
                        <span>{rev.area}</span>
                        <span>•</span>
                        <span>{rev.date_formatted}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0">
                    <div className="flex items-center gap-0.5">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} size={13} fill="#E65A1E" className="text-brand" />
                      ))}
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
                      ₹{rev.pay.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>

                {/* Review Body */}
                <p className="mt-3 text-xs sm:text-sm leading-relaxed text-ink/90 dark:text-zinc-300 font-medium italic">
                  "{rev.text}"
                </p>

                {/* Review Badges */}
                {rev.badges && rev.badges.length > 0 && (
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

              {/* Freelancer Pro attribution footer */}
              <div className="mt-5 border-t border-ink/10 dark:border-zinc-800 pt-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white text-[10px] font-bold">
                    {rev.freelancer_name.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-ink dark:text-white">{rev.freelancer_name}</span>
                    <span className="text-[10px] text-inkmuted dark:text-zinc-400 ml-1.5">({rev.freelancer_skill})</span>
                  </div>
                </div>

                <Link
                  to={`/employer?pro=${rev.freelancer_id}`}
                  className="text-[11px] font-black text-brand hover:underline flex items-center gap-0.5"
                >
                  <span>Hire Pro</span>
                  <ChevronRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>

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
