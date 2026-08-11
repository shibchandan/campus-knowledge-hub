import { useEffect, useState, useRef } from "react";
import { apiClient } from "../lib/apiClient";
import { useAuth } from "../auth/AuthContext";
import { useConfirm } from "../ui/ConfirmContext";
import { useToast } from "../ui/ToastContext";

export function CommunityPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
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
  const pollInterval = useRef(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (activeGroup) {
      fetchMessages(activeGroup._id);
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
      const res = await apiClient.post("/community/groups", { name: newGroupName, description: newGroupDesc });
      showSuccess("Group created!");
      setShowCreateModal(false);
      setNewGroupName("");
      setNewGroupDesc("");
      fetchGroups();
      setActiveGroup(res.data.data);
    } catch (err) {
      showError(err.response?.data?.message || "Failed to create group");
    }
  }

  async function handleJoinGroup(e) {
    e.preventDefault();
    try {
      const res = await apiClient.post("/community/groups/join", { inviteCode: joinCode });
      showSuccess("Joined group successfully!");
      setShowJoinModal(false);
      setJoinCode("");
      fetchGroups();
      setActiveGroup(res.data.data.group);
    } catch (err) {
      showError(err.response?.data?.message || "Invalid Invite Code");
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!messageText.trim() || !activeGroup) return;

    const originalText = messageText.trim();
    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      _id: tempId,
      text: originalText,
      sender: user,
      createdAt: new Date().toISOString(),
      reactions: [],
      isOptimistic: true
    };

    setMessages((prev) => [...prev, tempMessage]);
    setMessageText("");
    setSending(true);

    try {
      await apiClient.post(`/community/groups/${activeGroup._id}/messages`, { text: originalText });
      pollMessages(activeGroup._id);
    } catch (err) {
      showError("Failed to send message");
      setMessages((prev) => prev.filter(m => m._id !== tempId));
      setMessageText(originalText); 
    } finally {
      setSending(false);
    }
  }

  async function handleReact(msgId, emoji) {
    const originalMessages = [...messages];
    setMessages((prev) => 
      prev.map(msg => {
        if (msg._id !== msgId) return msg;

        const newReactions = [...(msg.reactions || [])];
        const existingReactionIndex = newReactions.findIndex(r => r.emoji === emoji);

        if (existingReactionIndex !== -1) {
          const reaction = newReactions[existingReactionIndex];
          if (reaction.users.includes(user.id)) {
            reaction.users = reaction.users.filter(uid => uid !== user.id);
            if (reaction.users.length === 0) {
              newReactions.splice(existingReactionIndex, 1);
            }
          } else {
            reaction.users.push(user.id);
          }
        } else {
          newReactions.push({ emoji, users: [user.id] });
        }

        return { ...msg, reactions: newReactions };
      })
    );

    try {
      await apiClient.post(`/community/messages/${msgId}/react`, { emoji });
      pollMessages(activeGroup._id);
    } catch (err) {
      showError("Failed to add reaction");
      setMessages(originalMessages);
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
        theme: { color: "#6366f1" }
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => showError("Payment failed or cancelled"));
      rzp.open();
    } catch (err) {
      showError("Failed to initiate checkout");
    }
  }

  async function handleLeaveGroup() {
    const isConfirmed = await confirm({
      title: "Leave Group",
      message: `Are you sure you want to leave "${activeGroup?.name}"? You will need the invite code to rejoin.`,
      confirmText: "Leave Group",
      intent: "danger"
    });
    if (!isConfirmed) return;

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
    const currentPassword = await confirm({
      title: "Delete Group",
      message: `Are you sure you want to permanently delete "${activeGroup?.name}"? This deletes all messages and removes all members. This cannot be undone.`,
      confirmText: "Delete Group",
      intent: "danger",
      requirePassword: true
    });
    
    if (!currentPassword || typeof currentPassword !== "string") return;

    try {
      await apiClient.delete(`/community/groups/${activeGroup._id}`, {
        data: { currentPassword }
      });
      showSuccess("Group deleted");
      setShowSettingsModal(false);
      setActiveGroup(null);
      fetchGroups();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to delete group");
    }
  }

  async function handleTransferAdmin(newAdminId, newAdminName) {
    const isConfirmed = await confirm({
      title: "Transfer Admin Rights",
      message: `Are you sure you want to transfer ownership of "${activeGroup?.name}" to ${newAdminName}? You will become a regular member and lose the ability to manage the group.`,
      confirmText: "Transfer Admin",
      intent: "danger"
    });
    if (!isConfirmed) return;

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

  function getInitials(name) {
    if (!name) return "?";
    return name.substring(0, 2).toUpperCase();
  }

  function getAvatarColor(name) {
    const colors = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#f43f5e"];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
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
        background: "var(--glass-bg)", 
        borderRadius: "20px", 
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--glass-shadow)",
        backdropFilter: "blur(16px)",
        overflow: "hidden"
      }}>
        
        {/* LEFT SIDEBAR - Groups */}
        <div style={{ 
          width: "320px", 
          borderRight: "1px solid var(--glass-border)",
          display: "flex",
          flexDirection: "column",
          background: "rgba(15, 23, 42, 0.4)"
        }}>
          <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--glass-border)", display: "flex", gap: "0.5rem" }}>
            <button onClick={() => setShowCreateModal(true)} className="glowing-btn primary small" style={{ flex: 1, padding: "0.6rem 0" }}>
              + Create
            </button>
            <button onClick={() => setShowJoinModal(true)} className="glowing-btn secondary small" style={{ flex: 1, padding: "0.6rem 0" }}>
              Join Link
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "1rem", overflowX: "hidden", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {loadingGroups ? (
              <p className="muted" style={{ textAlign: "center", marginTop: "1rem" }}>Loading groups...</p>
            ) : groups.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem 1rem", opacity: 0.7 }}>
                <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "1rem" }}>👥</span>
                <p className="muted" style={{ fontSize: "0.9rem" }}>No groups yet. Create or join one!</p>
              </div>
            ) : (
              groups.map(g => {
                const isActive = activeGroup?._id === g._id;
                const avatarColor = getAvatarColor(g.name);
                
                return (
                  <div 
                    key={g._id}
                    onClick={() => setActiveGroup(g)}
                    style={{
                      padding: "1rem",
                      borderRadius: "14px",
                      cursor: "pointer",
                      background: isActive ? "linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.05))" : "transparent",
                      borderLeft: isActive ? "4px solid #6366f1" : "4px solid transparent",
                      border: isActive ? "1px solid rgba(99, 102, 241, 0.2)" : "1px solid transparent",
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      transition: "all 0.25s ease"
                    }}
                    onMouseEnter={(e) => {
                      if(!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    }}
                    onMouseLeave={(e) => {
                      if(!isActive) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div style={{
                      minWidth: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: avatarColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: "bold",
                      fontSize: "1rem",
                      boxShadow: isActive ? `0 0 15px ${avatarColor}80` : "none"
                    }}>
                      {getInitials(g.name)}
                    </div>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <strong style={{ display: "block", color: isActive ? "#818cf8" : "var(--color-text-primary)", fontSize: "1.05rem", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.name}</strong>
                      {g.description && <span className="muted" style={{ fontSize: "0.85rem", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.description}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT SIDE - Chat Window */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "transparent", position: "relative" }}>
          {activeGroup ? (
            <>
              {/* Chat Header */}
              <div style={{ padding: "1.25rem 2rem", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(15, 23, 42, 0.3)", backdropFilter: "blur(12px)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{
                      width: "48px", height: "48px", borderRadius: "12px",
                      background: getAvatarColor(activeGroup.name), display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontWeight: "bold", fontSize: "1.2rem", boxShadow: "0 4px 10px rgba(0,0,0,0.2)"
                    }}>
                    {getInitials(activeGroup.name)}
                  </div>
                  <div>
                    <strong style={{ fontSize: "1.35rem", color: "#f8fafc", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {activeGroup.name}
                      {activeGroup.onlyAdminsCanMessage && <span style={{ fontSize: "0.8rem", background: "rgba(245, 158, 11, 0.2)", color: "#fbd38d", padding: "0.1rem 0.5rem", borderRadius: "10px", border: "1px solid rgba(245, 158, 11, 0.3)", letterSpacing: "0" }}>Read Only</span>}
                    </strong>
                    <p className="muted" style={{ margin: 0, fontSize: "0.85rem", marginTop: "4px" }}>
                      {activeGroup.members?.length || 1} / {activeGroup.maxCapacity || 256} members
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  {user?.id === activeGroup.createdBy && (
                    <button onClick={() => setShowUpgradeModal(true)} className="glowing-btn small" style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white" }}>
                      ⚡ Upgrade Capacity
                    </button>
                  )}
                  <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", padding: "0.6rem 1.25rem", borderRadius: "10px" }}>
                    <span className="muted" style={{ fontSize: "0.8rem", marginRight: "0.5rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Invite:</span>
                    <strong style={{ color: "#fbd38d", letterSpacing: "1px" }}>{activeGroup.inviteCode}</strong>
                  </div>
                  <button onClick={() => setShowSettingsModal(true)} className="action-button neutral" style={{ padding: "0.6rem 1rem", borderRadius: "10px", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1.1rem" }}>⚙️</span> Settings & Members
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {loadingMessages ? (
                  <p className="muted" style={{ textAlign: "center" }}>Loading messages...</p>
                ) : messages.length === 0 ? (
                  <div style={{ margin: "auto", textAlign: "center" }}>
                    <span style={{ fontSize: "3rem" }}>👋</span>
                    <p className="muted" style={{ marginTop: "1rem", fontSize: "1.1rem" }}>Be the first to say hello in {activeGroup.name}!</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMine = msg.sender?._id === user?.id;
                    const isAdmin = msg.sender?._id === activeGroup.createdBy;
                    return (
                      <div key={msg._id} style={{ alignSelf: isMine ? "flex-end" : "flex-start", maxWidth: "75%", display: "flex", flexDirection: "column" }}>
                        {!isMine && (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "0.75rem", marginBottom: "0.4rem" }}>
                            <span className="muted" style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px", color: isAdmin ? "#fbd38d" : "var(--color-slate-400-adaptive)" }}>
                              {msg.sender?.fullName || "Anonymous"}
                            </span>
                            {isAdmin && <span style={{ fontSize: "0.7rem", background: "rgba(245, 158, 11, 0.2)", border: "1px solid rgba(245, 158, 11, 0.4)", color: "#fbd38d", padding: "0.1rem 0.4rem", borderRadius: "10px" }}>Admin</span>}
                          </div>
                        )}
                        <div className="message-bubble" style={{ 
                          background: isMine ? "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" : "rgba(30, 41, 59, 0.7)",
                          color: isMine ? "white" : "#f1f5f9",
                          padding: "0.85rem 1.25rem",
                          borderRadius: isMine ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                          border: isMine ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
                          boxShadow: isMine ? "0 4px 12px rgba(99, 102, 241, 0.25)" : "0 4px 12px rgba(0, 0, 0, 0.15)",
                          position: "relative",
                          backdropFilter: isMine ? "none" : "blur(12px)"
                        }}>
                          <p style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "0.95rem", lineHeight: 1.5 }}>{msg.text}</p>
                          
                          {/* Reactions Display */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                              {msg.reactions.map(r => (
                                <button 
                                  key={r.emoji} 
                                  onClick={() => handleReact(msg._id, r.emoji)}
                                  style={{ 
                                    background: r.users.includes(user?.id) ? (isMine ? "rgba(255,255,255,0.25)" : "rgba(99, 102, 241, 0.2)") : "rgba(0,0,0,0.2)",
                                    border: r.users.includes(user?.id) && !isMine ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid transparent", 
                                    borderRadius: "16px", padding: "0.25rem 0.6rem",
                                    fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem",
                                    color: isMine ? "white" : (r.users.includes(user?.id) ? "#818cf8" : "#cbd5e1"),
                                    transition: "transform 0.1s"
                                  }}
                                  onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
                                  onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                                >
                                  <span>{r.emoji}</span>
                                  <span>{r.users.length}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Quick React Bar (Hover) */}
                          <div className="quick-react" style={{ 
                            position: "absolute", bottom: "-35px", right: isMine ? "0" : "auto", left: isMine ? "auto" : "0",
                            background: "rgba(15, 23, 42, 0.95)", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "24px",
                            padding: "0.4rem 0.8rem", display: "flex", gap: "0.5rem", opacity: 0, transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                            backdropFilter: "blur(12px)", zIndex: 10, boxShadow: "0 8px 16px rgba(0,0,0,0.3)", transform: "translateY(5px)"
                          }}>
                            {["👍", "❤️", "😂", "🚀", "👀"].map(emoji => (
                              <span key={emoji} onClick={() => handleReact(msg._id, emoji)} style={{ cursor: "pointer", fontSize: "1.1rem", transition: "transform 0.15s" }} onMouseEnter={(e)=>e.target.style.transform="scale(1.3)"} onMouseLeave={(e)=>e.target.style.transform="scale(1)"}>{emoji}</span>
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
                <div style={{ padding: "1.5rem", background: "rgba(15, 23, 42, 0.4)", borderTop: "1px solid var(--glass-border)", textAlign: "center", backdropFilter: "blur(12px)" }}>
                  <span style={{ fontSize: "1.5rem", display: "block", marginBottom: "0.5rem" }}>🔒</span>
                  <p className="muted" style={{ margin: 0 }}>Only the Admin can send messages in this group.</p>
                </div>
              ) : (
                <div style={{ padding: "1.25rem 2rem", background: "rgba(15, 23, 42, 0.4)", borderTop: "1px solid var(--glass-border)", backdropFilter: "blur(12px)" }}>
                  <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "1rem" }}>
                    <input 
                      type="text" 
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder={`Message ${activeGroup.name}...`}
                      style={{
                        flex: 1, padding: "1rem 1.5rem", borderRadius: "99px",
                        border: "1px solid rgba(255, 255, 255, 0.12)", 
                        background: "linear-gradient(145deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01))",
                        color: "#f8fafc", outline: "none", fontSize: "1rem",
                        boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.2)",
                        transition: "all 0.3s"
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "rgba(129, 140, 248, 0.8)";
                        e.target.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.25), inset 0 2px 4px rgba(0, 0, 0, 0.1)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "rgba(255, 255, 255, 0.12)";
                        e.target.style.boxShadow = "inset 0 2px 4px rgba(0, 0, 0, 0.2)";
                      }}
                    />
                    <button 
                      type="submit" 
                      disabled={sending || !messageText.trim()}
                      className="glowing-btn primary"
                      style={{
                        padding: "0 2rem", borderRadius: "99px", fontWeight: "600", opacity: (!messageText.trim() || sending) ? 0.5 : 1,
                        fontSize: "1rem"
                      }}
                    >
                      Send
                    </button>
                  </form>
                </div>
              )}
            </>
          ) : (
            <div style={{ margin: "auto", textAlign: "center", opacity: 0.8 }}>
              <div style={{ 
                width: "120px", height: "120px", borderRadius: "50%", background: "rgba(99, 102, 241, 0.1)", 
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem auto",
                border: "1px solid rgba(99, 102, 241, 0.2)", boxShadow: "0 0 40px rgba(99, 102, 241, 0.1)"
              }}>
                <span style={{ fontSize: "4rem" }}>💬</span>
              </div>
              <h2 style={{ color: "#f8fafc", marginBottom: "0.5rem" }}>Your Campus Communities</h2>
              <p className="muted" style={{ maxWidth: "350px", margin: "0 auto", lineHeight: 1.6 }}>Select a group from the sidebar to start chatting, or create a new one to invite your classmates.</p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: "450px", background: "var(--bg-panel)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", padding: "2rem", borderRadius: "16px" }}>
            <h2 style={{ marginTop: 0, fontSize: "1.5rem", color: "white" }}>Create a New Group</h2>
            <p className="muted" style={{ marginBottom: "1.5rem" }}>Start a study group, club, or batch chat.</p>
            <form onSubmit={handleCreateGroup} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-slate-400-adaptive)" }}>Group Name *</label>
                <input required type="text" value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} placeholder="e.g. CS Study Group" className="auth-input" style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-slate-400-adaptive)" }}>Description (Optional)</label>
                <input type="text" value={newGroupDesc} onChange={e=>setNewGroupDesc(e.target.value)} placeholder="What is this group about?" className="auth-input" style={{ width: "100%" }} />
              </div>
              <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="action-button neutral" style={{ flex: 1, padding: "0.75rem" }}>Cancel</button>
                <button type="submit" className="glowing-btn primary" style={{ flex: 1, padding: "0.75rem" }}>Create Group</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN MODAL */}
      {showJoinModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: "450px", background: "var(--bg-panel)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", padding: "2rem", borderRadius: "16px" }}>
            <h2 style={{ marginTop: 0, fontSize: "1.5rem", color: "white" }}>Join via Invite Code</h2>
            <p className="muted" style={{ marginBottom: "1.5rem" }}>Paste the 8-character code shared by the group Admin.</p>
            <form onSubmit={handleJoinGroup} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-slate-400-adaptive)" }}>Invite Code *</label>
                <input required type="text" value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="e.g. A1B2C3D4" className="auth-input" style={{ width: "100%", textTransform: "uppercase", letterSpacing: "2px", textAlign: "center", fontWeight: "bold" }} maxLength={8} />
              </div>
              <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                <button type="button" onClick={() => setShowJoinModal(false)} className="action-button neutral" style={{ flex: 1, padding: "0.75rem" }}>Cancel</button>
                <button type="submit" className="glowing-btn secondary" style={{ flex: 1, padding: "0.75rem" }}>Join Group</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPGRADE MODAL */}
      {showUpgradeModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: "450px", background: "var(--bg-panel)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", padding: "2rem", borderRadius: "16px" }}>
            <h2 style={{ marginTop: 0, fontSize: "1.5rem", color: "white" }}>Upgrade Group Capacity</h2>
            <p className="muted" style={{ marginBottom: "1.5rem" }}>Expand your group's maximum size. Extra slots cost ₹25 per 100 members.</p>
            <form onSubmit={handleUpgradeCheckout} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-slate-400-adaptive)" }}>Extra Member Slots</label>
                <select 
                  className="auth-input" 
                  style={{ width: "100%" }}
                  value={upgradeSlots} 
                  onChange={e => setUpgradeSlots(Number(e.target.value))}
                >
                  <option value={100}>+100 Slots (₹25)</option>
                  <option value={200}>+200 Slots (₹50)</option>
                  <option value={500}>+500 Slots (₹125)</option>
                  <option value={1000}>+1000 Slots (₹250)</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                <button type="button" onClick={() => setShowUpgradeModal(false)} className="action-button neutral" style={{ flex: 1, padding: "0.75rem" }}>Cancel</button>
                <button type="submit" className="glowing-btn" style={{ flex: 1, padding: "0.75rem", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white" }}>Pay ₹{ (upgradeSlots / 100) * 25 }</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettingsModal && activeGroup && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: "500px", background: "var(--bg-panel)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", padding: "2rem", borderRadius: "20px", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <div style={{
                      width: "60px", height: "60px", borderRadius: "16px",
                      background: getAvatarColor(activeGroup.name), display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontWeight: "bold", fontSize: "1.5rem", boxShadow: "0 4px 15px rgba(0,0,0,0.3)"
                    }}>
                    {getInitials(activeGroup.name)}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.5rem", color: "white" }}>Group Settings</h2>
                  <p className="muted" style={{ margin: 0, marginTop: "0.25rem" }}>{activeGroup.name}</p>
                </div>
              </div>
              <button onClick={() => setShowSettingsModal(false)} style={{ background: "transparent", border: "none", color: "var(--color-slate-400-adaptive)", cursor: "pointer", fontSize: "1.5rem", padding: "0.5rem" }}>✖</button>
            </div>

            <div style={{ overflowY: "auto", paddingRight: "0.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              
              {user?.id === activeGroup.createdBy && (
                <div style={{ padding: "1.25rem", background: "rgba(255,255,255,0.03)", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", color: "white" }}>Restrict Messaging</h3>
                    <p className="muted" style={{ margin: 0, fontSize: "0.85rem", marginTop: "4px" }}>Only the Admin can send messages.</p>
                  </div>
                  <label style={{ position: "relative", display: "inline-block", width: "50px", height: "28px" }}>
                    <input type="checkbox" checked={activeGroup.onlyAdminsCanMessage || false} onChange={handleToggleRestriction} style={{ opacity: 0, width: 0, height: 0 }} />
                    <span style={{ position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: activeGroup.onlyAdminsCanMessage ? "#6366f1" : "#475569", transition: ".4s", borderRadius: "34px", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)" }}>
                      <span style={{ position: "absolute", content: "''", height: "20px", width: "20px", left: activeGroup.onlyAdminsCanMessage ? "26px" : "4px", bottom: "4px", backgroundColor: "white", transition: ".4s", borderRadius: "50%", boxShadow: "0 2px 5px rgba(0,0,0,0.3)" }}></span>
                    </span>
                  </label>
                </div>
              )}
              
              <div style={{ padding: "1.25rem", background: "rgba(255,255,255,0.03)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <h3 style={{ marginTop: 0, fontSize: "1.05rem", color: "white", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  Members <span style={{ background: "rgba(99, 102, 241, 0.2)", color: "#818cf8", padding: "0.1rem 0.5rem", borderRadius: "10px", fontSize: "0.85rem" }}>{groupMembers.length}</span>
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem", maxHeight: "250px", overflowY: "auto" }}>
                  {groupMembers.map(m => (
                    <div key={m._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: "rgba(255,255,255,0.02)", borderRadius: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: getAvatarColor(m.fullName), display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: "0.9rem" }}>
                          {getInitials(m.fullName)}
                        </div>
                        <div>
                          <span style={{ display: "block", fontSize: "0.95rem", color: "white" }}>
                            {m.fullName} {m._id === user?.id && <span style={{ color: "var(--color-slate-400-adaptive)" }}>(You)</span>}
                          </span>
                          <span className="muted" style={{ fontSize: "0.8rem" }}>{m.email}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {m._id === activeGroup.createdBy && (
                          <span style={{ fontSize: "0.75rem", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#fbd38d", padding: "0.2rem 0.6rem", borderRadius: "20px", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            <span>👑</span> Admin
                          </span>
                        )}
                        {user?.id === activeGroup.createdBy && m._id !== user?.id && (
                          <button onClick={() => handleTransferAdmin(m._id, m.fullName)} style={{ background: "transparent", border: "1px solid #6366f1", color: "#818cf8", borderRadius: "8px", padding: "0.3rem 0.75rem", fontSize: "0.8rem", cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={(e) => Object.assign(e.currentTarget.style, { background: "rgba(99, 102, 241, 0.1)" })} onMouseLeave={(e) => Object.assign(e.currentTarget.style, { background: "transparent" })}>
                            Make Admin
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              {user?.id === activeGroup.createdBy ? (
                <button onClick={handleDeleteGroup} className="glowing-btn danger" style={{ flex: 1, padding: "0.85rem" }}>
                  Delete Group
                </button>
              ) : (
                <button onClick={handleLeaveGroup} className="glowing-btn danger" style={{ flex: 1, padding: "0.85rem" }}>
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
