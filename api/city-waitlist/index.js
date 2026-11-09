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

const DEFAULT_WAITLIST = [
  {
    waitlist_id: "wl_calicut_1",
    id: "wl_calicut_1",
    city: "Calicut",
    email: "calicut.expansion@gmail.com",
    contact: "calicut.expansion@gmail.com",
    role: "employer",
    note: "Looking to hire verified freelancers in Calicut / Kozhikode region",
    created_at: "2026-11-08T12:00:00.000Z",
  },
  {
    waitlist_id: "wl_mysore_1",
    id: "wl_mysore_1",
    city: "Mysore",
    email: "mysore.design@gmail.com",
    contact: "mysore.design@gmail.com",
    role: "freelancer",
    note: "Graphic designer and UI/UX pro interested in WorkHop Mysore gigs",
    created_at: "2026-11-07T14:30:00.000Z",
  },
  {
    waitlist_id: "wl_mangalore_1",
    id: "wl_mangalore_1",
    city: "Mangalore",
    email: "mangalore.hire@outlook.com",
    contact: "mangalore.hire@outlook.com",
    role: "employer",
    note: "E-commerce agency hiring video editors and content creators",
    created_at: "2026-11-06T09:15:00.000Z",
  },
  {
    waitlist_id: "wl_kochi_1",
    id: "wl_kochi_1",
    city: "Kochi",
    email: "kochi.techlead@gmail.com",
    contact: "kochi.techlead@gmail.com",
    role: "employer",
    note: "React and Python fullstack developers wanted",
    created_at: "2026-11-05T16:45:00.000Z",
  },
  {
    waitlist_id: "wl_hubli_1",
    id: "wl_hubli_1",
    city: "Hubli",
    email: "hubli.creatives@gmail.com",
    contact: "hubli.creatives@gmail.com",
    role: "freelancer",
    note: "Architectural drafts and interior renders",
    created_at: "2026-11-04T11:20:00.000Z",
  },
];

let inMemoryWaitlist = [...DEFAULT_WAITLIST];
const deletedWaitlistIds = new Set();

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  // 1. DELETE
  if (req.method === "DELETE") {
    try {
      const urlParts = (req.url || "").split("?")[0].split("/");
      const lastPart = urlParts[urlParts.length - 1];
      const targetId = req.query?.id || (lastPart !== "city-waitlist" && lastPart !== "index" ? lastPart : "");
      if (targetId) {
        deletedWaitlistIds.add(String(targetId));
        inMemoryWaitlist = inMemoryWaitlist.filter(
          (e) => e.waitlist_id !== targetId && e.id !== targetId
        );
      }
      return res.status(200).json({ ok: true, deleted_id: targetId });
    } catch (e) {
      return res.status(400).json({ detail: e?.message || "Delete failed" });
    }
  }

  // 2. POST (New Waitlist Signup)
  if (req.method === "POST") {
    try {
      const body = typeof req.body === "object" && req.body ? req.body : JSON.parse(req.body || "{}");
      const city = (body.city || "Calicut").trim();
      const email = (body.email || body.contact || "").trim();
      if (!email) return res.status(400).json({ detail: "Email address is required" });

      const normalizedCity = city.charAt(0).toUpperCase() + city.slice(1);
      const waitlist_id = `wl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newEntry = {
        waitlist_id,
        id: waitlist_id,
        city: normalizedCity,
        email,
        contact: email,
        role: body.role || "user",
        note: body.note || "",
        coords: body.coords || null,
        created_at: new Date().toISOString(),
      };

      inMemoryWaitlist = [newEntry, ...inMemoryWaitlist];

      // Also persist to Razorpay customers if possible for durable multi-server sync
      try {
        await rzpRequest("POST", "/customers", {
          name: `Waitlist ${normalizedCity}`,
          email: email.includes("@") ? email : `${email.replace(/\D/g, "")}@phone.waitlist.workhop.in`,
          contact: email.replace(/\D/g, "").slice(-10) || undefined,
          notes: {
            role: "waitlist",
            waitlist_id,
            city: normalizedCity,
            user_role: body.role || "user",
            note: (body.note || "").slice(0, 200),
            created_at: newEntry.created_at,
          },
        });
      } catch (rzpErr) {
        // Non-blocking fallback
      }

      const cityCount = inMemoryWaitlist.filter((w) => w.city.toLowerCase() === normalizedCity.toLowerCase()).length;
      return res.status(200).json({
        ok: true,
        waitlist_id,
        city: normalizedCity,
        email,
        waitlist_count: cityCount,
        message: `You're on the waitlist for ${normalizedCity}! We'll notify you as soon as WorkHop launches in your area.`,
      });
    } catch (e) {
      return res.status(500).json({ detail: e?.message || "Failed to join waitlist" });
    }
  }

  // 3. GET (Read all waitlist entries)
  try {
    let rzpWaitlist = [];
    try {
      const custRes = await rzpRequest("GET", "/customers?count=100");
      if (Array.isArray(custRes?.items)) {
        for (const c of custRes.items) {
          if (c.notes?.role === "waitlist") {
            rzpWaitlist.push({
              waitlist_id: c.notes?.waitlist_id || c.id,
              id: c.notes?.waitlist_id || c.id,
              city: c.notes?.city || "Outside Bengaluru",
              email: c.email || c.contact || "",
              contact: c.email || c.contact || "",
              role: c.notes?.user_role || "user",
              note: c.notes?.note || "",
              created_at: c.notes?.created_at || new Date(c.created_at * 1000).toISOString(),
            });
          }
        }
      }
    } catch {}

    const seen = new Set();
    const merged = [];

    for (const item of [...inMemoryWaitlist, ...rzpWaitlist]) {
      if (deletedWaitlistIds.has(item.waitlist_id) || deletedWaitlistIds.has(item.id)) continue;
      const key = `${(item.email || "").toLowerCase()}_${(item.city || "").toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }

    const cityCounts = {};
    for (const item of merged) {
      const c = item.city || "Unknown";
      cityCounts[c] = (cityCounts[c] || 0) + 1;
    }
    const byCity = Object.entries(cityCounts)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);

    return res.status(200).json({
      total: merged.length,
      by_city: byCity,
      entries: merged,
    });
  } catch (err) {
    return res.status(500).json({ detail: err?.message || "Failed to load waitlist" });
  }
};
