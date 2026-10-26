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

function buildInvoiceHtml({ invoiceNumber, customerName, customerEmail, itemTitle, hopsAdded, totalInr, paymentId }) {
  const taxable = (totalInr / 1.18).toFixed(2);
  const cgst = ((totalInr - totalInr / 1.18) / 2).toFixed(2);
  const sgst = cgst;
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#121212;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#FFFFFF;border:3px solid #121212;box-shadow:6px 6px 0px #121212;">
    <tr>
      <td style="background:#121212;padding:20px 24px;color:#FFFFFF;">
        <table width="100%">
          <tr>
            <td>
              <div style="font-size:22px;font-weight:900;letter-spacing:-0.5px;">WORK<span style="color:#E65A1E;">HOP</span></div>
              <div style="font-size:11px;color:#BDBDBD;font-weight:700;text-transform:uppercase;">WorkHop Technologies · Bengaluru, KA</div>
            </td>
            <td align="right">
              <span style="background:#E65A1E;color:#FFF;padding:5px 10px;font-size:11px;font-weight:900;text-transform:uppercase;">TAX INVOICE · PAID</span>
              <div style="font-size:12px;font-weight:800;margin-top:6px;color:#FFF;">#${invoiceNumber}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <table width="100%" style="margin-bottom:18px;font-size:12px;">
          <tr>
            <td>
              <div style="font-size:10px;font-weight:900;color:#777;text-transform:uppercase;">Billed To</div>
              <div style="font-size:14px;font-weight:900;margin-top:2px;">${customerName}</div>
              <div style="color:#555;">${customerEmail}</div>
            </td>
            <td align="right">
              <div style="font-size:10px;font-weight:900;color:#777;text-transform:uppercase;">Invoice Date</div>
              <div style="font-weight:800;margin-top:2px;">${dateStr}</div>
              <div style="font-size:11px;color:#666;margin-top:2px;">Ref: ${paymentId}</div>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="10" cellspacing="0" style="border:2px solid #121212;border-collapse:collapse;font-size:12px;margin-bottom:18px;">
          <tr style="background:#FAF7F2;border-bottom:2px solid #121212;font-weight:900;text-transform:uppercase;font-size:10px;">
            <td align="left">Description (SAC 998311)</td>
            <td align="center">Hops Credited</td>
            <td align="right">Amount (INR)</td>
          </tr>
          <tr>
            <td style="font-weight:800;">${itemTitle}</td>
            <td align="center" style="font-weight:900;color:#E65A1E;">+${hopsAdded} Hops</td>
            <td align="right" style="font-weight:800;">&#8377;${Number(totalInr).toFixed(2)}</td>
          </tr>
        </table>

        <table width="100%" style="margin-bottom:18px;">
          <tr>
            <td width="45%"></td>
            <td width="55%">
              <table width="100%" cellpadding="6" cellspacing="0" style="border:2px solid #121212;background:#FAF7F2;border-collapse:collapse;font-size:11px;">
                <tr>
                  <td>Taxable Amount:</td>
                  <td align="right" style="font-weight:700;">&#8377;${taxable}</td>
                </tr>
                <tr>
                  <td>CGST (9%):</td>
                  <td align="right" style="font-weight:700;">&#8377;${cgst}</td>
                </tr>
                <tr style="border-bottom:2px solid #121212;">
                  <td>SGST (9%):</td>
                  <td align="right" style="font-weight:700;">&#8377;${sgst}</td>
                </tr>
                <tr style="background:#FFE8DC;font-size:13px;font-weight:900;">
                  <td>TOTAL PAID:</td>
                  <td align="right" style="color:#E65A1E;">&#8377;${Number(totalInr).toFixed(2)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <div style="background:#FFF9E6;border:2px solid #121212;padding:14px;font-size:12px;font-weight:700;">
          🪙 <strong>+${hopsAdded} Hops</strong> have been added to your WorkHop wallet and never expire.
        </div>

        <p style="font-size:10px;color:#777;text-align:center;margin-top:18px;">
          Questions? Contact <a href="mailto:connect@work-hop.com" style="color:#E65A1E;font-weight:700;">connect@work-hop.com</a> · <a href="https://www.work-hop.com" style="color:#121212;font-weight:700;">www.work-hop.com</a>
        </p>
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
    const smtpPass = (process.env.SMTP_PASSWORD || "").replace(/\s+/g, "");

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
