const https = require("https");

const PLANS_PRICES_INR = {
  // Freelancer Hops Packs (1 Hop = ₹15)
  "pack-10": 150,
  "pack-20": 300,
  "pack-40": 600,
  "pack-60": 900,
  "pack-80": 1200,
  "pack-100": 1500,
  "pack-200": 3000,
  // Freelancer Monthly Passes
  "starter_pass": 399,
  "pro_pass": 999,
  "power_pass": 1899,
  "elite_pass": 999,
  // Employer & Platform Add-Ons
  "urgent-boost": 399,
  "urgent-boost-49": 49,
  "post-49": 49,
  "lead-unlock": 199,
  "quota_boost": 149,
  "assisted-999": 999,
  "freelancer_onboarding": 299,
  "onboarding": 299,
  "verification-badge": 299,
  "verification_badge": 299,
};

function createRazorpayOrder(keyId, keySecret, orderPayload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(orderPayload);
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const req = https.request(
      {
        hostname: "api.razorpay.com",
        port: 443,
        path: "/v1/orders",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
          Authorization: `Basic ${auth}`,
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(body);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(parsed?.error?.description || "Razorpay order creation failed"));
            }
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ detail: "Method not allowed" });

  try {
    const body = typeof req.body === "object" && req.body ? req.body : JSON.parse(req.body || "{}");
    const product = body.product || "hops_pack";
    const planId = body.plan_id || "pack-40";
    const basePrice = Number(PLANS_PRICES_INR[planId] || PLANS_PRICES_INR[product] || 199);
    let priceInr = body.amount_inr != null ? Number(body.amount_inr) : basePrice;

    // If coupon_code was supplied but amount_inr was not pre-discounted, apply launch coupon
    const couponCode = String(body.coupon_code || "").trim().toUpperCase();
    if (couponCode && body.amount_inr == null) {
      if (["LAUNCH50", "WELCOME50", "BLR50", "WORKHOP50"].includes(couponCode)) {
        priceInr = Math.max(1, basePrice - Math.round(basePrice * 0.5));
      } else if (/^LAUNCH(\d{1,2})$/.test(couponCode)) {
        const pct = parseInt(couponCode.replace("LAUNCH", ""), 10);
        priceInr = Math.max(1, basePrice - Math.round((basePrice * pct) / 100));
      }
    }

    const amountPaise = Math.max(100, Math.round(priceInr * 100));

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_live_Tran4lUkI8SdOr";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

    if (keyId && keySecret) {
      const rzpOrder = await createRazorpayOrder(keyId, keySecret, {
        amount: amountPaise,
        currency: "INR",
        payment_capture: 1,
        notes: {
          product,
          plan_id: planId,
          email: body.email || "",
          full_name: body.full_name || "",
        },
      });
      return res.status(200).json({
        order_id: rzpOrder.id,
        amount: amountPaise,
        currency: "INR",
        key_id: keyId,
        product,
      });
    }

    // Fallback when only public keyId is available (Standard Checkout without server-side order_id)
    return res.status(200).json({
      order_id: "",
      amount: amountPaise,
      currency: "INR",
      key_id: keyId,
      product,
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message || "Could not create payment order" });
  }
};
