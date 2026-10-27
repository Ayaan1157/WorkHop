const nodemailer = require("nodemailer");

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const NOTIFICATION_TEMPLATES = {
  hired: {
    badge: "🎉 HIRED ALERT · OFFICIAL OFFER",
    badgeBg: "#A3E635",
    badgeText: "#000000",
    defaultSubject: "🎉 You've Been Hired on WorkHop Bengaluru!",
    heading: "CONGRATULATIONS! YOU'VE BEEN HIRED.",
    ctaLabel: "OPEN DEAL ROOM & CHAT →",
  },
  new_message: {
    badge: "💬 NEW DIRECT MESSAGE",
    badgeBg: "#FACC15",
    badgeText: "#000000",
    defaultSubject: "💬 New Message on WorkHop Bengaluru",
    heading: "YOU HAVE A NEW MESSAGE",
    ctaLabel: "REPLY IN WORKHOP CHAT →",
  },
  new_proposal: {
    badge: "📩 NEW PROPOSAL RECEIVED",
    badgeBg: "#38BDF8",
    badgeText: "#000000",
    defaultSubject: "📩 New Freelancer Proposal for Your Bengaluru Gig",
    heading: "A VERIFIED PRO APPLIED TO YOUR GIG",
    ctaLabel: "REVIEW PROPOSAL & PORTFOLIO →",
  },
  featured_blast: {
    badge: "⚡ 5KM HYPERLOCAL GIG BLAST",
    badgeBg: "#FF5500",
    badgeText: "#FFFFFF",
    defaultSubject: "⚡ Featured Gig Posted Near You in Bengaluru!",
    heading: "NEW FEATURED GIG WITHIN 5KM",
    ctaLabel: "APPLY TO THIS GIG NOW →",
  },
  contact_unlocked: {
    badge: "🔓 DIRECT CONTACT UNLOCKED",
    badgeBg: "#A3E635",
    badgeText: "#000000",
    defaultSubject: "🔓 Direct Contact Details Unlocked on WorkHop",
    heading: "DIRECT CONTACT DETAILS UNLOCKED",
    ctaLabel: "VIEW CONTACT & WHATSAPP →",
  },
};

function buildNotificationEmailHtml({
  type = "new_message",
  recipientName = "Bengaluru Member",
  title = "New Activity on WorkHop",
  message = "You have a new update waiting for you on WorkHop Bengaluru.",
  senderName = "",
  gigTitle = "",
  area = "Bengaluru",
  payFormatted = "",
  actionUrl = "https://www.workhop.in/inbox",
  ctaLabel = "",
}) {
  const tpl = NOTIFICATION_TEMPLATES[type] || NOTIFICATION_TEMPLATES.new_message;
  const safeRecipient = escapeHtml(recipientName);
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  const safeSender = escapeHtml(senderName);
  const safeGigTitle = escapeHtml(gigTitle);
  const safeArea = escapeHtml(area);
  const safePay = escapeHtml(payFormatted);
  const safeUrl = escapeHtml(actionUrl || "https://www.workhop.in");
  const buttonText = escapeHtml(ctaLabel || tpl.ctaLabel);

  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} - WorkHop Bengaluru</title>
