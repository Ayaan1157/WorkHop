const https = require("https");

function rzpRequest(method, path, data = null) {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_live_Tran4lUkI8SdOr";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "TTx70SMHAYmm9rONUAxbYOjV";
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : "";
    const req = https.request(
      {
        hostname: "api.razorpay.com",
        port: 443,
        path: `/v1${path}`,
        method,
        headers: {
          Authorization: `Basic ${auth}`,
          ...(data
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(postData),
              }
            : {}),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ detail: "Method not allowed" });

  try {
    const body = typeof req.body === "object" && req.body ? req.body : JSON.parse(req.body || "{}");
    const {
      freelancer_id,
      name,
      phone,
      email,
      skill,
      category,
      rate_hr,
      intro,
      portfolio_url,
      languages,
      delivery_days,
    } = body;

    const contactPhone = (phone || "").replace(/\D/g, "");

    // Attempt to register or update customer in Razorpay so metadata is persisted in cloud
    try {
      await rzpRequest("POST", "/customers", {
        name: name || "WorkHop Verified Pro",
        email: email || `${contactPhone || "pro"}@workhop.in`,
        contact: contactPhone.slice(-10),
        notes: {
          freelancer_id: freelancer_id || `freelancer-${Date.now()}`,
          skill: skill || "Creative Pro",
          category: category || "Graphics & Design",
          rate_hr: String(rate_hr || 850),
          delivery_days: String(delivery_days || 2),
          portfolio_url: portfolio_url || "",
          source: "workhop_onboarding",
          status: "approved",
        },
      });
    } catch {
      /* ignore customer duplicate error */
    }

    return res.status(200).json({
      ok: true,
      status: "verified",
      verified: true,
      profile: {
        freelancer_id,
        name,
        phone,
        email,
        skill,
        category,
        rate_hr,
        intro,
        portfolio_url,
        approved: true,
      },
    });
  } catch (err) {
    return res.status(400).json({ detail: err?.message || "Failed to submit profile." });
  }
};
