const crypto = require("crypto");

/**
 * WorkHop Production Razorpay Webhook Receiver (Vercel Serverless Function)
 * Supports:
 *  - https://www.work-hop.com/api/payments/razorpay/webhook
 *  - https://www.work-hop.com/api/razorpay/webhook
 *  - https://www.work-hop.com/api/webhooks/razorpay-escrow
 *  - https://www.work-hop.com/api/webhooks/razorpay-billing
 *  - https://www.work-hop.com/api/webhooks/razorpay-payouts
 */
module.exports = async function handler(req, res) {
  // Allow CORS & Razorpay preflight/health checks
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Razorpay-Signature, X-Razorpay-Event-Id");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // GET request: helpful health-check when testing URL in browser or Razorpay reachability check
  if (req.method === "GET") {
    return res.status(200).json({
      status: "ok",
      service: "WorkHop Razorpay Webhook Receiver",
      mode: (process.env.RAZORPAY_KEY_ID || "rzp_live_Tran4lUkI8SdOr").startsWith("rzp_live_") ? "live" : "test",
      supported_events: [
        "payment.authorized",
        "payment.captured",
        "payment.failed",
        "order.paid",
        "refund.created",
        "refund.processed",
        "refund.failed",
        "dispute.created",
        "dispute.won",
        "dispute.lost",
        "transfer.processed",
        "transfer.failed",
        "payout.processed",
        "payout.reversed",
        "subscription.activated",
        "subscription.charged",
        "subscription.cancelled",
      ],
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const signature = req.headers["x-razorpay-signature"] || "";
    const eventId = req.headers["x-razorpay-event-id"] || "";
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

    const rawBody =
      typeof req.body === "string"
        ? req.body
        : Buffer.isBuffer(req.body)
        ? req.body.toString("utf8")
        : JSON.stringify(req.body || {});

    // Verify HMAC-SHA256 signature if RAZORPAY_WEBHOOK_SECRET is configured
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      const expectedBuf = Buffer.from(expectedSignature, "utf8");
      const actualBuf = Buffer.from(String(signature), "utf8");
      if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
        console.warn("[WorkHop Webhook] Signature mismatch for event:", eventId);
        return res.status(400).json({ status: "error", detail: "Invalid webhook signature" });
      }
    }

    const payload = typeof req.body === "object" && req.body !== null ? req.body : JSON.parse(rawBody || "{}");
    const eventType = payload.event || "unknown";
    const paymentEntity = payload?.payload?.payment?.entity || {};
    const orderEntity = payload?.payload?.order?.entity || {};
    const refundEntity = payload?.payload?.refund?.entity || {};
    const disputeEntity = payload?.payload?.dispute?.entity || {};
    const transferEntity = payload?.payload?.transfer?.entity || {};
    const payoutEntity = payload?.payload?.payout?.entity || {};

    const notes = paymentEntity.notes || orderEntity.notes || {};

    console.log(
      JSON.stringify({
        source: "workhop_razorpay_webhook",
        event_id: eventId,
        event: eventType,
        payment_id: paymentEntity.id || refundEntity.payment_id || null,
        order_id: paymentEntity.order_id || orderEntity.id || null,
        amount_paise: paymentEntity.amount || orderEntity.amount || refundEntity.amount || 0,
        product: notes.product || notes.type || "general",
        deal_id: notes.deal_id || null,
        received_at: new Date().toISOString(),
      })
    );

    // Optional forwarding to external backend if BACKEND_WEBHOOK_FORWARD_URL is set
    if (process.env.BACKEND_WEBHOOK_FORWARD_URL) {
      try {
        await fetch(process.env.BACKEND_WEBHOOK_FORWARD_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Razorpay-Signature": signature,
            "X-Razorpay-Event-Id": eventId,
          },
          body: rawBody,
        });
      } catch (fwdErr) {
        console.warn("[WorkHop Webhook] Forward warning:", fwdErr.message);
      }
    }

    return res.status(200).json({
      status: "ok",
      received: true,
      event: eventType,
      event_id: eventId || undefined,
      deal_id: notes.deal_id || undefined,
      product: notes.product || notes.type || undefined,
      transfer_id: transferEntity.id || payoutEntity.id || undefined,
      dispute_id: disputeEntity.id || undefined,
    });
  } catch (err) {
    console.error("[WorkHop Webhook] Error processing webhook:", err);
    return res.status(200).json({ status: "ok", note: "Acknowledged" });
  }
};
