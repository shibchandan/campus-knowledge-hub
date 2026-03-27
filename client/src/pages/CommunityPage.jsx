import { SectionCard } from "../components/SectionCard";
import { communityThreads } from "../features/community/mockCommunity";

export function CommunityPage() {
  return (
    <div className="page-stack">
      <SectionCard
        title="Collaboration & Community"
        description="Discussion forums, doubt solving, peer mentorship, and college-only communication channels."
      >
        <div className="table">
          {communityThreads.map((thread) => (
            <article className="table-row" key={thread.title}>
              <div>
                <h3>{thread.title}</h3>
                <p className="muted">{thread.channel}</p>
              </div>
              <div>
                <p>{thread.replies} replies</p>
                <p className="muted">{thread.status}</p>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
