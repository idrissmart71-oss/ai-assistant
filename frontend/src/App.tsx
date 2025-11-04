import React, { useState, useEffect, useCallback } from "react";
import { Message } from "./types";
import Header from "./components/Header";
import ChatWindow from "./components/ChatWindow";
import InputBar from "./components/InputBar";

export type InitializationStatus = "pending" | "success" | "error";

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [initializationStatus, setInitializationStatus] =
    useState<InitializationStatus>("pending");
  const [showWelcome, setShowWelcome] = useState(true);
  const [chatId, setChatId] = useState<string | null>(null);

  // ✅ Initialize new chat session with backend
  useEffect(() => {
    const initializeChat = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/chat`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: "Initialize STEMROBO Assistant" }),
          }
        );
        

        const data = await res.json();

        if (!data.chatId) throw new Error("Failed to start chat session.");

        setChatId(data.chatId);
        setMessages([
          {
            id: "initial-message",
            role: "model",
            text:
              "👋 Hello! I am the STEMROBO Assistant. How can I help you today?",
          },
        ]);

        setInitializationStatus("success");
        console.log("✅ STEMROBO Assistant initialized successfully");
      } catch (error) {
        console.error("❌ Failed to initialize chat:", error);
        setMessages([
          {
            id: "error-init",
            role: "model",
            text:
              "⚠️ Sorry, I'm having trouble connecting to the STEMROBO server.\n\nPlease check your network or try again shortly.",
          },
        ]);
        setInitializationStatus("error");
      }
    };

    initializeChat();
  }, []);

  // ✅ Handle message send
  const handleSendMessage = useCallback(
    async (text: string) => {
      if (
        !text.trim() ||
        isLoading ||
        initializationStatus !== "success" ||
        !chatId
      )
        return;

      if (showWelcome) setShowWelcome(false);
      setIsLoading(true);

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        text,
      };
      setMessages((prev) => [...prev, userMessage]);

      const modelMessageId = (Date.now() + 1).toString();
      const modelMessage: Message = {
        id: modelMessageId,
        role: "model",
        text: "",
      };
      setMessages((prev) => [...prev, modelMessage]);

      try {
        // ✅ Send message to backend correctly
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/chat`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chatId,
              message: text,
            }),
          }
        );

        const data = await response.json();

        if (!data.text)
          throw new Error("Empty response from backend or invalid message.");

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === modelMessageId ? { ...msg, text: data.text } : msg
          )
        );
      } catch (error) {
        console.error("❌ Error sending message:", error);
        const errorText =
          "⚠️ Oops! Something went wrong while connecting to the STEMROBO Assistant. Please try again later.";
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === modelMessageId ? { ...msg, text: errorText } : msg
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, initializationStatus, showWelcome, chatId]
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-800">
      <Header />
      <ChatWindow
        messages={messages}
        isLoading={isLoading}
        initializationStatus={initializationStatus}
        showWelcome={showWelcome}
        onSuggestionClick={handleSendMessage}
      />
      <InputBar
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        isInitialized={initializationStatus === "success"}
      />
    </div>
  );
};

export default App;
