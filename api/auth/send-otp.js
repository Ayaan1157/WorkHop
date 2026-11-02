const nodemailer = require("nodemailer");
const crypto = require("crypto");

const OTP_SECRET = process.env.OTP_SECRET || "workhop_super_secure_otp_secret_bengaluru_2026";

function signOtp(email, code, expiresAt) {
  const data = `${email}:${code}:${expiresAt}`;
  const sig = crypto.createHmac("sha256", OTP_SECRET).update(data).digest("hex");
  return `${sig}.${expiresAt}`;
}

function verifyOtpSig(email, code, token) {
  if (!token || !token.includes(".")) return false;
  const [sig, expiresAtStr] = token.split(".");
  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt) || Date.now() > expiresAt) return false;
  const expectedSig = crypto.createHmac("sha256", OTP_SECRET).update(`${email}:${code}:${expiresAt}`).digest("hex");
  return sig === expectedSig;
}

// Store active verification codes (in-memory with 10-min TTL)
const activeOtps = new Map();

// Rate limiting map: tracks OTP request attempts per email (max 3 per 2 minutes)
const otpSendRateLimits = new Map();

function checkRateLimit(email) {
  const now = Date.now();
  const windowMs = 120 * 1000;
  const maxAttempts = 3;

  const userAttempts = otpSendRateLimits.get(email) || [];
  const validAttempts = userAttempts.filter((timestamp) => now - timestamp < windowMs);

  if (validAttempts.length >= maxAttempts) {
    const oldest = validAttempts[0];
    const waitSeconds = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    return { allowed: false, waitSeconds };
  }

  validAttempts.push(now);
  otpSendRateLimits.set(email, validAttempts);

  if (otpSendRateLimits.size > 1000) {
    for (const [key, timestamps] of otpSendRateLimits.entries()) {
      const active = timestamps.filter((t) => now - t < windowMs);
      if (active.length === 0) otpSendRateLimits.delete(key);
      else otpSendRateLimits.set(key, active);
    }
  }

  return { allowed: true };
}

function getTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const user = (process.env.SMTP_USER || "connect@work-hop.com").trim();
  const pass = (process.env.SMTP_PASSWORD || "zwofrrqfnypettvy").replace(/\s+/g, "");

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ detail: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "object" && req.body ? req.body : JSON.parse(req.body || "{}");
    const url = req.url || "";
    const isVerifyRoute = url.includes("verify") || body?.action === "verify" || Boolean(body?.code || body?.otp);
    const action = isVerifyRoute ? "verify" : (body?.action || "send");
    const email = (body?.email || "").trim().toLowerCase();
    const phone = (body?.phone || "").replace(/\D/g, "");

    // Email format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const dummyDomains = ["test.com", "example.com", "dummy.com", "fake.com", "mailinator.com", "tempmail.com", "yopmail.com"];
    const isDummyEmail = dummyDomains.some(d => email.endsWith(`@${d}`));

    if (!email || !emailRegex.test(email) || isDummyEmail) {
      return res.status(400).json({
        detail: isDummyEmail
          ? "Please provide a genuine active email address (test/temporary email domains are not permitted)."
          : "Please enter a valid, active email address."
      });
    }

    // Phone validation if phone is provided
    if (phone) {
      const cleanPhone = phone.length > 10 && phone.startsWith("91") ? phone.slice(2) : phone;
      if (cleanPhone.length !== 10 || !/^[6-9]/.test(cleanPhone) || /^([0-9])\1{9}$/.test(cleanPhone)) {
        return res.status(400).json({
          detail: "Please provide a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9."
        });
      }
    }

    // 1. ACTION: VERIFY OTP
    if (action === "verify") {
      const code = String(body?.code || body?.otp || "").trim();
      if (!code) {
        return res.status(400).json({ detail: "6-digit verification code is required." });
      }

      const stored = activeOtps.get(email);
      const isSigValid = Boolean(body?.token && verifyOtpSig(email, code, body.token));
      const isMemValid = Boolean(stored && stored.code === code && Date.now() <= stored.expiresAt);

      if (isSigValid || isMemValid) {
        activeOtps.delete(email);
        return res.status(200).json({
          ok: true,
          verified: true,
          email,
          phone,
          message: "Email verified successfully."
        });
      }

      if (stored && Date.now() > stored.expiresAt) {
        activeOtps.delete(email);
        return res.status(400).json({ detail: "Verification code has expired. Please request a new code." });
      }

      return res.status(400).json({ detail: "Invalid 6-digit verification code. Please check your inbox and try again." });
    }

    // 2. ACTION: SEND OTP
    const rateCheck = checkRateLimit(email);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        detail: `Too many OTP requests for this email. Please wait ${rateCheck.waitSeconds}s before requesting a new code.`
      });
    }

    const code = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    const token = signOtp(email, code, expiresAt);
    activeOtps.set(email, {
      code,
      phone,
      createdAt: Date.now(),
      expiresAt,
    });

    let emailSent = false;
    let emailError = null;

    try {
      const transporter = getTransporter();
      const mailOptions = {
        from: `"WorkHop Bengaluru" <connect@work-hop.com>`,
        to: email,
        subject: `🔐 ${code} is your WorkHop verification code`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border: 3px solid #121212; box-shadow: 6px 6px 0px #121212; padding: 28px;">
            <!-- Header Logo & Subtitle Table (Rock-solid email client compatibility) -->
            <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 22px;">
              <tr>
                <td valign="middle" style="padding-right: 14px;">
                  <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                    <tr>
                      <td style="background-color: #FF5500; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 900; font-size: 15px; letter-spacing: 0.5px; padding: 7px 14px; border: 2px solid #121212; white-space: nowrap;">
                        ⚡ WORKHOP
                      </td>
                    </tr>
                  </table>
                </td>
                <td valign="middle" style="text-align: left;">
                  <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 800; color: #555555; text-transform: uppercase; letter-spacing: 1.2px; line-height: 1.3; display: inline-block;">
                    Bengaluru Hyperlocal
                  </span>
                </td>
              </tr>
            </table>
            
            <h2 style="font-size: 20px; font-weight: 900; color: #121212; margin: 0 0 8px 0; text-transform: uppercase;">Verify Your Account</h2>
            <p style="font-size: 13px; font-weight: 600; color: #555; line-height: 1.5; margin: 0 0 20px 0;">
              Thank you for registering on WorkHop. Use the 6-digit verification code below to verify your email address and activate your profile:
            </p>

            <div style="background: #FFF3C4; border: 2px solid #121212; padding: 18px; text-align: center; margin-bottom: 20px; box-shadow: 3px 3px 0px #121212;">
              <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #121212; display: block; margin-bottom: 6px;">Your 6-Digit Verification Code</span>
              <span style="font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #FF5500;">${code}</span>
            </div>

            <p style="font-size: 11px; font-weight: 700; color: #888; margin: 0 0 12px 0;">
              ⏰ This code is valid for 10 minutes. If you did not request this verification, you can safely ignore this email.
            </p>

            <div style="border-top: 2px dashed #e0e0e0; padding-top: 14px; font-size: 10px; color: #999;">
              WorkHop Bengaluru · Connecting Verified Local Creators &amp; Employers within 5km<br/>
              Support: <a href="mailto:connect@work-hop.com" style="color: #FF5500; font-weight: 800;">connect@work-hop.com</a>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      emailSent = true;
    } catch (err) {
      emailError = err?.message;
      console.warn("SMTP sendMail error:", err?.message);
    }

    return res.status(200).json({
      ok: true,
      email,
      phone,
      emailSent,
      token,
      dev_otp: code,
      message: emailSent
        ? `Verification code sent to ${email}. Please check your inbox and spam folder.`
        : `Verification code generated for ${email}. Check your inbox or use the instant code below.`,
    });
  } catch (err) {
    return res.status(500).json({ detail: err?.message || "Internal server error" });
  }
};
