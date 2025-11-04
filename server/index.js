// index.js — STEMROBO AI Assistant Backend

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

// ⚙️ Config
const PORT = process.env.PORT || 8080;
const API_KEY =
  process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("❌ Missing Gemini API key! Set GEMINI_API_KEY in .env or Render settings.");
  process.exit(1);
}

// 🌐 Allowed origins (add your Vercel frontend URL)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://stemrobo-ai-assistant.vercel.app", // ✅ Replace with your frontend URL
];

// Initialize Gemini model
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

// 🧠 In-memory session store (for short-term chat memory)
const sessionStore = new Map();
const MAX_HISTORY = 12;

function pushToSession(sessionId, role, content) {
  const history = sessionStore.get(sessionId) || [];
  history.push({ role, content });
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
  sessionStore.set(sessionId, history);
}

// 🚀 Express App
const app = express();
app.use(express.json({ limit: "200kb" }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST"],
  })
);

// 🏢 STEMROBO Company Info
const STEMROBO_INFO = `
🏢 *STEMROBO Technologies Pvt. Ltd.*
🌐 Website: https://www.stemrobo.com
📍 Address: C-15, Sector-65, Noida, Uttar Pradesh, India
☎️ Phone: +91-8130645500
📧 Email: info@stemrobo.com

💼 *About:*
STEMROBO Technologies is an EdTech company focused on STEM, Robotics, AI, and IoT-based learning for K–12 students and institutions. It provides:
- AI Labs, ATL Labs, Tinkering Labs setup
- Robotics kits and IoT devices
- AI, Robotics, and Coding training programs
- Curriculum integration & teacher training

🎯 *Mission:* To empower students with 21st-century skills through hands-on technology-based learning.
`;

// 🤖 System Prompt
const SYSTEM_PROMPT = `
You are "STEMROBO AI Assistant" — the official virtual guide for STEMROBO Technologies Pvt. Ltd.

🎓 Your Purpose:
- Help users understand STEMROBO’s products, labs, AI/IoT solutions, and educational services.
- Provide information on pricing, setup, training, and support.
- Guide schools and institutions on how to partner or get enrolled with STEMROBO.
- Maintain a professional, courteous, and tech-savvy tone.

💡 Communication Style:
- Be clear, concise, and friendly.
- Use bullet points, headings, and emojis (🤖🔬📦💡).
- End with a helpful note like: *"Would you like me to connect you with our sales or technical team? 🤝"*

🧠 Capabilities:
1️⃣ Provide full company information, product range, and contact details.
2️⃣ Explain procedures for school enrollment, ATL setup, and AI Lab partnership.
3️⃣ Generate quotations (approximate) when users ask for estimated pricing or kits.
4️⃣ Suggest relevant products based on user queries (e.g., robotics kits, AI modules).
5️⃣ Offer educational explanations related to AI, ML, robotics, sensors, coding, and IoT.
6️⃣ Respond to general or unrelated questions smartly, without breaking the professional tone.
7️⃣ Remember conversation context to respond naturally and avoid repetition.

⚙️ Tone Example:
User: "Tell me about STEMROBO."
Assistant: "🤖 STEMROBO Technologies Pvt. Ltd. is a pioneering EdTech company that builds innovation-driven learning solutions for schools — focusing on AI, Robotics, and IoT education."

Always maintain accuracy, professionalism, and clarity.
`;

// ✅ Health Check
app.get("/", (req, res) => res.send("✅ STEMROBO AI Assistant backend running!"));

// 🧩 Chat Endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { prompt, sessionId: clientSessionId } = req.body;
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    const sessionId = clientSessionId || uuidv4();

    console.log(`🧠 [${sessionId}] Prompt: ${prompt}`);

    pushToSession(sessionId, "user", prompt);

    const history = sessionStore.get(sessionId) || [];
    const context = history
      .map((m) => `${m.role === "user" ? "👤 User:" : "🤖 Assistant:"} ${m.content}`)
      .join("\n");

    const fullPrompt = `${SYSTEM_PROMPT}\n\n${STEMROBO_INFO}\n\nConversation Context:\n${context}\n\nNow respond to the user's latest message appropriately.`;

    const result = await model.generateContent([fullPrompt, prompt]);
    const text = result.response.text?.() ?? result.response.text ?? "";

    if (!text.trim()) {
      console.warn(`⚠️ [${sessionId}] Empty Gemini response`);
      return res.status(500).json({ error: "Empty response from model" });
    }

    pushToSession(sessionId, "assistant", text);

    console.log(`✅ [${sessionId}] Responded successfully`);
    res.json({ text, sessionId });
  } catch (err) {
    console.error("❌ Chat error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 🔄 Clear Session
app.post("/api/clear-session", (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) sessionStore.delete(sessionId);
  res.json({ ok: true });
});

// 🚀 Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ STEMROBO Assistant Server running on port ${PORT}`);
});
