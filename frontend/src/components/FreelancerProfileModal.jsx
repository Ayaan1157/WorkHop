import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X, ShieldCheck, MapPin, Star, IndianRupee, Clock, CheckCheck,
  Globe, Tag, Briefcase, ExternalLink, MessageSquare, PlusCircle,
  ArrowRight, User, CheckCircle2, Lock, Phone, Image as ImageIcon, Sparkles,
  ChevronLeft, ChevronRight, Loader2
} from "lucide-react";
import {
  getOrCreateChatWithCandidate,
  getSubmittedProfiles,
  getFreelancerProfile,
  sendProfileCompletionReminder,
} from "@/lib/clientStore";
import { formatWhatsAppUrl, isVerifiedPro } from "@/lib/utils";
import PortfolioGallery from "@/components/PortfolioGallery";

function formatImageSrc(img) {
  if (!img || typeof img !== "string") return "";
  const trimmed = img.trim();
  if (trimmed.startsWith("data:") || trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
    return trimmed;
  }
  if (trimmed.startsWith("iVBORw0KGgo")) {
    return `data:image/png;base64,${trimmed}`;
  } else if (trimmed.startsWith("/9j/")) {
    return `data:image/jpeg;base64,${trimmed}`;
  } else if (trimmed.startsWith("R0lGOD")) {
    return `data:image/gif;base64,${trimmed}`;
  } else if (trimmed.startsWith("UklGR")) {
    return `data:image/webp;base64,${trimmed}`;
  }
  return `data:image/jpeg;base64,${trimmed}`;
}

