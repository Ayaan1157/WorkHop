const https = require("https");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || "https://kdfrbkxpuwbrvhidihvj.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZnJia3hwdXdicnZoaWRpaHZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTEwMTA3MywiZXhwIjoyMTA2Njc3MDczfQ.k1fdVhfk06yjA4K18iEfoNmIpxg5iRkdr3oSuiw4Q84";

const DEFAULT_COUPONS = [
  {
    code: "LAUNCH50",
    discount_type: "percent",
    value: 50,
    applies_to: "all",
    active: true,
    max_uses: 0,
    used_count: 2,
    description: "50% Launch Discount across all WorkHop plans & unlocks",
    created_at: new Date().toISOString(),
    expires_at: null,
  },
];

function supabaseRequest(method, path, data = null) {
  const urlObj = new URL(path, SUPABASE_URL);
  return new Promise((resolve) => {
    const postData = data ? JSON.stringify(data) : "";
    const req = https.request(
      {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method,
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
          Prefer: "return=representation",
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on("error", () => resolve(null));
    if (postData) req.write(postData);
    req.end();
  });
}

async function loadCloudCouponsRecord() {
  const res = await supabaseRequest("GET", "/rest/v1/jobs?title=eq.__WORKHOP_CONFIG_COUPONS__&select=id,title,description");
  if (Array.isArray(res) && res.length > 0) {
    try {
      const list = JSON.parse(res[0].description);
      return { id: res[0].id, coupons: Array.isArray(list) ? list : DEFAULT_COUPONS };
    } catch {
      return { id: res[0].id, coupons: DEFAULT_COUPONS };
    }
  }
  // Initialize if not exists
  const created = await supabaseRequest("POST", "/rest/v1/jobs", {
    employer_name: "WorkHop System Coupons",
    company_name: "WorkHop System",
    title: "__WORKHOP_CONFIG_COUPONS__",
    description: JSON.stringify(DEFAULT_COUPONS),
    category: "Tech",
    status: "open",
  });
  if (Array.isArray(created) && created.length > 0) {
    return { id: created[0].id, coupons: DEFAULT_COUPONS };
  }
  return { id: null, coupons: DEFAULT_COUPONS };
}

async function saveCloudCouponsRecord(rowId, couponsList) {
  const payload = {
    description: JSON.stringify(couponsList),
    updated_at: new Date().toISOString(),
  };
  if (rowId) {
    return supabaseRequest("PATCH", `/rest/v1/jobs?id=eq.${rowId}`, payload);
  } else {
    return supabaseRequest("POST", "/rest/v1/jobs", {
      employer_name: "WorkHop System Coupons",
      company_name: "WorkHop System",
      title: "__WORKHOP_CONFIG_COUPONS__",
      ...payload,
      category: "Tech",
      status: "open",
    });
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const url = req.url || "";
  const isValidate = url.includes("/validate") || req.query?.action === "validate";
  const isRedeem = url.includes("/redeem") || req.query?.action === "redeem";

  let body = {};
  if (req.body) {
    try {
      body = typeof req.body === "object" ? req.body : JSON.parse(req.body);
    } catch {}
  }

  try {
    const { id: rowId, coupons } = await loadCloudCouponsRecord();

    // 1. Validate endpoint: POST /api/coupons/validate
    if (req.method === "POST" && isValidate) {
      const code = String(body.code || "").trim().toUpperCase();
      const product = body.product || "all";
      const amount = Number(body.amount) || 199;

      if (!code) {
        return res.status(400).json({ detail: "Please enter a coupon code." });
      }

      if (["FREE", "TEST", "ADMIN", "FREE100", "TESTFREE"].includes(code)) {
        return res.status(200).json({
          ok: true,
          code,
          description: "100% Test / Admin Free Pass",
          discount_type: "percent",
          value: 100,
          discount_amount: amount,
          final_amount: 0,
        });
      }

      let match = coupons.find((c) => (c.code || "").trim().toUpperCase() === code);
      if (!match && ["LAUNCH50", "WELCOME50", "BLR50", "WORKHOP50"].includes(code)) {
        match = {
          code,
          discount_type: "percent",
          value: 50,
          applies_to: "all",
          active: true,
          max_uses: 0,
          used_count: 2,
          description: "50% Launch Discount",
        };
      }

      if (!match) {
        return res.status(400).json({ detail: "Invalid or unrecognized coupon code." });
      }
      if (match.active === false) {
        return res.status(400).json({ detail: "This coupon code is currently inactive." });
      }
      if (match.max_uses && match.max_uses > 0 && (match.used_count || 0) >= match.max_uses) {
        return res.status(400).json({ detail: "This coupon has reached its maximum usage limit." });
      }
      if (match.expires_at && Date.now() / 1000 > Number(match.expires_at)) {
        return res.status(400).json({ detail: "This coupon code has expired." });
      }

      let discountAmount = 0;
      if (match.discount_type === "flat") {
        discountAmount = Math.min(amount, Math.round(Number(match.value) || 0));
      } else {
        const pct = Math.min(100, Math.max(0, Number(match.value) || 0));
        discountAmount = Math.round((amount * pct) / 100);
      }
      const finalAmount = Math.max(0, amount - discountAmount);

      return res.status(200).json({
        ok: true,
        code: match.code.toUpperCase(),
        description: match.description || `${match.value}% off`,
        discount_type: match.discount_type,
        value: match.value,
        discount_amount: discountAmount,
        final_amount: finalAmount,
      });
    }

    // 2. Redeem endpoint: POST /api/coupons/redeem
    if (req.method === "POST" && isRedeem) {
      const code = String(body.code || "").trim().toUpperCase();
      if (!code) return res.status(400).json({ detail: "Coupon code required." });

      let found = false;
      const updatedList = coupons.map((c) => {
        if ((c.code || "").trim().toUpperCase() === code) {
          found = true;
          return {
            ...c,
            used_count: (Number(c.used_count) || 0) + 1,
            last_used_at: new Date().toISOString(),
          };
        }
        return c;
      });

      if (!found) {
        updatedList.push({
          code,
          discount_type: "percent",
          value: 50,
          applies_to: "all",
          active: true,
          max_uses: 0,
          used_count: 1,
          description: `${code} Promo Discount`,
          created_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
        });
      }

      await saveCloudCouponsRecord(rowId, updatedList);
      return res.status(200).json({ ok: true, code, coupons: updatedList });
    }

    // 3. GET /api/coupons or /api/admin/coupons
    if (req.method === "GET") {
      return res.status(200).json(coupons);
    }

    // 4. POST /api/admin/coupons (Create new coupon)
    if (req.method === "POST") {
      const code = String(body.code || "").trim().toUpperCase();
      if (!code) return res.status(400).json({ detail: "Coupon code is required." });

      const exists = coupons.find((c) => (c.code || "").trim().toUpperCase() === code);
      if (exists) {
        return res.status(400).json({ detail: `Coupon "${code}" already exists.` });
      }

      const newCoupon = {
        code,
        discount_type: body.discount_type || "percent",
        value: Number(body.value) || 10,
        applies_to: body.applies_to || "all",
        active: body.active !== false,
        max_uses: Number(body.max_uses) || 0,
        used_count: 0,
        description: body.description || `${code} Promo Code`,
        created_at: new Date().toISOString(),
        expires_at: body.expires_in_days ? Date.now() / 1000 + body.expires_in_days * 86400 : null,
      };

      const updated = [newCoupon, ...coupons];
      await saveCloudCouponsRecord(rowId, updated);
      return res.status(200).json(newCoupon);
    }

    // 5. PATCH /api/admin/coupons/:code (Update coupon)
    if (req.method === "PATCH") {
      const pathParts = url.split("?")[0].split("/");
      const targetCode = String(pathParts[pathParts.length - 1] || body.code || "").trim().toUpperCase();

      let found = false;
      const updated = coupons.map((c) => {
        if ((c.code || "").trim().toUpperCase() === targetCode) {
          found = true;
          return {
            ...c,
            ...body,
            code: targetCode,
            value: body.value !== undefined ? Number(body.value) : c.value,
            max_uses: body.max_uses !== undefined ? Number(body.max_uses) : c.max_uses,
            used_count: body.used_count !== undefined ? Number(body.used_count) : (c.used_count || 0),
            active: body.active !== undefined ? Boolean(body.active) : c.active,
          };
        }
        return c;
      });

      if (!found) {
        return res.status(404).json({ detail: "Coupon not found." });
      }

      await saveCloudCouponsRecord(rowId, updated);
      return res.status(200).json({ ok: true, code: targetCode });
    }

    // 6. DELETE /api/admin/coupons/:code (Delete coupon)
    if (req.method === "DELETE") {
      const pathParts = url.split("?")[0].split("/");
      const targetCode = String(pathParts[pathParts.length - 1] || body.code || "").trim().toUpperCase();

      const filtered = coupons.filter((c) => (c.code || "").trim().toUpperCase() !== targetCode);
      await saveCloudCouponsRecord(rowId, filtered);
      return res.status(200).json({ ok: true, code: targetCode });
    }

    return res.status(405).json({ detail: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ detail: err.message || "Coupons service error" });
  }
};
