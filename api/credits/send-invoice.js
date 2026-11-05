const nodemailer = require("nodemailer");
const tls = require("tls");
const PDFDocument = require("pdfkit");

const KNOWN_ITEMS = {
  "verification-badge": { title: "Verified Pro Onboarding Badge", subtitle: "Freelancer Profile Verification & 5km Radius Listing", type: "onboarding", default_price: 299 },
  "freelancer_onboarding": { title: "Verified Pro Onboarding Badge", subtitle: "Freelancer Profile Verification & 5km Radius Listing", type: "onboarding", default_price: 299 },
  "onboarding": { title: "Verified Pro Onboarding Badge", subtitle: "Freelancer Profile Verification & 5km Radius Listing", type: "onboarding", default_price: 299 },
  "lead_unlock": { title: "Direct Client Contact Unlock", subtitle: "Verified Employer Lead Unlock & Direct WhatsApp Tether", type: "lead_unlock", default_price: 199 },
  "pro_unlock": { title: "Direct Client Contact Unlock", subtitle: "Verified Employer Lead Unlock & Direct WhatsApp Tether", type: "lead_unlock", default_price: 199 },
  "pack-10": { title: "10 Hops Top-Up Pack", subtitle: "WorkHop Bidding Hops Credit Pack", credits: 10, default_price: 150, type: "hops_pack" },
  "pack-20": { title: "20 Hops Top-Up Pack", subtitle: "WorkHop Bidding Hops Credit Pack", credits: 20, default_price: 300, type: "hops_pack" },
  "pack-40": { title: "40 Hops Value Pack", subtitle: "WorkHop Bidding Hops Credit Pack", credits: 40, default_price: 600, type: "hops_pack" },
  "pack-60": { title: "60 Hops Growth Pack", subtitle: "WorkHop Bidding Hops Credit Pack", credits: 60, default_price: 900, type: "hops_pack" },
  "pack-80": { title: "80 Hops Pro Bundle", subtitle: "WorkHop Bidding Hops Credit Pack", credits: 80, default_price: 1200, type: "hops_pack" },
  "pack-100": { title: "100 Hops Best Value Pack", subtitle: "WorkHop Bidding Hops Credit Pack", credits: 100, default_price: 1500, type: "hops_pack" },
  "pack-200": { title: "200 Hops Agency Pack", subtitle: "WorkHop Bidding Hops Credit Pack", credits: 200, default_price: 3000, type: "hops_pack" },
  "starter_pass": { title: "Starter Hops Pass (30 Hops/mo)", subtitle: "Monthly Connects Pass", credits: 30, default_price: 399, type: "hops_pass" },
  "pro_pass": { title: "Freelancer Plus Pass (80 Hops/mo)", subtitle: "Monthly Connects Pass", credits: 80, default_price: 999, type: "hops_pass" },
  "power_pass": { title: "Power Freelancer Pass (160 Hops/mo)", subtitle: "Monthly Connects Pass", credits: 160, default_price: 1899, type: "hops_pass" },
  "elite_pass": { title: "WorkHop Elite Monthly Pass (200 Hops/mo)", subtitle: "Monthly Connects Pass", credits: 200, default_price: 999, type: "hops_pass" },
};

