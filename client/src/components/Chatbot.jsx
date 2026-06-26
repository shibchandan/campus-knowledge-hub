import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  
  const suggestions = [
    "How do I report a pothole?",
    "What is the SLA for broken streetlights?",
    "How can I pay my utilities?"
  ];

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
                  <h3 className="cb-title">CivicBot</h3>
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
            <div className="cb-body">
              <div className="cb-message-row">
                <div className="cb-message-avatar">
                  <RobotIcon style={{ width: '16px', height: '16px' }} />
                </div>
                <div className="cb-message-bubble">
                  Hi! I am CivicBot, your AI Assistant.<br/>
                  How can I help you improve our city today?
                </div>
              </div>
            </div>

            {/* Suggestions & Input */}
            <div className="cb-footer">
              <div className="cb-suggestions">
                {suggestions.map((text, i) => (
                  <button 
                    key={i}
                    onClick={() => setInputText(text)}
                    className="cb-suggestion-chip"
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
                  placeholder="Ask CivicBot..."
                  className="cb-input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputText.trim()) {
                      setInputText("");
                      // handle send
                    }
                  }}
                />
                <button 
                  className={`cb-send-btn ${inputText.trim() ? 'cb-send-active' : ''}`}
                  onClick={() => {
                    if (inputText.trim()) {
                      setInputText("");
                    }
                  }}
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
