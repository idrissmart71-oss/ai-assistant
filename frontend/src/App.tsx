import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Message } from './types';
import Header from './components/Header';
import ChatWindow from './components/ChatWindow';
import InputBar from './components/InputBar';
import { SYSTEM_PROMPT } from './constants';

export type InitializationStatus = 'pending' | 'success' | 'error';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [initializationStatus, setInitializationStatus] = useState<InitializationStatus>('pending');
  const [showWelcome, setShowWelcome] = useState(true);
  const chatRef = useRef<Chat | null>(null);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        if (!process.env.VITE_GEMINI_API_KEY) {
          throw new Error("API_KEY environment variable not set.");
        }
        const ai = new GoogleGenerativeAI({ apiKey: process.env.VITE_GEMINI_API_KEY });
        const chat = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: SYSTEM_PROMPT,
          },
        });
        chatRef.current = chat;
        setMessages([
           {
              id: 'initial-message',
              role: 'model',
              text: 'Hello! I am the STEMROBO Assistant. How can I help you today?',
            },
        ]);
        setInitializationStatus('success');
      } catch (error) {
        console.error("Failed to initialize chat:", error);
        setMessages([
          {
            id: 'error-init',
            role: 'model',
            text: "Sorry, I'm having trouble connecting to the assistant.\n\n**For Developers:** Please ensure the `API_KEY` is correctly configured in your environment.",
          },
        ]);
        setInitializationStatus('error');
      }
    };
    initializeChat();
  }, []);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading || initializationStatus !== 'success') return;

    if (showWelcome) {
      setShowWelcome(false);
    }

    setIsLoading(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    const modelMessageId = (Date.now() + 1).toString();
    const modelMessage: Message = {
      id: modelMessageId,
      role: 'model',
      text: '',
    };
    setMessages((prevMessages) => [...prevMessages, modelMessage]);

    try {
      if (!chatRef.current) {
        throw new Error("Chat is not initialized.");
      }
      
      const stream = await chatRef.current.sendMessageStream({ message: text });
      
      let fullResponse = "";
      for await (const chunk of stream) {
        fullResponse += chunk.text;
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === modelMessageId ? { ...msg, text: fullResponse } : msg
          )
        );
      }
      
    } catch (error) {
      console.error("Error sending message:", error);
      const errorText = "Oops! Something went wrong while connecting to the assistant. Please check your API key and network connection, then refresh the page.";
       setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === modelMessageId ? { ...msg, text: errorText } : msg
          )
        );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, initializationStatus, showWelcome]);

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
      <InputBar onSendMessage={handleSendMessage} isLoading={isLoading} isInitialized={initializationStatus === 'success'} />
    </div>
  );
};

export default App;
