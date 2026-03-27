import { SectionCard } from "../components/SectionCard";
import { mockLectures } from "../features/lectures/mockLectures";

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
                  {lecture.subject} • {lecture.topic} • {lecture.semester}
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
    </div>
  );
}
