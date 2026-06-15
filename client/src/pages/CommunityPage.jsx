import { useEffect, useState, useRef } from "react";
import { apiClient } from "../lib/apiClient";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../ui/ToastContext";
import { SectionCard } from "../components/SectionCard";

export function CommunityPage() {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();

  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const chatEndRef = useRef(null);

  // Poll interval reference
  const pollInterval = useRef(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (activeGroup) {
      fetchMessages(activeGroup._id);
      // Start polling
      pollInterval.current = setInterval(() => {
        pollMessages(activeGroup._id);
      }, 3000);
    } else {
      setMessages([]);
    }

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [activeGroup]);

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchGroups() {
    setLoadingGroups(true);
    try {
      const res = await apiClient.get("/community/groups");
      setGroups(res.data.data || []);
    } catch (err) {
      showError("Failed to fetch groups.");
    } finally {
      setLoadingGroups(false);
    }
  }

  async function fetchMessages(groupId) {
    setLoadingMessages(true);
    try {
      const res = await apiClient.get(`/community/groups/${groupId}/messages`);
      setMessages(res.data.data || []);
    } catch (err) {
      showError("Failed to load messages.");
    } finally {
      setLoadingMessages(false);
    }
  }

  async function pollMessages(groupId) {
    try {
      const res = await apiClient.get(`/community/groups/${groupId}/messages`);
      setMessages(res.data.data || []);
    } catch (err) {
      // silently fail polling
    }
  }

  async function handleCreateGroup(e) {
    e.preventDefault();
    try {
      await apiClient.post("/community/groups", { name: newGroupName, description: newGroupDesc });
      showSuccess("Group created!");
      setShowCreateModal(false);
      setNewGroupName("");
      setNewGroupDesc("");
      fetchGroups();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to create group");
    }
  }

  async function handleJoinGroup(e) {
    e.preventDefault();
    try {
      await apiClient.post("/community/groups/join", { inviteCode: joinCode });
      showSuccess("Joined group successfully!");
      setShowJoinModal(false);
      setJoinCode("");
      fetchGroups();
    } catch (err) {
      showError(err.response?.data?.message || "Invalid Invite Code");
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!messageText.trim() || !activeGroup) return;

    setSending(true);
    try {
      await apiClient.post(`/community/groups/${activeGroup._id}/messages`, { text: messageText });
      setMessageText("");
      pollMessages(activeGroup._id);
    } catch (err) {
      showError("Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function handleReact(msgId, emoji) {
    try {
      await apiClient.post(`/community/messages/${msgId}/react`, { emoji });
      pollMessages(activeGroup._id); // Refresh messages
    } catch (err) {
      showError("Failed to add reaction");
    }
  }

  return (
    <div className="page-stack" style={{ height: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h1 style={{ margin: 0 }}>Community Chat</h1>
          <p className="muted" style={{ margin: 0 }}>Connect with peers in real-time.</p>
        </div>
      </div>

      <div style={{ 
        display: "flex", 
        flex: 1, 
        background: "var(--color-bg-secondary)", 
        borderRadius: "12px", 
        border: "1px solid var(--color-border)",
        overflow: "hidden"
      }}>
        
        {/* LEFT SIDEBAR - Groups */}
        <div style={{ 
          width: "300px", 
          borderRight: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          background: "var(--color-bg-primary)"
        }}>
          <div style={{ padding: "1rem", borderBottom: "1px solid var(--color-border)", display: "flex", gap: "0.5rem" }}>
            <button onClick={() => setShowCreateModal(true)} style={{ flex: 1, padding: "0.5rem", background: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
              + Create
            </button>
            <button onClick={() => setShowJoinModal(true)} style={{ flex: 1, padding: "0.5rem", background: "transparent", color: "#3b82f6", border: "1px solid #3b82f6", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
              Join Link
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
            {loadingGroups ? (
              <p className="muted" style={{ textAlign: "center", marginTop: "1rem" }}>Loading groups...</p>
            ) : groups.length === 0 ? (
              <p className="muted" style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.9rem" }}>No groups yet. Create or join one!</p>
            ) : (
              groups.map(g => (
                <div 
                  key={g._id}
                  onClick={() => setActiveGroup(g)}
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    cursor: "pointer",
                    background: activeGroup?._id === g._id ? "rgba(59, 130, 246, 0.15)" : "transparent",
                    borderLeft: activeGroup?._id === g._id ? "4px solid #3b82f6" : "4px solid transparent",
                    marginBottom: "0.5rem",
                    transition: "all 0.2s"
                  }}
                >
                  <strong style={{ display: "block", color: activeGroup?._id === g._id ? "#3b82f6" : "inherit" }}>{g.name}</strong>
                  {g.description && <span className="muted" style={{ fontSize: "0.8rem", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.description}</span>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT SIDE - Chat Window */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--color-bg-secondary)" }}>
          {activeGroup ? (
            <>
              {/* Chat Header */}
              <div style={{ padding: "1rem", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-bg-primary)" }}>
                <div>
                  <strong style={{ fontSize: "1.2rem" }}>{activeGroup.name}</strong>
                  <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                    {activeGroup.members?.length || 1} members
                  </p>
                </div>
                <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", padding: "0.5rem 1rem", borderRadius: "8px" }}>
                  <span className="muted" style={{ fontSize: "0.8rem", marginRight: "0.5rem" }}>Invite Code:</span>
                  <strong style={{ color: "#f59e0b", letterSpacing: "1px" }}>{activeGroup.inviteCode}</strong>
                </div>
              </div>

              {/* Messages Area */}
              <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                {loadingMessages ? (
                  <p className="muted" style={{ textAlign: "center" }}>Loading messages...</p>
                ) : messages.length === 0 ? (
                  <div style={{ margin: "auto", textAlign: "center" }}>
                    <span style={{ fontSize: "3rem" }}>👋</span>
                    <p className="muted">Be the first to say hello in {activeGroup.name}!</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMine = msg.sender?._id === user?.id;
                    return (
                      <div key={msg._id} style={{ alignSelf: isMine ? "flex-end" : "flex-start", maxWidth: "70%" }}>
                        {!isMine && (
                          <span className="muted" style={{ fontSize: "0.75rem", marginLeft: "0.5rem", marginBottom: "0.2rem", display: "block" }}>
                            {msg.sender?.fullName || "Anonymous"}
                          </span>
                        )}
                        <div style={{ 
                          background: isMine ? "#3b82f6" : "var(--color-bg-primary)",
                          color: isMine ? "white" : "var(--color-text-primary)",
                          padding: "0.75rem 1rem",
                          borderRadius: isMine ? "16px 16px 0 16px" : "16px 16px 16px 0",
                          border: isMine ? "none" : "1px solid var(--color-border)",
                          position: "relative"
                        }}>
                          <p style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.text}</p>
                          
                          {/* Reactions Display */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div style={{ display: "flex", gap: "0.2rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                              {msg.reactions.map(r => (
                                <button 
                                  key={r.emoji} 
                                  onClick={() => handleReact(msg._id, r.emoji)}
                                  style={{ 
                                    background: r.users.includes(user?.id) ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                                    border: "none", borderRadius: "12px", padding: "0.1rem 0.4rem",
                                    fontSize: "0.75rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.2rem"
                                  }}
                                >
                                  <span>{r.emoji}</span>
                                  <span style={{ color: isMine ? "white" : "inherit" }}>{r.users.length}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Quick React Bar (Hover) */}
                          <div className="quick-react" style={{ 
                            position: "absolute", bottom: "-15px", right: isMine ? "auto" : "-10px", left: isMine ? "-10px" : "auto",
                            background: "var(--color-bg-primary)", border: "1px solid var(--color-border)", borderRadius: "20px",
                            padding: "0.2rem 0.5rem", display: "flex", gap: "0.5rem", opacity: 0.5, transition: "opacity 0.2s"
                          }}>
                            {["👍", "❤️", "😂", "🚀"].map(emoji => (
                              <span key={emoji} onClick={() => handleReact(msg._id, emoji)} style={{ cursor: "pointer", fontSize: "0.85rem" }}>{emoji}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div style={{ padding: "1rem", background: "var(--color-bg-primary)", borderTop: "1px solid var(--color-border)" }}>
                <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "0.5rem" }}>
                  <input 
                    type="text" 
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={`Message ${activeGroup.name}...`}
                    style={{
                      flex: 1, padding: "0.75rem 1rem", borderRadius: "24px",
                      border: "1px solid var(--color-border)", background: "var(--color-bg-secondary)",
                      color: "var(--color-text-primary)", outline: "none"
                    }}
                  />
                  <button 
                    type="submit" 
                    disabled={sending || !messageText.trim()}
                    style={{
                      padding: "0 1.5rem", borderRadius: "24px", background: "#3b82f6", color: "white",
                      border: "none", cursor: "pointer", fontWeight: "bold", opacity: (!messageText.trim() || sending) ? 0.5 : 1
                    }}
                  >
                    Send
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div style={{ margin: "auto", textAlign: "center" }}>
              <span style={{ fontSize: "4rem", opacity: 0.5 }}>💬</span>
              <h2 className="muted">Select a group to start chatting</h2>
            </div>
          )}
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: "400px", background: "var(--color-bg-primary)", padding: "2rem", borderRadius: "12px" }}>
            <h2 style={{ marginTop: 0 }}>Create a Group</h2>
            <form onSubmit={handleCreateGroup} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <input required type="text" value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} placeholder="Group Name (e.g. CS Study Group)" className="auth-input" />
              <input type="text" value={newGroupDesc} onChange={e=>setNewGroupDesc(e.target.value)} placeholder="Description (Optional)" className="auth-input" />
              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ flex: 1, padding: "0.75rem", background: "transparent", border: "1px solid var(--color-border)", color: "white", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: "0.75rem", background: "#3b82f6", border: "none", color: "white", borderRadius: "8px", cursor: "pointer" }}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN MODAL */}
      {showJoinModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: "400px", background: "var(--color-bg-primary)", padding: "2rem", borderRadius: "12px" }}>
            <h2 style={{ marginTop: 0 }}>Join via Invite Link/Code</h2>
            <form onSubmit={handleJoinGroup} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <input required type="text" value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="Enter 8-character Invite Code" className="auth-input" />
              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setShowJoinModal(false)} style={{ flex: 1, padding: "0.75rem", background: "transparent", border: "1px solid var(--color-border)", color: "white", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: "0.75rem", background: "#f59e0b", border: "none", color: "white", borderRadius: "8px", cursor: "pointer" }}>Join Group</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
