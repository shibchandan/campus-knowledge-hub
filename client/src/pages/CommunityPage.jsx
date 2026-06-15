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

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeSlots, setUpgradeSlots] = useState(100);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);

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

  async function fetchGroupMembers() {
    try {
      const res = await apiClient.get(`/community/groups/${activeGroup._id}/members`);
      setGroupMembers(res.data.data.members || []);
    } catch (err) {
      showError("Failed to fetch members");
    }
  }

  useEffect(() => {
    if (showSettingsModal && activeGroup) {
      fetchGroupMembers();
    }
  }, [showSettingsModal, activeGroup]);

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

  async function handleUpgradeCheckout(e) {
    e.preventDefault();
    try {
      const orderRes = await apiClient.post("/payments/create-order", {
        paymentType: "group_capacity",
        targetId: activeGroup._id,
        extraCapacity: upgradeSlots
      });
      const { orderId, amount, currency, key } = orderRes.data.data;

      const options = {
        key,
        amount,
        currency,
        name: "Campus Hub",
        description: `Upgrade Capacity (+${upgradeSlots} slots)`,
        order_id: orderId,
        handler: async function (response) {
          try {
            await apiClient.post("/payments/verify", response);
            showSuccess("Group capacity upgraded!");
            setShowUpgradeModal(false);
            fetchGroups(); 
          } catch (err) {
            showError("Payment verification failed.");
          }
        },
        theme: { color: "#3b82f6" }
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => showError("Payment failed or cancelled"));
      rzp.open();
    } catch (err) {
      showError("Failed to initiate checkout");
    }
  }

  async function handleLeaveGroup() {
    if (!window.confirm("Are you sure you want to leave this group?")) return;
    try {
      await apiClient.post(`/community/groups/${activeGroup._id}/leave`);
      showSuccess("Left group");
      setShowSettingsModal(false);
      setActiveGroup(null);
      fetchGroups();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to leave");
    }
  }

  async function handleDeleteGroup() {
    if (!window.confirm("Delete this group permanently? This cannot be undone.")) return;
    try {
      await apiClient.delete(`/community/groups/${activeGroup._id}`);
      showSuccess("Group deleted");
      setShowSettingsModal(false);
      setActiveGroup(null);
      fetchGroups();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to delete group");
    }
  }

  async function handleTransferAdmin(newAdminId) {
    if (!window.confirm("Transfer admin rights? You will no longer be the owner.")) return;
    try {
      await apiClient.put(`/community/groups/${activeGroup._id}/transfer`, { newAdminId });
      showSuccess("Admin transferred");
      fetchGroups(); 
      setActiveGroup(null); 
      setShowSettingsModal(false);
    } catch (err) {
      showError(err.response?.data?.message || "Failed to transfer");
    }
  }

  async function handleToggleRestriction() {
    try {
      const res = await apiClient.put(`/community/groups/${activeGroup._id}/restrict`);
      setActiveGroup(res.data.data);
      showSuccess(res.data.data.onlyAdminsCanMessage ? "Only admins can message now" : "Everyone can message now");
      fetchGroups();
    } catch (err) {
      showError("Failed to update restriction");
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
                    {activeGroup.members?.length || 1} / {activeGroup.maxCapacity || 256} members
                  </p>
                </div>
                <div style={{ display: "flex", gap: "1rem" }}>
                  {user?.id === activeGroup.createdBy && (
                    <button onClick={() => setShowUpgradeModal(true)} style={{ background: "#10b981", color: "white", border: "none", padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
                      ⚡ Upgrade Capacity
                    </button>
                  )}
                  <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", padding: "0.5rem 1rem", borderRadius: "8px" }}>
                    <span className="muted" style={{ fontSize: "0.8rem", marginRight: "0.5rem" }}>Invite Code:</span>
                    <strong style={{ color: "#f59e0b", letterSpacing: "1px" }}>{activeGroup.inviteCode}</strong>
                  </div>
                  <button onClick={() => setShowSettingsModal(true)} style={{ background: "transparent", color: "var(--color-text-primary)", border: "1px solid var(--color-border)", padding: "0.5rem", borderRadius: "8px", cursor: "pointer" }}>
                    ⚙️
                  </button>
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
              {activeGroup.onlyAdminsCanMessage && activeGroup.createdBy !== user?.id ? (
                <div style={{ padding: "1.5rem", background: "var(--color-bg-primary)", borderTop: "1px solid var(--color-border)", textAlign: "center" }}>
                  <p className="muted" style={{ margin: 0 }}>Only admins can send messages in this group.</p>
                </div>
              ) : (
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
              )}
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

      {/* UPGRADE MODAL */}
      {showUpgradeModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: "400px", background: "var(--color-bg-primary)", padding: "2rem", borderRadius: "12px" }}>
            <h2 style={{ marginTop: 0 }}>Upgrade Group Capacity</h2>
            <p className="muted">Expand your group's maximum size. Extra slots cost ₹25 per 100 members.</p>
            <form onSubmit={handleUpgradeCheckout} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem" }}>Extra Member Slots</label>
                <select 
                  className="auth-input" 
                  value={upgradeSlots} 
                  onChange={e => setUpgradeSlots(Number(e.target.value))}
                >
                  <option value={100}>+100 Slots (₹25)</option>
                  <option value={200}>+200 Slots (₹50)</option>
                  <option value={500}>+500 Slots (₹125)</option>
                  <option value={1000}>+1000 Slots (₹250)</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setShowUpgradeModal(false)} style={{ flex: 1, padding: "0.75rem", background: "transparent", border: "1px solid var(--color-border)", color: "white", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: "0.75rem", background: "#10b981", border: "none", color: "white", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>Pay ₹{ (upgradeSlots / 100) * 25 }</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: "450px", background: "var(--color-bg-primary)", padding: "2rem", borderRadius: "12px", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ marginTop: 0 }}>Group Settings</h2>
              <button onClick={() => setShowSettingsModal(false)} style={{ background: "transparent", border: "none", color: "white", cursor: "pointer", fontSize: "1.2rem" }}>✖</button>
            </div>

            {user?.id === activeGroup.createdBy && (
              <div style={{ marginTop: "1.5rem", padding: "1rem", background: "var(--color-bg-secondary)", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1rem" }}>Restrict Messaging</h3>
                  <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>Only admins can send messages.</p>
                </div>
                <label style={{ position: "relative", display: "inline-block", width: "44px", height: "24px" }}>
                  <input type="checkbox" checked={activeGroup.onlyAdminsCanMessage || false} onChange={handleToggleRestriction} style={{ opacity: 0, width: 0, height: 0 }} />
                  <span style={{ position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: activeGroup.onlyAdminsCanMessage ? "#10b981" : "#475569", transition: ".4s", borderRadius: "24px" }}>
                    <span style={{ position: "absolute", content: "''", height: "18px", width: "18px", left: activeGroup.onlyAdminsCanMessage ? "22px" : "3px", bottom: "3px", backgroundColor: "white", transition: ".4s", borderRadius: "50%" }}></span>
                  </span>
                </label>
              </div>
            )}
            
            <div style={{ marginTop: "1.5rem", marginBottom: "1rem", padding: "1rem", background: "var(--color-bg-secondary)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Members ({groupMembers.length})</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "200px", overflowY: "auto" }}>
                {groupMembers.map(m => (
                  <div key={m._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem", borderBottom: "1px solid var(--color-border)" }}>
                    <div>
                      <span style={{ display: "block", fontSize: "0.9rem" }}>{m.fullName} {m._id === user?.id && "(You)"}</span>
                      <span className="muted" style={{ fontSize: "0.75rem" }}>{m.email}</span>
                    </div>
                    {user?.id === activeGroup.createdBy && m._id !== user?.id && (
                      <button onClick={() => handleTransferAdmin(m._id)} style={{ background: "transparent", border: "1px solid #3b82f6", color: "#3b82f6", borderRadius: "4px", padding: "0.2rem 0.5rem", fontSize: "0.75rem", cursor: "pointer" }}>
                        Make Admin
                      </button>
                    )}
                    {m._id === activeGroup.createdBy && (
                      <span style={{ fontSize: "0.75rem", background: "#f59e0b", color: "black", padding: "0.1rem 0.4rem", borderRadius: "4px", fontWeight: "bold" }}>Admin</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
              {user?.id === activeGroup.createdBy ? (
                <button onClick={handleDeleteGroup} style={{ flex: 1, padding: "0.75rem", background: "#ef4444", border: "none", color: "white", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
                  Delete Group
                </button>
              ) : (
                <button onClick={handleLeaveGroup} style={{ flex: 1, padding: "0.75rem", background: "#ef4444", border: "none", color: "white", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
                  Leave Group
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
