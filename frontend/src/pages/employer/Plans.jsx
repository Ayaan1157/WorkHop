import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, ArrowRight, Check, Loader2, Sparkles,
  PlusCircle, ShieldCheck, Zap, Building2, Flame
} from "lucide-react";
import { Shell, TopBar, Spinner, IconBtn } from "@/components/kit";
import CouponInput from "@/components/CouponInput";
import { useRazorpay } from "@/hooks/usePayments";
import { apiGet, getEmployerId } from "@/lib/api";
import { ADMIN_EMAILS } from "@/lib/clientStore";
import { useAuth } from "@/context/AuthContext";

export default function Plans() {
  const nav = useNavigate();
  const { user } = useAuth();
  const isAdmin = Boolean(
    user?.is_admin ||
    user?.role === "admin" ||
    (user?.email && ADMIN_EMAILS.includes(user.email.trim().toLowerCase()))
  );
  const [plans, setPlans] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [coupon, setCoupon] = useState(null);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'postings' | 'branding'
  const { startPayment } = useRazorpay();

  const loadPurchases = useCallback(async () => {
    try {
      const data = await apiGet(`/employer/${getEmployerId()}/plans`);
      if (data) setPurchases(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    Promise.all([
      apiGet("/plans").then((res) => {
        if (Array.isArray(res)) setPlans(res);
      }).catch(() => {}),
      loadPurchases(),
    ]).finally(() => setLoading(false));
  }, [loadPurchases]);

  const open = (plan) => {
    if (plan.price === 0 || plan.is_free) {
      nav("/employer/post-job");
      return;
    }
    setSelected(plan);
    setCoupon(null);
    setPaySuccess(false);
  };

  const handlePay = async () => {
    if (!selected) return;
    setPaying(true);
    try {
      const data = await startPayment(
        {
          product: "plan",
          plan_id: selected.plan_id,
          employer_id: getEmployerId(),
          coupon_code: coupon?.code ?? null,
        },
        `${selected.name} · ${coupon?.final_amount != null ? `₹${coupon.final_amount}` : selected.price_label}`,
      );
      if (data?.purchase || data?.ok !== false) {
        setPaySuccess(true);
        await loadPurchases();
        setTimeout(() => setSelected(null), 1400);
      }
    } catch (e) {
      if (e?.message !== "PAYMENT_CANCELLED") console.log("purchase err", e);
    } finally {
      setPaying(false);
    }
  };

  const postingPlans = plans.filter((p) => p.section === "postings" || p.section === "add-ons");
  const brandingPlans = plans.filter((p) => p.section === "branding");

  const visiblePlans =
    activeTab === "postings"
      ? postingPlans
      : activeTab === "branding"
      ? brandingPlans
      : plans;

  const finalLabel =
    coupon?.final_amount != null
      ? `₹${Number(coupon.final_amount).toLocaleString("en-IN")}`
      : selected?.price_label;

  return (
    <Shell>
      <TopBar
        title="PLANS &amp; PRICING"
        sub="Free Job Posting · Optional Boosts &amp; Employer Branding"
        backTestID="plans-back-btn"
        right={
          <IconBtn onClick={() => nav("/employer/post-job")} title="Post a Job">
            <PlusCircle size={18} className="text-brand" />
          </IconBtn>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-8 pb-20">
          {/* 100% FREE JOB POSTING HERO BANNER */}
          <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 border-2 border-ink bg-[#E5F8EE] p-5 sm:p-7 shadow-[4px_4px_0px_#121212]">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-ink bg-ok text-white shadow-[2px_2px_0px_#121212]">
                <Zap size={24} />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-ok">
                    WORKHOP EMPLOYER PRIVILEGE
                  </span>
                  <span className="px-2.5 py-0.5 text-[10px] font-black tracking-wide border border-ink bg-ink text-white">
                    100% FREE JOB POSTING
                  </span>
                  <span className="px-2 py-0.5 text-[9px] font-black tracking-wide border border-ink bg-[#FFF3C4] text-ink">
                    NO CREDITS · ZERO FEES
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-ink mt-1">
                  Job Posting is 100% Free on WorkHop!
                </h2>
                <p className="text-xs text-inkmuted font-semibold mt-1 max-w-2xl leading-relaxed">
                  Post unlimited gigs with zero platform posting fees. Your requirement goes live instantly across your 5km radius in Bangalore with direct WhatsApp and phone connections to verified talent.
                </p>
              </div>
            </div>
            <button
              onClick={() => nav("/employer/post-job")}
              className="flex items-center gap-2 border-2 border-ink bg-brand px-6 py-3.5 text-xs font-black tracking-wider uppercase text-white hover:bg-brand/95 transition active:translate-y-0.5 shrink-0 shadow-[2px_2px_0px_#121212]"
            >
              <PlusCircle size={15} /> POST A GIG (FREE)
            </button>
          </div>

          {/* ACTIVE PLANS SECTION */}
          {purchases.length > 0 && (
            <div className="mb-6 flex flex-col gap-2" data-testid="active-plans">
              <p className="text-[10px] font-extrabold tracking-[0.15em] text-inkmuted">
                YOUR ACTIVE SERVICES
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {purchases.map((p) => (
                  <div
                    key={p.purchase_id || p.plan_id}
                    data-testid={`active-plan-${p.plan_id}`}
                    className="flex items-center gap-3 border-2 border-ok bg-[#E5F8EE] p-3.5 shadow-sm"
                  >
                    <CheckCircle2 size={20} className="text-ok shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-ink truncate">
                        {p.plan_name || p.name || "Active Service"}
                      </p>
                      <p className="text-[11px] text-inkmuted font-semibold">
                        {p.expires_at
                          ? `Active until ${new Date(p.expires_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}`
                          : "Active — Lifetime Access"}
                      </p>
                    </div>
                    <span className="text-sm font-black text-ink shrink-0">
                      {p.price ? `₹${Number(p.price).toLocaleString("en-IN")}` : "FREE"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CATEGORY TABS */}
          <div className="flex border-b-2 border-ink bg-sand dark:bg-[#1a1a1e] mb-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`border-r-2 border-ink px-4 py-3 text-xs font-black tracking-wide whitespace-nowrap transition ${
                activeTab === "all"
                  ? "bg-white text-ink dark:bg-[#161618] dark:text-white border-b-2 border-b-white dark:border-b-[#161618] -mb-[2px]"
                  : "text-inkmuted dark:text-zinc-400 hover:text-ink dark:hover:text-white hover:bg-sand/80 dark:hover:bg-[#25252a]"
              }`}
            >
              ALL SERVICES ({plans.length})
            </button>
            <button
              onClick={() => setActiveTab("postings")}
              className={`border-r-2 border-ink px-4 py-3 text-xs font-black tracking-wide whitespace-nowrap flex items-center gap-1.5 transition ${
                activeTab === "postings"
                  ? "bg-white text-ink dark:bg-[#161618] dark:text-white border-b-2 border-b-white dark:border-b-[#161618] -mb-[2px]"
                  : "text-inkmuted dark:text-zinc-400 hover:text-ink dark:hover:text-white hover:bg-sand/80 dark:hover:bg-[#25252a]"
              }`}
            >
              <Zap size={14} className="text-ok" />
              FREE POSTING &amp; BOOSTS ({postingPlans.length})
            </button>
            <button
              onClick={() => setActiveTab("branding")}
              className={`border-r-2 border-ink px-4 py-3 text-xs font-black tracking-wide whitespace-nowrap flex items-center gap-1.5 transition ${
                activeTab === "branding"
                  ? "bg-white text-ink dark:bg-[#161618] dark:text-white border-b-2 border-b-white dark:border-b-[#161618] -mb-[2px]"
                  : "text-inkmuted dark:text-zinc-400 hover:text-ink dark:hover:text-white hover:bg-sand/80 dark:hover:bg-[#25252a]"
              }`}
            >
              <Building2 size={14} className="text-ink dark:text-zinc-300" />
              EMPLOYER BRANDING &amp; ADS ({brandingPlans.length})
            </button>
          </div>

          {/* SECTION A: FREE POSTING & OPTIONAL BOOSTS */}
          {(activeTab === "all" || activeTab === "postings") && (
            <div className="mb-10">
              <Section
                tag="A"
                title="Job Posting &amp; Performance Boosts"
                sub="Post unlimited gigs for free, or add 48-hour urgent pinned placement"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {postingPlans.map((p) => (
                  <PlanCard
                    key={p.plan_id}
                    plan={p}
                    onBuy={() => open(p)}
                    onFreePost={() => nav("/employer/post-job")}
                  />
                ))}
              </div>
            </div>
          )}

          {/* SECTION B: EMPLOYER BRANDING & ADS */}
          {(activeTab === "all" || activeTab === "branding") && (
            <div className="mb-6">
              <Section
                tag="B"
                dark
                title="Employer Branding &amp; Classified Ads"
                sub="Enterprise visibility, logo placement, and priority matching"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {brandingPlans.map((p) => (
                  <PlanCard
                    key={p.plan_id}
                    plan={p}
                    onBuy={() => open(p)}
                    onFreePost={() => nav("/employer/post-job")}
                    enterprise
                  />
                ))}
              </div>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-inkmuted font-semibold">
            🔒 Optional add-on payments secured via Razorpay · UPI, Cards &amp; Netbanking
          </p>
        </div>
      )}

      {/* RAZORPAY CHECKOUT MODAL */}
      {selected && (
        <div
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg border-2 border-ink bg-white dark:bg-[#161618] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {paySuccess ? (
              <div
                data-testid="plan-pay-success"
                className="flex flex-col items-center gap-3 py-8 text-center animate-in fade-in"
              >
                <CheckCircle2 size={56} className="text-ok" />
                <p className="text-2xl font-black text-ink dark:text-white">Payment successful!</p>
                <p className="text-xs text-inkmuted dark:text-zinc-300 max-w-xs font-semibold">
                  {selected.name} is now active on your employer account.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-extrabold tracking-[0.15em] text-inkmuted dark:text-zinc-400 uppercase">
                    WORKHOP × RAZORPAY CHECKOUT
                  </p>
                  <span className="border border-ink/30 bg-sand dark:bg-[#242428] px-2 py-0.5 text-[10px] font-black text-brand uppercase">
                    OPTIONAL ADD-ON
                  </span>
                </div>

                <p className="text-3xl sm:text-4xl font-black tracking-tight text-ink dark:text-white mt-1">
                  Pay {finalLabel}
                </p>
                <p className="text-xs text-inkmuted dark:text-zinc-300 font-bold mt-1">
                  {selected.name} · {selected.unit}
                </p>

                <div className="my-4 border-2 border-ink bg-sand dark:bg-[#202024] p-3.5">
                  <p className="text-[10px] font-extrabold tracking-wide text-inkmuted dark:text-zinc-300 uppercase">
                    INCLUDED IN THIS PLAN
                  </p>
                  <div className="mt-2 flex flex-col gap-1 text-xs font-bold text-ink dark:text-zinc-200">
                    {(selected.features || []).map((f) => (
                      <div key={f} className="flex items-center gap-1.5">
                        <Check size={13} className="text-ok shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-3">
                  <CouponInput
                    key={selected.plan_id}
                    product="plan"
                    amount={selected.price}
                    onApplied={setCoupon}
                    testIDPrefix="plan-coupon"
                  />
                </div>

                <button
                  data-testid="plan-pay-confirm-btn"
                  onClick={handlePay}
                  disabled={paying}
                  className="flex w-full items-center justify-center gap-2 border-2 border-ink bg-brand py-4 text-sm font-black text-white disabled:opacity-60 hover:bg-brand/90 transition active:translate-y-0.5 shadow-sm"
                >
                  {paying ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Processing Payment…
                    </>
                  ) : (
                    `Pay ${finalLabel} with Razorpay`
                  )}
                </button>
                <p className="mt-2 text-center text-[11px] text-inkmuted dark:text-zinc-400">
                  🔒 Razorpay Test Mode · Test Card: 4111 1111 1111 1111
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}

const Section = ({ tag, title, sub, dark }) => (
  <div className="mt-2 flex items-center gap-3">
    <span
      className={`flex h-8 w-8 items-center justify-center border-2 border-ink text-sm font-black text-white ${
        dark ? "bg-ink dark:bg-zinc-800" : "bg-brand"
      }`}
    >
      {tag}
    </span>
    <div>
      <p className="text-base font-black text-ink dark:text-white">{title}</p>
      <p className="text-[11px] text-inkmuted dark:text-zinc-300 font-semibold">{sub}</p>
    </div>
  </div>
);

function PlanCard({ plan, onBuy, onFreePost, enterprise }) {
  const isFree = plan.price === 0 || plan.is_free;
  return (
    <div
      data-testid={`plan-card-${plan.plan_id}`}
      className={`flex flex-col justify-between border-2 border-ink p-5 shadow-[3px_3px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 ${
        isFree
          ? "border-ok bg-[#F0FDF4] dark:bg-[#132219] text-ink dark:text-white ring-2 ring-ok/30"
          : enterprise
          ? "bg-ink text-white dark:bg-[#1a1a1e] dark:text-white"
          : "bg-white text-ink dark:bg-[#161618] dark:text-white"
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-base font-black text-ink dark:text-white">
            {plan.name}
          </p>
          {plan.badge && (
            <span
              className={`border px-2 py-0.5 text-[9px] font-black tracking-wider ${
                isFree || plan.badge.includes("FREE")
                  ? "bg-ok text-white border-ok"
                  : enterprise
                  ? "bg-brand text-white border-brand"
                  : "bg-brand text-white border-ink"
              }`}
            >
              {plan.badge}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-baseline gap-1.5 border-b border-ink/20 pb-3">
          <span className="text-3xl font-black tracking-tight text-ink dark:text-white">
            {plan.price_label}
          </span>
          <span className="text-xs font-bold text-inkmuted dark:text-zinc-300">
            / {plan.unit}
          </span>
        </div>

        <div className="my-4 flex flex-col gap-2">
          {(plan.features || []).map((f) => (
            <div key={f} className="flex items-start gap-2">
              <Check
                size={14}
                className={`mt-0.5 shrink-0 ${isFree ? "text-ok" : "text-brand dark:text-brand"}`}
              />
              <span className="text-xs font-semibold leading-4 text-ink dark:text-zinc-200">
                {f}
              </span>
            </div>
          ))}
        </div>
      </div>

      {isFree ? (
        <button
          data-testid={`plan-buy-${plan.plan_id}`}
          onClick={onFreePost}
          className="mt-2 flex w-full items-center justify-center gap-2 border-2 py-3 text-xs font-black tracking-wider text-white transition active:translate-y-0.5 border-ink bg-ok hover:bg-ok/90 shadow-[2px_2px_0px_#121212]"
        >
          <PlusCircle size={14} className="text-white shrink-0" />
          <span className="text-white font-black">POST A GIG (100% FREE)</span>
        </button>
      ) : (
        <button
          data-testid={`plan-buy-${plan.plan_id}`}
          onClick={onBuy}
          className="mt-2 flex w-full items-center justify-center gap-2 border-2 py-3 text-xs font-black tracking-wider text-white transition active:translate-y-0.5 border-ink bg-brand hover:bg-brand/90 shadow-[2px_2px_0px_#121212]"
        >
          <span className="text-white font-black">
            {`Buy ${plan.name} · ${plan.price_label}`}
          </span>
          <ArrowRight size={14} className="text-white shrink-0" />
        </button>
      )}
    </div>
  );
}
