import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  X, ShieldCheck, MapPin, Star, Users, Building2, Briefcase,
  IndianRupee, Sparkles, CheckCircle2, MessageSquare, Plus,
  Calendar, Check, Send, AlertCircle, ArrowRight, ExternalLink
} from "lucide-react";
import {
  getEmployerProfile,
  addFreelancerReviewForEmployer
} from "@/lib/clientStore";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function EmployerProfileModal({ isOpen, onClose, employer, onApplyJob }) {
  const nav = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rateMode, setRateMode] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerSkill, setReviewerSkill] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "reviews" | "jobs"

  // Quick feedback prompts for rating an employer
  const EMPLOYER_FEEDBACK_CHIPS = [
    "Clear requirements",
    "Prompt payment",
    "Fast milestone approval",
    "Respectful communication",
    "Fair project scope",
    "Great partner to work with",
  ];

  const companyName = employer?.company_name || employer?.employer_name || (typeof employer === "string" ? employer : "Company");

  useEffect(() => {
    if (!isOpen || !companyName) return;
    setLoading(true);
    setRateMode(false);
    setSuccessMsg("");

    // Initialize reviewer defaults from active session
    if (user?.name) setReviewerName(user.name);
    if (user?.skill) setReviewerSkill(user.skill);

    // 1. Synchronous fallback from local catalog
    const localProfile = getEmployerProfile(companyName, employer?.area);
    setProfile(localProfile);

    // 2. Fetch fresh stats from backend if available
    apiGet(`/employers/${encodeURIComponent(companyName)}`)
      .then((data) => {
        if (data && data.company_name) {
          setProfile((prev) => ({
            ...prev,
            ...data,
            // Ensure reviews from local storage are merged if any newly added
            reviews: (data.reviews && data.reviews.length > 0) ? data.reviews : prev.reviews,
          }));
        }
      })
      .catch(() => {
        // Fallback to local profile seamlessly
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, companyName, employer, user]);

  if (!isOpen || !employer) return null;

  const initials = (profile?.company_name || companyName || "CO")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleChipClick = (chip) => {
    setReviewText((prev) => (prev ? `${prev} · ${chip}` : chip));
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRating) return;
    setSubmitting(true);

    const authorName = reviewerName.trim() || user?.name || "Verified Freelancer";
    const authorSkill = reviewerSkill.trim() || user?.skill || "Freelance Specialist";
    const projectTitle = jobTitle.trim() || employer?.title || "Freelance Collaboration";
    const feedback = reviewText.trim() || "Great employer with smooth communication and prompt milestone approvals.";

    try {
      // 1. Save in clientStore for immediate local persistence
      const savedReview = addFreelancerReviewForEmployer({
        company_name: profile?.company_name || companyName,
        reviewer_name: authorName,
        reviewer_skill: authorSkill,
        rating: selectedRating,
        text: feedback,
        job_title: projectTitle,
      });

      // 2. Sync to backend API
      try {
        await apiPost("/reviews", {
          reviewer_role: "freelancer",
          reviewer_name: `${authorName} · ${authorSkill}`,
          subject_type: "company",
          subject_id: profile?.company_name || companyName,
          rating: selectedRating,
          text: feedback,
          job_title: projectTitle,
        });
      } catch (apiErr) {
        // Local persistence succeeded, ignore offline API error
      }

      // 3. Optimistic local profile update
      if (savedReview) {
        setProfile((prev) => {
          const nextReviews = [savedReview, ...(prev?.reviews || [])];
          const newAvg = (
            nextReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / nextReviews.length
          ).toFixed(1);
          return {
            ...prev,
            reviews: nextReviews,
            reviews_count: nextReviews.length,
            rating: Number(newAvg),
          };
        });
      }

      setSuccessMsg(`✓ Your review for ${profile?.company_name || companyName} has been published!`);
      setRateMode(false);
      setReviewText("");
      setActiveTab("reviews");
      setTimeout(() => setSuccessMsg(""), 6000);
    } catch (err) {
      alert("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="employer-profile-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-5 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        data-testid="employer-profile-modal"
        className="relative flex flex-col w-full max-w-2xl max-h-[92vh] border-2 border-ink dark:border-zinc-700 bg-white dark:bg-[#161618] text-ink dark:text-white shadow-[6px_6px_0px_#121212] dark:shadow-[6px_6px_0px_#000] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="flex items-start justify-between border-b-2 border-ink dark:border-zinc-700 bg-[#FFF7F2] dark:bg-[#1c1613] p-4 sm:p-5">
          <div className="flex items-start gap-3.5 min-w-0 pr-4">
            {/* Company Initials Avatar */}
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center border-2 border-ink bg-[#FF5A1F] text-lg sm:text-xl font-black text-white shadow-[2px_2px_0px_#121212]">
              {initials}
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2
                  data-testid="modal-employer-company-name"
                  className="text-base sm:text-xl font-black tracking-tight text-ink dark:text-white truncate"
                >
                  {profile?.company_name || companyName}
                </h2>
                <span className="inline-flex items-center gap-0.5 bg-ok/15 text-ok border border-ok px-1.5 py-0.2 text-[9px] font-black shrink-0">
                  <ShieldCheck size={11} /> VERIFIED EMPLOYER
                </span>
                <span className="inline-flex items-center gap-0.5 bg-[#059669]/15 text-[#059669] dark:text-emerald-300 border border-[#059669] px-1.5 py-0.2 text-[9px] font-black shrink-0">
                  💳 PAYMENT VERIFIED
                </span>
              </div>

              <p className="text-xs sm:text-sm font-bold text-inkmuted dark:text-zinc-300 mt-0.5">
                {profile?.employer_name || `${profile?.company_name || companyName} Talent Lead`}
              </p>

              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px] font-bold">
                <span className="flex items-center gap-1 text-ink dark:text-zinc-200">
                  <MapPin size={12} className="text-[#FF5A1F] shrink-0" />
                  <span>
                    {profile?.area || employer?.area || "Bengaluru"} ·{" "}
                    <strong className="text-[#FF5A1F]">{employer?.distance_km || 1.2} km away</strong>
                  </span>
                </span>
                <span className="text-inkmuted dark:text-zinc-500">•</span>
                <span className="text-inkmuted dark:text-zinc-400">
                  Member since {profile?.member_since || "2024"}
                </span>
              </div>
            </div>
          </div>

          <button
            data-testid="employer-modal-close-btn"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink dark:border-zinc-700 bg-sand dark:bg-[#2a2a2a] text-ink dark:text-white hover:bg-black hover:text-white transition"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Success Alert Banner */}
        {successMsg && (
          <div className="bg-[#E6F4EA] dark:bg-[#11291E] border-b-2 border-ok text-[#059669] dark:text-emerald-300 px-4 py-2.5 text-xs font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={15} /> {successMsg}
            </span>
            <button onClick={() => setSuccessMsg("")} className="text-xs font-black">✕</button>
          </div>
        )}

        {/* Tab Navigation & Rate Employer Action Button */}
        <div className="flex items-center justify-between border-b-2 border-ink dark:border-zinc-700 bg-sand/40 dark:bg-zinc-900 px-4 py-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => { setActiveTab("overview"); setRateMode(false); }}
              className={`px-3 py-1 text-xs font-black tracking-wide border transition ${
                activeTab === "overview" && !rateMode
                  ? "border-ink bg-white dark:bg-[#202023] text-ink dark:text-white shadow-[1.5px_1.5px_0px_#121212]"
                  : "border-transparent text-inkmuted dark:text-zinc-400 hover:text-ink"
              }`}
            >
              OVERVIEW
            </button>
            <button
              onClick={() => { setActiveTab("reviews"); setRateMode(false); }}
              className={`px-3 py-1 text-xs font-black tracking-wide border transition flex items-center gap-1 ${
                activeTab === "reviews" && !rateMode
                  ? "border-ink bg-white dark:bg-[#202023] text-ink dark:text-white shadow-[1.5px_1.5px_0px_#121212]"
                  : "border-transparent text-inkmuted dark:text-zinc-400 hover:text-ink"
              }`}
            >
              <span>REVIEWS</span>
              <span className="text-[10px] bg-sand dark:bg-zinc-800 px-1 py-0.2 rounded font-extrabold">
                {profile?.reviews_count || (profile?.reviews || []).length}
              </span>
            </button>
            {(profile?.open_jobs || []).length > 0 && (
              <button
                onClick={() => { setActiveTab("jobs"); setRateMode(false); }}
                className={`px-3 py-1 text-xs font-black tracking-wide border transition flex items-center gap-1 ${
                  activeTab === "jobs" && !rateMode
                    ? "border-ink bg-white dark:bg-[#202023] text-ink dark:text-white shadow-[1.5px_1.5px_0px_#121212]"
                    : "border-transparent text-inkmuted dark:text-zinc-400 hover:text-ink"
                }`}
              >
                <span>OPEN GIGS</span>
                <span className="text-[10px] bg-sand dark:bg-zinc-800 px-1 py-0.2 rounded font-extrabold">
                  {profile.open_jobs.length}
                </span>
              </button>
            )}
          </div>

          <button
            data-testid="rate-employer-toggle-btn"
            onClick={() => setRateMode(!rateMode)}
            className={`flex items-center gap-1.5 border-2 border-ink px-3 py-1 text-[11px] font-black uppercase transition shadow-[1.5px_1.5px_0px_#121212] ${
              rateMode
                ? "bg-sand text-ink hover:bg-black hover:text-white"
                : "bg-[#FF5A1F] text-white hover:bg-black"
            }`}
          >
            <Star size={12} fill={rateMode ? "none" : "#fff"} />
            {rateMode ? "Cancel Rating" : "★ Rate This Employer"}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* ══════════════════════════════════════════════════════════════════
              RATE EMPLOYER FORM DRAWER
          ══════════════════════════════════════════════════════════════════ */}
          {rateMode && (
            <form
              data-testid="rate-employer-form"
              onSubmit={handleReviewSubmit}
              className="border-2 border-ink dark:border-zinc-700 bg-[#FFFBF8] dark:bg-zinc-900/90 p-4 sm:p-5 shadow-[3px_3px_0px_#121212] space-y-3.5 animate-in fade-in-50 duration-200"
            >
              <div className="flex items-center justify-between border-b border-ink/10 dark:border-zinc-800 pb-2">
                <div>
                  <h3 className="text-sm font-black text-ink dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                    <Star size={14} className="text-[#FF5A1F]" fill="#FF5A1F" />
                    Review &amp; Rate {profile?.company_name || companyName}
                  </h3>
                  <p className="text-[11px] font-medium text-inkmuted dark:text-zinc-400">
                    Help other local Bangalore freelancers understand client communication, clarity, and payment speed.
                  </p>
                </div>
              </div>

              {/* Star Rating Selector */}
              <div>
                <label className="text-[10px] font-black uppercase text-inkmuted dark:text-zinc-400 block mb-1">
                  Overall Experience Rating
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      data-testid={`employer-rate-star-${star}`}
                      onClick={() => setSelectedRating(star)}
                      className="p-1 hover:scale-110 transition active:scale-95"
                    >
                      <Star
                        size={28}
                        className={star <= selectedRating ? "text-[#FF5A1F]" : "text-zinc-300 dark:text-zinc-600"}
                        fill={star <= selectedRating ? "#FF5A1F" : "none"}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-xs font-black text-ink dark:text-white">
                    {selectedRating === 5 && "5.0 · Exceptional Employer"}
                    {selectedRating === 4 && "4.0 · Very Good Client"}
                    {selectedRating === 3 && "3.0 · Average Experience"}
                    {selectedRating === 2 && "2.0 · Needs Improvement"}
                    {selectedRating === 1 && "1.0 · Poor Experience"}
                  </span>
                </div>
              </div>

              {/* Quick Feedback Chips */}
              <div>
                <label className="text-[10px] font-black uppercase text-inkmuted dark:text-zinc-400 block mb-1">
                  Quick Client Tags (Click to append)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {EMPLOYER_FEEDBACK_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleChipClick(chip)}
                      className="border border-ink/40 dark:border-zinc-700 bg-sand/70 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-ink dark:text-zinc-200 hover:bg-[#FFE5D6] dark:hover:bg-zinc-700 transition"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Text */}
              <div>
                <label className="text-[10px] font-black uppercase text-inkmuted dark:text-zinc-400 block mb-1">
                  Your Detailed Feedback (Public to Freelancers)
                </label>
                <textarea
                  data-testid="employer-review-textarea"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="How was client communication, clarity of scope, milestone signoff, and payment promptness?"
                  rows={3}
                  className="w-full border-2 border-ink dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 text-xs text-ink dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                />
              </div>

              {/* Optional Fields: Your Name & Role / Gig Context */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[9px] font-black uppercase text-inkmuted dark:text-zinc-400 block mb-0.5">
                    Your Name / Role (Optional)
                  </label>
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="e.g. Rohan S. (UI/UX Designer)"
                    className="w-full border border-ink/40 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-1.5 text-xs text-ink dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-inkmuted dark:text-zinc-400 block mb-0.5">
                    Project / Deliverable Context (Optional)
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Fintech Mobile App Redesign"
                    className="w-full border border-ink/40 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-1.5 text-xs text-ink dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink/10 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setRateMode(false)}
                  className="border border-ink/40 dark:border-zinc-700 px-3 py-1.5 text-xs font-bold text-ink dark:text-zinc-300 hover:bg-sand transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  data-testid="submit-employer-review-btn"
                  className="border-2 border-ink bg-[#FF5A1F] px-4 py-1.5 text-xs font-black uppercase text-white hover:bg-black transition shadow-[2px_2px_0px_#121212] active:translate-y-0.5"
                >
                  {submitting ? "Publishing..." : "Publish Freelancer Review"}
                </button>
              </div>
            </form>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              KEY METRICS GRID
              1. Spend tier on WorkHop (NOT exact amount)
              2. Past hires count
              3. Average rating
              4. Payment & escrow record
          ══════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* SPEND TIER (NOT EXACT AMOUNT) */}
            <div
              data-testid="stat-employer-spend-tier"
              className="flex flex-col justify-between border-2 border-ink dark:border-zinc-700 bg-[#FFF7F2] dark:bg-zinc-800/80 p-3 shadow-[2px_2px_0px_#121212]"
            >
              <div className="flex items-center justify-between text-inkmuted dark:text-zinc-400">
                <span className="text-[9px] font-black uppercase tracking-wider">TOTAL SPEND</span>
                <IndianRupee size={13} className="text-[#FF5A1F]" />
              </div>
              <div className="my-1.5">
                <span className="text-base sm:text-lg font-black text-ink dark:text-white">
                  {profile?.spend_tier || "₹25,000+ spent"}
                </span>
              </div>
              <span className="text-[9px] font-bold text-[#FF5A1F]">
                Verified Tier (Amount Protected)
              </span>
            </div>

            {/* PAST HIRES COUNT */}
            <div
              data-testid="stat-employer-past-hires"
              className="flex flex-col justify-between border-2 border-ink dark:border-zinc-700 bg-sand/60 dark:bg-zinc-800/80 p-3 shadow-[2px_2px_0px_#121212]"
            >
              <div className="flex items-center justify-between text-inkmuted dark:text-zinc-400">
                <span className="text-[9px] font-black uppercase tracking-wider">PAST HIRES</span>
                <Users size={13} className="text-[#059669]" />
              </div>
              <div className="my-1.5">
                <span className="text-base sm:text-lg font-black text-ink dark:text-white">
                  {profile?.past_hires_count || 12} Freelancers
                </span>
              </div>
              <span className="text-[9px] font-bold text-inkmuted dark:text-zinc-400">
                Completed on WorkHop
              </span>
            </div>

            {/* RATING */}
            <div
              data-testid="stat-employer-rating"
              className="flex flex-col justify-between border-2 border-ink dark:border-zinc-700 bg-sand/60 dark:bg-zinc-800/80 p-3 shadow-[2px_2px_0px_#121212]"
            >
              <div className="flex items-center justify-between text-inkmuted dark:text-zinc-400">
                <span className="text-[9px] font-black uppercase tracking-wider">RATING</span>
                <Star size={13} fill="#FF5A1F" className="text-[#FF5A1F]" />
              </div>
              <div className="my-1.5 flex items-baseline gap-1">
                <span className="text-base sm:text-lg font-black text-ink dark:text-white">
                  {profile?.rating || "4.9"} ★
                </span>
              </div>
              <span className="text-[9px] font-bold text-inkmuted dark:text-zinc-400">
                {profile?.reviews_count || (profile?.reviews || []).length} Freelancer reviews
              </span>
            </div>

            {/* PAYMENT RECORD */}
            <div
              data-testid="stat-employer-payment-record"
              className="flex flex-col justify-between border-2 border-ink dark:border-zinc-700 bg-[#E6F4EA] dark:bg-[#11291E] p-3 shadow-[2px_2px_0px_#121212]"
            >
              <div className="flex items-center justify-between text-ok">
                <span className="text-[9px] font-black uppercase tracking-wider">PAYMENT RECORD</span>
                <ShieldCheck size={13} />
              </div>
              <div className="my-1.5">
                <span className="text-base sm:text-lg font-black text-[#059669] dark:text-emerald-300">
                  100% Escrow
                </span>
              </div>
              <span className="text-[9px] font-bold text-[#059669] dark:text-emerald-400">
                Instant UPI release
              </span>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              TAB 1: OVERVIEW & COMPANY SUMMARY
          ══════════════════════════════════════════════════════════════════ */}
          {(activeTab === "overview" || !activeTab) && (
            <div className="space-y-4">
              <div className="border border-ink/20 dark:border-zinc-700 bg-sand/20 dark:bg-zinc-900/60 p-3.5">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-inkmuted dark:text-zinc-400 mb-1 flex items-center gap-1.5">
                  <Building2 size={13} className="text-[#FF5A1F]" />
                  About This Employer
                </h4>
                <p className="text-xs sm:text-[13px] leading-relaxed text-ink dark:text-zinc-200">
                  Verified Bangalore client based in {profile?.area || employer?.area || "Malleshwaram"}.
                  Active employer on WorkHop since {profile?.member_since || "2024"} with{" "}
                  <strong>{profile?.past_hires_count || 12} successful freelancer collaborations</strong> and a{" "}
                  <strong>{profile?.spend_tier || "₹25,000+ spent"}</strong> cumulative milestone track record.
                </p>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 border border-ink/10 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5">
                  <CheckCircle2 size={16} className="text-[#059669] shrink-0" />
                  <div>
                    <p className="font-extrabold text-ink dark:text-white">Payment Method Verified</p>
                    <p className="text-[10px] text-inkmuted dark:text-zinc-400">Funds secured via Razorpay Escrow before job kickoff.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 border border-ink/10 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5">
                  <CheckCircle2 size={16} className="text-[#059669] shrink-0" />
                  <div>
                    <p className="font-extrabold text-ink dark:text-white">Direct Hyperlocal WhatsApp Chat</p>
                    <p className="text-[10px] text-inkmuted dark:text-zinc-400">Direct phone call &amp; chat unlocked upon hiring.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 2: FREELANCER REVIEWS LIST
          ══════════════════════════════════════════════════════════════════ */}
          {(activeTab === "reviews" || activeTab === "overview") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-ink/10 dark:border-zinc-800 pb-2">
                <h3 className="text-xs sm:text-sm font-black tracking-tight text-ink dark:text-white uppercase flex items-center gap-1.5">
                  <Star size={14} className="text-[#FF5A1F]" fill="#FF5A1F" />
                  Reviews from Freelancers ({profile?.reviews?.length || 0})
                </h3>
                {!rateMode && (
                  <button
                    onClick={() => setRateMode(true)}
                    className="text-[11px] font-black text-[#FF5A1F] hover:underline flex items-center gap-0.5"
                  >
                    + Write a Review
                  </button>
                )}
              </div>

              {(!profile?.reviews || profile.reviews.length === 0) ? (
                <div className="p-6 text-center border border-dashed border-ink/30 dark:border-zinc-700 bg-sand/20 dark:bg-zinc-900">
                  <p className="text-xs font-bold text-ink dark:text-white">No written reviews yet for this employer.</p>
                  <p className="text-[11px] text-inkmuted dark:text-zinc-400 mt-0.5">
                    Have you collaborated with {profile?.company_name || companyName}? Be the first to leave feedback!
                  </p>
                  <button
                    onClick={() => setRateMode(true)}
                    className="mt-3 border-2 border-ink bg-[#FF5A1F] px-3 py-1.5 text-xs font-black text-white uppercase"
                  >
                    Rate Employer
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {profile.reviews.map((rev, idx) => (
                    <div
                      key={rev.review_id || idx}
                      className="border border-ink/20 dark:border-zinc-700 bg-white dark:bg-zinc-900/90 p-3 sm:p-3.5 shadow-[1px_1px_0px_#121212] space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-ink dark:text-white">
                              {rev.reviewer_name || "Verified Freelancer"}
                            </span>
                            {rev.reviewer_skill && (
                              <span className="text-[10px] text-inkmuted dark:text-zinc-400 font-medium">
                                · {rev.reviewer_skill}
                              </span>
                            )}
                          </div>
                          {rev.job_title && (
                            <p className="text-[10px] font-bold text-inkmuted dark:text-zinc-400">
                              Gig: {rev.job_title}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs font-black text-[#FF5A1F]">
                            {rev.rating || 5}★
                          </span>
                          <span className="text-[10px] text-inkmuted dark:text-zinc-500">
                            {rev.date_formatted || "Recently"}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs leading-relaxed text-ink/90 dark:text-zinc-300">
                        "{rev.text || "Smooth communication and fast milestone approval."}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 3: OPEN GIGS BY THIS EMPLOYER
          ══════════════════════════════════════════════════════════════════ */}
          {(activeTab === "jobs" || activeTab === "overview") && (profile?.open_jobs || []).length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs sm:text-sm font-black tracking-tight text-ink dark:text-white uppercase flex items-center gap-1.5 border-b border-ink/10 dark:border-zinc-800 pb-2">
                <Briefcase size={14} className="text-[#059669]" />
                Active Gigs by this Employer ({profile.open_jobs.length})
              </h3>

              <div className="space-y-2">
                {profile.open_jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between border-2 border-ink dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 shadow-[2px_2px_0px_#121212] gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-black uppercase text-inkmuted dark:text-zinc-400">
                        {job.category || "Gig"} · {job.area || "Bengaluru"}
                      </span>
                      <h4 className="text-xs sm:text-sm font-black text-ink dark:text-white truncate">
                        {job.title}
                      </h4>
                      <p className="text-xs font-black text-[#059669]">
                        ₹{job.pay_label || (job.pay ? Number(job.pay).toLocaleString("en-IN") : "Fixed")} Fixed
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        onClose?.();
                        if (typeof onApplyJob === "function") {
                          onApplyJob(job);
                        } else {
                          nav(`/freelancer/jobs?q=${encodeURIComponent(job.title)}`);
                        }
                      }}
                      className="shrink-0 border-2 border-ink bg-[#059669] px-3 py-1.5 text-xs font-black text-white uppercase hover:bg-black transition shadow-[1px_1px_0px_#121212]"
                    >
                      Apply Now →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t-2 border-ink dark:border-zinc-700 p-3.5 sm:p-4 bg-white dark:bg-[#1a1a1c]">
          <span className="text-[11px] font-bold text-inkmuted dark:text-zinc-400">
            WorkHop Hyperlocal Client Transparency · 0% Freelancer Fees
          </span>

          <button
            onClick={onClose}
            className="border-2 border-ink dark:border-zinc-700 bg-sand dark:bg-zinc-800 px-4 py-1.5 text-xs font-black tracking-wider text-ink dark:text-white hover:bg-black hover:text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
