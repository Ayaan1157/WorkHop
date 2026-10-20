import React, { useState } from "react";
import {
  MapPin,
  X,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Building2,
  User,
  Send,
  Loader2,
  Compass,
  ShieldCheck,
  Globe,
} from "lucide-react";
import { useCityGate } from "@/hooks/useCityGate";

export default function CityRestrictionModal({
  forceOpen = false,
  onClose = null,
}) {
  const {
    isOutsideCity,
    detectedCity,
    distanceKm,
    isPreviewMode,
    isGateOpen,
    closeGateModal,
    enablePreviewMode,
    exitPreviewMode,
    submitWaitlist,
  } = useCityGate();

  const [cityInput, setCityInput] = useState(detectedCity || "your area");
  const [contactInput, setContactInput] = useState("");
  const [roleInput, setRoleInput] = useState("employer"); // "employer" | "freelancer"
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [waitlistCount, setWaitlistCount] = useState(148);

  // Auto-fill logged-in user email if available
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("workhop_user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u?.email && !contactInput) {
          setContactInput(u.email);
        }
      }
    } catch {}
  }, [contactInput]);

  // Sync cityInput when detectedCity updates
  React.useEffect(() => {
    if (detectedCity && (!cityInput || cityInput === "your area" || cityInput === "Mysore")) {
      setCityInput(detectedCity);
    }
  }, [detectedCity, cityInput]);

  const showModal = forceOpen || (isGateOpen && !isPreviewMode);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contactInput.trim()) return;

    setSubmitting(true);
    try {
      const res = await submitWaitlist({
        city: cityInput.trim() || detectedCity || "your city",
        email: contactInput.trim(),
        contact: contactInput.trim(),
        role: roleInput,
      });
      if (res && res.ok) {
        setSubmitted(true);
        setWaitlistCount(res.waitlist_count || 149);
        setSubmitMessage(res.message || `You're on the waitlist for ${cityInput || "your city"}!`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismissPreview = () => {
    enablePreviewMode();
    if (onClose) onClose();
  };

  return (
    <>
      {/* 1. Sticky Preview Mode Banner (shown when user is outside Bengaluru but previewing) */}
      {isPreviewMode && isOutsideCity && (
        <div className="bg-sand border-b-2 border-ink px-3 py-1.5 text-ink text-xs font-black flex items-center justify-between gap-2 shadow-[0_2px_0px_#121212] z-40 relative animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-brand animate-ping"></span>
            <span className="bg-brand text-white text-[9px] px-1.5 py-0.2 uppercase font-black border border-ink">
              PREVIEW MODE
            </span>
            <span className="text-[11px] font-bold">
              WorkHop is not available in {detectedCity || "your region"} yet ({distanceKm ? `~${distanceKm}km from Bengaluru` : "outside Bengaluru"}). You are previewing Bengaluru listings.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={exitPreviewMode}
              className="border border-ink bg-white px-2 py-0.5 text-[10px] font-black uppercase hover:bg-sand transition"
            >
              View Region Status
            </button>
          </div>
        </div>
      )}

      {/* 2. Geofence Interstitial Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg border-3 border-ink bg-white dark:bg-[#151515] text-ink dark:text-white shadow-[8px_8px_0px_#121212] dark:shadow-[8px_8px_0px_#333]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-3 border-ink bg-brand px-5 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-white text-brand shadow-[1.5px_1.5px_0px_#121212]">
                  <MapPin size={20} className="fill-brand" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    Not Available In Your Region Yet
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-wider text-white/90">
                    WorkHop is currently exclusive to Bengaluru
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismissPreview}
                title="Preview Bengaluru Platform"
                className="flex h-7 w-7 items-center justify-center border-2 border-ink bg-white text-ink hover:bg-sand transition shadow-[1px_1px_0px_#121212]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Primary Notification Box */}
              <div className="border-2 border-ink bg-[#FFF5EE] dark:bg-[#251812] p-4 shadow-[2px_2px_0px_#121212]">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-white font-black text-xs">
                    !
                  </div>
                  <div>
                    <h4 className="text-base font-black tracking-tight text-ink dark:text-white">
                      WorkHop is not available in {detectedCity || "your region"} yet
                    </h4>
                    <p className="text-xs text-inkmuted dark:text-stone-300 font-medium mt-1 leading-relaxed">
                      We detected your location in <strong>{detectedCity || "a region outside Bengaluru"}</strong>{distanceKm ? ` (~${distanceKm} km away)` : ""}. WorkHop operates on a strict <strong>5-kilometer hyperlocal radius</strong> with 100% physically verified local freelancers and milestone-protected escrow.
                    </p>
                    <p className="text-xs text-inkmuted dark:text-stone-300 font-medium mt-2">
                      To guarantee same-day availability and trusted quality, we are currently live exclusively across <strong>Bengaluru</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* City Expansion Waitlist Form */}
              <div className="border-2 border-ink bg-white dark:bg-[#1c1c1c] p-4 space-y-3.5 shadow-[2px_2px_0px_#121212]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-brand fill-brand" />
                    <span className="text-xs font-black uppercase tracking-wider text-ink dark:text-white">
                      Vote to Bring WorkHop to Your Region
                    </span>
                  </div>
                  <span className="bg-[#E5F7E0] dark:bg-[#132c18] text-[#0E6220] dark:text-[#6ee7b7] text-[9px] font-black uppercase px-2 py-0.5 border border-ink/40">
                    EXPANDING NEXT
                  </span>
                </div>

                {submitted ? (
                  <div className="bg-[#E5F7E0] dark:bg-[#132c18] border-2 border-ink p-4 text-center space-y-2">
                    <CheckCircle2 size={24} className="text-[#0E6220] dark:text-[#6ee7b7] mx-auto" />
                    <p className="text-xs font-black uppercase tracking-wider text-[#0E6220] dark:text-[#6ee7b7]">
                      {submitMessage}
                    </p>
                    <p className="text-[11px] text-inkmuted dark:text-stone-300 font-medium">
                      You are #{waitlistCount} on the {cityInput || "city"} launch list. We prioritize city launches by waitlist demand!
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400 mb-1">
                          Your City:
                        </label>
                        <input
                          type="text"
                          required
                          value={cityInput}
                          onChange={(e) => setCityInput(e.target.value)}
                          placeholder="e.g. Mysore, Mangalore, Hubli..."
                          className="w-full border-2 border-ink bg-sand/30 dark:bg-[#252525] px-3 py-2 text-xs font-bold text-ink dark:text-white outline-none focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400 mb-1">
                          Your Email Address:
                        </label>
                        <input
                          type="email"
                          required
                          value={contactInput}
                          onChange={(e) => setContactInput(e.target.value)}
                          placeholder="e.g. name@gmail.com"
                          className="w-full border-2 border-ink bg-sand/30 dark:bg-[#252525] px-3 py-2 text-xs font-bold text-ink dark:text-white outline-none focus:bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400 mb-1">
                        I primarily want to:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRoleInput("employer")}
                          className={`flex items-center justify-center gap-1.5 border-2 border-ink py-1.5 text-xs font-black transition ${
                            roleInput === "employer"
                              ? "bg-brand text-white shadow-[1.5px_1.5px_0px_#121212]"
                              : "bg-white dark:bg-[#222] text-ink dark:text-white hover:bg-sand"
                          }`}
                        >
                          <Building2 size={13} />
                          <span>Hire Local Talent</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRoleInput("freelancer")}
                          className={`flex items-center justify-center gap-1.5 border-2 border-ink py-1.5 text-xs font-black transition ${
                            roleInput === "freelancer"
                              ? "bg-brand text-white shadow-[1.5px_1.5px_0px_#121212]"
                              : "bg-white dark:bg-[#222] text-ink dark:text-white hover:bg-sand"
                          }`}
                        >
                          <User size={13} />
                          <span>Work as Freelancer</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-inkmuted dark:text-stone-400">
                      💡 Your email is saved directly in our admin dashboard so our team can send you an invite as soon as we open in {cityInput || "your city"}.
                    </p>

                    <button
                      type="submit"
                      disabled={submitting || !contactInput.trim()}
                      className="w-full flex items-center justify-center gap-2 border-2 border-ink bg-brand px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-[2.5px_2.5px_0px_#121212] transition hover:bg-brand/90 active:translate-y-0.5 disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                      <span>Join Launch List for {cityInput || "My City"} &rarr;</span>
                    </button>
                  </form>
                )}
              </div>

              {/* Alternative: Bengaluru Preview Mode for Remote Employers / Testers */}
              <div className="border border-dashed border-ink/40 p-3.5 bg-sand/20 dark:bg-[#1a1a1a] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="space-y-0.5 text-center sm:text-left">
                  <p className="text-xs font-black text-ink dark:text-white">
                    Visiting or hiring Bengaluru talent remotely?
                  </p>
                  <p className="text-[11px] text-inkmuted dark:text-stone-400">
                    You can preview the live platform and browse Bengaluru's local talent network.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDismissPreview}
                  className="shrink-0 flex items-center gap-1 border-2 border-ink bg-white dark:bg-[#252525] px-3.5 py-1.5 text-xs font-black uppercase text-ink dark:text-white shadow-[2px_2px_0px_#121212] hover:bg-sand transition"
                >
                  <span>Explore Bengaluru</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
