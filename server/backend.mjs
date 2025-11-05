/*******************************
 ✅ LOAD ENV FIRST
*******************************/
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ✅ Ensure correct .env path for local + Render
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

console.log("✅ ENV Loaded => GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.slice(0, 10) : "NOT FOUND");


/*******************************
 ✅ IMPORTS
*******************************/
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v4 as uuidv4 } from "uuid";


/*****************************************
 ✅ CHECK API KEY
******************************************/
if (!process.env.GEMINI_API_KEY) {
  throw new Error("❌ GEMINI_API_KEY not found. Add it inside /server/.env AND Render dashboard.");
}


/*****************************************
 ✅ SYSTEM PROMPT
******************************************/
const SYSTEM_PROMPT = `You are an intelligent, polite, and professional AI Chat Assistant named STEMROBO Assistant, created for STEMROBO Technologies Pvt. Ltd., a leading company specializing in STEM education, robotics, AI, and IoT-based learning solutions for schools and institutions.

Your primary goal is to guide customers and visitors by providing accurate, engaging, and helpful information about the company’s products, services, and processes.

Your Capabilities:

Company Introduction & Overview
Introduce STEMROBO Technologies Pvt. Ltd. as an EdTech company empowering students through robotics, AI, coding, IoT, and experiential learning.

Explain the company’s vision, mission, and educational goals.

Highlight collaborations, achievements, and global presence.

Product Assistance
Provide detailed information about all STEMROBO products, kits, learning platforms, and courses.
Suggest products based on:
– Age group
– Curriculum
– Budget
– Institution type

Quotation & Pricing
Collect:
Product names
Quantity
Location
Institution type
Provide approximate quotation or guide to the sales team.

Order Assistance
Explain ordering, payment, and delivery timelines.

Partnership
Explain onboarding schools, distributors, collaboration steps, demo process.

Lead Collection
Collect:
Name
Email
Contact
Organization
Ask permission before saving personal data.

Query Handling
Answer FAQs, product queries, training, technical issues.
If uncertain → connect with sales/support.

Persona
Professional, friendly, polite.
Clear + structured responses.
Focus only on STEMROBO context.

Format
Product Name
Features
Price Range
Next Step
`;


/*****************************************
 ✅ SETUP EXPRESS
******************************************/
const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());
app.use(bodyParser.json());

/*****************************************
 ✅ CORS
******************************************/
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://ai-assistant-nine-theta.vercel.app",
      "https://ai-assistant-idris-projects-711eb9ab.vercel.app"
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);


/*****************************************
 ✅ GEMINI SETUP
******************************************/
const genAI = new GoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

// ✅ BEST MODEL AVAILABLE
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });


/*****************************************
 ✅ SESSION MEMORY
******************************************/
const chatSessions = new Map();


/*****************************************
 ✅ START CHAT SESSION
******************************************/
app.post("/api/start", (req, res) => {
  try {
    const chatId = uuidv4();
    chatSessions.set(chatId, []);

    console.log("🆕 New Session:", chatId);
    res.json({ chatId });
  } catch (err) {
    console.error("❌ Session start error:", err);
    res.status(500).json({ error: "Failed to start session" });
  }
});


/*****************************************
 ✅ CHAT COMPLETION
******************************************/
app.post("/api/chat", async (req, res) => {
  const { chatId, message } = req.body;

  if (!chatId || !chatSessions.has(chatId)) {
    return res.status(400).json({ error: "Invalid or missing chatId" });
  }
  if (!message) {
    return res.status(400).json({ error: "Missing message" });
  }

  try {
    const history = chatSessions.get(chatId);

    history.push({ role: "user", text: message });

    const fullPrompt =
      SYSTEM_PROMPT +
      "\n\n---conversation---\n" +
      history
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
        .join("\n") +
      `\nUser: ${message}\nAssistant: `;

console.log(
  "↗️ Gemini payload:",
  JSON.stringify(
    {
      contents: [
        { role: "user", parts: [{ text: fullPrompt.slice(0, 200) + " …" }] }
      ]
    },
    null,
    2
  )
);

      
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: fullPrompt }],
        },
      ],
    });

    const reply =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ??
      result?.response?.text ??
      "Sorry, I could not generate a response.";

    history.push({ role: "model", text: reply });
    chatSessions.set(chatId, history);

    return res.json({ text: reply });
  } catch (err) {
    console.error("Gemini error:", err);
    return res.status(500).json({ error: "Failed to process chat message" });
  }
});


/*****************************************
 ✅ START SERVER
******************************************/
app.listen(port, () => {
  console.log(`✅ Server running on: ${port}`);
});
