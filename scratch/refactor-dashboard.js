const fs = require('fs');
const path = require('path');

const filePath = path.join('c:/Users/shib chandan mistry/Documents/campus-knowledge-hub', 'client', 'src', 'pages', 'DashboardPage.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Imports
if (!content.includes('import "../styles/Dashboard.css"')) {
    content = content.replace('import { DashboardMap } from "../components/DashboardMap";', 'import { DashboardMap } from "../components/DashboardMap";\nimport "../styles/Dashboard.css";');
}

// Chips
content = content.replace(/className="overview-inline-chips" style={{ marginBottom: "1.5rem" }}/g, 'className="dashboard-premium-chips"');
content = content.replace(/className={`notes-focus-chip \${selectedProfileCourse === prog.id \? "active" : ""}`} \s*onClick=\{\(\) => setSelectedProfileCourse\(prog\.id\)\} \s*style=\{\{[\s\S]*?\}\}/g, 'className={`dashboard-premium-chip ${selectedProfileCourse === prog.id ? "active" : ""}`} onClick={() => setSelectedProfileCourse(prog.id)}');

// Detail Card replacements
content = content.replace(/className="detail-card"/g, 'className="dashboard-premium-card"');
content = content.replace(/className="overview-side-label"/g, 'className="dashboard-premium-label"');

// Value styles - using the new class instead of <strong>
content = content.replace(/<strong>\{item\.value\}<\/strong>/g, '<span className="dashboard-premium-value">{item.value}</span>');

// Placement Table
content = content.replace(/<div className="table-responsive" style={{ overflowX: "auto", margin: "0.5rem 0" }}>/g, '<div className="dashboard-premium-table-wrapper">');
content = content.replace(/<table style={{[\s\S]*?}}>/g, '<table className="dashboard-premium-table">');
content = content.replace(/<tr style={{ background: "rgba\(255, 255, 255, 0.06\)" }}>/g, '<tr>');
content = content.replace(/<th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "var\(--fw-head\)", color: "#ffffff", borderBottom: "1px solid rgba\(255, 255, 255, 0.08\)" }}>/g, '<th>');
content = content.replace(/<tr key=\{rIdx\} style={{ borderBottom: rIdx === profile\.placementList\.length - 1 \? "none" : "1px solid rgba\(255, 255, 255, 0.04\)" }}>/g, '<tr key={rIdx}>');
content = content.replace(/<td style={{ padding: "8px 10px", color: "#cbd5e1" }}>/g, '<td>');

// Cutoff Table
content = content.replace(/<tr key=\{rIdx\} style={{ borderBottom: rIdx === profile\.cutOffList\.length - 1 \? "none" : "1px solid rgba\(255, 255, 255, 0.04\)" }}>/g, '<tr key={rIdx}>');

fs.writeFileSync(filePath, content, 'utf8');
console.log('DashboardPage updated successfully.');