</head>
<body style="margin:0;padding:0;background-color:#F4F0EA;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#000000;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F0EA;padding:32px 12px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border:3px solid #000000;box-shadow:8px 8px 0px #000000;">
          
          <!-- Header -->
          <tr>
            <td style="background-color:#FF5500;padding:22px 28px;border-bottom:3px solid #000000;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size:24px;font-weight:900;color:#000000;letter-spacing:-0.5px;text-transform:uppercase;">
                      ⚡ WORKHOP
                    </div>
                    <div style="font-size:11px;font-weight:800;color:#000000;text-transform:uppercase;letter-spacing:1.2px;margin-top:2px;">
                      Bengaluru's Hyperlocal Gig Marketplace
                    </div>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display:inline-block;background-color:${tpl.badgeBg};color:${tpl.badgeText};border:2px solid #000000;padding:5px 10px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;box-shadow:2px 2px 0px #000000;">
                      ${tpl.badge}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting & Alert Box -->
          <tr>
            <td style="padding:28px 28px 16px 28px;">
              <div style="font-size:12px;font-weight:900;color:#666666;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">
                HI ${safeRecipient.toUpperCase()} 👋 · ${dateStr}
              </div>
              <h1 style="margin:0 0 14px 0;font-size:22px;font-weight:900;color:#000000;text-transform:uppercase;line-height:1.25;">
                ${safeTitle}
              </h1>

              <!-- Message Card -->
              <div style="background-color:#F4F0EA;border:2px solid #000000;padding:18px;box-shadow:4px 4px 0px #000000;margin-bottom:20px;">
                ${
                  safeSender
                    ? `<div style="font-size:11px;font-weight:900;color:#FF5500;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">
                        FROM: ${safeSender}
                      </div>`
                    : ""
                }
                <div style="font-size:15px;font-weight:700;color:#000000;line-height:1.6;">
                  "${safeMessage}"
                </div>
              </div>

              ${
                safeGigTitle || safePay
                  ? `<!-- Context Strip -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #000000;background-color:#FFFDF9;margin-bottom:22px;">
                <tr>
                  ${
                    safeGigTitle
                      ? `<td style="padding:12px 14px;border-right:2px solid #000000;">
                          <div style="font-size:9px;font-weight:900;color:#666666;text-transform:uppercase;letter-spacing:1px;">GIG / PROJECT</div>
                          <div style="font-size:13px;font-weight:900;color:#000000;margin-top:3px;">${safeGigTitle}</div>
                        </td>`
                      : ""
                  }
                  ${
                    safeArea
                      ? `<td style="padding:12px 14px;${safePay ? "border-right:2px solid #000000;" : ""}">
                          <div style="font-size:9px;font-weight:900;color:#666666;text-transform:uppercase;letter-spacing:1px;">NEIGHBOURHOOD</div>
                          <div style="font-size:13px;font-weight:900;color:#000000;margin-top:3px;">📍 ${safeArea}</div>
                        </td>`
                      : ""
                  }
                  ${
                    safePay
                      ? `<td style="padding:12px 14px;background-color:#ECFDF5;">
                          <div style="font-size:9px;font-weight:900;color:#065F46;text-transform:uppercase;letter-spacing:1px;">BUDGET / PAY</div>
                          <div style="font-size:14px;font-weight:900;color:#059669;margin-top:3px;">${safePay}</div>
                        </td>`
                      : ""
                  }
                </tr>
              </table>`
                  : ""
              }

              <!-- CTA Button -->
              <div style="text-align:center;margin:24px 0 12px 0;">
                <a href="${safeUrl}" style="display:inline-block;background-color:#FF5500;color:#FFFFFF;border:2px solid #000000;padding:14px 28px;font-size:13px;font-weight:900;text-transform:uppercase;text-decoration:none;letter-spacing:0.8px;box-shadow:4px 4px 0px #000000;">
                  ${buttonText}
                </a>
              </div>
            </td>
          </tr>

          <!-- Safety Tip -->
          <tr>
            <td style="padding:0 28px 24px 28px;">
              <div style="background-color:#FEFCE8;border:2px solid #000000;padding:12px 14px;font-size:11px;font-weight:700;color:#333333;line-height:1.5;">
                ⚡ <strong>WorkHop Pro Tip:</strong> Fast responses within 15 minutes get <strong>3x higher hire rates</strong> across Indiranagar, Koramangala &amp; HSR Layout.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#000000;color:#FFFFFF;padding:18px 28px;text-align:center;">
              <div style="font-size:11px;font-weight:800;letter-spacing:0.5px;">
                WORKHOP TECHNOLOGIES · SMART PLAZA, COLES ROAD, FRAZER TOWN, BENGALURU 560005
              </div>
              <div style="font-size:10px;color:#A3A3A3;margin-top:4px;">
                Need help? Reply to this email or write to <a href="mailto:support@workhop.in" style="color:#FF5500;text-decoration:underline;font-weight:800;">support@workhop.in</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      to_email,
      recipient_name = "Bengaluru Member",
      type = "new_message",
      subject = "",
      title = "New Activity on WorkHop",
      message = "",
      sender_name = "",
      gig_title = "",
      area = "Bengaluru",
      pay_formatted = "",
      action_url = "https://www.workhop.in/inbox",
      cta_label = "",
    } = req.body || {};

    if (!to_email || !String(to_email).includes("@")) {
      return res.status(400).json({ error: "Valid recipient email (to_email) is required" });
    }

    const tpl = NOTIFICATION_TEMPLATES[type] || NOTIFICATION_TEMPLATES.new_message;
    const finalSubject = subject || `${tpl.defaultSubject}`;

    const html = buildNotificationEmailHtml({
      type,
      recipientName: recipient_name,
      title,
      message,
      senderName: sender_name,
      gigTitle: gig_title,
      area,
      payFormatted: pay_formatted,
      actionUrl: action_url,
      ctaLabel: cta_label,
    });

    const smtpHost = process.env.SMTP_HOST || "";
    const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
    const smtpUser = process.env.SMTP_USER || "";
    const smtpPassword = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || "";
    const smtpFromEmail = process.env.SMTP_FROM_EMAIL || smtpUser || "support@workhop.in";
    const smtpFromName = process.env.SMTP_FROM_NAME || "WorkHop Bengaluru";

    let emailDispatched = false;
    let dispatchNote = "Notification email template generated (Configure SMTP_HOST & SMTP_USER in Vercel to dispatch live emails).";

    if (smtpHost && smtpUser && smtpPassword) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });

      await transporter.sendMail({
        from: `"${smtpFromName}" <${smtpFromEmail}>`,
        to: to_email,
        subject: finalSubject,
        html,
      });

      emailDispatched = true;
      dispatchNote = `Notification email dispatched to ${to_email}`;
    }

    return res.status(200).json({
      ok: true,
      email_dispatched: emailDispatched,
      recipient: to_email,
      type,
      message: dispatchNote,
    });
  } catch (err) {
    console.error("Send notification email error:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to send notification email",
    });
  }
};
