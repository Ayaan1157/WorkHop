import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ArrowRight, Check, Tag, Loader2 } from "lucide-react";
import { Shell, TopBar, Spinner, IconBtn } from "@/components/kit";
import CouponInput from "@/components/CouponInput";
import { useRazorpay } from "@/hooks/usePayments";
import { apiGet, getEmployerId } from "@/lib/api";

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [coupon, setCoupon] = useState(null);
  const { startPayment } = useRazorpay();

  const loadPurchases = useCallback(async () => {
    try { setPurchases(await apiGet(`/employer/${getEmployerId()}/plans`)); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    Promise.all([apiGet("/plans").then(setPlans).catch(() => {}), loadPurchases()]).finally(() => setLoading(false));
  }, [loadPurchases]);

  const open = (plan) => { setSelected(plan); setCoupon(null); setPaySuccess(false); };

  const handlePay = async () => {
    if (!selected) return;
    setPaying(true);
    try {
      const data = await startPayment(
        { product: "plan", plan_id: selected.plan_id, employer_id: getEmployerId(), coupon_code: coupon?.code ?? null },
        `${selected.name} · ${coupon?.final_amount != null ? `₹${coupon.final_amount}` : selected.price_label}`,
      );
      if (data?.purchase) { setPaySuccess(true); await loadPurchases(); setTimeout(() => setSelected(null), 1200); }
    } catch (e) { if (e?.message !== "PAYMENT_CANCELLED") console.log("purchase err", e); }
    finally { setPaying(false); }
  };

  const postingPlans = plans.filter((p) => p.section === "postings");
  const brandingPlans = plans.filter((p) => p.section === "branding");
  const finalLabel = coupon?.final_amount != null ? `₹${coupon.final_amount.toLocaleString("en-IN")}` : selected?.price_label;

  return (
    <Shell>
      <TopBar title="PLANS & PRICING" sub="Grow your hiring on WorkHop" backTestID="plans-back-btn" right={<IconBtn onClick={() => {}}><Tag size={18} className="text-brand" /></IconBtn>} />
      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <div className="flex flex-col gap-3 p-4 pb-16">
          {purchases.length > 0 && (
            <div className="flex flex-col gap-2" data-testid="active-plans">
              <p className="text-[10px] font-extrabold tracking-[0.15em] text-inkmuted">YOUR ACTIVE PLANS</p>
              {purchases.map((p) => (
                <div key={p.purchase_id} data-testid={`active-plan-${p.plan_id}`} className="flex items-center gap-3 border-2 border-ok bg-[#E5F8EE] p-3">
                  <CheckCircle2 size={18} className="text-ok" />
                  <div className="flex-1"><p className="text-[13px] font-black text-ink">{p.plan_name}</p><p className="text-[11px] text-inkmuted">{p.expires_at ? `Active until ${new Date(p.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "Active — no expiry"}</p></div>
                  <span className="text-[13px] font-black text-ink">₹{p.price.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          )}

          <Section tag="A" title="Job Postings & Premium Listings" sub="Pay-per-post or bundles" />
          {postingPlans.map((p) => <PlanCard key={p.plan_id} plan={p} onBuy={() => open(p)} />)}
          <Section tag="B" dark title="Employer Branding & Classified Ads" sub="Enterprise visibility on the platform" />
          {brandingPlans.map((p) => <PlanCard key={p.plan_id} plan={p} onBuy={() => open(p)} enterprise />)}
          <p className="mt-2 text-center text-[11px] text-inkmuted">🔒 Payments via Razorpay Test Mode</p>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/55" onClick={() => setSelected(null)}>
          <div className="w-full max-w-2xl border-t-2 border-ink bg-white p-6" onClick={(e) => e.stopPropagation()}>
            {paySuccess ? (
              <div data-testid="plan-pay-success" className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle2 size={56} className="text-ok" />
                <p className="text-2xl font-black text-ink">Payment successful</p>
                <p className="text-[13px] text-inkmuted">{selected.name} is now active on your account.</p>
              </div>
            ) : (
              <>
                <p className="text-[10px] font-extrabold tracking-[0.15em] text-inkmuted">WORKHOP × RAZORPAY</p>
                <p className="text-4xl font-black tracking-tight text-ink">Pay {finalLabel}</p>
                <p className="mt-1 text-[13px] text-inkmuted">{selected.name} · {selected.unit}</p>
                <div className="my-4 border-2 border-ink bg-sand p-3"><p className="text-[10px] font-extrabold tracking-wide text-inkmuted">SECURE CHECKOUT</p><p className="mt-1 text-base font-black text-ink">UPI · Cards · Netbanking</p></div>
                <div className="mb-3"><CouponInput key={selected.plan_id} product="plan" amount={selected.price} onApplied={setCoupon} testIDPrefix="plan-coupon" /></div>
                <button data-testid="plan-pay-confirm-btn" onClick={handlePay} disabled={paying} className="flex w-full items-center justify-center gap-2 border-2 border-ink bg-ink py-4 text-[15px] font-black text-white disabled:opacity-60">
                  {paying ? <><Loader2 size={18} className="animate-spin" /> Waiting…</> : `Pay ${finalLabel} with Razorpay`}
                </button>
                <p className="mt-2 text-center text-[11px] text-inkmuted">🔒 Razorpay Test Mode · Test card 4111 1111 1111 1111</p>
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
    <span className={`flex h-8 w-8 items-center justify-center border-2 border-ink text-[15px] font-black text-white ${dark ? "bg-ink" : "bg-brand"}`}>{tag}</span>
    <div><p className="text-base font-black text-ink">{title}</p><p className="text-[11px] text-inkmuted">{sub}</p></div>
  </div>
);

function PlanCard({ plan, onBuy, enterprise }) {
  return (
    <div data-testid={`plan-card-${plan.plan_id}`} className={`flex flex-col gap-3 border-2 border-ink p-4 ${enterprise ? "bg-ink" : "bg-white"}`}>
      <div className="flex items-center justify-between">
        <p className={`flex-1 text-base font-black ${enterprise ? "text-white" : "text-ink"}`}>{plan.name}</p>
        {plan.badge && <span className="border border-ink bg-brand px-2 py-0.5 text-[9px] font-black tracking-wider text-white">{plan.badge}</span>}
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-3xl font-black tracking-tight ${enterprise ? "text-brand" : "text-ink"}`}>{plan.price_label}</span>
        <span className={`mb-1 text-xs font-semibold ${enterprise ? "text-[#BDBDBD]" : "text-inkmuted"}`}>/ {plan.unit}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {plan.features.map((f) => (
          <div key={f} className="flex items-center gap-2"><Check size={14} className={enterprise ? "text-brand" : "text-ok"} /><span className={`flex-1 text-xs ${enterprise ? "text-[#D6D6D6]" : "text-ink"}`}>{f}</span></div>
        ))}
      </div>
      <button data-testid={`plan-buy-${plan.plan_id}`} onClick={onBuy} className={`flex items-center justify-center gap-2 border-2 py-3 text-[13px] font-black tracking-wider text-white transition active:translate-y-0.5 ${enterprise ? "border-brand bg-brand" : "border-ink bg-ink"}`}>Buy {plan.price_label} <ArrowRight size={15} /></button>
    </div>
  );
}
