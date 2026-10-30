import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X, ShieldCheck, MapPin, Star, IndianRupee, Clock, CheckCheck,
  Globe, Tag, Briefcase, ExternalLink, MessageSquare, PlusCircle,
  ArrowRight, User, CheckCircle2, Lock, Phone, Image as ImageIcon, Sparkles
} from "lucide-react";
import { getOrCreateChatWithCandidate } from "@/lib/clientStore";
import { formatWhatsAppUrl, isVerifiedPro } from "@/lib/utils";

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
  const [lightboxImage, setLightboxImage] = useState(null);

  if (!isOpen || !pro) return null;

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
              {initials}
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

              <p className="text-xs sm:text-sm font-bold text-inkmuted dark:text-zinc-300 line-clamp-1 mt-0.5">
                {pro.skill}
              </p>

              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px] font-bold">
                <span className="flex items-center gap-1 text-ink dark:text-zinc-200">
                  <MapPin size={12} className="text-brand shrink-0" />
                  <span>
                    {pro.area || "Bengaluru"} ·{" "}
                    <strong className="text-brand">{pro.distance_km || 0.8} km away</strong>
                  </span>
                </span>
                <span className="border border-ink/20 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-1.5 py-0.2 text-[10px] font-black uppercase text-inkmuted dark:text-zinc-400">
                  {pro.category || pro.bucket || "Creative"}
                </span>
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
          
          {/* 4-Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                ₹{pro.rate_hr || 550}/hr
              </span>
              <span className="text-[9px] font-black tracking-wider text-inkmuted dark:text-zinc-400 uppercase mt-0.5">
                Rate / Hour
              </span>
            </div>

            <div className="flex flex-col items-center justify-center border-2 border-ink dark:border-zinc-700 bg-sand/60 dark:bg-zinc-800/80 p-2 text-center">
              <span className="flex items-center gap-1 text-xs sm:text-sm font-black text-ink dark:text-white">
                <Clock size={12} className="text-brand" />
                {pro.delivery_days || 1}d
              </span>
              <span className="text-[9px] font-black tracking-wider text-inkmuted dark:text-zinc-400 uppercase mt-0.5">
                Turnaround
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
                let text = pro.intro || `${pro.name} is a professional specializing in ${pro.skill} in Bengaluru. Experienced in fast delivery, clear communication, and high quality deliverables.`;
                if (!verified && text.startsWith("Verified ")) {
                  text = text.replace(/^Verified\s+/i, "");
                }
                return text;
              })()}
            </p>
          </div>

          {/* Core Skills & Keywords */}
          {Array.isArray(pro.keywords) && pro.keywords.length > 0 && (
            <div>
              <h3 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-inkmuted dark:text-zinc-400 mb-2">
                <Tag size={13} className="text-brand" />
                <span>Specialized Skills</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {pro.keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="border border-ink/30 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-ink dark:text-zinc-200 capitalize shadow-[1px_1px_0px_#121212] dark:shadow-none"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Languages Spoken */}
          {Array.isArray(pro.languages) && pro.languages.length > 0 && (
            <div>
              <h3 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-inkmuted dark:text-zinc-400 mb-1.5">
                <Globe size={13} className="text-brand" />
                <span>Languages</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {pro.languages.map((lang, i) => (
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

          {/* Work Samples / Portfolio Preview */}
          {(() => {
            const portfolioImages = (
              Array.isArray(pro.portfolio_images) && pro.portfolio_images.length > 0
                ? pro.portfolio_images
                : Array.isArray(pro.samples)
                ? pro.samples.filter((s) => s?.image).map((s) => s.image)
                : []
            ).filter(Boolean);

            const portfolioUrl = (pro.portfolio_url || pro.portfolio || "").trim();
            const validPortfolioLink = portfolioUrl
              ? portfolioUrl.startsWith("http://") || portfolioUrl.startsWith("https://")
                ? portfolioUrl
                : `https://${portfolioUrl}`
              : null;

            return (
              <div>
                <div className="flex items-center justify-between mb-2 flex-wrap gap-1.5">
                  <h3 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-inkmuted dark:text-zinc-400">
                    <Briefcase size={13} className="text-brand" />
                    <span>Portfolio &amp; Work Samples</span>
                  </h3>
                  {validPortfolioLink && (
                    <a
                      href={validPortfolioLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-brand hover:underline flex items-center gap-1 border border-brand/30 px-1.5 py-0.5 rounded-sm"
                    >
                      <ExternalLink size={10} />
                      <span className="truncate max-w-[180px]">{portfolioUrl}</span>
                    </a>
                  )}
                </div>

                {portfolioImages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {portfolioImages.map((img, idx) => {
                      const src = formatImageSrc(img);
                      return (
                        <div
                          key={idx}
                          onClick={() => setLightboxImage(src)}
                          className="group relative cursor-pointer border border-ink/30 dark:border-zinc-700 bg-sand dark:bg-zinc-800 overflow-hidden shadow-xs hover:border-brand transition"
                        >
                          <div className="aspect-[4/3] w-full overflow-hidden bg-stone-100 dark:bg-zinc-900 flex items-center justify-center">
                            <img
                              src={src}
                              alt={`Work sample ${idx + 1}`}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          </div>
                          <div className="p-1.5 bg-white dark:bg-zinc-800 text-[9px] font-black text-ink dark:text-zinc-200 flex items-center justify-between">
                            <span>Sample #{idx + 1}</span>
                            <Sparkles size={9} className="text-brand" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="border border-dashed border-ink/30 dark:border-zinc-700 bg-sand/30 dark:bg-zinc-900/50 p-4 text-center">
                    <ImageIcon size={22} className="mx-auto text-inkmuted mb-1 opacity-70" />
                    <p className="text-[11px] font-bold text-ink dark:text-zinc-300">No image samples uploaded directly.</p>
                    {validPortfolioLink && (
                      <p className="text-[10px] text-brand font-medium mt-0.5">
                        Projects can be viewed via the external portfolio link above.
                      </p>
                    )}
                  </div>
                )}
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
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] w-full bg-white dark:bg-zinc-900 border-2 border-ink dark:border-zinc-700 p-3 shadow-[8px_8px_0px_#121212] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-ink dark:border-zinc-700">
              <span className="text-xs font-black uppercase text-ink dark:text-white flex items-center gap-1.5">
                <ImageIcon size={14} className="text-brand" /> Work Sample Preview
              </span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="flex h-7 w-7 items-center justify-center border-2 border-ink dark:border-zinc-700 bg-sand dark:bg-zinc-800 hover:bg-brand hover:text-white font-black text-xs transition"
              >
                ✕
              </button>
            </div>
            <div className="overflow-auto flex-1 flex items-center justify-center p-1 bg-stone-50 dark:bg-zinc-950 border border-ink/20 dark:border-zinc-800">
              <img
                src={lightboxImage}
                alt="Enlarged work sample"
                className="max-h-[70vh] w-auto max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
