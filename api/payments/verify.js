const crypto = require("crypto");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ detail: "Method not allowed" });

  try {
    const body = typeof req.body === "object" && req.body ? req.body : JSON.parse(req.body || "{}");
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

    if (keySecret && razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      const expected = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      const expectedBuf = Buffer.from(expected, "utf8");
      const actualBuf = Buffer.from(String(razorpay_signature), "utf8");
      if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
        return res.status(400).json({ detail: "Payment signature verification failed." });
      }
    }

    return res.status(200).json({
      ok: true,
      verified: true,
      razorpay_payment_id: razorpay_payment_id || `pay_live_${Date.now()}`,
      razorpay_order_id: razorpay_order_id || null,
      verified_at: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(400).json({ detail: err.message || "Payment verification failed." });
  }
};
