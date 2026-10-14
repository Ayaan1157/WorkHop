import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  User,
  Building2,
  Tag,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { submitProfessionSuggestion } from "@/lib/api";
import { supabaseSubmitProfessionSuggestion } from "@/lib/supabase";

const POPULAR_SUGGESTIONS = [
  "Drone Videography & FPV",
  "AI Voiceover & Dubbing",
  "Interior & Spatial Styling",
  "Sound Design & Foley",
  "Fitness & Yoga Trainer",
  "Fashion & Wardrobe Styling",
  "Pet Photography & Grooming",
  "Event Host & Emcee",
  "Tattoo Artist",
  "CAD & 3D Printing",
];

const CATEGORY_OPTIONS = [
  "General / Not Sure",
  "Graphics & Design",
  "Video & Animation",
  "AI & Smart Automations",
  "Tech & Code",
  "Digital Marketing",
  "Writing & Translation",
  "Music & Audio",
  "Business & Operations",
  "Lifestyle & Events",
  "Education & Consulting",
  "Create a Brand New Main Tab",
];

export default function SuggestProfessionModal({
  isOpen,
  onClose,
  initialProfession = "",
  initialCategory = "",
  onSuccess,
}) {
  const { user } = useAuth();
  const [profession, setProfession] = useState(initialProfession || "");
  const [categoryHint, setCategoryHint] = useState(initialCategory || "General / Not Sure");
  const [details, setDetails] = useState("");
  const [role, setRole] = useState(() => (user?.role === "employer" ? "employer" : "freelancer"));
  const [contact, setContact] = useState(() => user?.email || user?.phone || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedItem, setSubmittedItem] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setProfession(initialProfession || "");
      if (initialCategory) setCategoryHint(initialCategory);
      if (user?.email || user?.phone) {
        setContact(user.email || user.phone || "");
      }
      setError(null);
      setSubmitted(false);
      setSubmittedItem(null);
    }
  }, [isOpen, initialProfession, initialCategory, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanProf = profession.trim();
    if (!cleanProf) {
      setError("Please enter the profession or skill name.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      profession: cleanProf,
      category_hint: categoryHint,
      details: details.trim(),
      description: details.trim(),
      user_role: role,
      user_email: contact.includes("@") ? contact.trim() : "",
      user_phone: !contact.includes("@") ? contact.trim() : "",
      area: "Bengaluru",
    };

    try {
      // 1. Submit via WorkHop API / clientStore
      const res = await submitProfessionSuggestion(payload);

      // 2. Also try recording in Supabase if configured
      try {
        await supabaseSubmitProfessionSuggestion(payload);
      } catch {
        /* best effort */
      }

      setSubmitted(true);
      setSubmittedItem({
        profession: cleanProf,
        count: res?.request_count || 1,
      });

      if (typeof onSuccess === "function") {
        onSuccess(cleanProf);
      }
    } catch (err) {
      setError(err?.message || "Could not submit suggestion. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg border-2 border-ink dark:border-stone-600 bg-white dark:bg-[#181818] p-5 sm:p-6 shadow-[5px_5px_0px_#121212] dark:shadow-[5px_5px_0px_#FF5A1F] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          data-testid="suggest-modal-close"
          onClick={onClose}
          className="absolute right-3.5 top-3.5 flex h-8 w-8 items-center justify-center border border-ink bg-sand dark:bg-[#252525] text-ink dark:text-white hover:bg-brand hover:text-white transition shadow-[1px_1px_0px_#121212]"
        >
          <X size={16} />
        </button>

        {submitted ? (
          /* Success Screen */
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-600 shadow-[2px_2px_0px_#059669]">
              <CheckCircle2 size={32} />
            </div>

            <span className="inline-block bg-[#FFE082] text-ink px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider mb-2 border border-ink shadow-[1px_1px_0px_#121212]">
              SUGGESTION LOGGED ✓
            </span>

            <h3 className="text-xl font-black text-ink dark:text-white">
              "{submittedItem?.profession}" Recorded!
            </h3>

            <p className="mt-2 text-xs sm:text-sm text-inkmuted dark:text-stone-300 max-w-sm mx-auto leading-relaxed">
              Thank you for helping shape WorkHop! We review requested professions weekly to add dedicated tabs and skills taxonomy across Bengaluru.
            </p>

            {submittedItem?.count > 1 && (
              <div className="mt-3 inline-flex items-center gap-1.5 border border-brand bg-brand/10 dark:bg-brand/20 px-3 py-1 text-xs font-bold text-brand">
                <TrendingUp size={14} />
                <span>Upvoted! Total {submittedItem.count} people have requested this tab.</span>
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={onClose}
                className="border-2 border-ink bg-brand px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-[2px_2px_0px_#121212] hover:bg-brand/90 transition active:translate-y-0.5"
              >
                DONE &amp; CONTINUE
              </button>
            </div>
          </div>
        ) : (
          /* Suggestion Form */
          <div>
            <div className="flex items-start gap-3 mb-4 pr-8">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink bg-brand text-white shadow-[2px_2px_0px_#121212]">
                <Sparkles size={20} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-brand tracking-wider">
                  COMMUNITY TAXONOMY
                </span>
                <h3 className="text-lg font-black text-ink dark:text-white leading-tight">
                  Can't Find Your Profession?
                </h3>
                <p className="text-xs text-inkmuted dark:text-stone-400 mt-0.5">
                  Tell us what professional tab or category you'd like added to WorkHop.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 border border-red-500 bg-red-50 dark:bg-red-950/40 p-2.5 text-xs font-bold text-red-700 dark:text-red-300">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Field 1: Profession Title */}
              <div>
                <label className="block text-xs font-black uppercase text-ink dark:text-white mb-1">
                  Profession / Skill Name <span className="text-brand">*</span>
                </label>
                <input
                  type="text"
                  required
                  data-testid="suggest-profession-input"
                  value={profession}
                  onChange={(e) => {
                    setProfession(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. Drone Videographer, AI Voiceover, Fashion Stylist..."
                  className="w-full border-2 border-ink dark:border-stone-600 bg-sand/30 dark:bg-[#202020] px-3 py-2 text-sm font-bold text-ink dark:text-white placeholder:font-normal placeholder:text-stone-400 focus:border-brand focus:outline-none"
                  autoFocus
                />

                {/* Popular Suggestion Chips */}
                <div className="mt-2">
                  <span className="text-[10px] font-black uppercase text-inkmuted dark:text-stone-400 block mb-1">
                    POPULAR REQUESTS (TAP TO SELECT):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto wh-scroll">
                    {POPULAR_SUGGESTIONS.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => {
                          setProfession(sug);
                          if (error) setError(null);
                        }}
                        className={`border px-2 py-0.5 text-[10px] font-bold transition ${
                          profession === sug
                            ? "border-brand bg-brand text-white shadow-[1px_1px_0px_#121212]"
                            : "border-ink/30 dark:border-stone-700 bg-white dark:bg-[#222] text-ink dark:text-stone-300 hover:border-brand"
                        }`}
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Field 2: Category Hint */}
              <div>
                <label className="block text-xs font-black uppercase text-ink dark:text-white mb-1">
                  Which category does this fit under?
                </label>
                <select
                  value={categoryHint}
                  onChange={(e) => setCategoryHint(e.target.value)}
                  className="w-full border-2 border-ink dark:border-stone-600 bg-white dark:bg-[#202020] px-3 py-2 text-xs font-bold text-ink dark:text-white focus:border-brand focus:outline-none"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 3: Details */}
              <div>
                <label className="block text-xs font-black uppercase text-ink dark:text-white mb-1">
                  Why should we add this tab? <span className="text-inkmuted font-normal text-[10px]">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="e.g. Lots of cafes and builders in Indiranagar/Koramangala need drone videographers..."
                  className="w-full border-2 border-ink dark:border-stone-600 bg-sand/30 dark:bg-[#202020] px-3 py-2 text-xs font-medium text-ink dark:text-white placeholder:font-normal placeholder:text-stone-400 focus:border-brand focus:outline-none resize-none"
                />
              </div>

              {/* Field 4: User Role */}
              <div>
                <label className="block text-xs font-black uppercase text-ink dark:text-white mb-1.5">
                  I am a...
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "freelancer", label: "Freelancer / Pro", icon: Briefcase },
                    { id: "employer", label: "Client / Hiring", icon: Building2 },
                    { id: "visitor", label: "Just Exploring", icon: User },
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = role === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setRole(item.id)}
                        className={`flex items-center justify-center gap-1.5 border-2 p-2 text-[11px] font-black transition ${
                          active
                            ? "border-brand bg-brand text-white shadow-[2px_2px_0px_#121212]"
                            : "border-ink dark:border-stone-700 bg-white dark:bg-[#202020] text-ink dark:text-stone-300 hover:bg-sand"
                        }`}
                      >
                        <Icon size={13} className="shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Field 5: Contact for Launch Alert */}
              <div>
                <label className="block text-xs font-black uppercase text-ink dark:text-white mb-1">
                  Email or Phone <span className="text-inkmuted font-normal text-[10px]">(Optional · get notified when tab is added)</span>
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="your.email@example.com or 10-digit phone"
                  className="w-full border-2 border-ink dark:border-stone-600 bg-white dark:bg-[#202020] px-3 py-2 text-xs font-bold text-ink dark:text-white placeholder:font-normal placeholder:text-stone-400 focus:border-brand focus:outline-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  data-testid="submit-profession-btn"
                  className="w-full border-2 border-ink bg-brand py-3 text-xs font-black uppercase tracking-wider text-white shadow-[3px_3px_0px_#121212] hover:bg-brand/90 transition active:translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>SUBMITTING SUGGESTION...</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>SUGGEST PROFESSION TAB</span>
                    </>
                  )}
                </button>
                <p className="mt-2 text-center text-[10px] text-inkmuted dark:text-stone-400">
                  We check community requests weekly to add Bangalore's most requested categories.
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
