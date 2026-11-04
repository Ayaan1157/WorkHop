const https = require("https");

const DEFAULT_SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZnJia3hwdXdicnZoaWRpaHZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTEwMTA3MywiZXhwIjoyMTA2Njc3MDczfQ.k1fdVhfk06yjA4K18iEfoNmIpxg5iRkdr3oSuiw4Q84";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "object" && req.body ? req.body : JSON.parse(req.body || "{}");
    const { file_data, file_name, file_type, user_id, folder = "portfolios" } = body;

    if (!file_data) {
      return res.status(400).json({ error: "No file_data provided" });
    }

    // Clean base64 data
    const base64Content = file_data.includes(",") ? file_data.split(",")[1] : file_data;
    const buffer = Buffer.from(base64Content, "base64");

    const mime = file_type || "image/jpeg";
    const ext = (file_name ? file_name.split(".").pop().toLowerCase() : "jpg") || "jpg";
    const safeUserId = String(user_id || "shared").replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const storagePath = `${safeUserId}/${fileName}`;

    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.REACT_APP_SUPABASE_URL ||
      "https://kdfrbkxpuwbrvhidihvj.supabase.co";

    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      DEFAULT_SUPABASE_SERVICE_ROLE_KEY;

    const urlObj = new URL(`/storage/v1/object/${folder}/${storagePath}`, supabaseUrl);

    const uploadPromise = new Promise((resolve, reject) => {
      const uReq = https.request(
        {
          hostname: urlObj.hostname,
          port: 443,
          path: urlObj.pathname,
          method: "POST",
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": mime,
            "Content-Length": buffer.length,
            "x-upsert": "true",
          },
        },
        (uRes) => {
          let uBody = "";
          uRes.on("data", (chunk) => (uBody += chunk));
          uRes.on("end", () => {
            if (uRes.statusCode >= 200 && uRes.statusCode < 300) {
              const publicUrl = `${supabaseUrl}/storage/v1/object/public/${folder}/${storagePath}`;
              resolve({ ok: true, publicUrl, path: storagePath });
            } else {
              resolve({ ok: false, status: uRes.statusCode, error: uBody });
            }
          });
        }
      );
      uReq.on("error", reject);
      uReq.write(buffer);
      uReq.end();
    });

    const result = await uploadPromise;

    if (result.ok) {
      return res.status(200).json({
        ok: true,
        public_url: result.publicUrl,
        url: result.publicUrl,
        path: result.path,
      });
    } else {
      return res.status(500).json({ error: "Upload failed", details: result });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
