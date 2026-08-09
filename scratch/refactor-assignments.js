const fs = require('fs');
const path = require('path');

const filePath = path.join('c:/Users/shib chandan mistry/Documents/campus-knowledge-hub', 'client', 'src', 'pages', 'AssignmentsPage.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Imports
if (!content.includes('import "../styles/Assignments.css"')) {
    content = content.replace('import { useNavigate, Link } from "react-router-dom";', 'import { useNavigate, Link } from "react-router-dom";\nimport "../styles/Assignments.css";\nimport "../styles/Auth.css";');
}

// Search bar
content = content.replace('className="list-toolbar"', 'className="assignment-premium-search-container"');
content = content.replace('className="college-search"', 'className="assignment-premium-search-input"');
content = content.replace('<p className="muted">{filtered.length} active posts</p>', '<p className="assignment-premium-desc" style={{marginRight: "1rem"}}>{filtered.length} active posts</p>');
content = content.replace('className="action-button approve"', 'className="auth-premium-submit" style={{width: "auto", margin: 0}}');

// Card
content = content.replace(/className="community-card-enhanced"[\s\S]*?style={{ borderLeft: "4px solid #f59e0b" }}/g, 'className="assignment-premium-card"');
content = content.replace(/className="community-card-body"/g, 'className="assignment-premium-header"');
content = content.replace(/className="community-card-top-row"/g, 'className="assignment-premium-badges"');
content = content.replace(/className="community-semester-tag" style={{ background: "#f59e0b20", color: "#f59e0b" }}/g, 'className="assignment-premium-badge"');
content = content.replace(/className="community-semester-tag" style={{ background: "#3b82f620", color: "#3b82f6", border: "1px solid #3b82f6" }}/g, 'className="assignment-premium-badge" style={{ borderColor: "#3b82f6", color: "#60a5fa", background: "rgba(59, 130, 246, 0.15)" }}');
content = content.replace(/<span className="muted" style={{ fontSize: "0.8rem" }}>\s*Expires soon\s*<\/span>/g, '<span className="assignment-premium-meta">Expires soon</span>');
content = content.replace(/className="community-card-title"/g, 'className="assignment-premium-title"');
content = content.replace(/className="muted community-card-desc"/g, 'className="assignment-premium-desc"');
content = content.replace(/className="community-card-details"/g, 'className="assignment-premium-meta"');
content = content.replace(/className="community-detail-item"/g, 'className="assignment-premium-meta-item"');
content = content.replace(/className="community-card-footer"/g, 'className="assignment-premium-footer"');
content = content.replace(/className="community-replies-badge" style={{ background: "#1f2937", color: "white" }}/g, 'className="assignment-premium-reply-count"');
content = content.replace(/className="community-join-btn"\s*style={{ color: "#f59e0b", textDecoration: "none" }}/g, 'className="assignment-premium-action"');

// Modal
content = content.replace(/<div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>/g, '<div className="assignment-premium-modal-overlay">');
content = content.replace(/<div className="panel-card" style={{ width: "100%", maxWidth: "500px", padding: "1.5rem" }}>/g, '<div className="assignment-premium-modal">');
content = content.replace(/<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>/g, '<div className="assignment-premium-modal-header">');
content = content.replace(/<button onClick=\{\(\) => setShowCreateModal\(false\)\} style={{ background: "transparent", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var\(--color-text-primary\)" }}>/g, '<button onClick={() => setShowCreateModal(false)} className="assignment-premium-close">');
content = content.replace(/<form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>/g, '<form onSubmit={handleCreate} className="assignment-premium-modal-body">');

// Modal Inputs
content = content.replace(/className="auth-field"/g, 'className="auth-premium-field"');
content = content.replace(/<input required type="text" value={form\.title}/g, '<input className="assignment-premium-search-input" style={{background:"rgba(0,0,0,0.25)"}} required type="text" value={form.title}');
content = content.replace(/<input required type="text" value={form\.subject}/g, '<input className="assignment-premium-search-input" style={{background:"rgba(0,0,0,0.25)"}} required type="text" value={form.subject}');
content = content.replace(/<textarea required rows=\{4\} value=\{form\.message\}[\s\S]*?resize: "vertical" \}\}><\/textarea>/g, '<textarea className="assignment-premium-textarea" required rows={4} value={form.message} onChange={e => setForm({...form, message: e.target.value})} placeholder="Describe the assignment or what you need help with..."></textarea>');
content = content.replace(/className="auth-submit" style={{ background: "#f59e0b" }}/g, 'className="auth-premium-submit assignment-premium-submit-amber"');

fs.writeFileSync(filePath, content, 'utf8');
console.log('AssignmentsPage updated successfully.');
