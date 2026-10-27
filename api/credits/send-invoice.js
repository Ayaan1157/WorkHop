const tls = require("tls");

const HOPS_ITEMS = {
  "pack-10": { title: "10 Hops Top-Up Pack", credits: 10, price_inr: 150, type: "hops_pack" },
  "pack-20": { title: "20 Hops Top-Up Pack", credits: 20, price_inr: 300, type: "hops_pack" },
  "pack-40": { title: "40 Hops Value Pack", credits: 40, price_inr: 600, type: "hops_pack" },
  "pack-60": { title: "60 Hops Growth Pack", credits: 60, price_inr: 900, type: "hops_pack" },
  "pack-80": { title: "80 Hops Pro Bundle", credits: 80, price_inr: 1200, type: "hops_pack" },
  "pack-100": { title: "100 Hops Best Value Pack", credits: 100, price_inr: 1500, type: "hops_pack" },
  "pack-200": { title: "200 Hops Agency Pack", credits: 200, price_inr: 3000, type: "hops_pack" },
  "starter_pass": { title: "Starter Hops Pass (30 Hops/mo)", credits: 30, price_inr: 399, type: "hops_pass" },
  "pro_pass": { title: "Freelancer Plus Pass (80 Hops/mo)", credits: 80, price_inr: 999, type: "hops_pass" },
  "power_pass": { title: "Power Freelancer Pass (160 Hops/mo)", credits: 160, price_inr: 1899, type: "hops_pass" },
  "elite_pass": { title: "WorkHop Elite Monthly Pass (200 Hops/mo)", credits: 200, price_inr: 999, type: "hops_pass" },
};

function sendGmailSmtp({ smtpHost = "smtp.gmail.com", smtpPort = 465, smtpUser, smtpPass, to, subject, htmlBody }) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(smtpPort, smtpHost, { servername: smtpHost });
    let step = 0;
    let buffer = "";

    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error("SMTP connection timeout"));
    }, 10000);

    const sendLine = (line) => {
      socket.write(line + "\r\n");
    };

    const boundary = `wh_boundary_${Date.now()}`;
    const rawEmail = [
      `From: "WorkHop Billing" <${smtpUser}>`,
      `To: <${to}>`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      ``,
      `Thank you for your WorkHop Hops purchase! Please view this email in an HTML-capable client for your full GST Tax Invoice.`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      ``,
      htmlBody,
      ``,
      `--${boundary}--`,
      `.`,
    ].join("\r\n");

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split("\r\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line) continue;
        // Wait until multi-line response finishes (4th char is space)
        if (line.length >= 4 && line[3] === "-") continue;
        const code = parseInt(line.slice(0, 3), 10);

        if (code >= 400) {
          clearTimeout(timeout);
          socket.destroy();
          return reject(new Error(`SMTP Error ${code}: ${line}`));
        }

        if (step === 0 && code === 220) {
          step = 1;
          sendLine("EHLO work-hop.com");
        } else if (step === 1 && code === 250) {
          step = 2;
          sendLine("AUTH LOGIN");
        } else if (step === 2 && code === 334) {
          step = 3;
          sendLine(Buffer.from(smtpUser).toString("base64"));
        } else if (step === 3 && code === 334) {
          step = 4;
          sendLine(Buffer.from(smtpPass).toString("base64"));
        } else if (step === 4 && code === 235) {
          step = 5;
          sendLine(`MAIL FROM:<${smtpUser}>`);
        } else if (step === 5 && code === 250) {
          step = 6;
          sendLine(`RCPT TO:<${to}>`);
        } else if (step === 6 && code === 250) {
          step = 7;
          sendLine("DATA");
        } else if (step === 7 && code === 354) {
          step = 8;
          sendLine(rawEmail);
        } else if (step === 8 && code === 250) {
          step = 9;
          sendLine("QUIT");
          clearTimeout(timeout);
          socket.end();
          return resolve(true);
        }
      }
    });

    socket.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inrAmountToWords(n) {
  const num = Math.max(0, Math.round(Number(n) || 0));
  if (num === 0) return "Zero Rupees Only";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const twoDigits = (x) => (x < 20 ? ones[x] : `${tens[Math.floor(x / 10)]} ${ones[x % 10]}`.trim());
  const threeDigits = (x) => {
    const h = Math.floor(x / 100);
    const rem = x % 100;
    const parts = [];
    if (h > 0) parts.push(`${ones[h]} Hundred`);
    if (rem > 0) parts.push(twoDigits(rem));
    return parts.join(" ");
  };
  let rem = num;
  const parts = [];
  const lakhs = Math.floor(rem / 100000);
  rem %= 100000;
  const thousands = Math.floor(rem / 1000);
  rem %= 1000;
  if (lakhs > 0) parts.push(`${twoDigits(lakhs)} Lakh`);
  if (thousands > 0) parts.push(`${twoDigits(thousands)} Thousand`);
  if (rem > 0) parts.push(threeDigits(rem));
  return `${parts.join(" ").trim()} Rupees Only`;
}

