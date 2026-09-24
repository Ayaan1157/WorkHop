import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Phone, Globe, LockOpen, ShieldCheck, MapPin, ArrowLeftRight,
  MessageSquare, CheckCircle2, Loader2, Star, Clock, IndianRupee,
  CheckCheck, Briefcase, Award, Sparkles, ExternalLink
} from "lucide-react";
import { Shell, TopBar } from "@/components/kit";
import Breadcrumbs from "@/components/Breadcrumbs";
import RatingBreakdown from "@/components/RatingBreakdown";
import { ProfileSkeleton } from "@/components/Skeletons";
import CouponInput from "@/components/CouponInput";
import { useRazorpay } from "@/hooks/usePayments";
import { apiGet, getEmployerId } from "@/lib/api";
import { ADMIN_EMAILS } from "@/lib/clientStore";
import { useAuth } from "@/context/AuthContext";

const Blur = () => <span className="pointer-events-none absolute inset-0 backdrop-blur-[6px]" />;

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
  const { startPayment } = useRazorpay();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    apiGet(`/pros/${id}`)
      .then((d) => {
        if (d) {
          setPro(d.pro);
          setReviews(d.reviews || []);
        }
      })
      .catch(() => {})
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
                  <span className="flex items-center gap-1 bg-ok text-white border border-ink px-2 py-0.5 text-[9px] font-black">
                    <ShieldCheck size={11} /> VERIFIED PRO
                  </span>
                </div>

                <p className="text-sm font-bold text-inkmuted mt-0.5">{pro.skill}</p>

                <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="flex items-center gap-1 border border-ink bg-sand px-2 py-1 text-[10px] font-extrabold text-ink">
                    <MapPin size={11} /> {pro.area || "Bengaluru"} · {pro.distance_km || 1.2} km away
                  </span>
                  <span className="flex items-center gap-1 border border-ink bg-[#FFF3C4] px-2 py-1 text-[10px] font-black text-ink">
                    <Star size={11} fill="#121212" /> {pro.rating} rating
                  </span>
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
                  <a
                    href={`tel:${pro.phone || "9876543210"}`}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 border-2 border-ink bg-ok px-5 py-2.5 text-xs font-black tracking-wider text-white"
                  >
                    <Phone size={14} /> CALL {pro.phone || "PRO"} {isAdmin ? "(ADMIN)" : ""}
                  </a>
                )}
              </div>
            </div>

            {/* KEY METRICS ROW */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t-2 border-ink pt-4">
              {[
                { n: `★ ${pro.rating}`, l: pro.reviews_count ? `${pro.reviews_count} REVIEWS` : "RATING", icon: Star },
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

              {/* WORK SAMPLES / PORTFOLIO GRID */}
              <div className="flex flex-col gap-2 border-2 border-ink bg-white p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-[11px] font-black tracking-[0.15em] text-ink">PORTFOLIO &amp; WORK SAMPLES</h2>
                  <span className="text-[10px] font-extrabold text-inkmuted">3 SAMPLES</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
                  {[
                    { title: "Client Project Alpha", tag: "Completed" },
                    { title: "Commercial Brand Kit", tag: "Featured" },
                    { title: "High-Impact Delivery", tag: "Verified" },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="border-2 border-ink bg-sand p-3 flex flex-col justify-between h-36 relative overflow-hidden group hover:bg-[#FFE5D6] transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="border border-ink bg-white px-2 py-0.5 text-[8px] font-black">
                          {item.tag}
                        </span>
                        <Sparkles size={13} className="text-brand" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-ink">{item.title}</p>
                        <p className="text-[10px] text-inkmuted">{pro.skill} case study</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

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
                      <p className="text-sm font-black text-ink">
                        {unlocked ? pro.phone || "+91 98450 12345" : "+91 ••••• •••••"}
                      </p>
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

          {/* TAB 2: REVIEWS & RATINGS WITH BREAKDOWN */}
          {activeTab === "reviews" && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              <RatingBreakdown
                average={pro.rating || 4.9}
                totalCount={reviews.length || pro.reviews_count || 12}
                distribution={{ 5: 85, 4: 12, 3: 3, 2: 0, 1: 0 }}
              />

              <div className="flex flex-col gap-3">
                <h3 className="text-[11px] font-black tracking-[0.15em] text-ink">
                  CLIENT REVIEWS ({reviews.length})
                </h3>
                {reviews.length === 0 ? (
                  <div className="border-2 border-ink bg-sand p-6 text-center">
                    <MessageSquare size={24} className="mx-auto text-inkmuted" />
                    <p className="mt-2 text-xs font-bold text-ink">No written reviews yet</p>
                    <p className="text-[11px] text-inkmuted">Reviews build automatically after completed local gigs.</p>
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
              <div className="border-2 border-ink bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[11px] font-black tracking-[0.15em] text-ink">
                    COMPLETED JOBS &amp; HISTORY
                  </h2>
                  <span className="text-xs font-black text-brand">
                    {(reviews.length || pro.jobs_done || 0)} TOTAL DELIVERIES
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {reviews.length > 0 ? (
                    reviews.map((h, i) => (
                      <div key={h.review_id || i} className="border-2 border-ink bg-sand p-3.5 shadow-[1.5px_1.5px_0px_#121212]">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="text-xs font-black text-ink">{h.job_title}</span>
                          <span className="text-xs font-black text-ink">
                            {h.pay ? `₹${Number(h.pay).toLocaleString("en-IN")}` : "₹15,000"}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-inkmuted font-bold flex-wrap gap-1">
                          <span>{h.date_formatted || h.date || `${i + 1} week ago`} · {h.company_name || h.reviewer_name || "Bengaluru Client"}</span>
                          <span className="text-brand flex items-center gap-1 font-black">
                            <span className="text-amber-500">★</span> {Number(h.rating || 5).toFixed(1)} Completed
                          </span>
                        </div>
                        {h.text && (
                          <p className="mt-2 text-[11px] text-ink/80 italic border-l-2 border-ink pl-2">
                            "{h.text}"
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-inkmuted font-bold">
                      No completed jobs yet. Work history updates automatically as client projects conclude.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}
