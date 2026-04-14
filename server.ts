import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Twilio Client Initialization
  const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

  // API Route for Automatic SMS
  app.post("/api/send-sms", async (req, res) => {
    let { to, message } = req.body;

    if (!twilioClient) {
      return res.status(500).json({ 
        error: "Twilio not configured", 
        details: "Please add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to your secrets." 
      });
    }

    // Sanitize phone numbers (remove spaces, ensure E.164)
    const sanitize = (phone: string) => {
      let cleaned = phone.replace(/[\s\-\(\)]/g, '');
      if (!cleaned.startsWith('+')) {
        // If it's 10 digits and doesn't start with +, it's likely missing a country code.
        // We'll prepend + but we can't guess the country code reliably.
        // However, we can log a warning.
        cleaned = '+' + cleaned;
      }
      return cleaned;
    };

    try {
      const rawFrom = process.env.TWILIO_PHONE_NUMBER || "";
      const fromNumber = sanitize(rawFrom);
      const toNumber = sanitize(to);

      console.log(`Attempting to send SMS from ${fromNumber} to ${toNumber}`);

      const result = await twilioClient.messages.create({
        body: message,
        from: fromNumber,
        to: toNumber
      });
      res.json({ success: true, sid: result.sid });
    } catch (error: any) {
      console.error("Twilio Error Details:", {
        code: error.code,
        message: error.message,
        moreInfo: error.moreInfo,
        status: error.status
      });
      
      let userFriendlyError = "Failed to send SMS";
      if (error.code === 21211) userFriendlyError = "Invalid 'To' number. Did you include the country code (e.g. +91)?";
      if (error.code === 21659) userFriendlyError = "The 'From' number is not a valid Twilio number. Check your TWILIO_PHONE_NUMBER secret.";
      if (error.code === 21408) userFriendlyError = "Permission denied. Check if your Twilio account is allowed to send to this country.";
      
      res.status(500).json({ 
        error: userFriendlyError, 
        details: error.message 
      });
    }
  });

  // API Route for Automated Voice Call
  app.post("/api/make-call", async (req, res) => {
    let { to, message } = req.body;

    if (!twilioClient) {
      return res.status(500).json({ error: "Twilio not configured" });
    }

    const sanitize = (phone: string) => {
      let cleaned = phone.replace(/[\s\-\(\)]/g, '');
      if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
      return cleaned;
    };

    try {
      const fromNumber = sanitize(process.env.TWILIO_PHONE_NUMBER || "");
      const toNumber = sanitize(to);

      const result = await twilioClient.calls.create({
        twiml: `<Response><Say voice="alice">${message}</Say></Response>`,
        from: fromNumber,
        to: toNumber
      });
      res.json({ success: true, sid: result.sid });
    } catch (error: any) {
      console.error("Twilio Voice Error:", error);
      res.status(500).json({ error: "Failed to make call", details: error.message });
    }
  });

  // API Route to check Twilio configuration status (masked for security)
  app.get("/api/twilio-status", (req, res) => {
    const sid = process.env.TWILIO_ACCOUNT_SID || "";
    const phone = process.env.TWILIO_PHONE_NUMBER || "";
    
    res.json({
      configured: !!(sid && process.env.TWILIO_AUTH_TOKEN && phone),
      sidMasked: sid ? `${sid.substring(0, 4)}...${sid.substring(sid.length - 4)}` : "Not set",
      phoneMasked: phone ? `...${phone.substring(phone.length - 4)}` : "Not set",
      isIndianNumber: phone.replace(/\s+/g, '').startsWith('+91') || phone.replace(/\s+/g, '').startsWith('91')
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