function buildInvoiceHtml({ invoiceNumber, customerName, customerEmail, itemTitle, hopsAdded, totalInr, paymentId }) {
  const safeInv = escapeHtml(invoiceNumber);
  const safeName = escapeHtml(customerName);
  const safeEmail = escapeHtml(customerEmail);
  const safeTitle = escapeHtml(itemTitle);
  const safePayId = escapeHtml(paymentId);
  const taxable = (totalInr / 1.18).toFixed(2);
  const cgst = ((totalInr - totalInr / 1.18) / 2).toFixed(2);
  const sgst = cgst;
  const amountWords = inrAmountToWords(totalInr);
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tax Invoice #${safeInv} - WorkHop</title>
</head>
<body style="margin:0;padding:24px 12px;background-color:#F4EFEA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#121212;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px;background-color:#FFFFFF;border:3px solid #121212;box-shadow:6px 6px 0px #121212;border-collapse:separate;">
    <!-- Top Header -->
    <tr>
      <td style="background-color:#E65A1E;padding:22px 24px;border-bottom:3px solid #121212;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="middle">
              <span style="font-size:24px;font-weight:900;letter-spacing:-0.5px;color:#FFFFFF;text-transform:uppercase;">⚡ WORKHOP</span>
              <div style="font-size:11px;font-weight:700;color:#FFE2D4;text-transform:uppercase;letter-spacing:1px;margin-top:2px;">
                Hyperlocal Freelance Platform &middot; Bengaluru
              </div>
            </td>
            <td align="right" valign="middle">
              <span style="background-color:#121212;color:#7AE582;font-size:10px;font-weight:900;padding:6px 10px;text-transform:uppercase;letter-spacing:1px;border:1.5px solid #121212;display:inline-block;">
                &bull; PAID &middot; TAX INVOICE
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body Container -->
    <tr>
      <td style="padding:24px;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
          <tr>
            <td>
              <h1 style="margin:0 0 6px 0;font-size:20px;font-weight:900;text-transform:uppercase;color:#121212;letter-spacing:0.5px;">
                Tax Invoice &amp; Payment Receipt
              </h1>
              <p style="margin:0;font-size:13px;color:#555;line-height:1.4;">
                Hi <strong>${safeName}</strong>, thank you for your purchase! Your payment was successfully processed and your Bidding Hops balance is now updated.
              </p>
            </td>
          </tr>
        </table>

        <!-- Metadata Bar -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#FAF7F2;border:2px solid #121212;margin-bottom:20px;">
          <tr>
            <td style="padding:12px 14px;border-right:2px solid #121212;width:50%;" valign="top">
              <div style="font-size:10px;font-weight:800;text-transform:uppercase;color:#777;letter-spacing:0.5px;">INVOICE NUMBER</div>
              <div style="font-size:13px;font-weight:900;color:#121212;font-family:monospace;margin-top:2px;">${safeInv}</div>
              <div style="font-size:10px;font-weight:800;text-transform:uppercase;color:#777;letter-spacing:0.5px;margin-top:8px;">INVOICE DATE</div>
              <div style="font-size:12px;font-weight:700;color:#121212;margin-top:2px;">${dateStr}</div>
            </td>
            <td style="padding:12px 14px;width:50%;" valign="top">
              <div style="font-size:10px;font-weight:800;text-transform:uppercase;color:#777;letter-spacing:0.5px;">PAYMENT REF (TXN ID)</div>
              <div style="font-size:12px;font-weight:900;color:#121212;font-family:monospace;margin-top:2px;">${safePayId}</div>
              <div style="font-size:10px;font-weight:800;text-transform:uppercase;color:#777;letter-spacing:0.5px;margin-top:8px;">PAYMENT METHOD</div>
              <div style="font-size:12px;font-weight:700;color:#121212;margin-top:2px;">Razorpay / UPI Online</div>
            </td>
          </tr>
        </table>

        <!-- Supplier & Billed To -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
          <tr>
            <td width="48%" valign="top" style="border:2px solid #121212;padding:12px;background-color:#FFFFFF;">
              <div style="font-size:10px;font-weight:900;text-transform:uppercase;color:#E65A1E;letter-spacing:0.5px;margin-bottom:6px;">
                ISSUED BY (SUPPLIER)
              </div>
              <div style="font-size:12px;font-weight:800;color:#121212;">WorkHop Technologies</div>
              <div style="font-size:11px;color:#444;line-height:1.4;margin-top:2px;">
                Smart Plaza, Coles Road, Frazer Town<br/>
                Bengaluru, Karnataka 560005, India<br/>
                <strong>Place of Supply:</strong> 29 - Karnataka<br/>
                <strong>Email:</strong> connect@work-hop.com
              </div>
            </td>
            <td width="4%"></td>
            <td width="48%" valign="top" style="border:2px solid #121212;padding:12px;background-color:#FFFFFF;">
              <div style="font-size:10px;font-weight:900;text-transform:uppercase;color:#E65A1E;letter-spacing:0.5px;margin-bottom:6px;">
                BILLED TO (CUSTOMER)
              </div>
              <div style="font-size:12px;font-weight:800;color:#121212;">${safeName}</div>
              <div style="font-size:11px;color:#444;line-height:1.4;margin-top:2px;">
                <strong>Email:</strong> ${safeEmail}<br/>
                <strong>Place of Supply:</strong> 29 - Karnataka<br/>
                <strong>Category:</strong> Registered Freelancer
              </div>
            </td>
          </tr>
        </table>

        <!-- Itemized Table -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border:2px solid #121212;border-collapse:collapse;margin-bottom:16px;">
          <tr style="background-color:#121212;color:#FFFFFF;">
            <th align="left" style="padding:10px 12px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;">ITEM DESCRIPTION</th>
            <th align="center" style="padding:10px 8px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;width:65px;">SAC</th>
            <th align="center" style="padding:10px 8px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;width:75px;">HOPS</th>
            <th align="right" style="padding:10px 12px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;width:100px;">TAXABLE (INR)</th>
          </tr>
          <tr style="background-color:#FFFFFF;border-bottom:2px solid #121212;">
            <td style="padding:12px;vertical-align:top;">
              <div style="font-size:13px;font-weight:800;color:#121212;">${safeTitle}</div>
              <div style="font-size:11px;color:#666;margin-top:2px;">WorkHop Bidding Hops Credit Pack</div>
            </td>
            <td align="center" style="padding:12px 8px;font-size:12px;font-weight:700;color:#333;vertical-align:top;font-family:monospace;">998311</td>
            <td align="center" style="padding:12px 8px;font-size:12px;font-weight:900;color:#E65A1E;vertical-align:top;">+${Number(hopsAdded) || 0}</td>
            <td align="right" style="padding:12px;font-size:13px;font-weight:800;color:#121212;vertical-align:top;">&#8377;${taxable}</td>
          </tr>
        </table>

        <!-- Totals Table -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
          <tr>
            <td width="45%" valign="top">
              <div style="font-size:11px;color:#666;line-height:1.4;">
                <strong>Amount in Words:</strong><br/>
                <span style="font-style:italic;color:#121212;font-weight:700;">${amountWords}</span>
              </div>
            </td>
            <td width="55%" valign="top">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border:2px solid #121212;background-color:#FAF7F2;border-collapse:collapse;">
                <tr>
                  <td style="padding:8px 12px;font-size:11px;font-weight:700;color:#555;border-bottom:1px solid #E0D7D0;">Taxable Amount:</td>
                  <td align="right" style="padding:8px 12px;font-size:11px;font-weight:700;color:#121212;border-bottom:1px solid #E0D7D0;">&#8377;${taxable}</td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;font-size:11px;font-weight:700;color:#555;border-bottom:1px solid #E0D7D0;">CGST @ 9.0%:</td>
                  <td align="right" style="padding:8px 12px;font-size:11px;font-weight:700;color:#121212;border-bottom:1px solid #E0D7D0;">&#8377;${cgst}</td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;font-size:11px;font-weight:700;color:#555;border-bottom:2px solid #121212;">SGST @ 9.0%:</td>
                  <td align="right" style="padding:8px 12px;font-size:11px;font-weight:700;color:#121212;border-bottom:2px solid #121212;">&#8377;${sgst}</td>
                </tr>
                <tr style="background-color:#FFF3E9;">
                  <td style="padding:10px 12px;font-size:13px;font-weight:900;text-transform:uppercase;color:#121212;">TOTAL PAID (INR):</td>
                  <td align="right" style="padding:10px 12px;font-size:16px;font-weight:900;color:#E65A1E;">&#8377;${Number(totalInr).toFixed(2)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Wallet Top-Up Highlight Box -->
        <div style="background-color:#FFF9E6;border:2.5px solid #121212;padding:16px 18px;margin-bottom:22px;box-shadow:4px 4px 0px #121212;">
          <table width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td width="36" valign="top" style="font-size:26px;line-height:1;">🪙</td>
              <td valign="top" style="padding-left:10px;">
                <div style="font-size:13px;font-weight:900;text-transform:uppercase;color:#121212;letter-spacing:0.5px;">
                  Wallet Balance Updated: +${Number(hopsAdded) || 0} Hops Credited
                </div>
                <div style="font-size:11px;color:#555;line-height:1.4;margin-top:6px;">
                  ⚡ <strong>Hops Never Expire:</strong> Apply to hyperlocal Bengaluru gigs (2&ndash;16 Hops per job), boost your proposals to the top of employer feeds, and unlock direct chats.
                </div>
              </td>
            </tr>
          </table>
        </div>

        <!-- CTA Button -->
        <div style="text-align:center;margin:24px 0 16px 0;">
          <a href="https://www.work-hop.com/freelancer/jobs" target="_blank" style="display:inline-block;background-color:#121212;color:#FFFFFF;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:1px;text-decoration:none;padding:14px 28px;border:2px solid #121212;box-shadow:4px 4px 0px #E65A1E;">
            BROWSE LOCAL BENGALURU GIGS &rarr;
          </a>
        </div>

        <!-- Legal Disclaimer -->
        <p style="margin:20px 0 0 0;font-size:10px;color:#888;text-align:center;line-height:1.4;border-top:1px dashed #DDD;padding-top:14px;">
          This is an electronically generated tax invoice issued under Rule 46 of the Central Goods and Services Tax Rules, 2017. No physical signature is required.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color:#FAF7F2;padding:16px 24px;border-top:2px solid #121212;font-size:11px;color:#666;line-height:1.5;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <strong>WorkHop Platform</strong> &middot; Bengaluru's Hyperlocal Freelance Marketplace<br/>
              Support: <a href="mailto:connect@work-hop.com" style="color:#E65A1E;font-weight:700;text-decoration:underline;">connect@work-hop.com</a> &middot; <a href="mailto:help@work-hop.com" style="color:#E65A1E;font-weight:700;text-decoration:underline;">help@work-hop.com</a> &middot; <a href="https://www.work-hop.com" style="color:#121212;font-weight:700;text-decoration:underline;">www.work-hop.com</a>
            </td>
            <td align="right" valign="top">
              <span style="font-size:10px;font-weight:700;color:#999;text-transform:uppercase;">GST SAC 998311</span>
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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ detail: "Method not allowed" });

  try {
    const body = typeof req.body === "object" && req.body ? req.body : JSON.parse(req.body || "{}");
    const itemKey = body.pack_id || body.plan_id || "pack-40";
    const item = HOPS_ITEMS[itemKey] || HOPS_ITEMS["pack-40"];
    const customerEmail = (body.email || "").trim();
    const customerName = body.full_name || "WorkHop Freelancer";
    const invoiceNumber = body.invoice_number || `WH-INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const paymentId = body.payment_id || `pay_${Date.now()}`;

    const smtpUser = (process.env.SMTP_USER || "connect@work-hop.com").trim();
    const smtpPass = (process.env.SMTP_PASSWORD || process.env.SMTP_PASS || "").replace(/\s+/g, "");

    let emailSent = false;
    if (customerEmail && customerEmail.includes("@") && smtpPass) {
      const htmlBody = buildInvoiceHtml({
        invoiceNumber,
        customerName,
        customerEmail,
        itemTitle: item.title,
        hopsAdded: item.credits,
        totalInr: item.price_inr,
        paymentId,
      });
      const subject = `Tax Invoice #${invoiceNumber} · ${item.title} [WorkHop]`;
      await sendGmailSmtp({
        smtpUser,
        smtpPass,
        to: customerEmail,
        subject,
        htmlBody,
      });
      emailSent = true;
    }

    return res.status(200).json({
      ok: true,
      invoice_number: invoiceNumber,
      invoice_email_sent: emailSent,
      recipient: customerEmail || null,
    });
  } catch (err) {
    console.error("[WorkHop Invoice Email] Error:", err.message);
    return res.status(200).json({
      ok: true,
      invoice_email_sent: false,
      detail: err.message,
    });
  }
};
