import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Phone, Globe, Lock, LockOpen, ShieldCheck, MapPin, ArrowLeftRight,
  MessageSquare, CheckCircle2, Loader2, Star, Clock, IndianRupee,
  CheckCheck, Briefcase, Award, Sparkles, ExternalLink, Image as ImageIcon, X
} from "lucide-react";
import { Shell, TopBar } from "@/components/kit";
import Breadcrumbs from "@/components/Breadcrumbs";
import RatingBreakdown from "@/components/RatingBreakdown";
import { ProfileSkeleton } from "@/components/Skeletons";
import CouponInput from "@/components/CouponInput";
import { useRazorpay } from "@/hooks/usePayments";
import { apiGet, getEmployerId } from "@/lib/api";
import { ADMIN_EMAILS, getLeadById, getSubmittedProfiles, getStoredReviews } from "@/lib/clientStore";
import { useAuth } from "@/context/AuthContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { formatWhatsAppUrl, isVerifiedPro } from "@/lib/utils";

const Blur = () => <span className="pointer-events-none absolute inset-0 backdrop-blur-[6px]" />;

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

export default function Pro() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const isAdmin = Boolean(
    user?.is_admin ||
    user?.role === "admin" ||
    (user?.email && ADMIN_EMAILS.includes(user.email.trim().toLowerCase()))
  );
  const [pro, setPro] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [paying, setPaying] = useState(false);
  const [coupon, setCoupon] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // overview | reviews | skills | history
  const [lightboxImage, setLightboxImage] = useState(null);
  const { startPayment } = useRazorpay();

  usePageMeta({
    title: pro ? `${pro.name} · ${pro.skill} in Bengaluru` : "Freelancer Profile · WorkHop",
    description: pro
      ? `${pro.name} is a verified ${pro.skill} based in Bengaluru (${pro.rating ? `${pro.rating}★ rating, ` : ""}${pro.jobs_done || 0} gigs completed). Connect directly on WorkHop.`
      : "View verified freelancer portfolio, ratings, and rates on WorkHop.",
    canonical: `https://workhop.in/pro/${id}`,
    ogTitle: pro ? `${pro.name} · ${pro.skill}` : "WorkHop Freelancer",
    ogDescription: pro
      ? `Hire ${pro.name} for ${pro.skill} in Bengaluru. Hyperlocal talent, verified reviews, direct chats.`
      : "Freelancer profile on WorkHop.",
    jsonLd: pro
      ? {
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          "mainEntity": {
            "@type": "Person",
            "name": pro.name,
            "jobTitle": pro.skill,
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Bengaluru",
              "addressCountry": "IN",
            },
            ...(pro.rating
              ? {
                  "aggregateRating": {
                    "@type": "AggregateRating",
                    "ratingValue": pro.rating,
                    "reviewCount": reviews.length || pro.jobs_done || 1,
                  },
                }
              : {}),
          },
        }
      : null,
  });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    const syncProfileAndReviews = (rawPro, apiReviews = []) => {
      if (!rawPro) return;
      const proObj = { ...rawPro };
      const localRevs = getStoredReviews(proObj.id || id);
      const combined = [...apiReviews];
      for (const lr of localRevs) {
        if (!combined.some((r) => r.review_id === lr.review_id)) {
          combined.push(lr);
        }
      }
      if (combined.length > 0) {
        const total = combined.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
        proObj.rating = (total / combined.length).toFixed(1);
        proObj.reviews_count = combined.length;
        proObj.jobs_done = Math.max(Number(proObj.jobs_done) || 0, combined.length);
      } else if (!proObj.is_dummy) {
        proObj.rating = null;
        proObj.reviews_count = 0;
        proObj.jobs_done = Number(proObj.jobs_done) || 0;
      }
      setPro(proObj);
      setReviews(combined);
    };

    const fallbackLocalPro = () => {
      try {
        const targetId = String(id).trim().toLowerCase();
        const strippedTarget = targetId.replace(/^pro-/, "");
        const found =
          getLeadById(id) ||
          getSubmittedProfiles().find((p) => {
            const pId = String(p.id || p.freelancer_id || "").toLowerCase();
            const strippedPId = pId.replace(/^pro-/, "");
            return pId === targetId || strippedPId === strippedTarget || String(p.user_id || "").toLowerCase() === targetId;
          });
        if (found) {
          const proData = found.pro || found;
          const initialReviews = found.reviews || proData.reviews || [];
          syncProfileAndReviews(proData, initialReviews);
        }
      } catch (e) {
        console.error("Local pro fallback error", e);
      }
    };

    apiGet(`/pros/${id}`)
      .then((d) => {
        if (d && d.pro) {
          syncProfileAndReviews(d.pro, d.reviews || []);
        } else {
          fallbackLocalPro();
        }
      })
      .catch(() => {
        fallbackLocalPro();
      })
      .finally(() => {
        setLoading(false);
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      });
    if (isAdmin || localStorage.getItem("workhop_employer_unlocked") === "1") setUnlocked(true);
  }, [id, isAdmin]);

  const handleUnlock = async () => {
    setPaying(true);
    try {
      const employerId = getEmployerId();
      const data = await startPayment(
        {
          product: "employer_unlock",
          plan_id: "lead-unlock",
          amount_inr: coupon?.final_amount ?? 199,
          employer_id: employerId,
          coupon_code: coupon?.code ?? null,
        },
        `Unlock contact of ${pro?.name || "this pro"} · ₹${coupon?.final_amount ?? 199}`,
      );
      if (data?.leads) {
        setUnlocked(true);
        localStorage.setItem("workhop_employer_unlocked", "1");
        const fresh = data.leads.find((l) => l.id === id);
        if (fresh) setPro((p) => (p ? { ...p, phone: fresh.phone } : p));
      }
    } catch (e) {
      if (e?.message !== "PAYMENT_CANCELLED") console.log("unlock err", e);
    } finally {
      setPaying(false);
    }
  };

  return (
    <Shell>
      <TopBar title="PRO PROFILE" backTestID="pro-back-btn" />

      {loading ? (
        <div className="p-4 sm:p-6">
          <ProfileSkeleton />
        </div>
      ) : !pro ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-base font-black text-ink">Profile not found.</p>
          <button
            onClick={() => nav("/employer")}
            className="mt-3 border-2 border-ink bg-ink px-4 py-2 text-xs font-black text-white"
          >
            ← BACK TO PROS
          </button>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6 pb-20">
          {/* BREADCRUMBS */}
          <Breadcrumbs
            items={[
              { label: "Home", to: "/" },
              { label: "Pros", to: "/employer" },
              { label: pro.name },
            ]}
          />

          {/* UPWORK-STYLE HERO CARD */}
          <div className="border-2 border-ink bg-white p-6" data-testid="pro-hero">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center border-2 border-ink bg-brand text-3xl font-black text-white">
                {pro.initials || (pro.name || "?").slice(0, 2).toUpperCase()}
              </div>

              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl font-black text-ink">{pro.name}</h1>
                  {(() => {
                    const verified = isVerifiedPro(pro);
                    if (verified) {
                      return (
                        <span className="flex items-center gap-1 bg-ok text-white border border-ink px-2 py-0.5 text-[9px] font-black shadow-[1px_1px_0px_#121212]">
                          <ShieldCheck size={11} /> VERIFIED PRO
                        </span>
                      );
                    }
                    if (pro.approved || pro.status === "approved") {
                      return (
                        <span className="flex items-center gap-1 bg-sand text-ink border border-ink px-2 py-0.5 text-[9px] font-black shadow-[1px_1px_0px_#121212]">
                          PRO MEMBER
                        </span>
                      );
                    }
                    if (pro.status === "declined") {
                      return (
                        <span className="flex items-center gap-1 bg-red-600 text-white border border-ink px-2 py-0.5 text-[9px] font-black shadow-[1px_1px_0px_#121212]">
                          DECLINED
                        </span>
                      );
                    }
                    return (
                      <span className="flex items-center gap-1 bg-amber-500 text-white border border-ink px-2 py-0.5 text-[9px] font-black shadow-[1px_1px_0px_#121212]">
                        <Clock size={11} /> PENDING ADMIN APPROVAL
                      </span>
                    );
                  })()}
                </div>

                <p className="text-sm font-bold text-inkmuted mt-0.5">{pro.skill}</p>

                <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="flex items-center gap-1 border border-ink bg-sand px-2 py-1 text-[10px] font-extrabold text-ink">
                    <MapPin size={11} /> {pro.area || "Bengaluru"} · {pro.distance_km || 1.2} km away
                  </span>
                  {pro.rating ? (
                    <span className="flex items-center gap-1 border border-ink bg-[#FFF3C4] px-2 py-1 text-[10px] font-black text-ink">
                      <Star size={11} fill="#121212" /> {pro.rating} rating
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 border border-ink bg-sand px-2 py-1 text-[10px] font-bold text-inkmuted">
                      <Star size={11} /> New Pro · No reviews yet
                    </span>
                  )}
                </div>

                {!!pro.external_rating_source && (
                  <span
                    data-testid="imported-rating-badge"
                    className="mt-2 inline-flex items-center gap-1 border border-ink bg-[#FFF3C4] px-2 py-0.5 text-[9px] font-black text-ink"
                  >
                    <ArrowLeftRight size={10} /> RATING IMPORTED FROM {pro.external_rating_source.toUpperCase()}
                  </span>
                )}
              </div>

              {/* ACTION CTA BOX */}
              <div className="shrink-0 flex flex-col items-center sm:items-end w-full sm:w-auto">
                <div className="text-center sm:text-right mb-2">
                  <span className="text-[10px] font-bold text-inkmuted uppercase">Starting Rate</span>
                  <p className="text-lg font-black text-ink">
                    {pro.rate_hr ? `₹${pro.rate_hr}/hr` : "Custom Quote"}
                  </p>
                </div>
                {!(isAdmin || unlocked) ? (
                  <button
                    onClick={handleUnlock}
                    disabled={paying}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 border-2 border-ink bg-brand px-5 py-2.5 text-xs font-black tracking-wider text-white hover:bg-brand/95 transition active:translate-y-0.5"
                  >
                    {paying ? <Loader2 size={14} className="animate-spin" /> : <><LockOpen size={14} /> UNLOCK CONTACT</>}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                    <a
                      href={`tel:${pro.phone || ""}`}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 border-2 border-ink bg-ok px-4 py-2.5 text-xs font-black tracking-wider text-white hover:bg-ok/90 transition shadow-[2px_2px_0px_#121212]"
                    >
                      <Phone size={14} /> CALL {pro.phone || "PRO"} {isAdmin ? "(ADMIN)" : ""}
                    </a>
                    {pro.phone && (
                      <a
                        href={formatWhatsAppUrl(pro.phone, `Hi ${pro.name?.split(" ")?.[0] || ""}, connecting with you on WorkHop!`)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 border-2 border-ink bg-[#25D366] px-4 py-2.5 text-xs font-black tracking-wider text-white hover:bg-[#20ba59] transition shadow-[2px_2px_0px_#121212]"
                      >
                        <MessageSquare size={14} /> WHATSAPP
                      </a>
                    )}
                  </div>
                )}
                <button
                  onClick={() =>
                    nav("/employer/post-job", {
                      state: {
                        prefillTitle: `Need ${pro.skill}`,
                        prefillCategory: pro.category || pro.bucket || "Graphics & Design",
                        prefillArea: pro.area || "Bengaluru",
                        hireCandidateId: pro.id,
                        hireCandidateName: pro.name,
                      },
                    })
                  }
                  className="w-full sm:w-auto mt-2 flex items-center justify-center gap-1.5 border-2 border-ink bg-sand dark:bg-zinc-800 px-4 py-2 text-xs font-black text-ink dark:text-white shadow-[1.5px_1.5px_0px_#121212] hover:bg-sand/80 transition"
                >
                  <span>POST A GIG →</span>
                </button>
              </div>
            </div>

            {/* KEY METRICS ROW */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t-2 border-ink pt-4">
              {[
                {
                  n: pro.rating ? `★ ${pro.rating}` : "New Pro",
                  l: Number(pro.reviews_count) > 0 ? `${pro.reviews_count} REVIEWS` : "NO REVIEWS YET",
                  icon: Star,
                },
                { n: `${pro.jobs_done || 0}`, l: "JOBS COMPLETED", icon: CheckCheck },
                { n: `${pro.delivery_days || 3} Days`, l: "DELIVERY TIME", icon: Clock },
                { n: pro.rate_hr ? `₹${pro.rate_hr}` : "Quote", l: "HOURLY RATE", icon: IndianRupee },
              ].map((s, i) => (
                <div key={i} className="flex flex-col items-center border-2 border-ink bg-sand p-2.5 text-center">
                  <span className="text-sm font-black text-ink">{s.n}</span>
                  <span className="mt-0.5 text-[8px] font-extrabold tracking-wide text-inkmuted">
                    {s.l}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* UPWORK-STYLE TABS HEADER */}
          <div className="flex border-b-2 border-ink bg-sand overflow-x-auto">
            {[
              { id: "overview", label: "OVERVIEW & PORTFOLIO" },
              { id: "reviews", label: `REVIEWS (${reviews.length})` },
              { id: "skills", label: "SKILLS & CREDENTIALS" },
              { id: "history", label: "WORK HISTORY" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`border-r-2 border-ink px-4 py-3 text-xs font-black tracking-wide whitespace-nowrap transition ${
                  activeTab === t.id
                    ? "bg-white text-ink border-b-2 border-b-white -mb-[2px]"
                    : "text-inkmuted hover:text-ink hover:bg-sand/80"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB 1: OVERVIEW & PORTFOLIO */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              {/* ABOUT SECTION */}
              <div className="flex flex-col gap-2 border-2 border-ink bg-white p-4">
                <h2 className="text-[11px] font-black tracking-[0.15em] text-ink">ABOUT THIS PRO</h2>
                <p data-testid="pro-intro" className="text-[13px] leading-6 text-ink whitespace-pre-line">
                  {pro.intro || `${pro.name} is a verified ${pro.skill} based in ${pro.area || "Bengaluru"}, offering reliable local services with fast turnaround.`}
                </p>
              </div>

              {/* WORK SAMPLES & PORTFOLIO */}
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
                  <div className="flex flex-col gap-3 border-2 border-ink bg-white p-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h2 className="text-[11px] font-black tracking-[0.15em] text-ink uppercase">
                          PORTFOLIO &amp; WORK SAMPLES
                        </h2>
                        <p className="text-[10px] font-bold text-inkmuted mt-0.5">
                          {portfolioImages.length > 0
                            ? `${portfolioImages.length} Verified Case Study Image${portfolioImages.length > 1 ? "s" : ""}`
                            : "Freelancer Work & Case Studies"}
                        </p>
                      </div>
                      {validPortfolioLink && (
                        <a
                          href={validPortfolioLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 border-2 border-ink bg-sand hover:bg-brand hover:text-white px-3 py-1.5 text-xs font-black text-ink shadow-[1.5px_1.5px_0px_#121212] transition"
                        >
                          <Globe size={13} />
                          <span>OPEN EXTERNAL PORTFOLIO</span>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>

                    {/* IMAGE GALLERY */}
                    {portfolioImages.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-1">
                        {portfolioImages.map((img, i) => {
                          const src = formatImageSrc(img);
                          return (
                            <div
                              key={i}
                              onClick={() => setLightboxImage(src)}
                              className="group relative cursor-pointer border-2 border-ink bg-sand overflow-hidden shadow-[2px_2px_0px_#121212] hover:shadow-[4px_4px_0px_#121212] transition"
                            >
                              <div className="aspect-[4/3] w-full overflow-hidden bg-stone-100 flex items-center justify-center">
                                <img
                                  src={src}
                                  alt={`Work sample ${i + 1}`}
                                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  loading="lazy"
                                />
                              </div>
                              <div className="p-2 border-t border-ink bg-white flex items-center justify-between">
                                <span className="text-[10px] font-black text-ink uppercase">
                                  Sample #{i + 1}
                                </span>
                                <span className="text-[9px] font-bold text-brand flex items-center gap-1">
                                  <span>Click to enlarge</span>
                                  <Sparkles size={10} />
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-ink/30 bg-sand/40 p-6 text-center">
                        <ImageIcon size={32} className="mx-auto text-inkmuted mb-2" />
                        <p className="text-xs font-black text-ink">No image samples uploaded directly.</p>
                        {validPortfolioLink ? (
                          <p className="text-[11px] font-semibold text-inkmuted mt-1">
                            View their projects and case studies directly via the external portfolio link above.
                          </p>
                        ) : (
                          <p className="text-[11px] font-semibold text-inkmuted mt-1">
                            This freelancer has not uploaded work sample screenshots yet.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* CONTACT DETAILS & UNLOCK CARD */}
              <div className="flex flex-col gap-2 border-2 border-ink bg-white p-4" data-testid="pro-contact-card">
                <h2 className="text-[11px] font-black tracking-[0.15em] text-ink">DIRECT CONTACT INFORMATION</h2>
                <div className="flex flex-col gap-2.5 bg-sand p-3 border-2 border-ink">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center border border-ink bg-white">
                      <Phone size={16} className="text-brand" />
                    </span>
                    <div className="relative flex-1 overflow-hidden">
                      <p className="text-[9px] font-bold text-inkmuted">DIRECT PHONE / WHATSAPP</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-black text-ink">
                          {unlocked ? pro.phone || "+91 98450 12345" : "+91 ••••• •••••"}
                        </p>
                        {unlocked && pro.phone && (
                          <a
                            href={formatWhatsAppUrl(pro.phone, `Hi ${pro.name?.split(" ")?.[0] || ""}, connecting with you on WorkHop!`)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 bg-[#25D366] text-white px-2 py-0.5 text-[10px] font-black border border-ink hover:bg-[#20ba59] transition shadow-[1px_1px_0px_#121212]"
                          >
                            <Phone size={10} /> WhatsApp
                          </a>
                        )}
                      </div>
                      {!unlocked && <Blur />}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center border border-ink bg-white">
                      <Globe size={16} className="text-brand" />
                    </span>
                    <div className="relative flex-1 overflow-hidden">
                      <p className="text-[9px] font-bold text-inkmuted">WEBSITE / PORTFOLIO</p>
                      <p className="text-sm font-black text-ink">
                        {unlocked ? pro.portfolio || "https://workhop.in/pro" : "████████████.in"}
                      </p>
                      {!unlocked && <Blur />}
                    </div>
                  </div>

                  {!unlocked && (
                    <div className="mt-2 border-t border-ink/20 pt-2">
                      <CouponInput
                        product="employer_unlock"
                        amount={199}
                        onApplied={setCoupon}
                        testIDPrefix="pro-coupon"
                      />
                      <button
                        data-testid="pro-unlock-btn"
                        onClick={handleUnlock}
                        disabled={paying}
                        className="mt-2 flex w-full items-center justify-center gap-2 border-2 border-ink bg-brand py-3.5 text-xs font-black tracking-wider text-white disabled:opacity-70 active:translate-y-0.5 hover:bg-brand/95"
                      >
                        {paying ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <>
                            <LockOpen size={16} /> UNLOCK THIS LEAD · ₹{coupon?.final_amount ?? 199}
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {unlocked && (
                    <div
                      data-testid="pro-unlocked-badge"
                      className="mt-2 flex items-center gap-2 bg-[#E5F8EE] border border-ok p-2"
                    >
                      <CheckCircle2 size={16} className="text-ok" />
                      <span className="text-xs font-extrabold text-ink">
                        Contact unlocked — phone and website are visible
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REVIEWS & RATINGS */}
          {activeTab === "reviews" && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              {reviews.length > 0 && pro.rating ? (
                <RatingBreakdown
                  average={pro.rating}
                  totalCount={reviews.length || pro.reviews_count || 0}
                  distribution={reviews.reduce((acc, r) => {
                    const stars = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
                    acc[stars] = (acc[stars] || 0) + 1;
                    return acc;
                  }, { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 })}
                />
              ) : null}

              <div className="flex flex-col gap-3">
                <h3 className="text-[11px] font-black tracking-[0.15em] text-ink">
                  CLIENT REVIEWS ({reviews.length})
                </h3>
                {reviews.length === 0 ? (
                  <div className="border-2 border-ink bg-sand p-6 text-center shadow-[2px_2px_0px_#121212]">
                    <MessageSquare size={28} className="mx-auto text-inkmuted" />
                    <p className="mt-2 text-sm font-black text-ink">No Client Reviews Yet</p>
                    <p className="mt-1 text-xs text-inkmuted max-w-md mx-auto">
                      {pro.name} is a newly registered professional on WorkHop. Verified reviews and client ratings will appear here after local gigs are completed.
                    </p>
                  </div>
                ) : (
                  reviews.map((r) => (
                    <div key={r.review_id} className="border-2 border-ink bg-white p-4 shadow-[2px_2px_0px_#121212]">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-ink">
                          {r.reviewer_name || `${r.employer_name || "Verified Client"}${r.company_name ? ` · ${r.company_name}` : ""}`}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-black text-amber-500">
                            {"★".repeat(Math.min(5, Math.floor(r.rating || 5)))}
                          </span>
                          <span className="text-xs font-black text-ink">{Number(r.rating || 5).toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] font-bold text-brand flex-wrap">
                        <span>{r.job_title}</span>
                        {r.pay && <span className="text-ink font-black">· ₹{Number(r.pay).toLocaleString("en-IN")}</span>}
                        {r.date_formatted && <span className="text-inkmuted font-semibold">· {r.date_formatted}</span>}
                      </div>

                      {Array.isArray(r.badges) && r.badges.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {r.badges.map((b) => (
                            <span key={b} className="text-[9px] font-black text-ink bg-sand border border-ink/20 px-1.5 py-0.5">
                              {b}
                            </span>
                          ))}
                        </div>
                      )}

                      {!!r.text && <p className="mt-2 text-xs text-ink leading-5 italic bg-[#fcfcfc] p-2 border-l-2 border-brand">"{r.text}"</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SKILLS & CREDENTIALS */}
          {activeTab === "skills" && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              {/* SKILLS CHIPS */}
              <div className="border-2 border-ink bg-white p-4">
                <h2 className="text-[11px] font-black tracking-[0.15em] text-ink mb-3">
                  PRIMARY SKILLS &amp; KEYWORDS
                </h2>
                <div className="flex flex-wrap gap-2">
                  <span className="border-2 border-ink bg-brand px-3 py-1 text-xs font-black text-white">
                    {pro.skill}
                  </span>
                  {(pro.keywords || ["Graphic Design", "Logo Creation", "Social Media", "Brand Kit", "Illustrator"]).map(
                    (k) => (
                      <span
                        key={k}
                        className="border-2 border-ink bg-sand px-2.5 py-1 text-xs font-bold text-ink"
                      >
                        {k}
                      </span>
                    ),
                  )}
                </div>
              </div>

              {/* LANGUAGES */}
              <div className="border-2 border-ink bg-white p-4">
                <h2 className="text-[11px] font-black tracking-[0.15em] text-ink mb-3">
                  LANGUAGES SPOKEN
                </h2>
                <div className="flex flex-wrap gap-2">
                  {(pro.languages || ["English", "Hindi", "Kannada"]).map((l) => (
                    <span
                      key={l}
                      className="border-2 border-ink bg-white px-3 py-1 text-xs font-black text-ink"
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </div>

              {/* VERIFICATIONS STACK */}
              <div className="border-2 border-ink bg-white p-4">
                <h2 className="text-[11px] font-black tracking-[0.15em] text-ink mb-3">
                  TRUST &amp; VERIFICATION BADGES
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Email Address", status: "Verified", icon: CheckCircle2 },
                    { label: "Phone Number", status: "Verified", icon: CheckCircle2 },
                    { label: "Work Portfolio", status: "Reviewed", icon: Award },
                  ].map((v, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 border-2 border-ink bg-[#E5F8EE] p-3"
                    >
                      <v.icon size={16} className="text-ok" />
                      <div>
                        <p className="text-xs font-black text-ink">{v.label}</p>
                        <p className="text-[10px] font-extrabold text-ok">{v.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: WORK HISTORY */}
          {activeTab === "history" && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              <div className="border-2 border-ink bg-white p-4 shadow-[2px_2px_0px_#121212]">
                <div className="flex items-center justify-between mb-3 border-b-2 border-ink pb-2">
                  <h2 className="text-[11px] font-black tracking-[0.15em] text-ink">
                    COMPLETED JOBS &amp; HISTORY
                  </h2>
                  <span className="text-xs font-black text-brand">
                    {(reviews.length || pro.jobs_done || 0)} COMPLETED GIGS
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {reviews.length > 0 ? (
                    reviews.map((h, i) => (
                      <div
                        key={h.review_id || i}
                        className="border-2 border-ink bg-sand p-3.5 shadow-[1.5px_1.5px_0px_#121212]"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-ink">{h.job_title}</span>
                            <span className="inline-flex items-center gap-1 bg-[#0E6220] text-white text-[9px] font-black uppercase px-2 py-0.5 border border-ink shadow-[1px_1px_0px_#121212]">
                              <CheckCircle2 size={10} /> Job Completed
                            </span>
                          </div>
                          {h.pay && (
                            <span className="text-xs font-black text-ink">
                              ₹{Number(h.pay).toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-inkmuted font-bold flex-wrap gap-1">
                          <span>{h.date_formatted || h.date || `${i + 1} week ago`} · {h.company_name || h.reviewer_name || "Verified Client"}</span>
                          {h.rating && (
                            <span className="text-[#0E6220] flex items-center gap-1 font-black">
                              <span className="text-amber-500">★</span> {Number(h.rating).toFixed(1)} Completed
                            </span>
                          )}
                        </div>
                        {h.text && (
                          <p className="mt-2 text-[11px] text-ink/80 italic border-l-2 border-ink pl-2">
                            "{h.text}"
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center bg-sand border-2 border-dashed border-ink/30">
                      <CheckCheck size={28} className="mx-auto text-inkmuted mb-2" />
                      <p className="text-sm font-black text-ink">No Completed Gigs on WorkHop Yet</p>
                      <p className="mt-1 text-xs text-inkmuted max-w-md mx-auto">
                        Work history and delivery verifications will appear here automatically as client projects conclude on WorkHop.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LIGHTBOX PREVIEW MODAL */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[92vh] w-full bg-white border-2 border-ink p-3 shadow-[8px_8px_0px_#121212] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-ink">
              <span className="text-xs font-black uppercase text-ink flex items-center gap-1.5">
                <ImageIcon size={14} className="text-brand" /> Work Sample Preview
              </span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="flex h-7 w-7 items-center justify-center border-2 border-ink bg-sand hover:bg-brand hover:text-white font-black text-xs transition"
              >
                ✕
              </button>
            </div>
            <div className="overflow-auto flex-1 flex items-center justify-center p-1 bg-stone-50 border border-ink/20">
              <img
                src={lightboxImage}
                alt="Enlarged work sample"
                className="max-h-[75vh] w-auto max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
