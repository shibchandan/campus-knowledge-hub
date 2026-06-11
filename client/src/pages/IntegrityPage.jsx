import { useEffect, useState } from "react";
import { SectionCard } from "../components/SectionCard";
import { apiClient } from "../lib/apiClient";

function getStatusBadgeClass(status) {
  switch (status?.toLowerCase()) {
    case "clear":
      return "status-chip approved";
    case "warning":
      return "status-chip pending";
    case "review":
      return "status-chip rejected";
    default:
      return "status-chip pending";
  }
}

export function IntegrityPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const response = await apiClient.get("/plagiarism");
        setRecords(response.data.data || []);
      } catch (error) {
        console.error("Failed to load integrity records", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="page-stack">
      <SectionCard
        title="Plagiarism & Quality Control"
        description="Similarity checks across uploaded notes and public academic sources with contributor history awareness."
      >
        {loading ? (
          <p className="muted">Loading integrity reports...</p>
        ) : records.length === 0 ? (
          <div className="lecture-empty-state">
            <span className="lecture-empty-icon">🛡️</span>
            <h3>No Reports Found</h3>
            <p className="muted">All resources pass the integrity and plagiarism checks.</p>
          </div>
        ) : (
          <div className="panel-list">
            {records.map((record) => (
              <article className="panel-card" key={record._id}>
                <div className="resource-card-top">
                  <p className="resource-badge">{record.resourceType}</p>
                  <span className={getStatusBadgeClass(record.status)}>
                    {record.status?.toUpperCase() || "PENDING"}
                  </span>
                </div>
                <h3>{record.overallSimilarity}% Similarity Match</h3>
                <p className="muted">
                  Resource ID: {record.resourceId}
                </p>
                <div className="notes-focus-wrap" style={{ marginTop: "12px" }}>
                  {record.matches?.map((match, i) => (
                    <span className="notes-focus-chip" key={i}>
                      {match.sourceType === "internal" ? "Internal:" : "Public:"} {match.sourceLabel} ({match.similarityPercentage}%)
                    </span>
                  ))}
                </div>
                {record.contributor && (
                  <p className="muted" style={{ marginTop: "12px", fontSize: "0.8rem" }}>
                    Uploaded by: {record.contributor.fullName || record.contributor.email || "Unknown"}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
