import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient } from "../lib/apiClient";
import "./Chatbot.css";

const RobotIcon = ({ className, style }) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
    <path d="M12 8V4H8" />
  </svg>
);

const MessageIcon = ({ className, style }) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  </svg>
);

const CloseIcon = ({ className, style }) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const SendIcon = ({ className, style }) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="22" x2="11" y1="2" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState([
    { role: "bot", content: "Hi! I am CampusBot, your academic AI Assistant.\nHow can I help you with your studies today?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);
  
  const suggestions = [
    "Can you summarize my recent lecture?",
    "Generate a PYQ for my upcoming exam.",
    "Give me some study recommendations."
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (text) => {
    if (!text.trim() || isLoading) return;
    
    setInputText("");
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setIsLoading(true);

    try {
      const response = await apiClient.post("/ai/ask", {
        question: text,
        intent: "general"
      });

      const aiData = response.data?.data;
      
      let botResponse = aiData?.summary || "I couldn't generate a response.";
      if (aiData?.categories?.length > 0) {
        aiData.categories.forEach(cat => {
          botResponse += `\n\n**${cat.heading}**\n` + cat.points.map(p => `• ${p}`).join('\n');
        });
      }

      setMessages(prev => [...prev, { role: "bot", content: botResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: "bot", 
        content: error?.response?.data?.message || "Sorry, I am having trouble connecting to my servers right now." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="cb-container">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="cb-window"
          >
            {/* Header */}
            <div className="cb-header">
              <div className="cb-header-left">
                <div className="cb-avatar-wrapper">
                  <RobotIcon style={{ width: '20px', height: '20px' }} />
                  <div className="cb-status-dot"></div>
                </div>
                <div className="cb-header-text">
                  <h3 className="cb-title">CampusBot</h3>
                  <p className="cb-subtitle">AI Assistant • Online</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="cb-close-btn"
              >
                <CloseIcon style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            {/* Chat Body */}
            <div className="cb-body" ref={scrollRef}>
              {messages.map((msg, idx) => (
                <div key={idx} className="cb-message-row" style={{ flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                  {msg.role === "bot" && (
                    <div className="cb-message-avatar">
                      <RobotIcon style={{ width: '16px', height: '16px' }} />
                    </div>
                  )}
                  <div 
                    className="cb-message-bubble" 
                    style={{
                      backgroundColor: msg.role === "user" ? "#4f46e5" : "#1e293b",
                      borderTopLeftRadius: msg.role === "bot" ? "0.125rem" : "1rem",
                      borderTopRightRadius: msg.role === "user" ? "0.125rem" : "1rem",
                      whiteSpace: "pre-wrap"
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="cb-message-row">
                  <div className="cb-message-avatar">
                    <RobotIcon style={{ width: '16px', height: '16px' }} />
                  </div>
                  <div className="cb-message-bubble" style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#94a3b8", animation: "pulse 1.5s infinite" }}></div>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#94a3b8", animation: "pulse 1.5s infinite 0.2s" }}></div>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#94a3b8", animation: "pulse 1.5s infinite 0.4s" }}></div>
                  </div>
                </div>
              )}
            </div>

            {/* Suggestions & Input */}
            <div className="cb-footer">
              <div className="cb-suggestions">
                {suggestions.map((text, i) => (
                  <button 
                    key={i}
                    onClick={() => handleSend(text)}
                    className="cb-suggestion-chip"
                    disabled={isLoading}
                  >
                    {text}
                  </button>
                ))}
              </div>
              
              <div className="cb-input-wrapper">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask CampusBot..."
                  className="cb-input"
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputText.trim()) {
                      handleSend(inputText);
                    }
                  }}
                />
                <button 
                  className={`cb-send-btn ${inputText.trim() && !isLoading ? 'cb-send-active' : ''}`}
                  disabled={isLoading || !inputText.trim()}
                  onClick={() => handleSend(inputText)}
                >
                  <SendIcon style={{ width: '16px', height: '16px' }} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="cb-fab group"
      >
        <MessageIcon className="cb-fab-icon" />
        
        {!isOpen && (
          <span className="cb-fab-badge">
            1
          </span>
        )}
      </button>
    </div>
  );
}
