import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, ArrowRight, Check, Tag, Loader2, Sparkles, Coins,
  PlusCircle, ShieldCheck, Zap, Building2, Layers, ArrowUpRight, HelpCircle
} from "lucide-react";
import { Shell, TopBar, Spinner, IconBtn } from "@/components/kit";
import CouponInput from "@/components/CouponInput";
import { useRazorpay } from "@/hooks/usePayments";
import { apiGet, getEmployerId } from "@/lib/api";
import { ADMIN_EMAILS, getEmployerHops, addEmployerHops } from "@/lib/clientStore";
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
  const [employerHops, setEmployerHops] = useState(() => getEmployerHops(getEmployerId()));
  const [selectedBundleId, setSelectedBundleId] = useState("starter-bundle");
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
        const hopsToAdd = selected.hops ?? selected.credits ?? 0;
        if (hopsToAdd > 0) {
          const next = addEmployerHops(getEmployerId(), hopsToAdd);
          setEmployerHops(next);
        }
        await loadPurchases();
        setTimeout(() => setSelected(null), 1400);
      }
    } catch (e) {
      if (e?.message !== "PAYMENT_CANCELLED") console.log("purchase err", e);
    } finally {
      setPaying(false);
    }
  };

  const postingPlans = plans.filter((p) => p.section === "postings" || !p.section);
  const brandingPlans = plans.filter((p) => p.section === "branding");

  const hopBundles = postingPlans.filter((p) => (p.hops || p.credits) > 0);
  const selectedUpworkBundle = hopBundles.find((b) => b.plan_id === selectedBundleId) || hopBundles[1] || hopBundles[0];

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

  const currentHopCount = isAdmin ? 9999 : employerHops;

  return (
    <Shell>
      <TopBar
        title="PLANS &amp; PRICING"
        sub="Buy job post Hops &amp; employer branding"
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
          {/* HOPS OVERVIEW BANNER */}
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-2 border-ink bg-[#FFF3C4] p-4 sm:p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
            <div className="flex items-start gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-ink bg-brand text-white shadow-sm">
                <Coins size={24} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand">
                    {isAdmin ? "ADMIN MASTER ACCOUNT" : "EMPLOYER ACCOUNT"}
                  </span>
                  <span className={`px-2.5 py-0.5 text-[10px] font-black tracking-wide border border-ink ${isAdmin ? "bg-brand text-white" : "bg-ink text-white"}`}>
                    {isAdmin ? "ALL UNLOCKED (9999 HOPS)" : `${employerHops} HOPS ACTIVE`}
                  </span>
                </div>
                <h2 className="text-xl font-black text-ink mt-0.5">
                  {isAdmin ? "Full Platform Plans & Hops Unlocked" : "Need More Job Post Hops?"}
                </h2>
                <p className="text-xs text-inkmuted font-semibold mt-1">
                  {isAdmin
                    ? "As an administrator, you have unrestricted access to all posting plans, candidate unlocks, and employer branding."
                    : "1 Hop = 1 Live Job Post in your 5km radius for 30 days. Hops never expire and roll over."}
                </p>
              </div>
            </div>
            <button
              onClick={() => nav("/employer/post-job")}
              className="flex items-center gap-1.5 border-2 border-ink bg-brand px-4 py-2.5 text-xs font-black text-white hover:bg-brand/95 transition active:translate-y-0.5 shrink-0 shadow-sm"
            >
              <PlusCircle size={14} /> POST JOB NOW
            </button>
          </div>

          {/* ACTIVE PLANS SECTION */}
          {purchases.length > 0 && (
            <div className="mb-6 flex flex-col gap-2" data-testid="active-plans">
              <p className="text-[10px] font-extrabold tracking-[0.15em] text-inkmuted">
                YOUR ACTIVE PLANS
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
                        {p.plan_name || p.name || "Job Hops Pack"}
                      </p>
                      <p className="text-[11px] text-inkmuted font-semibold">
                        {p.expires_at
                          ? `Active until ${new Date(p.expires_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}`
                          : "Active — Lifetime Hops (No Expiry)"}
                      </p>
                    </div>
                    <span className="text-sm font-black text-ink shrink-0">
                      ₹{Number(p.price || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CATEGORY TABS */}
          <div className="flex border-b-2 border-ink bg-sand mb-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`border-r-2 border-ink px-4 py-3 text-xs font-black tracking-wide whitespace-nowrap transition ${
                activeTab === "all"
                  ? "bg-white text-ink border-b-2 border-b-white -mb-[2px]"
                  : "text-inkmuted hover:text-ink hover:bg-sand/80"
              }`}
            >
              ALL PLANS ({plans.length})
            </button>
            <button
              onClick={() => setActiveTab("postings")}
              className={`border-r-2 border-ink px-4 py-3 text-xs font-black tracking-wide whitespace-nowrap flex items-center gap-1.5 transition ${
                activeTab === "postings"
                  ? "bg-white text-ink border-b-2 border-b-white -mb-[2px]"
                  : "text-inkmuted hover:text-ink hover:bg-sand/80"
              }`}
            >
              <Coins size={14} className="text-brand" />
              JOB HOPS &amp; POSTING PLANS ({postingPlans.length})
            </button>
            <button
              onClick={() => setActiveTab("branding")}
              className={`border-r-2 border-ink px-4 py-3 text-xs font-black tracking-wide whitespace-nowrap flex items-center gap-1.5 transition ${
                activeTab === "branding"
                  ? "bg-white text-ink border-b-2 border-b-white -mb-[2px]"
                  : "text-inkmuted hover:text-ink hover:bg-sand/80"
              }`}
            >
              <Building2 size={14} className="text-ink" />
              EMPLOYER BRANDING &amp; ADS ({brandingPlans.length})
            </button>
          </div>

          {/* SECTION A: UPWORK-STYLE BUY HOPS EXPERIENCE */}
          {(activeTab === "all" || activeTab === "postings") && (
            <div className="mb-10">
              <Section
                tag="A"
                title="Job Postings &amp; Hop Bundles"
                sub="Purchase Hops to publish gigs on the 5km live feed"
              />

              {/* UPWORK-STYLE BUY HOPS CONTAINER */}
              <div className="mt-4 border-2 border-ink bg-white p-5 sm:p-7 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
                {/* UPWORK HEADER: AVAILABLE BALANCE */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-ink/15 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center border border-ink bg-[#FFF3C4] text-brand">
                        <Coins size={15} />
                      </span>
                      <h3 className="text-lg font-black tracking-tight text-ink uppercase">
                        Buy Hops
                      </h3>
                    </div>
                    <p className="text-xs text-inkmuted font-medium mt-1">
                      Hops are used to post verified gigs and broadcast requirements to skilled talent in your 5km radius.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 bg-sand/60 border border-ink/30 px-4 py-2.5 shrink-0">
                    <span className="text-[11px] font-bold text-inkmuted uppercase tracking-wider">
                      Your available balance:
                    </span>
                    <span className="text-base font-black text-brand">
                      {currentHopCount} Hops
                    </span>
                  </div>
                </div>

                {/* UPWORK SELECTOR SECTION */}
                <div className="mt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <label className="text-xs font-black uppercase tracking-wider text-ink">
                      Select the number of Hops to buy
                    </label>
                    <span className="text-[11px] text-inkmuted font-medium">
                      1 Hop = ₹299 (Save up to 50% on larger bundles)
                    </span>
                  </div>

                  {/* BUNDLE TILES SELECTOR */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {hopBundles.map((b) => {
                      const isSelected = selectedUpworkBundle?.plan_id === b.plan_id;
                      const hopCount = b.hops || b.credits || 1;
                      const unitRate = Math.round(b.price / hopCount);
                      return (
                        <div
                          key={b.plan_id}
                          onClick={() => setSelectedBundleId(b.plan_id)}
                          className={`cursor-pointer border-2 p-4 transition text-left relative flex flex-col justify-between ${
                            isSelected
                              ? "border-brand bg-brand/5 shadow-[0_4px_16px_-2px_rgba(230,90,30,0.15)] ring-2 ring-brand"
                              : "border-ink/30 bg-white hover:border-ink hover:bg-sand/30"
                          }`}
                        >
                          {b.badge && (
                            <span
                              className={`absolute -top-2.5 right-3 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border ${
                                b.badge.includes("BEST")
                                  ? "bg-ok text-white border-ok"
                                  : "bg-brand text-white border-brand"
                              }`}
                            >
                              {b.badge}
                            </span>
                          )}
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-base font-black text-ink">
                                {hopCount} {hopCount === 1 ? "Hop" : "Hops"}
                              </span>
                              <div
                                className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                                  isSelected ? "border-brand bg-brand text-white" : "border-ink/40"
                                }`}
                              >
                                {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                              </div>
                            </div>
                            <div className="mt-2 flex items-baseline gap-1">
                              <span className="text-2xl font-black text-ink">{b.price_label}</span>
                              <span className="text-[11px] text-inkmuted font-bold">
                                (₹{unitRate}/hop)
                              </span>
                            </div>
                            <p className="text-[11px] text-inkmuted mt-1 leading-snug">
                              {b.name} · Instant wallet credit
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* UPWORK ORDER SUMMARY / RECEIPT BOX */}
                  {selectedUpworkBundle && (
                    <div className="mt-6 border-2 border-ink/20 bg-sand/40 p-4 sm:p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-inkmuted mb-3">
                        Order Summary
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-ink/15 text-xs">
                        <div>
                          <p className="text-inkmuted font-semibold">Hops to add:</p>
                          <p className="text-sm font-black text-ink mt-0.5">
                            +{selectedUpworkBundle.hops || selectedUpworkBundle.credits || 1} Hops
                          </p>
                        </div>
                        <div>
                          <p className="text-inkmuted font-semibold">Your new Hop balance will be:</p>
                          <p className="text-sm font-black text-brand mt-0.5">
                            {currentHopCount + (selectedUpworkBundle.hops || selectedUpworkBundle.credits || 1)} Hops
                          </p>
                        </div>
                        <div>
                          <p className="text-inkmuted font-semibold">Your account will be charged:</p>
                          <p className="text-base font-black text-ink mt-0.5">
                            {selectedUpworkBundle.price_label}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-xs text-inkmuted font-semibold">
                          <ShieldCheck size={16} className="text-ok shrink-0" />
                          <span>
                            These Hops never expire as long as your account remains open. Hops roll over each month.
                          </span>
                        </div>
                        <button
                          data-testid="upwork-buy-hops-btn"
                          onClick={() => open(selectedUpworkBundle)}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 border-2 border-ink bg-brand px-6 py-3 text-xs font-black text-white hover:bg-brand/90 transition active:translate-y-0.5 shadow-sm shrink-0"
                        >
                          <span>Buy {selectedUpworkBundle.hops || selectedUpworkBundle.credits || 1} Hops · {selectedUpworkBundle.price_label}</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ALL POSTING PLANS & ADD-ONS DETAILED CARDS */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-black tracking-wider text-inkmuted uppercase">
                    All Job Posting Plans &amp; Add-ons
                  </p>
                  <span className="text-[11px] text-inkmuted font-semibold">
                    Compare features &amp; inclusions
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {postingPlans.map((p) => (
                    <PlanCard key={p.plan_id} plan={p} onBuy={() => open(p)} />
                  ))}
                </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                {brandingPlans.map((p) => (
                  <PlanCard key={p.plan_id} plan={p} onBuy={() => open(p)} enterprise />
                ))}
              </div>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-inkmuted font-semibold">
            🔒 Payments secured via Razorpay Test Mode · UPI, Cards &amp; Netbanking
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
            className="w-full max-w-lg border-2 border-ink bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {paySuccess ? (
              <div
                data-testid="plan-pay-success"
                className="flex flex-col items-center gap-3 py-8 text-center animate-in fade-in"
              >
                <CheckCircle2 size={56} className="text-ok" />
                <p className="text-2xl font-black text-ink">Payment successful!</p>
                <p className="text-xs text-inkmuted max-w-xs font-semibold">
                  {selected.name} is now active on your account.{" "}
                  {(selected.hops || selected.credits) ? (
                    <span className="text-brand font-black">
                      +{selected.hops || selected.credits} Hops added to your wallet.
                    </span>
                  ) : (
                    "Add-on is now active on your employer profile."
                  )}
                </p>
                <div className="mt-2 border border-ok/40 bg-ok/10 px-4 py-2 text-xs font-bold text-ok">
                  Your updated balance: {isAdmin ? 9999 : employerHops} Hops
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-extrabold tracking-[0.15em] text-inkmuted uppercase">
                    WORKHOP × RAZORPAY CHECKOUT
                  </p>
                  {(selected.hops || selected.credits) > 0 && (
                    <span className="flex items-center gap-1 border border-ink/30 bg-sand px-2 py-0.5 text-[10px] font-black text-brand">
                      <Coins size={12} />
                      +{selected.hops || selected.credits} HOPS
                    </span>
                  )}
                </div>

                <p className="text-3xl sm:text-4xl font-black tracking-tight text-ink mt-1">
                  Pay {finalLabel}
                </p>
                <p className="text-xs text-inkmuted font-bold mt-1">
                  {selected.name} · {selected.unit}
                </p>

                {/* UPWORK BALANCE MATH */}
                {(selected.hops || selected.credits) > 0 && (
                  <div className="mt-3 flex items-center justify-between border border-ink/20 bg-sand/50 p-2.5 text-xs">
                    <span className="text-inkmuted font-semibold">
                      Current balance: <strong className="text-ink">{currentHopCount} Hops</strong>
                    </span>
                    <ArrowRight size={13} className="text-inkmuted" />
                    <span className="text-brand font-black">
                      New balance: {currentHopCount + (selected.hops || selected.credits)} Hops
                    </span>
                  </div>
                )}

                <div className="my-4 border-2 border-ink bg-sand p-3.5">
                  <p className="text-[10px] font-extrabold tracking-wide text-inkmuted uppercase">
                    INCLUDED IN THIS PLAN
                  </p>
                  <div className="mt-2 flex flex-col gap-1 text-xs font-bold text-ink">
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
                  className="flex w-full items-center justify-center gap-2 border-2 border-ink bg-ink py-4 text-sm font-black text-white disabled:opacity-60 hover:bg-brand transition active:translate-y-0.5 shadow-sm"
                >
                  {paying ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Processing Payment…
                    </>
                  ) : (
                    `Pay ${finalLabel} with Razorpay`
                  )}
                </button>
                <p className="mt-2 text-center text-[11px] text-inkmuted">
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
        dark ? "bg-ink" : "bg-brand"
      }`}
    >
      {tag}
    </span>
    <div>
      <p className="text-base font-black text-ink">{title}</p>
      <p className="text-[11px] text-inkmuted font-semibold">{sub}</p>
    </div>
  </div>
);

function PlanCard({ plan, onBuy, enterprise }) {
  const hopCount = plan.hops || plan.credits || 0;
  return (
    <div
      data-testid={`plan-card-${plan.plan_id}`}
      className={`flex flex-col justify-between border-2 border-ink p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] transition hover:border-brand ${
        enterprise ? "bg-ink text-white" : "bg-white text-ink"
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-base font-black ${enterprise ? "!text-white text-white" : "text-ink"}`} style={enterprise ? { color: "#FFFFFF" } : undefined}>
            {plan.name}
          </p>
          {plan.badge && (
            <span
              className={`border px-2 py-0.5 text-[9px] font-black tracking-wider ${
                plan.badge.includes("BEST")
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
          <span
            className={`text-3xl font-black tracking-tight ${
              enterprise ? "!text-white text-white" : "text-ink"
            }`}
            style={enterprise ? { color: "#FFFFFF" } : undefined}
          >
            {plan.price_label}
          </span>
          <span
            className={`text-xs font-bold ${
              enterprise ? "!text-stone-300 text-stone-300" : "text-inkmuted"
            }`}
            style={enterprise ? { color: "#D6D6D6" } : undefined}
          >
            / {plan.unit}
          </span>
        </div>

        <div className="my-4 flex flex-col gap-2">
          {(plan.features || []).map((f) => (
            <div key={f} className="flex items-start gap-2">
              <Check
                size={14}
                className={`mt-0.5 shrink-0 ${enterprise ? "!text-brand text-brand" : "text-ok"}`}
                style={enterprise ? { color: "#E65A1E" } : undefined}
              />
              <span
                className={`text-xs font-semibold leading-4 ${
                  enterprise ? "!text-white text-white" : "text-ink"
                }`}
                style={enterprise ? { color: "#FFFFFF" } : undefined}
              >
                {f}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button
        data-testid={`plan-buy-${plan.plan_id}`}
        onClick={onBuy}
        className={`mt-2 flex w-full items-center justify-center gap-2 border-2 py-3 text-xs font-black tracking-wider !text-white text-white transition active:translate-y-0.5 ${
          enterprise
            ? "border-brand bg-brand hover:bg-brand/90"
            : "border-ink bg-ink hover:bg-brand hover:border-brand"
        }`}
      >
        <span className="!text-white text-white font-black" style={{ color: "#FFFFFF" }}>
          {hopCount > 0 ? `Buy ${hopCount} ${hopCount === 1 ? "Hop" : "Hops"} · ${plan.price_label}` : `Buy ${plan.price_label}`}
        </span>
        <ArrowRight size={14} className="!text-white text-white shrink-0" style={{ color: "#FFFFFF" }} />
      </button>
    </div>
  );
}
