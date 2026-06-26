import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const RobotIcon = ({ className }) => (
  <svg
    className={className}
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

const MessageIcon = ({ className }) => (
  <svg
    className={className}
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

const CloseIcon = ({ className }) => (
  <svg
    className={className}
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

const SendIcon = ({ className }) => (
  <svg
    className={className}
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
    <div className="fixed bottom-6 right-6 z-[100] font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute bottom-16 right-0 mb-4 w-[350px] md:w-[400px] h-[550px] bg-[#0d111c] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ 
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.15)"
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800/80 bg-[#121827]">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 text-slate-300">
                  <RobotIcon className="w-5 h-5" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#121827] rounded-full"></div>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-[15px] m-0 leading-tight">CivicBot</h3>
                  <p className="text-slate-400 text-xs font-medium m-0 mt-0.5">AI Assistant • Online</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer border-0 bg-transparent"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#0d111c]">
              <div className="flex gap-3">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-emerald-900/40 text-emerald-500 border border-emerald-800/30">
                  <RobotIcon className="w-4 h-4" />
                </div>
                <div className="bg-[#1e293b] text-slate-200 text-[15px] leading-relaxed px-4 py-3 rounded-2xl rounded-tl-sm max-w-[85%] border border-slate-700/50 shadow-sm">
                  Hi! I am CivicBot, your AI Assistant.<br/>
                  How can I help you improve our city today?
                </div>
              </div>
            </div>

            {/* Suggestions & Input */}
            <div className="p-4 border-t border-slate-800/80 bg-[#121827] flex flex-col gap-3">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {suggestions.map((text, i) => (
                  <button 
                    key={i}
                    onClick={() => setInputText(text)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full border border-slate-700 bg-slate-800/30 text-slate-300 text-[13px] hover:bg-slate-700/50 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {text}
                  </button>
                ))}
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask CivicBot..."
                  className="w-full bg-[#0B1120] border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-500 shadow-inner"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputText.trim()) {
                      setInputText("");
                      // handle send
                    }
                  }}
                />
                <button 
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors cursor-pointer border-0 bg-transparent flex items-center justify-center ${
                    inputText.trim() ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10' : 'text-slate-500'
                  }`}
                  onClick={() => {
                    if (inputText.trim()) {
                      setInputText("");
                    }
                  }}
                >
                  <SendIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-[#6D28D9] to-[#8B5CF6] text-white shadow-lg hover:shadow-[#8B5CF6]/30 hover:scale-105 active:scale-95 transition-all duration-200 group border-0 cursor-pointer"
      >
        <MessageIcon className="w-6 h-6 transform group-hover:scale-110 transition-transform" />
        
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[22px] h-[22px] px-1 bg-rose-500 text-white text-[12px] font-bold rounded-full border-2 border-[#0B1120]">
            1
          </span>
        )}
      </button>
    </div>
  );
}
