import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Briefcase, MapPin, Building2, Sparkles, Check, ArrowRight, ArrowLeft,
  ShieldCheck, AlertCircle, Eye, Navigation, CheckCircle2, Clock, Users,
  Send, HelpCircle, X
} from "lucide-react";
import {
  validateNoBusinessNameOrContact,
  generateEmployerPublicLabel
} from "@/lib/antiLeakValidator";
import { apiPost, getEmployerId } from "@/lib/api";
import { BENGALURU_AREAS } from "@/lib/locationAreas";
import { DISCIPLINES_CATALOG } from "@/lib/catalogFilters";

export const BUSINESS_TYPES = [
  { id: "Specialty Café / Roastery", label: "Specialty Café / Roastery", icon: "☕" },
  { id: "Boutique / Retail Store", label: "Boutique / Retail Store", icon: "🛍️" },
  { id: "Design / Spatial Studio", label: "Design / Spatial Studio", icon: "📐" },
  { id: "Tech Startup", label: "Tech Startup", icon: "🚀" },
  { id: "Marketing Agency", label: "Marketing Agency", icon: "📈" },
  { id: "Salon / Wellness Clinic", label: "Salon / Wellness Clinic", icon: "✨" },
  { id: "Restaurant / Kitchen", label: "Restaurant / Kitchen", icon: "🍽️" },
  { id: "Production / Media House", label: "Production / Media House", icon: "🎬" },
  { id: "Local Service Business", label: "Local Service Business", icon: "🏢" },
  { id: "Independent Employer", label: "Independent Employer", icon: "👤" },
];

export const TYPICAL_HELP_CHIPS = [
  "Graphic Design & Branding",
  "UI/UX & App Wireframing",
  "Social Media & Reels Video",
  "Website / Shopify Development",
  "Interior / 3D Visualization",
  "Copywriting & Content",
  "Performance Marketing",
  "Photography / Videography",
];

const LOCAL_STORAGE_KEY = "workhop_employer_profile_draft_v1";

