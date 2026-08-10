const fs = require('fs');
const path = require('path');

const filePath = path.join('c:/Users/shib chandan mistry/Documents/campus-knowledge-hub', 'client', 'src', 'pages', 'RepresentativePanelPage.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix handleEditCourse
const handleEditCourseOriginal = `
  function handleEditCourse(course) {
    setError("");
    setSuccess("");
    setEditingCourseId(course._id);
    setForm({
      collegeName: course.collegeName,
      courseName: course.courseName
    });
  }`;

const handleEditCourseNew = `
  function handleEditCourse(course) {
    setError("");
    setSuccess("");
    setEditingCourseId(course._id);
    setForm({
      collegeName: course.collegeName,
      courseName: course.courseName
    });
    setActiveTab("academic-setup");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }`;

content = content.replace(handleEditCourseOriginal.trim(), handleEditCourseNew.trim());

// Fix handleEditProfile
const handleEditProfileOriginal = `
  function handleEditProfile(profile) {
    setError("");
    setSuccess("");
    setEditingProfileId(profile._id);
    setProfileForm(mapProfileToForm(profile));
  }`;

const handleEditProfileNew = `
  function handleEditProfile(profile) {
    setError("");
    setSuccess("");
    setEditingProfileId(profile._id);
    setProfileForm(mapProfileToForm(profile));
    setActiveTab("college-profile");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }`;

content = content.replace(handleEditProfileOriginal.trim(), handleEditProfileNew.trim());

// Redesign My Approved Colleges Card
// First, check if there's an import for Dashboard.css, if not add it since we want to reuse premium card styles
if (!content.includes('import "../styles/Dashboard.css"')) {
    content = content.replace('import { SectionCard } from "../components/SectionCard";', 'import { SectionCard } from "../components/SectionCard";\nimport "../styles/Dashboard.css";');
}

// Replace <article className="panel-card" key={item._id}> with glassmorphism card
content = content.replace(/<article className="panel-card" key=\{item\._id\}>/g, '<article className="dashboard-premium-card" style={{ marginBottom: "1.5rem" }} key={item._id}>');

// We also need to style the action buttons inside.
// Open Course Page
content = content.replace(/className="action-button neutral"/g, 'className="glowing-btn primary small" style={{ marginRight: "10px", marginBottom: "10px", display: "inline-block" }}');

// Edit Course
content = content.replace(/className="action-button approve" onClick=\{\(\) => handleEditCourse\(item\)\} type="button"/g, 'className="glowing-btn secondary small" style={{ marginRight: "10px", marginBottom: "10px" }} onClick={() => handleEditCourse(item)} type="button"');

// Delete Course
content = content.replace(/className="action-button reject" onClick=\{\(\) => handleDeleteCourse\(item\)\} type="button"/g, 'className="glowing-btn danger small" style={{ marginRight: "10px", marginBottom: "10px" }} onClick={() => handleDeleteCourse(item)} type="button"');

// Delete College
content = content.replace(/className="action-button reject"\s*onClick=\{\(\) => handleDeleteCollege\(item\)\}\s*type="button"/g, 'className="glowing-btn danger small" style={{ marginBottom: "10px" }} onClick={() => handleDeleteCollege(item)} type="button"');

// Edit Profile
content = content.replace(/className="action-button approve" onClick=\{\(\) => handleEditProfile\(item\.profile\)\} type="button"/g, 'className="glowing-btn secondary small" style={{ marginRight: "10px" }} onClick={() => handleEditProfile(item.profile)} type="button"');

// Delete Profile
content = content.replace(/className="action-button reject" onClick=\{\(\) => handleDeleteProfile\(item\.profile\)\} type="button"/g, 'className="glowing-btn danger small" onClick={() => handleDeleteProfile(item.profile)} type="button"');

fs.writeFileSync(filePath, content, 'utf8');
console.log('RepresentativePanelPage updated successfully.');
