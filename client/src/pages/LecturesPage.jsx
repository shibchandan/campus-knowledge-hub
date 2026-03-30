import { SectionCard } from "../components/SectionCard";
import { mockLectures, recentLectureUploads } from "../features/lectures/mockLectures";

export function LecturesPage() {
  return (
    <div className="page-stack">
      <SectionCard
        title="Lecture Library"
        description="Secure professor-uploaded video lectures with subject, topic, semester, and date metadata."
      >
        <div className="table">
          {mockLectures.map((lecture) => (
            <article className="table-row" key={lecture.title}>
              <div>
                <h3>{lecture.title}</h3>
                <p className="muted">
                  {lecture.subject} | {lecture.topic} | {lecture.semester}
                </p>
                <p className="muted">
                  {lecture.uploadedBy} | {lecture.uploadType} | {lecture.duration}
                </p>
              </div>
              <div>
                <p>{lecture.date}</p>
                <p className="muted">Bookmarks: {lecture.bookmarks.join(", ")}</p>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Recent Uploads"
        description="Latest lecture video uploads and processing status for the selected college."
      >
        <div className="panel-list">
          {recentLectureUploads.map((item) => (
            <article className="panel-card" key={`${item.title}-${item.uploadedAt}`}>
              <div className="resource-card-top">
                <p className="resource-badge">{item.subject}</p>
                <span className={`status-chip ${item.status.toLowerCase() === "uploaded" ? "approved" : "pending"}`}>
                  {item.status}
                </span>
              </div>
              <h3>{item.title}</h3>
              <p className="muted">
                {item.uploader} | {item.semester}
              </p>
              <p className="muted">Uploaded at: {item.uploadedAt}</p>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