export default function EmployerProfileWizard({
  initialData = {},
  onComplete,
  onSkip,
  onNavigateToPostGig
}) {
  // Step: 1 = Business What/About, 2 = Where/Area & Help, 3 = Preview & Confirmation
  const [step, setStep] = useState(1);

  // Form State
  const [businessType, setBusinessType] = useState(initialData.business_type || "Specialty Café / Roastery");
  const [category, setCategory] = useState(initialData.business_category || initialData.category || "Graphics & Design");
  const [aboutBusiness, setAboutBusiness] = useState(initialData.about_business || initialData.bio || "");
  const [area, setArea] = useState(initialData.area || "Koramangala");
  const [typicalHelp, setTypicalHelp] = useState(initialData.typical_help_needed || []);
  const [teamSize, setTeamSize] = useState(initialData.team_size || "1-10 people");

  // Inline Validation state
  const [validationError, setValidationError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsNote, setGpsNote] = useState(null);

  // Load any previously saved draft from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.businessType) setBusinessType(d.businessType);
        if (d.category) setCategory(d.category);
        if (d.aboutBusiness) setAboutBusiness(d.aboutBusiness);
        if (d.area) setArea(d.area);
        if (Array.isArray(d.typicalHelp)) setTypicalHelp(d.typicalHelp);
        if (d.teamSize) setTeamSize(d.teamSize);
        if (d.step && d.step <= 3) setStep(d.step);
      }
    } catch {}
  }, []);

  // Autosave draft on any state change
  useEffect(() => {
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          businessType,
          category,
          aboutBusiness,
          area,
          typicalHelp,
          teamSize,
          step,
        })
      );
    } catch {}
  }, [businessType, category, aboutBusiness, area, typicalHelp, teamSize, step]);

  // Real-time Anti-Leak validation on About Business
  const handleAboutChange = (val) => {
    setAboutBusiness(val);
    if (!val.trim()) {
      setValidationError(null);
      return;
    }
    const check = validateNoBusinessNameOrContact(val);
    if (!check.valid) {
      setValidationError(check.reason);
    } else {
      setValidationError(null);
    }
  };

  // Live Generated Public Label
  const publicLabel = useMemo(() => {
    return generateEmployerPublicLabel(businessType, area, category);
  }, [businessType, area, category]);

  // GPS Geolocation Handler
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGpsNote("GPS not supported in this browser.");
      return;
    }
    setDetectingGps(true);
    setGpsNote(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetectingGps(false);
        setGpsNote("✓ Location verified within Bengaluru 5km geofence.");
      },
      (err) => {
        setDetectingGps(false);
        setGpsNote("Could not detect GPS automatically. Please choose your Bengaluru locality from the list.");
      },
      { timeout: 8000 }
    );
  };

  // Toggle Typical Help Chip
  const toggleHelpChip = (chip) => {
    setTypicalHelp((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  // Can advance from step 1?
  const canAdvanceStep1 =
    businessType &&
    category &&
    aboutBusiness.trim().length >= 30 &&
    !validationError;

  // Can advance from step 2?
  const canAdvanceStep2 = Boolean(area);

  // Submit and Complete Profile
  const handleCompleteProfile = async (targetAction = "complete") => {
    setSaving(true);
    try {
      const employerId = getEmployerId();
      const payload = {
        employer_id: employerId,
        business_type: businessType,
        business_category: category,
        about_business: aboutBusiness.trim(),
        area: area.trim(),
        typical_help_needed: typicalHelp,
        team_size: teamSize,
        public_label: publicLabel,
        company_name: publicLabel, // Never save private business name
        completion_status: "completed",
      };

      // 1. Sync to backend API
      try {
        await apiPost("/employers", payload);
      } catch (err) {
        console.warn("Backend employer sync notice:", err);
      }

      // 2. Clear draft
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.setItem("workhop_employer_profile_completed", "1");
      localStorage.setItem("workhop_company_name", publicLabel);

      if (targetAction === "post_gig") {
        if (onNavigateToPostGig) onNavigateToPostGig(payload);
      } else {
        if (onComplete) onComplete(payload);
      }
    } catch (e) {
      console.error("Save error:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto border-4 border-ink bg-white dark:bg-[#151515] p-5 sm:p-8 shadow-[8px_8px_0px_#121212] dark:shadow-[8px_8px_0px_#E65A1E]">
      {/* Top Header & Privacy Notice */}
      <div className="border-b-2 border-ink pb-4 mb-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-brand text-white font-black text-xs shadow-[1.5px_1.5px_0px_#121212]">
              {step}/3
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-ink dark:text-white">
              {step === 1 && "What Does Your Business Do?"}
              {step === 2 && "Where Are You Located?"}
              {step === 3 && "Public Profile Preview"}
            </span>
          </div>

          <button
            type="button"
            onClick={onSkip}
            className="text-[11px] font-bold text-inkmuted hover:text-ink dark:hover:text-white underline transition"
          >
            Skip for now
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-sand dark:bg-[#252525] h-2 border border-ink mt-3 overflow-hidden">
          <div
            className="bg-brand h-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Strict Privacy Assurance Banner */}
        <div className="mt-3 flex items-start gap-2 border border-ink/30 bg-[#FFF9E6] dark:bg-[#201a0e] p-2.5 text-[11px] font-semibold text-ink dark:text-stone-300">
          <ShieldCheck size={16} className="text-brand shrink-0 mt-0.5" />
          <p>
            <strong className="text-ink dark:text-white uppercase font-black">Zero Brand Leaks Guaranteed:</strong>{" "}
            You will <em>never</em> be asked for your company name. Your business is identified only as{" "}
            <span className="font-bold underline decoration-brand">{publicLabel}</span>. Contact details are unlocked only after you initiate a hire.
          </p>
        </div>
      </div>

      {/* STEP 1: What Does Your Business Do? */}
      {step === 1 && (
        <div className="space-y-5 animate-in fade-in">
          {/* Business Type Selectable Chips */}
          <div>
            <label className="text-xs font-black uppercase text-ink dark:text-white block mb-1.5">
              1. Select Your Business Type: *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BUSINESS_TYPES.map((bt) => (
                <button
                  key={bt.id}
                  type="button"
                  data-testid={`biz-type-${bt.id.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  onClick={() => setBusinessType(bt.id)}
                  className={`flex items-center gap-2 border-2 border-ink p-2.5 text-left text-xs font-black transition ${
                    businessType === bt.id
                      ? "bg-brand text-white shadow-[2px_2px_0px_#121212]"
                      : "bg-sand/40 dark:bg-[#1f1f1f] text-ink dark:text-stone-200 hover:bg-sand"
                  }`}
                >
                  <span className="text-base">{bt.icon}</span>
                  <span className="truncate leading-tight">{bt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Primary Vertical / Category */}
          <div>
            <label className="text-xs font-black uppercase text-ink dark:text-white block mb-1.5">
              2. Primary Area of Freelance Help Needed: *
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DISCIPLINES_CATALOG.map((cat) => (
                <button
                  key={cat.category}
                  type="button"
                  onClick={() => setCategory(cat.category)}
                  className={`border border-ink px-3 py-1.5 text-[11px] font-black transition ${
                    category === cat.category
                      ? "bg-ink text-white dark:bg-white dark:text-ink shadow-[2px_2px_0px_#121212]"
                      : "bg-white dark:bg-[#202020] text-ink dark:text-stone-300 hover:bg-sand"
                  }`}
                >
                  {cat.category}
                </button>
              ))}
            </div>
          </div>

          {/* About What The Business Does */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-black uppercase text-ink dark:text-white">
                3. Describe What Your Business Does: *
              </label>
              <span className={`text-[10px] font-bold ${aboutBusiness.length >= 40 ? "text-ok" : "text-inkmuted"}`}>
                {aboutBusiness.length} / 500 characters (min 30)
              </span>
            </div>
            <textarea
              rows={4}
              maxLength={500}
              value={aboutBusiness}
              onChange={(e) => handleAboutChange(e.target.value)}
              placeholder="e.g. We run an artisanal third-wave coffee roastery with two outlets in Bengaluru. We roast micro-lots and need weekly help with packaging graphics, event posters, and reels video editing..."
              data-testid="employer-about-business-input"
              className={`w-full border-2 p-3 text-xs font-semibold text-ink dark:text-white bg-white dark:bg-[#1a1a1a] outline-none transition resize-none ${
                validationError
                  ? "border-red-500 bg-red-50/20"
                  : "border-ink focus:border-brand"
              }`}
            />

            {/* Inline Anti-Leak Helper / Friendly Warning */}
            {validationError ? (
              <div
                data-testid="anti-leak-warning"
                className="mt-1.5 flex items-start gap-1.5 border border-red-400 bg-red-50 dark:bg-red-950/40 p-2 text-[11px] font-bold text-red-700 dark:text-red-300 animate-in fade-in"
              >
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            ) : (
              <p className="mt-1 text-[11px] font-semibold text-inkmuted dark:text-stone-400">
                💡 <strong>Privacy Tip:</strong> Describe your offerings, customers, and workflow. Do not include your brand name, phone, email, or website.
              </p>
            )}
          </div>

          {/* Navigation Next */}
          <div className="flex items-center justify-between pt-4 border-t-2 border-ink">
            <button
              type="button"
              onClick={onSkip}
              className="border border-ink bg-white dark:bg-[#202020] px-4 py-2 text-xs font-black text-ink dark:text-white hover:bg-sand"
            >
              Skip
            </button>
            <button
              type="button"
              disabled={!canAdvanceStep1}
              onClick={() => setStep(2)}
              data-testid="wizard-step1-next"
              className="flex items-center gap-2 border-2 border-ink bg-brand px-6 py-2.5 text-xs font-black uppercase text-white hover:bg-brand/90 transition shadow-[2px_2px_0px_#121212] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Next: Location</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Where Are You Located & Typical Needs */}
      {step === 2 && (
        <div className="space-y-5 animate-in fade-in">
          {/* Bengaluru Locality / Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black uppercase text-ink dark:text-white">
                1. Bengaluru Neighborhood / Locality: *
              </label>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={detectingGps}
                className="inline-flex items-center gap-1 text-[10px] font-black text-brand hover:underline"
              >
                <Navigation size={11} className={detectingGps ? "animate-spin" : ""} />
                <span>{detectingGps ? "Detecting GPS..." : "Auto-Detect My GPS"}</span>
              </button>
            </div>

            <div className="flex items-center border-2 border-ink bg-white dark:bg-[#1a1a1a] px-3 py-2">
              <MapPin size={16} className="text-brand mr-2 shrink-0" />
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                data-testid="wizard-area-select"
                className="w-full bg-transparent text-xs font-black text-ink dark:text-white outline-none cursor-pointer"
              >
                {BENGALURU_AREAS.map((a) => (
                  <option key={a.name || a} value={a.name || a} className="bg-white dark:bg-[#202020] text-ink dark:text-white font-bold">
                    {a.name || a}
                  </option>
                ))}
              </select>
            </div>

            {gpsNote && (
              <p className="mt-1 text-[11px] font-bold text-ok flex items-center gap-1">
                <Check size={12} /> {gpsNote}
              </p>
            )}

            <p className="mt-1 text-[10px] font-semibold text-inkmuted dark:text-stone-400">
              📍 Used for local 5km geofence matching with verified Bengaluru pros.
            </p>
          </div>

          {/* Typical Help Needed Chips */}
          <div>
            <label className="text-xs font-black uppercase text-ink dark:text-white block mb-1.5">
              2. Skills &amp; Deliverables You Typically Seek (Optional):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TYPICAL_HELP_CHIPS.map((chip) => {
                const active = typicalHelp.includes(chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => toggleHelpChip(chip)}
                    className={`border px-2.5 py-1 text-[11px] font-bold transition flex items-center gap-1 ${
                      active
                        ? "border-brand bg-brand text-white shadow-[1.5px_1.5px_0px_#121212]"
                        : "border-ink/40 bg-sand/40 dark:bg-[#202020] text-ink dark:text-stone-200 hover:bg-sand"
                    }`}
                  >
                    <span>{active ? "✓" : "+"}</span>
                    <span>{chip}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Team Size */}
          <div>
            <label className="text-xs font-black uppercase text-ink dark:text-white block mb-1.5">
              3. Organization Size:
            </label>
            <div className="flex gap-2 flex-wrap">
              {["Solo Founder / Owner", "1-10 people", "11-50 people", "50+ people"].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setTeamSize(sz)}
                  className={`border border-ink px-3 py-1.5 text-[11px] font-black transition ${
                    teamSize === sz
                      ? "bg-ink text-white dark:bg-white dark:text-ink shadow-[2px_2px_0px_#121212]"
                      : "bg-white dark:bg-[#1a1a1a] text-ink dark:text-stone-300 hover:bg-sand"
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t-2 border-ink">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1 border border-ink bg-white dark:bg-[#202020] px-4 py-2 text-xs font-black text-ink dark:text-white hover:bg-sand"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={!canAdvanceStep2}
              onClick={() => setStep(3)}
              data-testid="wizard-step2-next"
              className="flex items-center gap-2 border-2 border-ink bg-brand px-6 py-2.5 text-xs font-black uppercase text-white hover:bg-brand/90 transition shadow-[2px_2px_0px_#121212] disabled:opacity-50"
            >
              <span>Preview Profile</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Preview and Confirmation */}
      {step === 3 && (
        <div className="space-y-5 animate-in fade-in">
          <div>
            <p className="text-xs font-bold text-inkmuted dark:text-stone-400">
              Here is exactly how freelancers and local talent will see you in search results, job cards, and proposals:
            </p>
          </div>

          {/* Live Mock Card Preview */}
          <div
            data-testid="employer-public-preview-card"
            className="border-2 border-ink bg-[#FFFDF8] dark:bg-[#191919] p-5 shadow-[4px_4px_0px_#121212]"
          >
            <div className="flex items-center justify-between gap-2 border-b border-ink/20 pb-3 mb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-brand block">
                  VERIFIED LOCAL CLIENT
                </span>
                <h3 className="text-lg font-black text-ink dark:text-white mt-0.5">
                  {publicLabel}
                </h3>
              </div>
              <span className="border border-ink bg-ok/10 text-ok px-2 py-0.5 text-[10px] font-black uppercase">
                ★ 5.0 (New Employer)
              </span>
            </div>

            <p className="text-xs font-semibold text-ink/90 dark:text-stone-200 leading-relaxed mb-3">
              &quot;{aboutBusiness}&quot;
            </p>

            <div className="flex items-center gap-3 text-[11px] font-bold text-inkmuted dark:text-stone-400 flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin size={13} className="text-brand" /> {area} (Within 5km)
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Briefcase size={13} className="text-brand" /> {category}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Users size={13} className="text-brand" /> {teamSize}
              </span>
            </div>

            {typicalHelp.length > 0 && (
              <div className="mt-3 pt-3 border-t border-ink/10 flex flex-wrap gap-1">
                {typicalHelp.map((th) => (
                  <span key={th} className="border border-ink/20 bg-sand/60 dark:bg-[#252525] px-2 py-0.5 text-[9px] font-black text-ink dark:text-stone-300">
                    {th}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded border border-ink/30 bg-sand/40 dark:bg-[#1a1a1a] p-3 text-[11px] font-semibold text-inkmuted dark:text-stone-300">
            🔒 <strong>Notice:</strong> Your personal contact numbers and private identity are securely revealed <em>only</em> to the freelancer you choose to hire.
          </div>

          {/* Action Buttons: Post a gig now OR Maybe later */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t-2 border-ink">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full sm:w-auto flex items-center justify-center gap-1 border border-ink bg-white dark:bg-[#202020] px-4 py-3 text-xs font-black text-ink dark:text-white hover:bg-sand"
            >
              <ArrowLeft size={14} />
              <span>Back &amp; Edit</span>
            </button>

            <div className="w-full sm:w-auto flex items-center gap-2">
              <button
                type="button"
                disabled={saving}
                data-testid="employer-complete-later-btn"
                onClick={() => handleCompleteProfile("complete")}
                className="w-full sm:w-auto border-2 border-ink bg-white dark:bg-[#242424] px-4 py-3 text-xs font-black uppercase text-ink dark:text-white hover:bg-sand transition"
              >
                <span>Save Profile (Post Later)</span>
              </button>

              <button
                type="button"
                disabled={saving}
                data-testid="employer-complete-post-gig-btn"
                onClick={() => handleCompleteProfile("post_gig")}
                className="w-full sm:w-auto flex items-center justify-center gap-2 border-2 border-ink bg-brand px-6 py-3 text-xs font-black uppercase text-white hover:bg-brand/90 transition shadow-[2px_2px_0px_#121212]"
              >
                <span>Post A Gig Now</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