export default function FreelancerProfileModal({ isOpen, onClose, pro }) {
  const nav = useNavigate();
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [brokenImages, setBrokenImages] = useState({});
  const [loadingImages, setLoadingImages] = useState({});
  const [reminderSent, setReminderSent] = useState(false);

  // Keyboard navigation for lightbox
  React.useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setLightboxIndex(null);
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) => (prev > 0 ? prev - 1 : lightboxImages.length - 1));
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((prev) => (prev < lightboxImages.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, lightboxImages.length]);

  if (!isOpen || !pro) return null;

  const targetKey = String(pro.id || "").toLowerCase().trim();
  const strippedKey = targetKey.replace(/^pro-/, "");
  const matchingSubmitted = getSubmittedProfiles().find((p) => {
    const pId = String(p.id || p.freelancer_id || "").toLowerCase();
    return pId === targetKey || pId.replace(/^pro-/, "") === strippedKey || (p.email && pro.email && p.email.toLowerCase() === pro.email.toLowerCase());
  });
  const ownProfile = getFreelancerProfile();
  const isOwn = ownProfile && ((ownProfile.id && (ownProfile.id === pro.id || targetKey.includes(ownProfile.id))) || (ownProfile.email && pro.email && ownProfile.email.toLowerCase() === pro.email.toLowerCase()));

  const resolvedPicture = pro.picture || pro.avatar_url || matchingSubmitted?.picture || matchingSubmitted?.avatar_url || (isOwn ? (ownProfile.picture || ownProfile.avatar_url) : null);
  const avatarSrc = formatImageSrc(resolvedPicture || "");

  const languageLabels = (Array.isArray(pro.languages) && pro.languages.length > 0 ? pro.languages : matchingSubmitted?.languages || (isOwn ? ownProfile?.languages : []) || [])
    .map((l) => {
      if (typeof l === "string") return l.trim();
      if (l && typeof l === "object" && l.language) {
        return l.proficiency ? `${l.language} (${l.proficiency})` : l.language;
      }
      return "";
    })
    .filter(Boolean);

  const portfolioProjects = (
    Array.isArray(pro.portfolio_items) && pro.portfolio_items.length > 0
      ? pro.portfolio_items
      : Array.isArray(pro.portfolio) && pro.portfolio.length > 0
      ? pro.portfolio
      : matchingSubmitted?.portfolio_items && matchingSubmitted.portfolio_items.length > 0
      ? matchingSubmitted.portfolio_items
      : matchingSubmitted?.portfolio && Array.isArray(matchingSubmitted.portfolio) && matchingSubmitted.portfolio.length > 0
      ? matchingSubmitted.portfolio
      : isOwn && Array.isArray(ownProfile?.portfolio) && ownProfile.portfolio.length > 0
      ? ownProfile.portfolio
      : []
  ).filter((p) => p && typeof p === "object" && !p._workhop_meta);

  const firstName = pro.name?.split(" ")?.[0] || pro.name || "Freelancer";
  const initials =
    pro.initials ||
    pro.name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ||
    "PRO";

  const handlePostGig = () => {
    onClose?.();
    nav("/employer/post-job", {
      state: {
        prefillTitle: `Need ${pro.skill}`,
        prefillCategory: pro.category || pro.bucket || "Graphics & Design",
        prefillArea: pro.area || "Bengaluru",
        hireCandidateId: pro.id,
        hireCandidateName: pro.name,
      },
    });
  };

  const handleStartChat = () => {
    onClose?.();
    const convId = getOrCreateChatWithCandidate(pro);
    nav(`/chat/${convId}?role=employer`);
  };

  const handleSendReminder = (e) => {
    e?.stopPropagation?.();
    try {
      const res = sendProfileCompletionReminder(pro);
      setReminderSent(true);
      setTimeout(() => {
        onClose?.();
        nav(`/chat/${res.convId}?role=employer`);
      }, 750);
    } catch (err) {
      console.error("Failed to send reminder", err);
    }
  };

  const handleViewFullProfile = () => {
    onClose?.();
    nav(`/pro/${pro.id}`);
  };

  return (
    <div
      data-testid="freelancer-profile-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        data-testid="freelancer-profile-modal"
        className="relative flex flex-col w-full max-w-xl max-h-[90vh] border-2 border-ink dark:border-zinc-700 bg-white dark:bg-[#161618] text-ink dark:text-white shadow-[6px_6px_0px_#121212] dark:shadow-[6px_6px_0px_#000] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header with Close button & Profile Banner */}
        <div className="flex items-start justify-between border-b-2 border-ink dark:border-zinc-700 bg-sand/70 dark:bg-[#1f1f22] p-4 sm:p-5">
          <div className="flex items-start gap-3.5 min-w-0 pr-6">
            {/* Avatar Initials with live active dot */}
            <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-brand text-lg sm:text-xl font-black text-white shadow-[2px_2px_0px_#121212]">
              {avatarSrc && !avatarFailed ? (
                <img
                  src={avatarSrc}
                  alt={pro.name}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                initials
              )}
              <span
                className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-[#10B981] border-2 border-white dark:border-[#161618]"
                title="Available Now"
              />
            </div>

            {/* Name, Title, Badges */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2
                  data-testid="modal-pro-name"
                  className="text-base sm:text-lg font-black tracking-tight text-ink dark:text-white truncate"
                >
                  {pro.name}
                </h2>
                {(() => {
                  const verified = isVerifiedPro(pro);
                  if (verified) {
                    return (
                      <span className="inline-flex items-center gap-0.5 bg-ok/15 text-ok border border-ok px-1.5 py-0.2 text-[9px] font-black shrink-0">
                        <ShieldCheck size={11} /> VERIFIED PRO
                      </span>
                    );
                  }
                  if (pro.approved || pro.status === "approved") {
                    return (
                      <span className="inline-flex items-center gap-0.5 bg-sand dark:bg-zinc-800 text-ink dark:text-zinc-200 border border-ink/30 dark:border-zinc-700 px-1.5 py-0.2 text-[9px] font-black shrink-0">
                        PRO MEMBER
                      </span>
                    );
                  }
                  if (pro.status === "declined") {
                    return (
                      <span className="inline-flex items-center gap-0.5 bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/40 px-1.5 py-0.2 text-[9px] font-black shrink-0">
                        DECLINED
                      </span>
                    );
                  }
                  return (
                    <span className="inline-flex items-center gap-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/40 px-1.5 py-0.2 text-[9px] font-black shrink-0">
                      <Clock size={11} /> PENDING ADMIN APPROVAL
                    </span>
                  );
                })()}
              </div>

              {pro.skill ? (
                <p className="text-xs sm:text-sm font-bold text-inkmuted dark:text-zinc-300 line-clamp-1 mt-0.5">
                  {pro.skill}
                </p>
              ) : null}

              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px] font-bold">
                <span className="flex items-center gap-1 text-ink dark:text-zinc-200">
                  <MapPin size={12} className="text-brand shrink-0" />
                  <span>
                    {pro.area || "Bengaluru"} ·{" "}
                    <strong className="text-brand">{pro.distance_km || 0.8} km away</strong>
                  </span>
                </span>
                {(pro.category || pro.bucket) ? (
                  <span className="border border-ink/20 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-1.5 py-0.2 text-[10px] font-black uppercase text-inkmuted dark:text-zinc-400">
                    {pro.category || pro.bucket}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            data-testid="modal-pro-close-btn"
            className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink dark:border-zinc-700 bg-sand dark:bg-[#2a2a2a] text-ink dark:text-white hover:bg-brand hover:text-white transition shadow-[1px_1px_0px_#121212]"
            title="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body Details */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Incomplete Details / Profile Reminder Banner */}
          {(!pro.approved || pro.status === "pending" || !pro.bio || pro.bio.includes("No bio") || portfolioProjects.length === 0) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/40 p-3 shadow-[2px_2px_0px_#121212]">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="text-base select-none mt-0.5">⚠️</span>
                <div>
                  <p className="text-xs font-black uppercase text-amber-950 dark:text-amber-200">
                    Incomplete Freelancer Profile
                  </p>
                  <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                    Bio details or portfolio work samples are missing.
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-testid="modal-incomplete-remind-btn"
                onClick={handleSendReminder}
                disabled={reminderSent}
                className="shrink-0 flex items-center justify-center gap-1.5 border-2 border-ink bg-amber-400 dark:bg-amber-500 px-3 py-1.5 text-xs font-black uppercase text-ink shadow-[2px_2px_0px_#121212] hover:bg-amber-300 transition active:translate-y-0.5 disabled:bg-emerald-600 disabled:text-white"
              >
                {reminderSent ? (
                  <>
                    <CheckCircle2 size={13} />
                    <span>Reminder Sent!</span>
                  </>
                ) : (
                  <>
                    <MessageSquare size={13} />
                    <span>Ask to Complete Profile</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* 3-Metric Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="flex flex-col items-center justify-center border-2 border-ink dark:border-zinc-700 bg-sand/60 dark:bg-zinc-800/80 p-2 text-center">
              <span className="flex items-center gap-1 text-xs sm:text-sm font-black text-ink dark:text-white">
                <Star size={12} className="fill-brand text-brand" />
                {Number(pro.reviews_count) > 0 && pro.rating ? pro.rating : "New"}
              </span>
              <span className="text-[9px] font-black tracking-wider text-inkmuted dark:text-zinc-400 uppercase mt-0.5">
                {Number(pro.reviews_count) > 0 ? `${pro.reviews_count} Reviews` : "No reviews yet"}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center border-2 border-ink dark:border-zinc-700 bg-sand/60 dark:bg-zinc-800/80 p-2 text-center">
              <span className="flex items-center gap-1 text-xs sm:text-sm font-black text-ok">
                <CheckCheck size={13} />
                {Number(pro.jobs_done) || 0}
              </span>
              <span className="text-[9px] font-black tracking-wider text-inkmuted dark:text-zinc-400 uppercase mt-0.5">
                {Number(pro.jobs_done) > 0 ? "Jobs Done" : "New Pro"}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center border-2 border-ink dark:border-zinc-700 bg-sand/60 dark:bg-zinc-800/80 p-2 text-center">
              <span className="flex items-center gap-1 text-xs sm:text-sm font-black text-brand">
                {Number(pro.rate_hr) > 0 ? `₹${pro.rate_hr}/hr` : "Not set"}
              </span>
              <span className="text-[9px] font-black tracking-wider text-inkmuted dark:text-zinc-400 uppercase mt-0.5">
                Rate / Hour
              </span>
            </div>
          </div>

          {/* About / Bio */}
          <div className="border border-ink/20 dark:border-zinc-700 bg-sand/30 dark:bg-zinc-900/60 p-3.5">
            <h3 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-inkmuted dark:text-zinc-400 mb-1.5">
              <User size={13} className="text-brand" />
              <span>About {firstName}</span>
            </h3>
            <p className="text-xs sm:text-[13px] leading-relaxed text-ink dark:text-zinc-200 font-medium">
              {(() => {
                const verified = isVerifiedPro(pro);
                let text =
                  pro.intro ||
                  pro.bio ||
                  pro.description ||
                  (pro.skill
                    ? `${pro.name} is a professional specializing in ${pro.skill} in Bengaluru. Experienced in fast delivery, clear communication, and high quality deliverables.`
                    : "No bio or skill details added yet.");
                if (!verified && text.startsWith("Verified ")) {
                  text = text.replace(/^Verified\s+/i, "");
                }
                return text;
              })()}
            </p>
          </div>

          {/* Core Skills & Keywords */}
          {(() => {
            const rawSkills =
              (Array.isArray(pro.skills) && pro.skills.length > 0 ? pro.skills : null) ||
              (Array.isArray(matchingSubmitted?.skills) && matchingSubmitted.skills.length > 0 ? matchingSubmitted.skills : null) ||
              (isOwn && Array.isArray(ownProfile?.skills) && ownProfile.skills.length > 0 ? ownProfile.skills : null) ||
              (Array.isArray(pro.keywords) && pro.keywords.length > 0 ? pro.keywords : null) ||
              (pro.skill ? [pro.skill] : []);
            const resolvedSkills = Array.from(new Set(rawSkills.filter(Boolean)));
            if (resolvedSkills.length === 0) return null;
            return (
              <div>
                <h3 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-inkmuted dark:text-zinc-400 mb-2">
                  <Tag size={13} className="text-brand" />
                  <span>Specialized Skills</span>
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {resolvedSkills.map((kw, i) => (
                    <span
                      key={i}
                      className="border border-ink/30 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-ink dark:text-zinc-200 capitalize shadow-[1px_1px_0px_#121212] dark:shadow-none"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Languages Spoken */}
          {languageLabels.length > 0 && (
            <div>
              <h3 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-inkmuted dark:text-zinc-400 mb-1.5">
                <Globe size={13} className="text-brand" />
                <span>Languages</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {languageLabels.map((lang, i) => (
                  <span
                    key={i}
                    className="border border-ink/20 dark:border-zinc-700 bg-sand dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-black text-ink dark:text-zinc-200"
                  >
                    🗣️ {lang}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Work Samples / Portfolio Preview via Universal PortfolioGallery */}
          {(() => {
            const submittedImages = Array.isArray(matchingSubmitted?.portfolio_images) ? matchingSubmitted.portfolio_images : [];
            const ownImages = isOwn && Array.isArray(ownProfile?.portfolio_images) ? ownProfile.portfolio_images : [];
            const initialList = [
              ...portfolioProjects,
              ...(Array.isArray(pro.portfolio_images) ? pro.portfolio_images : []),
              ...submittedImages,
              ...ownImages,
              ...(Array.isArray(pro.samples) ? pro.samples.filter((s) => s?.image).map((s) => s.image) : []),
            ];

            const portfolioUrl = String(
              pro.portfolio_url || (typeof pro.portfolio === "string" ? pro.portfolio : "") || ""
            ).trim();

            return (
              <div className="border border-ink/20 dark:border-zinc-700 bg-sand/20 dark:bg-zinc-800/40 p-3 rounded-sm">
                <PortfolioGallery
                  freelancerId={pro.id || pro.freelancer_id}
                  freelancerEmail={pro.email}
                  initialItems={initialList}
                  externalPortfolioUrl={portfolioUrl}
                />
              </div>
            );
          })()}

                {/* CV / Resume Document Display */}
                {(() => {
                  const resolvedCvUrl =
                    pro.cv_url ||
                    pro.resume_url ||
                    matchingSubmitted?.cv_url ||
                    matchingSubmitted?.resume_url ||
                    (isOwn ? (ownProfile?.cv_url || ownProfile?.resume_url) : null);
                  const resolvedCvName =
                    pro.cv_name ||
                    matchingSubmitted?.cv_name ||
                    (isOwn ? ownProfile?.cv_name : null) ||
                    "Curriculum Vitae / Resume";

                  if (!resolvedCvUrl) return null;

                  return (
                    <div className="mt-3.5 border-2 border-ink dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3 shadow-[2px_2px_0px_#121212] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-ink bg-brand text-white">
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-ink dark:text-white truncate">
                            {resolvedCvName}
                          </p>
                          <p className="text-[10px] text-inkmuted dark:text-zinc-400 font-bold">
                            Official Verified CV / Resume Attachment
                          </p>
                        </div>
                      </div>
                      <a
                        href={resolvedCvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 border-2 border-ink bg-ink text-white hover:bg-brand px-3 py-1.5 text-xs font-black uppercase tracking-wider shrink-0 transition"
                      >
                        <span>View CV</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  );
                })()}

          {/* Direct Contact Policy Notice Banner */}
          <div className="border border-ok/40 bg-[#E6F4EA] dark:bg-[#11291E] p-2.5 text-xs text-[#059669] dark:text-emerald-300 flex items-start gap-2">
            <ShieldCheck size={16} className="shrink-0 mt-0.5" />
            <p className="text-[11px] leading-snug">
              <strong>Verified Hyperlocal Hire:</strong> Direct WhatsApp &amp; phone details are
              safely unlocked once the gig is initiated or hired for direct communication and settlement.
            </p>
          </div>

          {/* Admin / Unlocked Direct Contact Info */}
          {(pro.phone || pro.email) && (
            <div className="border-2 border-ink dark:border-zinc-700 bg-sand/60 dark:bg-zinc-800 p-3 flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-zinc-400">
                Contact &amp; Credentials
              </span>
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-ink dark:text-white">
                {pro.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={13} className="text-brand" /> {pro.phone}
                  </span>
                )}
                {pro.phone && (
                  <a
                    href={formatWhatsAppUrl(pro.phone, `Hi ${firstName}, contacting you from WorkHop!`)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 bg-[#25D366] text-white px-2 py-0.5 text-[10px] font-black border border-ink hover:bg-[#20ba59] transition shadow-[1px_1px_0px_#121212]"
                  >
                    <Phone size={10} /> WhatsApp
                  </a>
                )}
                {pro.email && (
                  <span className="flex items-center gap-1 text-inkmuted dark:text-zinc-300">
                    📧 {pro.email}
                  </span>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Sticky Action Footer */}
        <div className="flex flex-col gap-2 border-t-2 border-ink dark:border-zinc-700 bg-white dark:bg-[#1a1a1c] p-3.5 sm:p-4">
          {/* Ask to Complete Profile CTA Button */}
          <button
            type="button"
            onClick={handleSendReminder}
            disabled={reminderSent}
            data-testid="modal-remind-profile-btn"
            className="flex w-full items-center justify-center gap-2 border-2 border-ink dark:border-zinc-700 bg-amber-400 dark:bg-amber-500 py-2.5 text-xs font-black tracking-wide text-ink shadow-[2px_2px_0px_#121212] hover:bg-amber-300 transition active:translate-y-0.5 disabled:bg-emerald-600 disabled:text-white uppercase"
          >
            {reminderSent ? (
              <>
                <CheckCircle2 size={14} className="text-white" />
                <span>Message Sent! Opening Chat...</span>
              </>
            ) : (
              <>
                <MessageSquare size={14} className="text-ink" />
                <span>Ask Freelancer to Complete Profile</span>
              </>
            )}
          </button>

          {/* Main Hire CTA */}
          <button
            onClick={handlePostGig}
            data-testid="modal-post-gig-hire-btn"
            className="flex w-full items-center justify-center gap-2 border-2 border-ink dark:border-zinc-700 bg-brand py-3 text-xs sm:text-sm font-black tracking-wider text-white shadow-[3px_3px_0px_#121212] hover:bg-black transition active:translate-y-0.5 uppercase"
          >
            <PlusCircle size={15} />
            <span>POST A GIG</span>
            <ArrowRight size={15} />
          </button>

          {/* Secondary Actions Row: Chat & View Full Profile */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleStartChat}
              data-testid="modal-chat-pro-btn"
              className="flex items-center justify-center gap-1.5 border border-ink dark:border-zinc-700 bg-sand dark:bg-zinc-800 py-2 text-xs font-black text-ink dark:text-white hover:bg-stone/30 transition"
            >
              <MessageSquare size={13} className="text-brand" />
              <span>Chat / Message</span>
            </button>

            <button
              onClick={handleViewFullProfile}
              data-testid="modal-view-full-profile-btn"
              className="flex items-center justify-center gap-1.5 border border-ink dark:border-zinc-700 bg-white dark:bg-zinc-900 py-2 text-xs font-black text-ink dark:text-white hover:bg-sand transition"
            >
              <span>Full Profile Page</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* LIGHTBOX PREVIEW MODAL */}
      {lightboxIndex !== null && lightboxImages[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-3 sm:p-5 backdrop-blur-md animate-in fade-in select-none"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="relative max-w-4xl max-h-[92vh] w-full bg-white dark:bg-zinc-950 border-2 border-ink dark:border-zinc-700 p-3 sm:p-4 shadow-[8px_8px_0px_#121212] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b-2 border-ink dark:border-zinc-700">
              <span className="text-xs font-black uppercase text-ink dark:text-white flex items-center gap-1.5">
                <ImageIcon size={14} className="text-brand" /> Work Sample {lightboxIndex + 1} of {lightboxImages.length}
              </span>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="flex h-7 w-7 items-center justify-center border-2 border-ink dark:border-zinc-700 bg-sand dark:bg-zinc-800 hover:bg-brand hover:text-white font-black text-xs transition cursor-pointer"
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>

            {/* Lightbox Main Image & Navigation */}
            <div className="relative overflow-hidden flex-1 flex items-center justify-center p-2 bg-stone-900/40 dark:bg-zinc-900 border border-ink/20 dark:border-zinc-800 min-h-[300px]">
              <img
                src={lightboxImages[lightboxIndex]}
                alt={`Work sample ${lightboxIndex + 1}`}
                className="max-h-[70vh] w-auto max-w-full object-contain select-none"
              />

              {/* Prev Button */}
              {lightboxImages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex((prev) => (prev > 0 ? prev - 1 : lightboxImages.length - 1));
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center border-2 border-ink dark:border-zinc-600 bg-white/95 dark:bg-zinc-800 text-ink dark:text-white hover:bg-brand hover:text-white transition shadow-[2px_2px_0px_#121212] cursor-pointer"
                  title="Previous (Left Arrow)"
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              {/* Next Button */}
              {lightboxImages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex((prev) => (prev < lightboxImages.length - 1 ? prev + 1 : 0));
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center border-2 border-ink dark:border-zinc-600 bg-white/95 dark:bg-zinc-800 text-ink dark:text-white hover:bg-brand hover:text-white transition shadow-[2px_2px_0px_#121212] cursor-pointer"
                  title="Next (Right Arrow)"
                >
                  <ChevronRight size={20} />
                </button>
              )}
            </div>

            {/* Lightbox Footer Bar */}
            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-ink/20 dark:border-zinc-800 text-[10px] text-inkmuted dark:text-zinc-400">
              <span>Use arrow keys to navigate · Esc to close</span>
              <span className="font-bold text-ink dark:text-zinc-200">{lightboxIndex + 1} / {lightboxImages.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