function generateInvoicePdfBuffer({ invoiceNumber, customerName, customerEmail, itemTitle, itemSubtitle, totalInr, paymentId, amountWords }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      const orange = "#E65A1E";
      const ink = "#121212";
      const muted = "#666666";

      // Top Header Banner
      doc.rect(40, 40, 515, 60).fill(orange);
      doc.fillColor("#FFFFFF").fontSize(22).font("Helvetica-Bold").text("WORKHOP", 55, 52);
      doc.fontSize(8.5).font("Helvetica").text("HYPERLOCAL FREELANCE MARKETPLACE · BENGALURU, KARNATAKA", 55, 78);

      // Paid Badge
      doc.rect(420, 52, 120, 24).fill(ink);
      doc.fillColor("#7AE582").fontSize(9).font("Helvetica-Bold").text("• PAID · TAX INVOICE", 425, 59, { width: 110, align: "center" });

      // Invoice Title
      doc.fillColor(ink).fontSize(16).font("Helvetica-Bold").text("TAX INVOICE & PAYMENT RECEIPT", 40, 118);
      doc.fontSize(8.5).font("Helvetica").fillColor(muted).text("Electronically generated under Rule 46 of the Central Goods and Services Tax Rules, 2017.", 40, 138);

      // Metadata Box
      doc.rect(40, 155, 515, 60).lineWidth(1).strokeColor(ink).fillAndStroke("#FAF7F2", ink);
      doc.fillColor(muted).fontSize(7.5).font("Helvetica-Bold").text("INVOICE NUMBER", 50, 163);
      doc.fillColor(ink).fontSize(10).font("Helvetica-Bold").text(invoiceNumber || "WH-INV-SAMPLE", 50, 175);
      doc.fillColor(muted).fontSize(7.5).font("Helvetica-Bold").text("INVOICE DATE", 50, 192);
      doc.fillColor(ink).fontSize(9).font("Helvetica").text(new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), 50, 202);

      doc.fillColor(muted).fontSize(7.5).font("Helvetica-Bold").text("PAYMENT REFERENCE (TXN ID)", 220, 163);
      doc.fillColor(ink).fontSize(9).font("Helvetica-Bold").text(paymentId || "pay_captured", 220, 175);
      doc.fillColor(muted).fontSize(7.5).font("Helvetica-Bold").text("PAYMENT METHOD", 220, 192);
      doc.fillColor(ink).fontSize(9).font("Helvetica").text("Razorpay UPI / Netbanking · Instant Confirmation", 220, 202);

      doc.fillColor(muted).fontSize(7.5).font("Helvetica-Bold").text("PLACE OF SUPPLY", 410, 163);
      doc.fillColor(ink).fontSize(9).font("Helvetica-Bold").text("29 - Karnataka (Bengaluru)", 410, 175);
      doc.fillColor(muted).fontSize(7.5).font("Helvetica-Bold").text("GST SAC CODE", 410, 192);
      doc.fillColor(ink).fontSize(9).font("Helvetica").text("998311 (IT & Portal Services)", 410, 202);

      // Supplier & Customer 2-column
      let y = 230;
      doc.rect(40, y, 250, 85).lineWidth(1).strokeColor(ink).fillAndStroke("#FFFFFF", ink);
      doc.fillColor(orange).fontSize(8).font("Helvetica-Bold").text("SUPPLIER (ISSUED BY)", 50, y + 8);
      doc.fillColor(ink).fontSize(9.5).font("Helvetica-Bold").text("WorkHop Technologies", 50, y + 20);
      doc.fontSize(8).font("Helvetica").fillColor(ink)
        .text("Bengaluru Urban, Karnataka - 560001", 50, y + 34)
        .text("GSTIN: Unregistered (Composition/Startup Rule 46)", 50, y + 46)
        .text("Email: connect@work-hop.com | help@work-hop.com", 50, y + 58)
        .text("Web: www.work-hop.com", 50, y + 70);

      doc.rect(305, y, 250, 85).lineWidth(1).strokeColor(ink).fillAndStroke("#FFFFFF", ink);
      doc.fillColor(orange).fontSize(8).font("Helvetica-Bold").text("BILLED TO (CUSTOMER)", 315, y + 8);
      doc.fillColor(ink).fontSize(9.5).font("Helvetica-Bold").text(customerName || "WorkHop Member", 315, y + 20);
      doc.fontSize(8).font("Helvetica").fillColor(ink)
        .text(`Email: ${customerEmail || "member@workhop.in"}`, 315, y + 34)
        .text("Place of Supply: Bengaluru, Karnataka (29)", 315, y + 46)
        .text("Account: Verified Freelancer Profile", 315, y + 58)
        .text("Status: Active & Verified on Platform", 315, y + 70);

      // Line items table header
      y = 330;
      doc.rect(40, y, 515, 22).fill(ink);
      doc.fillColor("#FFFFFF").fontSize(8).font("Helvetica-Bold")
        .text("DESCRIPTION", 50, y + 6)
        .text("SAC", 330, y + 6)
        .text("QTY", 380, y + 6)
        .text("AMOUNT (INR)", 450, y + 6, { width: 95, align: "right" });

      const safeTotal = Number(totalInr || 149);
      const taxable = (safeTotal / 1.18).toFixed(2);
      const cgst = ((safeTotal - safeTotal / 1.18) / 2).toFixed(2);
      const sgst = cgst;

      // Line item row
      y += 22;
      doc.rect(40, y, 515, 45).lineWidth(1).strokeColor("#E0E0E0").fillAndStroke("#FFFFFF", "#E0E0E0");
      doc.fillColor(ink).fontSize(9).font("Helvetica-Bold").text(itemTitle || "Verified Pro Onboarding Badge", 50, y + 8);
      doc.fontSize(7.5).font("Helvetica").fillColor(muted).text(itemSubtitle || "Freelancer Profile Verification & 5km Radius Listing", 50, y + 22, { width: 270 });
      doc.fillColor(ink).fontSize(8.5).font("Helvetica")
        .text("998311", 330, y + 12)
        .text("1", 380, y + 12)
        .text(`₹${taxable}`, 450, y + 12, { width: 95, align: "right" });

      // Breakdown table
      y += 45;
      const drawRow = (label, val, bold = false, fillBg = null) => {
        if (fillBg) {
          doc.rect(40, y, 515, 20).fill(fillBg);
        }
        doc.rect(40, y, 515, 20).lineWidth(0.5).strokeColor("#E0E0E0").stroke();
        doc.fillColor(ink).fontSize(8.5).font(bold ? "Helvetica-Bold" : "Helvetica")
          .text(label, 240, y + 5)
          .text(val, 450, y + 5, { width: 95, align: "right" });
        y += 20;
      };

      drawRow("Taxable Value (Subtotal)", `₹${taxable}`);
      drawRow("Central GST (CGST @ 9%)", `₹${cgst}`);
      drawRow("State GST (SGST @ 9%)", `₹${sgst}`);
      drawRow("Total Amount Paid (Inclusive of Taxes)", `₹${safeTotal.toFixed(2)}`, true, "#FAF7F2");

      // Amount in words
      y += 10;
      doc.rect(40, y, 515, 28).lineWidth(1).strokeColor(ink).fillAndStroke("#FFFFFF", ink);
      doc.fillColor(muted).fontSize(7.5).font("Helvetica-Bold").text("AMOUNT IN WORDS", 50, y + 5);
      doc.fillColor(ink).fontSize(8.5).font("Helvetica-Bold").text(amountWords || "Rupees Only", 50, y + 16);

      // Authenticity & Non-Editable Notice
      y += 40;
      doc.rect(40, y, 515, 75).lineWidth(1).strokeColor(orange).fillAndStroke("#FFF7F2", orange);
      doc.fillColor(orange).fontSize(9).font("Helvetica-Bold").text("OFFICIAL NON-EDITABLE WORKHOP DOCUMENT", 50, y + 10);
      doc.fillColor(ink).fontSize(8).font("Helvetica")
        .text("• This official PDF tax invoice is immutable, non-editable, and certified under WorkHop letterhead.", 50, y + 24)
        .text("• Electronically generated under Rule 46 of the Central Goods and Services Tax Rules, 2017.", 50, y + 36)
        .text("• Retain this official PDF document for your business expense records, GST filing, and accounting.", 50, y + 48)
        .text("• For inquiries or billing verification: connect@work-hop.com · www.work-hop.com", 50, y + 60);

      // Watermark footer
      doc.fillColor("#AAAAAA").fontSize(7.5).font("Helvetica").text("WorkHop Technologies · Bengaluru Hyperlocal Freelance Marketplace · GST SAC 998311", 40, 780, { align: "center", width: 515 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function sendGmailSmtp({ smtpHost = "smtp.gmail.com", smtpPort = 465, smtpUser, smtpPass, to, subject, htmlBody, pdfBuffer, pdfFilename }) {
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

    const boundaryMixed = `wh_mixed_${Date.now()}`;
    const boundaryAlt = `wh_alt_${Date.now()}`;
    const filename = pdfFilename || "tax-invoice.pdf";
    const pdfBase64 = pdfBuffer ? pdfBuffer.toString("base64").match(/.{1,76}/g)?.join("\r\n") || "" : "";

    const rawEmail = [
      `From: "WorkHop Billing" <${smtpUser}>`,
      `To: <${to}>`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundaryMixed}"`,
      ``,
      `--${boundaryMixed}`,
      `Content-Type: multipart/alternative; boundary="${boundaryAlt}"`,
      ``,
      `--${boundaryAlt}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      ``,
      `Thank you for your WorkHop payment! Your official non-editable GST Tax Invoice PDF is attached to this email (${filename}).`,
      ``,
      `--${boundaryAlt}`,
      `Content-Type: text/html; charset="UTF-8"`,
      ``,
      htmlBody,
      ``,
      `--${boundaryAlt}--`,
      ...(pdfBuffer ? [
        ``,
        `--${boundaryMixed}`,
        `Content-Type: application/pdf; name="${filename}"`,
        `Content-Transfer-Encoding: base64`,
        `Content-Disposition: attachment; filename="${filename}"`,
        ``,
        pdfBase64,
      ] : []),
      ``,
      `--${boundaryMixed}--`,
      `.`,
    ].join("\r\n");

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split("\r\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line) continue;
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

async function dispatchInvoiceEmail({ to, subject, htmlBody, pdfBuffer, pdfFilename }) {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = (process.env.SMTP_USER || "connect@work-hop.com").trim();
  const pass = (process.env.SMTP_PASSWORD || process.env.SMTP_PASS || "zwofrrqfnypettvy").replace(/\s+/g, "");
  const filename = pdfFilename || "tax-invoice.pdf";

  const attachments = pdfBuffer ? [
    {
      filename,
      content: pdfBuffer,
      contentType: "application/pdf",
    },
  ] : [];

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });
    const info = await transporter.sendMail({
      from: `"WorkHop Billing" <${user}>`,
      to,
      subject,
      text: `Thank you for your WorkHop payment! Your payment was successfully received. Please find your official, non-editable GST Tax Invoice PDF attached (${filename}).`,
      html: htmlBody,
      attachments,
    });
    return { ok: true, messageId: info?.messageId };
  } catch (err) {
    console.warn("[WorkHop Invoice] Nodemailer failed, falling back to direct TLS socket:", err.message);
    await sendGmailSmtp({
      smtpHost: host,
      smtpPort: 465,
      smtpUser: user,
      smtpPass: pass,
      to,
      subject,
      htmlBody,
      pdfBuffer,
      pdfFilename: filename,
    });
    return { ok: true, fallback: true };
  }
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

function buildInvoiceHtml({ invoiceNumber, customerName, customerEmail, itemTitle, itemSubtitle, hopsAdded, totalInr, paymentId, type }) {
  const safeInv = escapeHtml(invoiceNumber);
  const safeName = escapeHtml(customerName || "WorkHop Member");
  const safeEmail = escapeHtml(customerEmail || "member@workhop.in");
  const safeTitle = escapeHtml(itemTitle);
  const safeSubtitle = escapeHtml(itemSubtitle);
  const safePayId = escapeHtml(paymentId);
  const taxable = (totalInr / 1.18).toFixed(2);
  const cgst = ((totalInr - totalInr / 1.18) / 2).toFixed(2);
  const sgst = cgst;
  const amountWords = inrAmountToWords(totalInr);
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const isOnboarding = type === "onboarding" || safeTitle.toLowerCase().includes("onboarding") || safeTitle.toLowerCase().includes("badge");

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
                Hi <strong>${safeName}</strong>, thank you for your payment! Your transaction was successfully processed. Please keep this official tax invoice for your records.
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
                <strong>Category:</strong> Registered Member
              </div>
            </td>
          </tr>
        </table>

        <!-- Itemized Table -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border:2px solid #121212;border-collapse:collapse;margin-bottom:16px;">
          <tr style="background-color:#121212;color:#FFFFFF;">
            <th align="left" style="padding:10px 12px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;">ITEM DESCRIPTION</th>
            <th align="center" style="padding:10px 8px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;width:65px;">SAC</th>
            <th align="center" style="padding:10px 8px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;width:75px;">QTY</th>
            <th align="right" style="padding:10px 12px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;width:100px;">TAXABLE (INR)</th>
          </tr>
          <tr style="background-color:#FFFFFF;border-bottom:2px solid #121212;">
            <td style="padding:12px;vertical-align:top;">
              <div style="font-size:13px;font-weight:800;color:#121212;">${safeTitle}</div>
              <div style="font-size:11px;color:#666;margin-top:2px;">${safeSubtitle}</div>
            </td>
            <td align="center" style="padding:12px 8px;font-size:12px;font-weight:700;color:#333;vertical-align:top;font-family:monospace;">998311</td>
            <td align="center" style="padding:12px 8px;font-size:12px;font-weight:900;color:#E65A1E;vertical-align:top;">${hopsAdded > 0 ? `+${hopsAdded}` : "1"}</td>
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

        ${isOnboarding ? `
        <!-- Verified Pro Badge Confirmation Box -->
        <div style="background-color:#E5F8EE;border:2.5px solid #121212;padding:16px 18px;margin-bottom:22px;box-shadow:4px 4px 0px #121212;">
          <table width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td width="36" valign="top" style="font-size:26px;line-height:1;">🛡️</td>
              <td valign="top" style="padding-left:10px;">
                <div style="font-size:13px;font-weight:900;text-transform:uppercase;color:#121212;letter-spacing:0.5px;">
                  Verified Pro Badge Activated
                </div>
                <div style="font-size:11px;color:#444;line-height:1.4;margin-top:6px;">
                  ✓ <strong>Verification Pass Confirmed:</strong> Your profile is unlocked with the Verified Pro badge and priority 5km radius visibility to local Bengaluru clients and employers.
                </div>
              </td>
            </tr>
          </table>
        </div>` : hopsAdded > 0 ? `
        <!-- Wallet Top-Up Highlight Box -->
        <div style="background-color:#FFF9E6;border:2.5px solid #121212;padding:16px 18px;margin-bottom:22px;box-shadow:4px 4px 0px #121212;">
          <table width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td width="36" valign="top" style="font-size:26px;line-height:1;">🪙</td>
              <td valign="top" style="padding-left:10px;">
                <div style="font-size:13px;font-weight:900;text-transform:uppercase;color:#121212;letter-spacing:0.5px;">
                  Wallet Balance Updated: +${hopsAdded} Hops Credited
                </div>
                <div style="font-size:11px;color:#555;line-height:1.4;margin-top:6px;">
                  ⚡ <strong>Hops Never Expire:</strong> Apply to hyperlocal Bengaluru gigs, boost your proposals to the top of employer feeds, and unlock direct chats.
                </div>
              </td>
            </tr>
          </table>
        </div>` : `
        <div style="background-color:#FAF7F2;border:2px solid #121212;padding:14px;margin-bottom:22px;">
          <p style="margin:0;font-size:12px;color:#444;line-height:1.4;">
            ✓ Payment received and credited to your WorkHop account. Thank you for building with WorkHop!
          </p>
        </div>`}

        <!-- Action Link -->
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
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const isGet = req.method === "GET";
    const dataSrc = isGet ? req.query : (typeof req.body === "object" && req.body ? req.body : JSON.parse(req.body || "{}"));

    const itemKey = (dataSrc.plan_id || dataSrc.pack_id || dataSrc.product || "").toLowerCase();
    const baseItem = KNOWN_ITEMS[itemKey] || {};
    const itemTitle = dataSrc.title || dataSrc.description || baseItem.title || (itemKey.includes("onboard") ? "Verified Pro Onboarding Badge" : "WorkHop Platform Service");
    const itemSubtitle = dataSrc.subtitle || baseItem.subtitle || (itemKey.includes("onboard") ? "Freelancer Profile Verification & 5km Radius Listing" : "WorkHop Professional Service");
    const totalInr = Number(dataSrc.amount || dataSrc.amount_inr || dataSrc.price_inr || baseItem.default_price || 149);
    const hopsAdded = Number(dataSrc.hops || dataSrc.credits || baseItem.credits || 0);
    const customerEmail = (dataSrc.email || "").trim();
    const customerName = dataSrc.full_name || dataSrc.customer_name || "WorkHop Member";
    const invoiceNumber = dataSrc.invoice_number || `WH-INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const paymentId = dataSrc.payment_id || `pay_${Date.now()}`;

    const htmlBody = buildInvoiceHtml({
      invoiceNumber,
      customerName,
      customerEmail,
      itemTitle,
      itemSubtitle,
      hopsAdded,
      totalInr,
      paymentId,
      type: baseItem.type || itemKey,
    });

    const amountWords = inrAmountToWords(totalInr);
    const pdfFilename = `${invoiceNumber}.pdf`;

    let pdfBuffer = null;
    try {
      pdfBuffer = await generateInvoicePdfBuffer({
        invoiceNumber,
        customerName,
        customerEmail,
        itemTitle,
        itemSubtitle,
        totalInr,
        paymentId,
        amountWords,
      });
    } catch (pdfErr) {
      console.warn("[WorkHop Invoice] PDF generation warning:", pdfErr.message);
    }

    // Direct PDF delivery for download or browser view (un-editable)
    if (isGet && (dataSrc.format === "pdf" || dataSrc.download === "pdf" || !dataSrc.format || dataSrc.format !== "html")) {
      if (pdfBuffer) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${pdfFilename}"`);
        return res.status(200).send(pdfBuffer);
      }
    }

    // If client requested preview / html directly via GET
    if (isGet && dataSrc.format === "html") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(htmlBody);
    }

    let emailSent = false;
    let emailDetail = null;

    if (customerEmail && customerEmail.includes("@")) {
      const subject = `Tax Invoice #${invoiceNumber} · ${itemTitle} [WorkHop]`;
      try {
        await dispatchInvoiceEmail({
          to: customerEmail,
          subject,
          htmlBody,
          pdfBuffer,
          pdfFilename,
        });
        emailSent = true;
      } catch (err) {
        console.error("[WorkHop Invoice Email Dispatch Error]:", err.message);
        emailDetail = err.message;
      }
    }

    return res.status(200).json({
      ok: true,
      invoice_number: invoiceNumber,
      invoice_email_sent: emailSent,
      recipient: customerEmail || null,
      pdf_attached: !!pdfBuffer,
      pdf_filename: pdfFilename,
      html: htmlBody,
      detail: emailDetail,
    });
  } catch (err) {
    console.error("[WorkHop Invoice Server Error]:", err.message);
    return res.status(200).json({
      ok: true,
      invoice_email_sent: false,
      detail: err.message,
    });
  }
};
