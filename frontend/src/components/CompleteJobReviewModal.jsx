import React, { useState } from "react";
import { Star, CheckCircle2, X, Loader2, Sparkles, Building2, User, Award, ShieldCheck } from "lucide-react";
import { apiPost } from "@/lib/api";
import { addEmployerReview } from "@/lib/clientStore";

const PRAISE_TAGS = [
  "⚡ Fast Delivery",
  "🎯 Pixel Perfect",
  "💬 Great Communication",
  "🤝 Highly Recommended",
  "💡 Creative Problem Solver",
  "🔧 Technical Excellence",
];

const RATING_LABELS = {
  5: "Outstanding / Exceeded Expectations (5.0)",
  4: "Very Good / High Quality Deliverable (4.0)",
  3: "Good / Met Requirements (3.0)",
  2: "Fair / Needed Multiple Revisions (2.0)",
  1: "Unsatisfactory (1.0)",
};

export default function CompleteJobReviewModal({
  isOpen,
  onClose,
  job,
  employerName = "Verified Employer",
  onSuccess,
}) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [freelancerName, setFreelancerName] = useState("Kavya Murthy");
  const [feedback, setFeedback] = useState("");
  const [selectedBadges, setSelectedBadges] = useState(["⚡ Fast Delivery", "🎯 Pixel Perfect"]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !job) return null;

  const toggleBadge = (tag) => {
    setSelectedBadges((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!feedback.trim()) {
      setError("Please write a few words of feedback for the freelancer.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const reviewPayload = {
        job_id: job.id,
        job_title: job.title,
        pay: job.pay || 15000,
        freelancer_id: job.freelancer_id || "fl-1",
        freelancer_name: freelancerName.trim() || "Freelancer Pro",
        employer_name: employerName || job.company_name || "Bengaluru Client",
        company_name: job.company_name || employerName || "Bengaluru Client",
        rating: Number(rating),
        text: feedback.trim(),
        badges: selectedBadges,
      };

      // Call API / clientStore
      try {
        await apiPost(`/employer/jobs/${job.id}/complete-and-review`, reviewPayload);
      } catch {
        // Fallback local store
        addEmployerReview(reviewPayload);
      }

      if (onSuccess) {
        onSuccess(reviewPayload);
      }
      onClose();
    } catch (err) {
      setError(err?.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const activeRating = hoverRating || rating;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg border-2 border-ink bg-white dark:bg-[#161618] p-5 sm:p-7 shadow-[5px_5px_0px_#121212] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b-2 border-ink pb-3 mb-4">
          <div>
            <span className="border border-ink bg-ok text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
              JOB COMPLETION &amp; FEEDBACK
            </span>
            <h2 className="text-xl font-black text-ink dark:text-white mt-1">
              Rate &amp; Review Freelancer
            </h2>
            <p className="text-xs text-inkmuted font-semibold mt-0.5">
              Review for: <strong className="text-ink dark:text-white">{job.title}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center border-2 border-ink bg-sand hover:bg-ink hover:text-white transition"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Freelancer Name Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-ink dark:text-stone-300">
              FREELANCER / PRO NAME
            </label>
            <div className="flex items-center gap-2 border-2 border-ink bg-[#f9f9f9] dark:bg-stone-800 px-3 py-2">
              <User size={15} className="text-brand shrink-0" />
              <input
                type="text"
                value={freelancerName}
                onChange={(e) => setFreelancerName(e.target.value)}
                placeholder="e.g. Kavya Murthy, Rohit N."
                className="w-full bg-transparent text-sm font-bold text-ink dark:text-white outline-none"
              />
            </div>
          </div>

          {/* Star Rating Selector */}
          <div className="flex flex-col gap-1.5 border-2 border-ink bg-sand/40 dark:bg-stone-800/40 p-3.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-ink dark:text-stone-300">
              STAR RATING
            </label>
            <div className="flex items-center gap-1.5 my-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    size={28}
                    className={
                      star <= activeRating
                        ? "text-amber-500 fill-amber-500"
                        : "text-ink/30 dark:text-stone-600"
                    }
                  />
                </button>
              ))}
              <span className="ml-2 text-base font-black text-ink dark:text-white">
                {activeRating}.0
              </span>
            </div>
            <p className="text-xs font-bold text-brand">
              {RATING_LABELS[activeRating] || "Select rating"}
            </p>
          </div>

          {/* Praise Tags */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-ink dark:text-stone-300">
              ADD RECOGNITION BADGES (OPTIONAL)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRAISE_TAGS.map((tag) => {
                const isSelected = selectedBadges.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggleBadge(tag)}
                    className={`border px-2.5 py-1 text-xs font-black transition ${
                      isSelected
                        ? "border-ink bg-brand text-white shadow-[1px_1px_0px_#121212]"
                        : "border-ink/30 bg-white dark:bg-stone-800 text-ink dark:text-stone-300 hover:border-ink"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback Textarea */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-ink dark:text-stone-300">
              WRITTEN CLIENT FEEDBACK &amp; REVIEW
            </label>
            <textarea
              rows={4}
              value={feedback}
              onChange={(e) => {
                setFeedback(e.target.value);
                if (error) setError("");
              }}
              placeholder="Describe their deliverable quality, speed, communication, and overall collaboration experience..."
              className="border-2 border-ink bg-white dark:bg-stone-800 p-3 text-sm font-semibold text-ink dark:text-white outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          {error && (
            <div className="border border-red-500 bg-red-50 p-2 text-xs font-bold text-red-600">
              {error}
            </div>
          )}

          {/* Trust strip */}
          <div className="flex items-center gap-2 border border-ok/40 bg-ok/10 p-2.5 text-xs font-semibold text-ok">
            <ShieldCheck size={16} className="shrink-0" />
            <span>
              This feedback will be verified and displayed in the freelancer's public profile and work history.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink/15">
            <button
              type="button"
              onClick={onClose}
              className="border-2 border-ink bg-white dark:bg-stone-800 px-4 py-2.5 text-xs font-black text-ink dark:text-white hover:bg-sand"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 border-2 border-ink bg-ok px-5 py-2.5 text-xs font-black text-white hover:bg-ok/90 transition shadow-[2px_2px_0px_#121212] disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> SUBMITTING…
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} /> SUBMIT REVIEW &amp; COMPLETE
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
