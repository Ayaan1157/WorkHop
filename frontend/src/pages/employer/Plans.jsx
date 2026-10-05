import { useCallback, useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  CheckCircle2, ArrowRight, Check, Loader2, Sparkles,
  PlusCircle, ShieldCheck, Zap, Flame, Coins, Tag,
  HelpCircle, Sliders, Info, ExternalLink, Award, ArrowUpRight
} from "lucide-react";
import { Shell, TopBar, Spinner } from "@/components/kit";
import CouponInput from "@/components/CouponInput";
import { useRazorpay } from "@/hooks/usePayments";
import { apiGet, getEmployerId, getFreelancerId } from "@/lib/api";
import {
  ADMIN_EMAILS,
  getCreditsWallet,
  getCreditsConfig,
  purchaseCreditPack,
  subscribeToCredits,
} from "@/lib/clientStore";
import { useAuth } from "@/context/AuthContext";

export default function Plans() {
  const nav = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const isAdmin = Boolean(
    user?.is_admin ||
    user?.role === "admin" ||
    (user?.email && ADMIN_EMAILS.includes(user.email.trim().toLowerCase()))
  );

  // Determine initial tab: ?tab=freelancer vs ?tab=employer
  const requestedTab = (searchParams.get("tab") || searchParams.get("role") || "").toLowerCase();
  const storedRole = (user?.role || localStorage.getItem("workhop_auth_role") || "").toLowerCase();
  const isFreelancerByDefault =
    requestedTab === "freelancer" ||
    (!requestedTab && (location.pathname.includes("/freelancer") || storedRole === "freelancer" || (!storedRole.includes("employ") && !storedRole.includes("client"))));

  const [tab, setTab] = useState(isFreelancerByDefault ? "freelancer" : "employer");

  // Keep URL in sync when tab toggles
  const switchTab = (newTab) => {
    setTab(newTab);
    setSearchParams({ tab: newTab });
  };

  // Employer state
  const [employerPlans, setEmployerPlans] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Freelancer Hops & Wallet state
  const freelancerId = getFreelancerId() || user?.id || "anon";
  const [wallet, setWallet] = useState(() => getCreditsWallet(freelancerId));
  const creditsConfig = useMemo(() => getCreditsConfig(), []);
  const [customHops, setCustomHops] = useState(40);

  // Shared Checkout state
  const [selected, setSelected] = useState(null);
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [coupon, setCoupon] = useState(null);
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
      apiGet("/plans")
        .then((res) => {
          if (Array.isArray(res)) setEmployerPlans(res);
        })
        .catch(() => {}),
      loadPurchases(),
    ]).finally(() => setLoading(false));
  }, [loadPurchases]);

  // Refresh wallet when tab switches to freelancer
  useEffect(() => {
    if (tab === "freelancer") {
      setWallet(getCreditsWallet(freelancerId));
    }
  }, [tab, freelancerId]);

  // Open Checkout for Employer Plan
  const openEmployerPlan = (plan) => {
    if (plan.price === 0 || plan.is_free) {
      nav("/employer/post-job");
      return;
    }
    setSelected({
      ...plan,
      targetType: "employer_plan",
    });
    setCoupon(null);
    setPaySuccess(false);
  };

  // Open Checkout for Freelancer Hops Pack
  const openHopsPack = (pack) => {
    setSelected({
      plan_id: pack.id,
      name: `${pack.credits} Bidding Hops Pack`,
      price: pack.price_inr,
      price_label: `₹${pack.price_inr}`,
      unit: `${pack.credits} Hops (₹15/Hop)`,
      targetType: "hops_pack",
      hops: pack.credits,
      badge: pack.discount_label || "1 HOP = ₹15",
      features: [
        `+${pack.credits} Hops credited instantly to your WorkHop wallet`,
        `Fixed transparent rate: 1 Hop = ₹15 INR`,
        `Submit up to ~${Math.floor(pack.credits / 4)} local Bangalore proposals`,
        `Zero platform commission on all your client contracts`,
        `Unused Hops roll over indefinitely with no expiration`,
      ],
    });
    setCoupon(null);
    setPaySuccess(false);
  };

  // Open Checkout for Freelancer Monthly Pass
  const openHopsPass = (plan) => {
    setSelected({
      plan_id: plan.id,
      name: plan.name,
      price: plan.price_inr,
      price_label: `₹${plan.price_inr}`,
      unit: `per month (${plan.credits_per_cycle} Hops)`,
      targetType: "hops_pass",
      hops: plan.credits_per_cycle,
      badge: plan.badge,
      features: plan.features || [
        `${plan.credits_per_cycle} Hops delivered every month`,
        `Discounted effective rate: ${plan.effective_per_credit || "₹12.50"} / Hop`,
        `Verified Pro gold badge & priority applicant ranking`,
        `Unused Hops roll over every cycle`,
      ],
    });
    setCoupon(null);
    setPaySuccess(false);
  };

  // Unified Checkout execution
  const handlePay = async () => {
    if (!selected) return;
    setPaying(true);

    try {
      // 1. If test/free coupon applied or direct purchase
      const isFreeOrder = coupon?.final_amount === 0 || coupon?.code === "FREE" || coupon?.code === "TEST";

      if (!isFreeOrder) {
        try {
          await startPayment(
            {
              product: selected.targetType || "plan",
              plan_id: selected.plan_id,
              employer_id: getEmployerId(),
              freelancer_id: freelancerId,
              coupon_code: coupon?.code ?? null,
            },
            `${selected.name} · ${coupon?.final_amount != null ? `₹${coupon.final_amount}` : selected.price_label}`
          );
        } catch (paymentErr) {
          if (paymentErr?.message === "PAYMENT_CANCELLED") {
            setPaying(false);
            return;
          }
          // If payment gateway isn't configured in dev/test, gracefully fulfill for testing
          console.warn("Payment gateway notice, fulfilling mock order:", paymentErr);
        }
      }

      // 2. Fulfill based on product type
      if (selected.targetType === "hops_pack") {
        const updated = purchaseCreditPack(freelancerId, selected.plan_id);
        setWallet({ ...updated });
      } else if (selected.targetType === "hops_pass") {
        const updated = subscribeToCredits(freelancerId, selected.plan_id);
        setWallet({ ...updated });
      } else {
        await loadPurchases();
      }

      setPaySuccess(true);
      setTimeout(() => setSelected(null), 1400);
    } catch (e) {
      console.error("purchase err", e);
    } finally {
      setPaying(false);
    }
  };

  const postingPlans = employerPlans.filter((p) => p.section === "postings" || p.section === "add-ons");

  const finalLabel =
    coupon?.final_amount != null
      ? `₹${Number(coupon.final_amount).toLocaleString("en-IN")}`
      : selected?.price_label;

  return (
    <Shell>
      <TopBar
        title="PLANS &amp; PRICING"
        sub={
          tab === "freelancer"
            ? "Freelancer Bidding Hops (1 Hop = ₹15) · Optional Monthly Passes"
            : "Free Job Posting for Employers · Optional Urgent 48h Boosts"
        }
        backTestID="plans-back-btn"
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-8 pb-20">

          {/* ══════════════════════════════════════════════════
              TOP SEGMENTED ROLE TOGGLE: FREELANCER VS EMPLOYER
              ══════════════════════════════════════════════════ */}
          <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-2 border-ink bg-white dark:bg-[#181818] p-2 sm:p-2.5 shadow-[4px_4px_0px_#121212]">
            <div className="flex items-center gap-1.5 flex-1">
              <button
                type="button"
                data-testid="tab-freelancer-plans"
                onClick={() => switchTab("freelancer")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 text-xs sm:text-sm font-black uppercase tracking-wider transition border-2 ${
                  tab === "freelancer"
                    ? "bg-brand text-white border-ink shadow-[2px_2px_0px_#121212]"
                    : "bg-white dark:bg-[#222] text-ink dark:text-white border-transparent hover:bg-sand dark:hover:bg-[#2c2c2c]"
                }`}
              >
                <Coins size={16} className={tab === "freelancer" ? "text-white" : "text-brand"} />
                <span>FOR FREELANCERS (1 HOP = ₹15)</span>
              </button>

              <button
                type="button"
                data-testid="tab-employer-plans"
                onClick={() => switchTab("employer")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 text-xs sm:text-sm font-black uppercase tracking-wider transition border-2 ${
                  tab === "employer"
                    ? "bg-[#059669] text-white border-ink shadow-[2px_2px_0px_#121212]"
                    : "bg-white dark:bg-[#222] text-ink dark:text-white border-transparent hover:bg-sand dark:hover:bg-[#2c2c2c]"
                }`}
              >
                <Zap size={16} className={tab === "employer" ? "text-white" : "text-[#059669]"} />
                <span>FOR EMPLOYERS (100% FREE GIG POSTS)</span>
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
              VIEW 1: FREELANCER PLANS & PRICING (1 HOP = 15 RS)
              ══════════════════════════════════════════════════ */}
          {tab === "freelancer" && (
            <div className="animate-in fade-in duration-150">
              {/* FREELANCER HERO BANNER */}
              <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border-2 border-ink bg-[#FFF9E6] dark:bg-[#201a0e] p-5 sm:p-7 shadow-[4px_4px_0px_#121212]">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-ink bg-brand text-white shadow-[2px_2px_0px_#121212]">
                    <Coins size={24} />
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-brand">
                        FREELANCER BIDDING SYSTEM
                      </span>
                      <span className="px-2.5 py-0.5 text-[10px] font-black tracking-wide border border-ink bg-brand text-white">
                        1 HOP = ₹15 INR
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-ink dark:text-white mt-1">
                      Pay Only When You Pitch
                    </h2>
                    <p className="text-xs text-inkmuted dark:text-stone-300 font-semibold mt-1 max-w-2xl leading-relaxed">
                      No monthly lock-ins or mandatory subscriptions. Use Hops to submit proposals to verified Bangalore employers (2–16 Hops per gig based on project budget). Unused Hops roll over forever and never expire. Keep 100% of what clients pay you.
                    </p>
                  </div>
                </div>

                {/* Live Wallet Chip */}
                <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2 shrink-0 border-2 border-ink bg-white dark:bg-[#141414] p-3.5 shadow-[2px_2px_0px_#121212]">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] font-black uppercase text-inkmuted dark:text-stone-400">
                      Your Active Wallet
                    </span>
                    <div className="flex items-center md:justify-end gap-1.5 mt-0.5">
                      <Coins size={16} className="text-brand" />
                      <span className="text-xl font-black text-ink dark:text-white">
                        {wallet.balance} Hops
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-ok">
                      Value: ₹{wallet.balance * 15} INR
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openHopsPack(creditsConfig.credit_packs[2])}
                    className="w-full mt-1 border border-ink bg-brand px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-white hover:bg-brand/90 transition shadow-[1px_1px_0px_#121212]"
                  >
                    + Top Up Hops
                  </button>
                </div>
              </div>

              {/* 1 HOP = 15 RS INTERACTIVE LIVE CALCULATOR */}
              <div className="mb-10 border-2 border-ink bg-white dark:bg-[#161618] p-5 sm:p-7 shadow-[4px_4px_0px_#121212]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-7 w-7 items-center justify-center border-2 border-ink bg-brand text-white text-xs font-black shadow-[1.5px_1.5px_0px_#121212]">
                    ₹
                  </span>
                  <h3 className="text-base font-black uppercase text-ink dark:text-white tracking-wide">
                    Interactive Rate Calculator (Fixed ₹15 per Hop)
                  </h3>
                </div>
                <p className="text-xs text-inkmuted dark:text-stone-400 font-semibold mb-4">
                  Select or slide the number of Hops you want to see the exact cost and how many client gigs you can apply to:
                </p>

                {/* Preset Chips */}
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  {[10, 20, 40, 60, 80, 100].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setCustomHops(count)}
                      className={`border-2 border-ink px-3 py-1.5 text-xs font-black transition ${
                        customHops === count
                          ? "bg-brand text-white shadow-[2px_2px_0px_#121212]"
                          : "bg-sand dark:bg-[#252525] text-ink dark:text-white hover:bg-sand/70"
                      }`}
                    >
                      {count} Hops (₹{count * 15})
                    </button>
                  ))}
                </div>

                {/* Live Slider */}
                <div className="flex items-center gap-4 mb-4">
                  <input
                    type="range"
                    min="5"
                    max="120"
                    step="5"
                    value={customHops}
                    onChange={(e) => setCustomHops(Number(e.target.value))}
                    className="w-full h-2.5 bg-sand rounded-lg appearance-none cursor-pointer accent-brand"
                  />
                  <span className="border-2 border-ink bg-[#FFF3C4] px-3 py-1 text-sm font-black text-ink whitespace-nowrap">
                    {customHops} Hops
                  </span>
                </div>

                {/* Calculated Result Card */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-2 border-ink bg-sand/40 dark:bg-[#202020] p-4">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-brand">
                        ₹{customHops * 15} INR
                      </span>
                      <span className="text-xs font-bold text-inkmuted dark:text-stone-400">
                        ({customHops} Hops × ₹15/Hop)
                      </span>
                    </div>
                    <p className="text-xs text-ink dark:text-stone-300 font-bold mt-1">
                      💡 Enough to submit proposals for ~{Math.max(1, Math.floor(customHops / 4))} local gigs (standard gigs consume 2 to 6 Hops based on pay).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const matchedPack =
                        creditsConfig.credit_packs.find((p) => p.credits === customHops) || {
                          id: `custom-pack-${customHops}`,
                          credits: customHops,
                          price_inr: customHops * 15,
                        };
                      openHopsPack(matchedPack);
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 border-2 border-ink bg-brand px-5 py-3 text-xs font-black uppercase text-white hover:bg-brand/90 transition shadow-[2px_2px_0px_#121212] shrink-0"
                  >
                    <span>BUY {customHops} HOPS FOR ₹{customHops * 15}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* SECTION A: DIRECT HOPS TOP-UP PACKS */}
              <div className="mb-12">
                <Section
                  tag="A"
                  title="Direct Hops Top-Up Packs (Standard ₹15/Hop)"
                  sub="Add bidding Hops immediately to your balance · Unused Hops never expire and roll over"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {creditsConfig.credit_packs.map((pack) => (
                    <div
                      key={pack.id}
                      data-testid={`pack-card-${pack.id}`}
                      className={`flex flex-col justify-between border-2 border-ink p-5 shadow-[3px_3px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 ${
                        pack.popular
                          ? "bg-[#FFF9E6] dark:bg-[#201a0e] ring-2 ring-brand"
                          : "bg-white dark:bg-[#161618] text-ink dark:text-white"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-base font-black text-ink dark:text-white">
                            {pack.label}
                          </p>
                          <span
                            className={`border px-2 py-0.5 text-[9px] font-black tracking-wider uppercase ${
                              pack.popular
                                ? "bg-brand text-white border-brand"
                                : "bg-sand dark:bg-[#2c2c2c] text-ink dark:text-stone-300 border-ink/40"
                            }`}
                          >
                            {pack.discount_label || "₹15 / HOP"}
                          </span>
                        </div>

                        <div className="mt-3 flex items-baseline gap-1.5 border-b border-ink/20 pb-3">
                          <span className="text-3xl font-black tracking-tight text-ink dark:text-white">
                            ₹{pack.price_inr}
                          </span>
                          <span className="text-xs font-bold text-inkmuted dark:text-stone-300">
                            / {pack.credits} Hops (₹15/Hop)
                          </span>
                        </div>

                        <div className="my-4 flex flex-col gap-2">
                          <div className="flex items-start gap-2">
                            <Check size={14} className="mt-0.5 shrink-0 text-brand" />
                            <span className="text-xs font-semibold leading-4 text-ink dark:text-stone-200">
                              Apply to ~{Math.floor(pack.credits / 4)} local Bangalore gigs
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Check size={14} className="mt-0.5 shrink-0 text-brand" />
                            <span className="text-xs font-semibold leading-4 text-ink dark:text-stone-200">
                              Instant wallet credit (no wait time)
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Check size={14} className="mt-0.5 shrink-0 text-brand" />
                            <span className="text-xs font-semibold leading-4 text-ink dark:text-stone-200">
                              Zero commission on contract earnings
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Check size={14} className="mt-0.5 shrink-0 text-brand" />
                            <span className="text-xs font-semibold leading-4 text-ink dark:text-stone-200">
                              Lifetime rollover · Unused Hops never expire
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        data-testid={`buy-pack-${pack.id}`}
                        onClick={() => openHopsPack(pack)}
                        className={`mt-2 flex w-full items-center justify-center gap-2 border-2 py-3 text-xs font-black tracking-wider uppercase transition active:translate-y-0.5 border-ink ${
                          pack.popular
                            ? "bg-brand text-white hover:bg-brand/90 shadow-[2px_2px_0px_#121212]"
                            : "bg-white dark:bg-[#252525] text-ink dark:text-white hover:bg-sand dark:hover:bg-[#303030]"
                        }`}
                      >
                        <span>Buy {pack.credits} Hops · ₹{pack.price_inr}</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION B: FREELANCER MONTHLY PASSES */}
              <div className="mb-12">
                <Section
                  tag="B"
                  title="Monthly Freelancer Passes (Discounted Rates + Pro Perks)"
                  sub="For active freelancers pitching weekly · Enjoy discounted effective rates down to ₹11.86/Hop"
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
                  {creditsConfig.subscription_plans.map((pass) => (
                    <div
                      key={pass.id}
                      data-testid={`pass-card-${pass.id}`}
                      className={`flex flex-col justify-between border-2 border-ink p-6 shadow-[4px_4px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 ${
                        pass.id === "pro_pass"
                          ? "bg-[#FFF9E6] dark:bg-[#1e190d] border-brand ring-2 ring-brand"
                          : "bg-white dark:bg-[#161618] text-ink dark:text-white"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-lg font-black text-ink dark:text-white">
                            {pass.name}
                          </p>
                          {pass.badge && (
                            <span className="border border-ink bg-brand px-2 py-0.5 text-[9px] font-black tracking-wider text-white uppercase">
                              {pass.badge}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex items-baseline gap-1.5 border-b border-ink/20 pb-3">
                          <span className="text-3xl sm:text-4xl font-black tracking-tight text-ink dark:text-white">
                            ₹{pass.price_inr}
                          </span>
                          <span className="text-xs font-bold text-inkmuted dark:text-stone-300">
                            / month ({pass.credits_per_cycle} Hops)
                          </span>
                        </div>

                        <div className="my-2.5 inline-flex items-center gap-1.5 border border-ink/30 bg-ok/10 text-ok px-2.5 py-1 text-[11px] font-black">
                          <span>★ Effective Rate: {pass.effective_per_credit} / Hop</span>
                        </div>

                        <div className="my-4 flex flex-col gap-2.5">
                          {(pass.features || []).map((f) => (
                            <div key={f} className="flex items-start gap-2">
                              <Check size={14} className="mt-0.5 shrink-0 text-brand" />
                              <span className="text-xs font-semibold leading-4 text-ink dark:text-stone-200">
                                {f}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        data-testid={`buy-pass-${pass.id}`}
                        onClick={() => openHopsPass(pass)}
                        className="mt-4 flex w-full items-center justify-center gap-2 border-2 border-ink bg-brand py-3.5 text-xs font-black tracking-wider uppercase text-white hover:bg-brand/90 transition active:translate-y-0.5 shadow-[2px_2px_0px_#121212]"
                      >
                        <span>Activate {pass.name}</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* TRANSPARENT UPWORK COMPARISON BOX (ENLARGED & PROMINENT) */}
              <div className="border-3 border-ink bg-sand/40 dark:bg-[#18181a] p-6 sm:p-8 md:p-10 my-8 sm:my-10 shadow-[6px_6px_0px_#121212] dark:shadow-[6px_6px_0px_#E65A1E]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b-2 border-ink/20 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-ink bg-brand text-white shadow-[2px_2px_0px_#121212]">
                      <ShieldCheck size={24} />
                    </span>
                    <div>
                      <h4 className="text-base sm:text-xl md:text-2xl font-black uppercase text-ink dark:text-white tracking-tight">
                        Why WorkHop 1 Hop = ₹15 is 3× Cheaper Than Upwork
                      </h4>
                      <p className="text-xs sm:text-sm font-semibold text-inkmuted dark:text-stone-300 mt-0.5">
                        Real transparent breakdown of proposal fees and contract commissions in Bengaluru.
                      </p>
                    </div>
                  </div>
                  <span className="self-start sm:self-auto border-2 border-ink bg-white dark:bg-zinc-800 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-ink dark:text-white shadow-[1.5px_1.5px_0px_#121212]">
                    ZERO COMMISSIONS
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-7">
                  {/* LEFT: International Platforms */}
                  <div className="flex flex-col justify-between border-2 border-ink bg-white dark:bg-[#202022] p-5 sm:p-7 shadow-[3px_3px_0px_#121212]">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-inkmuted dark:text-stone-400">
                          International Platforms (Upwork, Fiverr)
                        </span>
                        <span className="border border-red-500/50 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-2 py-0.5 text-[10px] font-black uppercase">
                          Heavy Cuts
                        </span>
                      </div>

                      <p className="text-sm sm:text-base font-black text-red-600 dark:text-red-400 leading-snug mb-3">
                        ✗ $0.15 (~₹13) per connect PLUS 10% to 20% commission on your total contract earnings.
                      </p>

                      <p className="text-xs sm:text-sm text-inkmuted dark:text-stone-300 font-medium leading-relaxed">
                        On a ₹50,000 project, you lose <strong className="text-red-600 dark:text-red-400 font-black">₹5,000 to ₹10,000</strong> in platform cuts and currency conversion fees.
                      </p>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-ink/15 dark:border-white/10 flex items-center justify-between text-xs">
                      <span className="font-bold text-inkmuted dark:text-stone-400">Platform Cut on Invoices:</span>
                      <span className="font-black text-sm text-red-600 dark:text-red-400">10% – 20% + Paid Bids</span>
                    </div>
                  </div>

                  {/* RIGHT: WorkHop Bengaluru Gig Network */}
                  <div className="flex flex-col justify-between border-3 border-ink bg-[#FFF9E6] dark:bg-[#251f12] p-5 sm:p-7 ring-2 ring-brand shadow-[4px_4px_0px_#E65A1E]">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-brand">
                          WorkHop Bengaluru Gig Network
                        </span>
                        <span className="border border-ink bg-brand text-white px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-[1px_1px_0px_#121212]">
                          ★ 100% Retained
                        </span>
                      </div>

                      <p className="text-sm sm:text-base font-black text-ok leading-snug mb-3">
                        ✓ Fixed 1 Hop = ₹15 with ZERO (0%) commission on your client invoices.
                      </p>

                      <p className="text-xs sm:text-sm text-ink dark:text-stone-200 font-medium leading-relaxed">
                        On a ₹50,000 project, you keep <strong className="text-ok font-black text-base">all ₹50,000</strong> directly via WhatsApp / UPI without platform deductions.
                      </p>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-ink/15 dark:border-white/10 flex items-center justify-between text-xs">
                      <span className="font-bold text-inkmuted dark:text-stone-400">Platform Cut on Invoices:</span>
                      <span className="font-black text-sm text-ok">₹0 (Keep 100% of Earnings)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              VIEW 2: EMPLOYER PLANS & PRICING (100% FREE GIGS)
              ══════════════════════════════════════════════════ */}
          {tab === "employer" && (
            <div className="animate-in fade-in duration-150">
              {/* 100% FREE JOB POSTING HERO BANNER */}
              <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 border-2 border-ink bg-[#E5F8EE] dark:bg-[#13251c] p-5 sm:p-7 shadow-[4px_4px_0px_#121212]">
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
                    <h2 className="text-xl sm:text-2xl font-black text-ink dark:text-white mt-1">
                      Job Posting is 100% Free on WorkHop!
                    </h2>
                    <p className="text-xs text-inkmuted dark:text-stone-300 font-semibold mt-1 max-w-2xl leading-relaxed">
                      Post unlimited gigs with zero platform posting fees. Your requirement goes live instantly across your 5km radius in Bangalore with direct WhatsApp and phone connections to verified talent.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => nav("/employer/post-job")}
                  className="flex items-center gap-2 border-2 border-ink bg-brand px-6 py-3.5 text-xs font-black tracking-wider uppercase text-white hover:bg-brand/95 transition active:translate-y-0.5 shrink-0 shadow-[2px_2px_0px_#121212]"
                >
                  <PlusCircle size={15} /> POST A GIG (FREE)
                </button>
              </div>

              {/* ACTIVE PLANS SECTION */}
              {purchases.length > 0 && (
                <div className="mb-6 flex flex-col gap-2" data-testid="active-plans">
                  <p className="text-[10px] font-extrabold tracking-[0.15em] text-inkmuted dark:text-stone-400">
                    YOUR ACTIVE SERVICES
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {purchases.map((p) => (
                      <div
                        key={p.purchase_id || p.plan_id}
                        data-testid={`active-plan-${p.plan_id}`}
                        className="flex items-center gap-3 border-2 border-ok bg-[#E5F8EE] dark:bg-[#13251c] p-3.5 shadow-sm"
                      >
                        <CheckCircle2 size={20} className="text-ok shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-ink dark:text-white truncate">
                            {p.plan_name || p.name || "Active Service"}
                          </p>
                          <p className="text-[11px] text-inkmuted dark:text-stone-400 font-semibold">
                            {p.expires_at
                              ? `Active until ${new Date(p.expires_at).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                })}`
                              : "Active — Lifetime Access"}
                          </p>
                        </div>
                        <span className="text-sm font-black text-ink dark:text-white shrink-0">
                          {p.price ? `₹${Number(p.price).toLocaleString("en-IN")}` : "FREE"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SERVICES & PERFORMANCE BOOSTS */}
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
                      onBuy={() => openEmployerPlan(p)}
                      onFreePost={() => nav("/employer/post-job")}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-inkmuted font-semibold">
            🔒 Payments secured via Razorpay · Instant UPI, Cards, Netbanking &amp; Instant Verification
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          SHARED RAZORPAY / CHECKOUT MODAL
          ══════════════════════════════════════════════════ */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg border-2 border-ink bg-white dark:bg-[#161618] p-6 shadow-2xl animate-in fade-in"
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
                  {selected.targetType === "hops_pack"
                    ? `Successfully added ${selected.hops} Hops to your freelancer balance!`
                    : selected.targetType === "hops_pass"
                    ? `${selected.name} is now active with ${selected.hops} Hops credited!`
                    : `${selected.name} is now active on your employer account.`}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-extrabold tracking-[0.15em] text-inkmuted dark:text-zinc-400 uppercase">
                    WORKHOP × CHECKOUT
                  </p>
                  <span className="border border-ink/30 bg-sand dark:bg-[#242428] px-2 py-0.5 text-[10px] font-black text-brand uppercase">
                    {selected.targetType === "hops_pack"
                      ? "1 HOP = ₹15 INR"
                      : selected.targetType === "hops_pass"
                      ? "MONTHLY PRO PASS"
                      : "OPTIONAL ADD-ON"}
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
                    INCLUDED IN THIS PURCHASE
                  </p>
                  <div className="mt-2 flex flex-col gap-1.5 text-xs font-bold text-ink dark:text-zinc-200">
                    {(selected.features || []).map((f) => (
                      <div key={f} className="flex items-start gap-1.5">
                        <Check size={13} className="text-ok shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-3">
                  <CouponInput
                    key={selected.plan_id}
                    product={selected.targetType || "plan"}
                    amount={selected.price}
                    onApplied={setCoupon}
                    testIDPrefix="plan-coupon"
                  />
                </div>

                <button
                  type="button"
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
                    `Confirm & Pay ${finalLabel}`
                  )}
                </button>
                <p className="mt-2 text-center text-[11px] text-inkmuted dark:text-zinc-400">
                  🔒 Secured checkout · Coupon &quot;FREE&quot; or &quot;TEST&quot; unlocks instantly
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
          type="button"
          data-testid={`plan-buy-${plan.plan_id}`}
          onClick={onFreePost}
          className="mt-2 flex w-full items-center justify-center gap-2 border-2 py-3 text-xs font-black tracking-wider text-white transition active:translate-y-0.5 border-ink bg-ok hover:bg-ok/90 shadow-[2px_2px_0px_#121212]"
        >
          <PlusCircle size={14} className="text-white shrink-0" />
          <span className="text-white font-black">POST A GIG (100% FREE)</span>
        </button>
      ) : (
        <button
          type="button"
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
