const path = require("path");
const express = require("express");
const nodemailer = require("nodemailer");
const sgMail = require("@sendgrid/mail");
require("dotenv").config();

const app = express();
const port = Number(process.env.PORT || 3000);
const mailTo = process.env.MAIL_TO || "ingeniuspro@yahoo.com";
const mailFrom = process.env.MAIL_FROM || process.env.SMTP_USER;
const sendgridFrom = process.env.SENDGRID_FROM_EMAIL || mailFrom;
const siteName = process.env.SITE_NAME || "INGENIUS PRO";

app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true }));

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  const portValue = Number(process.env.SMTP_PORT || 587);
  return {
    host,
    port: Number.isFinite(portValue) ? portValue : 587,
    secure:
      typeof process.env.SMTP_SECURE === "string"
        ? process.env.SMTP_SECURE === "true"
        : portValue === 465,
    auth: {
      user,
      pass,
    },
  };
}

function buildMessageBody(data) {
  return [
    `Nume: ${data.name}`,
    `Telefon: ${data.phone}`,
    `Email: ${data.email}`,
    "",
    "Mesaj:",
    data.message,
    "",
    `Sursă: ${data.source}`,
  ].join("\n");
}

app.post("/api/contact", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const phone = String(req.body?.phone || "").trim();
  const email = String(req.body?.email || "").trim();
  const message = String(req.body?.message || "").trim();
  const source = String(req.body?.source || "").trim();

  const phoneClean = phone.replace(/\s|\+|-/g, "");
  const phoneValid = /^[0-9]{6,15}$/.test(phoneClean);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!name) {
    return res.status(400).json({ error: "Vă rugăm introduceți numele." });
  }
  if (!phoneValid) {
    return res.status(400).json({ error: "Telefon invalid." });
  }
  if (!emailValid) {
    return res.status(400).json({ error: "Email invalid." });
  }
  if (!message) {
    return res.status(400).json({ error: "Vă rugăm adăugați un mesaj." });
  }

  const smtpConfig = getSmtpConfig();
  if (!smtpConfig || !mailFrom) {
    return res.status(500).json({
      error:
        "SMTP nu este configurat. Completați variabilele SMTP_HOST, SMTP_USER, SMTP_PASS și MAIL_FROM.",
    });
  }

  // attempt primary SMTP, then fallback to named service if available
  // If SendGrid API key is present, try SendGrid first (preferred)
  let lastError = null;
  if (process.env.SENDGRID_API_KEY) {
    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const sgMsg = {
        to: mailTo,
        from: {
          email: sendgridFrom,
          name: siteName,
        },
        replyTo: email,
        subject: `Solicitare contact de la ${name}`,
        text: buildMessageBody({
          name,
          phone: phoneClean,
          email,
          message,
          source,
        }),
      };
      await sgMail.send(sgMsg);
      return res.json({ ok: true, via: "sendgrid" });
    } catch (sgErr) {
      console.error(
        "SendGrid send failed:",
        sgErr && (sgErr.message || sgErr.toString()),
      );
      lastError = sgErr;
      // fall through to SMTP attempts
    }
  }

  // attempt primary SMTP, then fallback to named service if available
  try {
    // add conservative TLS/timeouts to help with providers that require specific handling
    const transportOptions = Object.assign({}, smtpConfig, {
      tls: Object.assign({ rejectUnauthorized: false }, smtpConfig.tls || {}),
      requireTLS: true,
      authMethod: smtpConfig.auth && smtpConfig.auth.user ? "LOGIN" : undefined,
      connectionTimeout: 20000,
      greetingTimeout: 20000,
    });
    const transporter = nodemailer.createTransport(transportOptions);
    await transporter.sendMail({
      from: `"${siteName}" <${mailFrom}>`,
      to: mailTo,
      replyTo: email,
      subject: `Solicitare contact de la ${name}`,
      text: buildMessageBody({
        name,
        phone: phoneClean,
        email,
        message,
        source:
          source || `${req.protocol}://${req.get("host")}${req.originalUrl}`,
      }),
    });
    return res.json({ ok: true });
  } catch (err1) {
    console.error("Primary SMTP send failed:", err1 && err1.message);
    lastError = err1;
  }

  try {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transport2 = nodemailer.createTransport({
        service: "yahoo",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { rejectUnauthorized: false },
        requireTLS: true,
        connectionTimeout: 20000,
        greetingTimeout: 20000,
      });
      await transport2.sendMail({
        from: `"${siteName}" <${mailFrom}>`,
        to: mailTo,
        replyTo: email,
        subject: `Solicitare contact de la ${name}`,
        text: buildMessageBody({
          name,
          phone: phoneClean,
          email,
          message,
          source,
        }),
      });
      return res.json({ ok: true });
    }
  } catch (err2) {
    console.error("Fallback Yahoo service send failed:", err2 && err2.message);
    lastError = err2;
  }

  console.error(
    "Eroare la trimiterea emailului (final):",
    lastError && lastError.message,
  );
  return res
    .status(500)
    .json({
      error: "Nu am putut trimite mesajul. Verificați configurarea SMTP.",
    });
});

app.use(express.static(path.join(__dirname)));

app.listen(port, () => {
  console.log(`INGENIUS PRO server running on http://127.0.0.1:${port}`);
});
