let inMemorySettings = {
  broadcast_banner_active: false,
  broadcast_banner_text: "⚡ Bengaluru Hyperlocal Live: Verified local creators & engineers available within 5km!",
  broadcast_banner_tone: "brand",
  broadcast_banner_link: "/freelancer/jobs",
  broadcast_banner_cta: "EXPLORE GIGS",
  maintenance_mode: false,
  maintenance_message: "WorkHop is performing a scheduled infrastructure upgrade. We'll be back shortly.",
  onboarding_fee: 299,
  lead_unlock_fee: 199,
  quota_boost_fee: 149,
  auto_approve_pros: false,
  direct_chat_enabled: true,
  main_email: "connect@work-hop.com",
  complaint_email: "help@work-hop.com",
  support_email: "help@work-hop.com",
  linkedin_url: "https://www.linkedin.com/in/workhop",
  grievance_officer_name: "Alia Mansoor",
  grievance_officer_designation: "Nodal officer",
  grievance_officer_email: "grievance@workhop.in",
  grievance_officer_phone: "+91 91 80530 827",
  grievance_officer_address: "Smart Plaza, Coles Road, Frazer Town, Bangalore - 560005",
  grievance_working_hours: "Monday to Friday, 10:00 AM – 6:00 PM IST (Excluding Public Holidays)",
  grievance_nodal_email: "nodal@workhop.in",
  grievance_ack_hours: 48,
  grievance_resolution_days: 30,
};

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "POST") {
    try {
      const body = typeof req.body === "object" && req.body ? req.body : JSON.parse(req.body || "{}");
      inMemorySettings = {
        ...inMemorySettings,
        ...body,
        broadcast_banner_active: Boolean(body?.broadcast_banner_active),
      };
      return res.status(200).json({ ok: true, settings: inMemorySettings });
    } catch (err) {
      return res.status(400).json({ detail: err?.message || "Invalid payload" });
    }
  }

  return res.status(200).json(inMemorySettings);
};
