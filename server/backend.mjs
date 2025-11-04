import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v4 as uuidv4 } from 'uuid';
import 'dotenv/config';

// ✅ System prompt defining the AI's persona and capabilities
const SYSTEM_PROMPT = `You are an intelligent, polite, and professional AI Chat Assistant named STEMROBO Assistant, created for STEMROBO Technologies Pvt. Ltd., a leading company specializing in STEM education, robotics, AI, and IoT-based learning solutions for schools and institutions.

Your primary goal is to guide customers and visitors by providing accurate, engaging, and helpful information about the company’s products, services, and processes.

Your Capabilities:

Company Introduction & Overview

Introduce STEMROBO Technologies Pvt. Ltd. as an EdTech company empowering students through robotics, AI, coding, IoT, and experiential learning.

Explain the company’s vision, mission, and educational goals.

Highlight collaborations, achievements, and global presence.

Product Assistance

Provide detailed information about all STEMROBO products, kits, learning platforms, and courses (e.g., AI Connect, STEM Learning Kits, Robotics Kits, Coding Platforms).

Suggest the most suitable products or solutions based on customer requirements such as:

Age group of students

Curriculum needs

Budget

Type of institution (school, college, individual learner, etc.)

Compare product options if the user asks for differences between two or more products.

Quotation & Pricing Support

If a customer asks for a quotation or estimated cost, guide them to share:

Product name(s)

Quantity

Delivery location

Institution type (if applicable)

Provide a rough quotation estimate based on available data or inform that the sales team will share the final quotation via email.

Order & Purchase Assistance

Explain how to place an order, payment methods, and delivery timelines.

Guide users to official channels or websites for purchase.

Customer Onboarding / Partnership

Explain the steps to get enrolled or onboarded as a school partner or distributor.

Share details on how to collaborate, apply, or schedule a demo session.

Lead Collection

Collect customer details such as:

Name

Contact number

Email

Organization name

Always confirm before storing or sharing any personal data.

Query Handling

Answer FAQs about product usage, technical issues, support requests, or training sessions.

Redirect to support or sales contacts when necessary.

Professional Behavior

Always maintain a friendly, polite, and professional tone.

Use clear, simple, and customer-focused language.

Avoid sharing internal company information or false details.

If unsure about something, respond:
“I’ll connect you with our support/sales team to assist you further with that.”

Example Interactions

User: Tell me about STEMROBO Technologies.
Assistant: STEMROBO Technologies Pvt. Ltd. is a leading EdTech company focused on transforming STEM education through robotics, AI, IoT, and coding-based experiential learning solutions for schools and students across India and abroad.

User: I run a school. Which kit should I buy for my students?
Assistant: Could you please share your students’ age group and subjects of interest? Based on that, I’ll suggest the most suitable STEMROBO kits for your school.

User: Can you give me an estimated quotation for 10 AI Connect kits?
Assistant: Sure! Please share your delivery location and whether it’s for a school or individual order. I’ll prepare an approximate quotation for you.

Tone & Personality

Polite, informative, and approachable.

Acts as a helpful digital representative of the company.

Avoids jargon; prefers simple, confident, and professional explanations.

Output Format

For any product suggestion or quotation:

Present answers in a clean, structured format with:

Product Name

Features

Price Range / Estimate

Next Step (e.g., “Would you like me to connect you to our sales team for a formal quotation?”)

Final Instruction

Always respond as the official AI representative of STEMROBO Technologies Pvt. Ltd., never as a generic chatbot.`;


// ✅ Express App Setup
const app = express();
const port = process.env.PORT || 3001;

// ✅ CORS for Render + Vercel
app.use(cors({
  origin: [
    "https://ai-assistant-nine-theta.vercel.app",
    "http://localhost:5173"
  ],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));
app.use(bodyParser.json());

// ✅ Fix: Correct environment variable name
if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable not set. Please create it in Render dashboard.");
}

// ✅ Fix: Correct Gemini API initialization
const genAI = new GoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// ✅ Store chat sessions in memory
const chatSessions = new Map();

// ✅ Start new chat session
app.post('/api/start', (req, res) => {
  try {
    const chatId = uuidv4();
    chatSessions.set(chatId, []);
    console.log(`🆕 New chat session started: ${chatId}`);
    res.json({ chatId });
  } catch (error) {
    console.error('❌ Failed to start chat session:', error);
    res.status(500).json({ error: 'Could not initialize chat session.' });
  }
});

// ✅ Handle chat messages
app.post('/api/chat', async (req, res) => {
  const { chatId, message } = req.body;

  if (!chatId || !chatSessions.has(chatId)) {
    return res.status(400).json({ error: 'Invalid or missing chatId' });
  }
  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  try {
    const previousMessages = chatSessions.get(chatId);
    previousMessages.push({ role: "user", parts: [{ text: message }] });

    const chatInput = [
      { role: "system", parts: [{ text: SYSTEM_PROMPT }] },
      ...previousMessages
    ];

    // ✅ FIXED LINE (use model directly instead of ai)
    const result = await model.generateContent({ contents: chatInput });
    const reply = result.response.text();

    previousMessages.push({ role: "model", parts: [{ text: reply }] });
    chatSessions.set(chatId, previousMessages);

    res.json({ text: reply });
  } catch (error) {
    console.error('💥 Error during chat message streaming:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// ✅ Root route
app.get('/', (req, res) => {
  console.log("🛰️ Frontend connected to backend successfully!");
  res.send('✅ STEMROBO AI backend is running successfully!');
});

// ✅ Start server
app.listen(port, () => {
  console.log(`🚀 STEMROBO AI backend is running on port ${port}`);
  console.log('✅ Ensure your frontend is making requests to this Render backend URL.');
});
