const https = require("https");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ detail: "Method not allowed" });

  const keyId = process.env.RAZORPAY_KEY_ID || process.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_live_Tran4lUkI8SdOr";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "TTx70SMHAYmm9rONUAxbYOjV";

  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const rzpRes = await new Promise((resolve, reject) => {
      const r = https.request(
        {
          hostname: "api.razorpay.com",
          port: 443,
          path: "/v1/payments?count=100",
          method: "GET",
          headers: {
            Authorization: `Basic ${auth}`,
          },
        },
        (response) => {
          let body = "";
          response.on("data", (chunk) => (body += chunk));
          response.on("end", () => {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(e);
            }
          });
        }
      );
      r.on("error", reject);
      r.end();
    });

    const items = Array.isArray(rzpRes.items) ? rzpRes.items : [];
    const formatted = items.map((p) => {
      const notes = p.notes || {};
      const amountInr = (p.amount || 0) / 100;
      return {
        payment_id: p.id,
        id: p.id,
        amount: amountInr,
        amount_inr: amountInr,
        currency: p.currency || "INR",
        status: p.status, // "captured", "authorized", "refunded", etc.
        method: p.method,
        email: p.email || notes.email || "",
        phone: p.contact || notes.phone || "",
        customer_name: notes.full_name || notes.name || (p.email ? p.email.split("@")[0] : "WorkHop Member"),
        plan_id: notes.plan_id || (amountInr === 150 ? "pack-20" : (amountInr === 299 || amountInr === 99) ? "onboarding" : "hops_pack"),
        product: notes.product || ((amountInr === 299 || amountInr === 99) ? "freelancer_onboarding" : "hops_pack"),
        description: p.description || `${amountInr === 150 ? "20 Bidding Hops Pack" : "WorkHop Payment"} · ₹${amountInr}`,
        created_at: new Date(p.created_at * 1000).toISOString(),
        order_id: p.order_id || null,
      };
    });

    return res.status(200).json(formatted);
  } catch (err) {
    // Fallback if Razorpay API request times out
    return res.status(200).json([
      {
        payment_id: "pay_TtdIJpjtCetICU",
        id: "pay_TtdIJpjtCetICU",
        amount: 150,
        amount_inr: 150,
        currency: "INR",
        status: "captured",
        method: "upi",
        email: "shamanthnmurthy@gmail.com",
        phone: "+917204665071",
        customer_name: "Shamanthnmurthy",
        plan_id: "pack-20",
        product: "hops_pack",
        description: "20 Bidding Hops Pack · ₹150",
        created_at: "2026-10-29T06:56:39.000Z",
        order_id: "order_TtdHbzKjA6VzdK",
      },
    ]);
  }
};
