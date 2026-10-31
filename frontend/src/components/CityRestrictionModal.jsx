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
  Navigation,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useCityGate } from "@/hooks/useCityGate";
import {
  isLocationInBengaluru,
  getDistanceFromBengaluru,
  setCityOverride,
} from "@/lib/locationAreas";

const POPULAR_BENGALURU_AREAS = [
  "Koramangala",
  "Indiranagar",
  "HSR Layout",
  "Whitefield",
  "Jayanagar",
  "MG Road",
  "BTM Layout",
  "Electronic City",
  "Bellandur",
  "JP Nagar",
  "Malleshwaram",
  "Marathahalli",
  "Sarjapur Road",
  "Hebbal",
];

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
    detectAccurateGps,
    setManualLocation,
  } = useCityGate();

  // Location resolution states
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [gpsSuccess, setGpsSuccess] = useState(null);
  const [selectedManualArea, setSelectedManualArea] = useState("");
  const [customAreaInput, setCustomAreaInput] = useState("");
  const [showWaitlist, setShowWaitlist] = useState(false);

  // Waitlist form states
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

  // 1. Detect Exact Phone Satellite GPS
  const handleDetectExactGps = async () => {
    setDetectingGps(true);
    setGpsError(null);
    setGpsSuccess(null);

    try {
      const res = await detectAccurateGps(15000);
      if (res.success && res.coords) {
        const inBlr = isLocationInBengaluru(res.coords);
        if (inBlr) {
          setGpsSuccess("Exact GPS verified inside Bengaluru! Opening WorkHop...");
          setCityOverride(true);
          enablePreviewMode();
          setTimeout(() => {
            closeGateModal();
            if (onClose) onClose();
          }, 800);
        } else {
          const dist = getDistanceFromBengaluru(res.coords);
          setGpsError(
            `Device GPS located you outside Bengaluru (~${dist} km away). You can select your Bengaluru neighborhood manually below, or explore in preview mode.`
          );
        }
      } else {
        setGpsError(
          res.error ||
            "Could not get GPS fix. Please ensure your phone's Location / GPS is turned ON, or choose your neighborhood manually below."
        );
      }
    } catch {
      setGpsError("Failed to acquire GPS. Please choose your Bengaluru neighborhood manually below.");
    } finally {
      setDetectingGps(false);
    }
  };

  // 2. Select or enter Manual Location
  const handleApplyManualLocation = (areaName) => {
    const target = (areaName || customAreaInput || selectedManualArea || "").trim();
    if (!target) return;

    setManualLocation(target);
    setCityOverride(true);
    enablePreviewMode();
    closeGateModal();
    if (onClose) onClose();
  };

  // 3. Submit City Waitlist
  const handleSubmitWaitlist = async (e) => {
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
    closeGateModal();
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
                    WorkHop is currently live across Bengaluru (5 km radius)
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
            <div className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* Primary Notification Box */}
              <div className="border-2 border-ink bg-[#FFF5EE] dark:bg-[#251812] p-3.5 shadow-[2px_2px_0px_#121212]">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-white font-black text-xs">
                    !
                  </div>
                  <div>
                    <h4 className="text-sm font-black tracking-tight text-ink dark:text-white">
                      WorkHop is not available in {detectedCity || "your region"} yet {distanceKm ? `(~${distanceKm} km away)` : ""}
                    </h4>
                    <p className="text-[11px] text-inkmuted dark:text-stone-300 font-medium mt-1 leading-relaxed">
                      We detected an IP in <strong>{detectedCity || "a region outside Bengaluru"}</strong>. If you are using mobile data (Jio, Airtel, Vi), cellular networks frequently route through distant towers (like Kudligi).
                    </p>
                  </div>
                </div>
              </div>

              {/* PRIMARY ACTION: Detect Phone GPS or Set Area Manually */}
              <div className="border-2 border-ink bg-white dark:bg-[#1a1a1a] p-4 shadow-[2px_2px_0px_#121212] space-y-3.5">
                <div className="flex items-center gap-1.5">
                  <Compass size={15} className="text-brand fill-brand" />
                  <span className="text-xs font-black uppercase tracking-wider text-ink dark:text-white">
                    Are you in or near Bengaluru?
                  </span>
                </div>

                {/* Option 1: High Accuracy GPS Button */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleDetectExactGps}
                    disabled={detectingGps}
                    className="w-full flex items-center justify-center gap-2 border-2 border-ink bg-brand px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-[2.5px_2.5px_0px_#121212] transition hover:bg-[#E65A1E] active:translate-y-0.5 disabled:opacity-60"
                  >
                    {detectingGps ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Detecting Exact Phone GPS...</span>
                      </>
                    ) : (
                      <>
                        <Navigation size={15} className="fill-white" />
                        <span>📍 Detect Exact Phone GPS</span>
                      </>
                    )}
                  </button>

                  {gpsSuccess && (
                    <div className="bg-[#E5F7E0] dark:bg-[#132c18] border-2 border-ink p-2 text-center text-xs font-black text-[#0E6220] dark:text-[#6ee7b7] flex items-center justify-center gap-1.5">
                      <CheckCircle2 size={14} />
                      <span>{gpsSuccess}</span>
                    </div>
                  )}

                  {gpsError && (
                    <div className="bg-red-50 dark:bg-[#2c1313] border-2 border-red-500 p-2.5 text-[11px] font-bold text-red-700 dark:text-red-300 space-y-1">
                      <p>{gpsError}</p>
                      <p className="text-[10px] text-inkmuted dark:text-stone-400 font-medium">
                        👉 Tip: You can directly select your Bengaluru neighborhood below without GPS!
                      </p>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 h-px bg-ink/20 dark:bg-stone-700"></div>
                  <span className="text-[10px] font-black uppercase text-inkmuted dark:text-stone-400">
                    OR SET NEIGHBORHOOD MANUALLY
                  </span>
                  <div className="flex-1 h-px bg-ink/20 dark:bg-stone-700"></div>
                </div>

                {/* Option 2: Quick Neighborhood Chips & Manual Input */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400">
                    Tap your Bengaluru area to enter immediately:
                  </label>
                  
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {POPULAR_BENGALURU_AREAS.map((area) => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => handleApplyManualLocation(area)}
                        className="px-2.5 py-1 text-[11px] font-bold border border-ink bg-sand/30 dark:bg-[#252525] text-ink dark:text-white hover:bg-brand hover:text-white transition shadow-[1px_1px_0px_#121212]"
                      >
                        📍 {area}
                      </button>
                    ))}
                  </div>

                  {/* Custom Search / Area Input */}
                  <div className="flex gap-1.5 pt-1">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={customAreaInput}
                        onChange={(e) => setCustomAreaInput(e.target.value)}
                        placeholder="Or enter any area (e.g. Kalyan Nagar, Domlur...)"
                        className="w-full border-2 border-ink bg-white dark:bg-[#222] px-3 py-1.5 text-xs font-bold text-ink dark:text-white outline-none focus:border-brand"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (customAreaInput.trim()) handleApplyManualLocation(customAreaInput);
                          }
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!customAreaInput.trim()}
                      onClick={() => handleApplyManualLocation(customAreaInput)}
                      className="border-2 border-ink bg-brand text-white px-3 py-1.5 text-xs font-black uppercase hover:bg-[#E65A1E] transition shadow-[1.5px_1.5px_0px_#121212] disabled:opacity-40"
                    >
                      Set & Enter &rarr;
                    </button>
                  </div>
                </div>
              </div>

              {/* SECONDARY / COLLAPSIBLE: City Waitlist for Genuine Non-Bengaluru Visitors */}
              <div className="border border-dashed border-ink/40 bg-sand/20 dark:bg-[#1a1a1a] p-3 space-y-2.5">
                <button
                  type="button"
                  onClick={() => setShowWaitlist((prev) => !prev)}
                  className="w-full flex items-center justify-between text-left text-xs font-black uppercase text-ink dark:text-white hover:text-brand transition"
                >
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={13} className="text-brand fill-brand" />
                    <span>Live outside Bengaluru? Vote to launch in {cityInput || "your city"}</span>
                  </div>
                  {showWaitlist ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>

                {showWaitlist && (
                  <div className="pt-2 border-t border-ink/20 space-y-3">
                    {submitted ? (
                      <div className="bg-[#E5F7E0] dark:bg-[#132c18] border-2 border-ink p-3 text-center space-y-1">
                        <CheckCircle2 size={20} className="text-[#0E6220] dark:text-[#6ee7b7] mx-auto" />
                        <p className="text-xs font-black uppercase text-[#0E6220] dark:text-[#6ee7b7]">
                          {submitMessage}
                        </p>
                        <p className="text-[11px] text-inkmuted dark:text-stone-300 font-medium">
                          You are #{waitlistCount} on the {cityInput || "city"} launch list!
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitWaitlist} className="space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400 mb-0.5">
                              Your City:
                            </label>
                            <input
                              type="text"
                              required
                              value={cityInput}
                              onChange={(e) => setCityInput(e.target.value)}
                              placeholder="e.g. Mysore, Mangalore..."
                              className="w-full border-2 border-ink bg-white dark:bg-[#252525] px-2.5 py-1.5 text-xs font-bold text-ink dark:text-white outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400 mb-0.5">
                              Your Email:
                            </label>
                            <input
                              type="email"
                              required
                              value={contactInput}
                              onChange={(e) => setContactInput(e.target.value)}
                              placeholder="name@gmail.com"
                              className="w-full border-2 border-ink bg-white dark:bg-[#252525] px-2.5 py-1.5 text-xs font-bold text-ink dark:text-white outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setRoleInput("employer")}
                            className={`flex items-center justify-center gap-1.5 border border-ink py-1 text-xs font-black transition ${
                              roleInput === "employer"
                                ? "bg-brand text-white shadow-[1px_1px_0px_#121212]"
                                : "bg-white dark:bg-[#222] text-ink dark:text-white hover:bg-sand"
                            }`}
                          >
                            <Building2 size={12} />
                            <span>Hire Talent</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRoleInput("freelancer")}
                            className={`flex items-center justify-center gap-1.5 border border-ink py-1 text-xs font-black transition ${
                              roleInput === "freelancer"
                                ? "bg-brand text-white shadow-[1px_1px_0px_#121212]"
                                : "bg-white dark:bg-[#222] text-ink dark:text-white hover:bg-sand"
                            }`}
                          >
                            <User size={12} />
                            <span>Freelance</span>
                          </button>
                        </div>

                        <button
                          type="submit"
                          disabled={submitting || !contactInput.trim()}
                          className="w-full flex items-center justify-center gap-1.5 border-2 border-ink bg-ink text-white py-2 text-xs font-black uppercase tracking-wider hover:bg-neutral-800 transition disabled:opacity-50"
                        >
                          {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                          <span>Join Launch List for {cityInput || "My City"}</span>
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Quick Dismiss / Preview Button */}
              <div className="pt-1 flex items-center justify-between text-xs">
                <span className="text-[11px] text-inkmuted dark:text-stone-400">
                  Just exploring or hiring remotely?
                </span>
                <button
                  type="button"
                  onClick={handleDismissPreview}
                  className="flex items-center gap-1 border-2 border-ink bg-white dark:bg-[#252525] px-3 py-1 font-black uppercase text-ink dark:text-white shadow-[1.5px_1.5px_0px_#121212] hover:bg-sand transition"
                >
                  <span>Explore Bengaluru</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
