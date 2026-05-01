require("dotenv").config();
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const { createClient } = require("@supabase/supabase-js");

const app = express();

// ── CORS — allow all origins (fixes local HTML file issue) ───────────────────
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

// ── Supabase client ──────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ── Email transporter (Gmail SMTP) ───────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Helper: send notification email to YOU (the business owner)
async function sendNotification({ subject, html }) {
  if (!process.env.SMTP_EMAIL) return;
  await transporter.sendMail({
    from: `"Reclic AI" <${process.env.SMTP_EMAIL}>`,
    to: process.env.NOTIFY_EMAIL || process.env.SMTP_EMAIL,
    subject,
    html,
  });
}

// Helper: send confirmation email to the lead/user
async function sendConfirmation({ to, subject, html }) {
  if (!process.env.SMTP_EMAIL) return;
  await transporter.sendMail({
    from: `"Reclic AI" <${process.env.SMTP_EMAIL}>`,
    to,
    subject,
    html,
  });
}

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ status: "Reclic AI Backend Running ✅" }));

// ─────────────────────────────────────────────────────────────────────────────
// 1. BOOK A DEMO
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/demo", async (req, res) => {
  try {
    const { name, email, phone, company, message } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, error: "Name and email are required." });
    }

    const { error: dbError } = await supabase
      .from("demo_requests")
      .insert([{ name, email, phone, company, message, created_at: new Date().toISOString() }]);

    if (dbError) throw dbError;

    await sendNotification({
      subject: `🎯 New Demo Request from ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#00120B;color:white;padding:32px;border-radius:12px;border:1px solid #C200FB33">
          <h2 style="color:#C200FB;margin-bottom:24px">New Demo Request 🚀</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#aaa;width:120px">Name</td><td style="padding:8px 0;font-weight:600">${name}</td></tr>
            <tr><td style="padding:8px 0;color:#aaa">Email</td><td style="padding:8px 0">${email}</td></tr>
            <tr><td style="padding:8px 0;color:#aaa">Phone</td><td style="padding:8px 0">${phone || "—"}</td></tr>
            <tr><td style="padding:8px 0;color:#aaa">Company</td><td style="padding:8px 0">${company || "—"}</td></tr>
            <tr><td style="padding:8px 0;color:#aaa;vertical-align:top">Message</td><td style="padding:8px 0">${message || "—"}</td></tr>
          </table>
          <p style="color:#666;font-size:12px;margin-top:24px">Received ${new Date().toLocaleString()}</p>
        </div>
      `,
    });

    await sendConfirmation({
      to: email,
      subject: "We got your demo request! 🤖",
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#00120B;color:white;padding:40px;border-radius:12px;border:1px solid #C200FB33">
          <h1 style="color:#C200FB;margin-bottom:8px">Hey ${name}! 👋</h1>
          <p style="color:#ccc;line-height:1.7">Thanks for booking a demo with <strong>Reclic AI</strong>. We've received your request and our team will reach out within <strong>24 hours</strong> to schedule your personalized walkthrough.</p>
          <div style="background:#C200FB18;border:1px solid #C200FB33;border-radius:8px;padding:20px;margin:28px 0">
            <p style="color:#C200FB;font-weight:600;margin-bottom:8px">What happens next?</p>
            <p style="color:#aaa;font-size:14px;line-height:1.7">1. Our team reviews your business details<br>2. We schedule a 30-min personalized demo<br>3. You see exactly how Reclic AI fits your workflow</p>
          </div>
          <p style="color:#666;font-size:12px">— The Reclic AI Team</p>
        </div>
      `,
    });

    res.json({ success: true, message: "Demo request received! We'll be in touch within 24 hours." });
  } catch (err) {
    console.error("Demo endpoint error:", err);
    res.status(500).json({ success: false, error: "Something went wrong. Please try again." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. CONTACT FORM
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: "Name, email and message are required." });
    }

    const { error: dbError } = await supabase
      .from("contact_messages")
      .insert([{ name, email, subject, message, created_at: new Date().toISOString() }]);

    if (dbError) throw dbError;

    await sendNotification({
      subject: `📬 New Contact Message from ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#00120B;color:white;padding:32px;border-radius:12px;border:1px solid #C200FB33">
          <h2 style="color:#C200FB;margin-bottom:24px">New Contact Message 📬</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#aaa;width:120px">Name</td><td style="padding:8px 0;font-weight:600">${name}</td></tr>
            <tr><td style="padding:8px 0;color:#aaa">Email</td><td style="padding:8px 0">${email}</td></tr>
            <tr><td style="padding:8px 0;color:#aaa">Subject</td><td style="padding:8px 0">${subject || "—"}</td></tr>
            <tr><td style="padding:8px 0;color:#aaa;vertical-align:top">Message</td><td style="padding:8px 0">${message}</td></tr>
          </table>
          <p style="color:#666;font-size:12px;margin-top:24px">Received ${new Date().toLocaleString()}</p>
        </div>
      `,
    });

    await sendConfirmation({
      to: email,
      subject: "We received your message — Reclic AI",
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#00120B;color:white;padding:40px;border-radius:12px;border:1px solid #C200FB33">
          <h1 style="color:#C200FB;margin-bottom:8px">Thanks, ${name}!</h1>
          <p style="color:#ccc;line-height:1.7">We've received your message and will get back to you within <strong>1 business day</strong>.</p>
          <p style="color:#666;font-size:12px;margin-top:24px">— The Reclic AI Team</p>
        </div>
      `,
    });

    res.json({ success: true, message: "Message sent! We'll reply within 1 business day." });
  } catch (err) {
    console.error("Contact endpoint error:", err);
    res.status(500).json({ success: false, error: "Something went wrong. Please try again." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. NEWSLETTER SIGNUP
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/newsletter", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required." });
    }

    const { data: existing } = await supabase
      .from("newsletter_subscribers")
      .select("email")
      .eq("email", email)
      .single();

    if (existing) {
      return res.json({ success: true, message: "You're already subscribed! 🎉" });
    }

    const { error: dbError } = await supabase
      .from("newsletter_subscribers")
      .insert([{ email, subscribed_at: new Date().toISOString() }]);

    if (dbError) throw dbError;

    await sendNotification({
      subject: `📧 New Newsletter Subscriber: ${email}`,
      html: `<div style="font-family:sans-serif;padding:24px;background:#00120B;color:white;border-radius:8px"><p>New subscriber: <strong>${email}</strong></p><p style="color:#666;font-size:12px">${new Date().toLocaleString()}</p></div>`,
    });

    await sendConfirmation({
      to: email,
      subject: "Welcome to Reclic AI updates! 🤖",
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#00120B;color:white;padding:40px;border-radius:12px;border:1px solid #C200FB33">
          <h1 style="color:#C200FB;margin-bottom:8px">You're in! 🎉</h1>
          <p style="color:#ccc;line-height:1.7">Welcome to the Reclic AI newsletter. You'll get the latest on AI automation trends, product updates, and exclusive tips to grow your business on autopilot.</p>
          <p style="color:#666;font-size:12px;margin-top:24px">— The Reclic AI Team</p>
        </div>
      `,
    });

    res.json({ success: true, message: "Subscribed! Welcome to the Reclic AI community." });
  } catch (err) {
    console.error("Newsletter endpoint error:", err);
    res.status(500).json({ success: false, error: "Something went wrong. Please try again." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Reclic AI backend running on port ${PORT}`));
