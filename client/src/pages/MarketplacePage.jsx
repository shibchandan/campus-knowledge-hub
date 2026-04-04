import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../components/SectionCard";
import { useAuth } from "../auth/AuthContext";
import { apiClient } from "../lib/apiClient";

const initialForm = {
  title: "",
  description: "",
  price: "0",
  isPublished: true,
  downloadUrl: "",
  thumbnailUrl: "",
  previewVideoUrl: "",
  resourceType: "course"
};

function courseTagFromPrice(price) {
  return Number(price) > 0 ? "paid-course" : "free-course";
}

function calculateCheckoutPreview(basePrice) {
  const base = Number(basePrice || 0);
  if (!Number.isFinite(base) || base <= 0) {
    return { base: 0, platformFee: 0, gst: 0, total: 0 };
  }

  const platformFee = Number((base * 0.05).toFixed(2));
  const gst = Number(((base + platformFee) * 0.18).toFixed(2));
  const total = Number((base + platformFee + gst).toFixed(2));

  return { base, platformFee, gst, total };
}

function getListingLabel(item) {
  if (item.resourceType === "subscription") {
    return "Monthly Basic Subscription";
  }

  return "Course";
}

export function MarketplacePage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [myItems, setMyItems] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [courseTagFilter, setCourseTagFilter] = useState("all");
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [busyId, setBusyId] = useState("");

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (courseTagFilter !== "all" && item.courseTag !== courseTagFilter) {
        return false;
      }
      if (!search.trim()) {
        return true;
      }
      const query = search.trim().toLowerCase();
      return (
        item.title.toLowerCase().includes(query) ||
        String(item.description || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [courseTagFilter, items, search]);

  async function loadMarketplace() {
    setLoading(true);
    setError("");
    try {
      const [listResponse, mineResponse, purchasesResponse] = await Promise.all([
        apiClient.get("/marketplace"),
        apiClient.get("/marketplace/mine"),
        apiClient.get("/marketplace/purchases/me")
      ]);
      setItems(listResponse.data.data?.items || []);
      setMyItems(mineResponse.data.data || []);
      setPurchases(purchasesResponse.data.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load marketplace.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMarketplace();
  }, []);

  function startEdit(item) {
    setEditingId(item._id);
    setForm({
      title: item.title || "",
      description: item.description || "",
      price: String(item.price ?? 0),
      isPublished: Boolean(item.isPublished),
      downloadUrl: item.downloadUrl || "",
      thumbnailUrl: item.thumbnailUrl || "",
      previewVideoUrl: item.previewVideoUrl || "",
      resourceType: item.resourceType || "course"
    });
  }

  function resetForm() {
    setEditingId("");
    setForm(initialForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        title: form.title,
        description: form.description,
        price: Number(form.price || 0),
        isPublished: form.isPublished,
        downloadUrl: form.downloadUrl,
        thumbnailUrl: form.thumbnailUrl,
        previewVideoUrl: form.previewVideoUrl,
        resourceType: form.resourceType
      };

      if (editingId) {
        await apiClient.patch(`/marketplace/${editingId}`, payload);
        setSuccess("Course updated successfully.");
      } else {
        await apiClient.post("/marketplace", payload);
        setSuccess("Course listed successfully.");
      }

      resetForm();
      await loadMarketplace();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to save marketplace course.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchive(itemId) {
    setBusyId(itemId);
    setError("");
    setSuccess("");
    try {
      await apiClient.delete(`/marketplace/${itemId}`);
      setSuccess("Course archived.");
      if (editingId === itemId) {
        resetForm();
      }
      await loadMarketplace();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to archive course.");
    } finally {
      setBusyId("");
    }
  }

  async function handlePurchase(itemId) {
    setBusyId(itemId);
    setError("");
    setSuccess("");
    try {
      const response = await apiClient.post(`/marketplace/${itemId}/purchase`);
      setSuccess(response.data.message || "Course access granted.");
      await loadMarketplace();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to complete purchase.");
    } finally {
      setBusyId("");
    }
  }

  const nowMs = Date.now();
  const purchaseItemIds = new Set(
    purchases
      .filter((purchase) => {
        if (purchase.purchaseType !== "monthly-subscription") {
          return true;
        }

        return purchase.accessExpiresAt
          ? new Date(purchase.accessExpiresAt).getTime() > nowMs
          : false;
      })
      .map((purchase) => purchase.item?._id)
      .filter(Boolean)
  );
  const checkoutPreview = calculateCheckoutPreview(form.price);

  return (
    <div className="page-stack">
      <SectionCard
        title="Academic Course Marketplace"
        description="Students, representatives, and admins can list courses for free or paid access."
      >
        {error ? <p className="auth-error">{error}</p> : null}
        {success ? <p className="success-note">{success}</p> : null}
        <form className="panel-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Course Title</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              required
              type="text"
              value={form.title}
            />
          </label>
          <label className="auth-field">
            <span>Listing Type</span>
            <select
              className="college-search"
              onChange={(event) =>
                setForm((current) => ({ ...current, resourceType: event.target.value }))
              }
              value={form.resourceType}
            >
              <option value="course">Course</option>
              <option value="subscription">Monthly Basic Subscription</option>
            </select>
          </label>
          <label className="auth-field">
            <span>Description</span>
            <textarea
              className="panel-textarea"
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              rows={3}
              value={form.description}
            />
          </label>
          <label className="auth-field">
            <span>
              {form.resourceType === "subscription"
                ? "Monthly Subscription Price"
                : "Base Price (0 = Free Course)"}
            </span>
            <input
              min={0}
              onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
              step="0.01"
              type="number"
              value={form.price}
            />
          </label>
          <label className="auth-field">
            <span>Publish Now</span>
            <select
              className="college-search"
              onChange={(event) =>
                setForm((current) => ({ ...current, isPublished: event.target.value === "true" }))
              }
              value={String(form.isPublished)}
            >
              <option value="true">Yes</option>
              <option value="false">No (Draft)</option>
            </select>
          </label>
          <label className="auth-field">
            <span>Course Content URL (optional)</span>
            <input
              onChange={(event) =>
                setForm((current) => ({ ...current, downloadUrl: event.target.value }))
              }
              placeholder="https://..."
              type="url"
              value={form.downloadUrl}
            />
          </label>
          <div className="panel-actions">
            <button className="auth-submit" disabled={submitting} type="submit">
              {submitting ? "Saving..." : editingId ? "Update Course" : "List Course"}
            </button>
            {editingId ? (
              <button className="action-button neutral" onClick={resetForm} type="button">
                Cancel Edit
              </button>
            ) : null}
          </div>
          <p className="muted">
            Current tag: {form.resourceType === "subscription" ? "monthly-basic-subscription" : courseTagFromPrice(form.price)}
          </p>
          {form.resourceType === "subscription" ? (
            <p className="muted">
              Buyers will receive a 30-day basic subscription after payment. Protected resources that allow
              basic subscription access will be unlocked during the active period.
            </p>
          ) : Number(form.price || 0) > 0 ? (
            <p className="muted">
              Checkout Preview | Base: INR {checkoutPreview.base} | Platform Fee: INR {checkoutPreview.platformFee} |
              GST: INR {checkoutPreview.gst} | Total Buyer Pays: INR {checkoutPreview.total}
            </p>
          ) : (
            <p className="muted">This will be listed as a free course.</p>
          )}
        </form>
      </SectionCard>

      <SectionCard
        title="Browse Courses"
        description="Buy paid courses or enroll in free courses from the community."
      >
        <div className="toolbar-grid">
          <input
            className="college-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search courses..."
            type="text"
            value={search}
          />
          <select
            className="college-search"
            onChange={(event) => setCourseTagFilter(event.target.value)}
            value={courseTagFilter}
          >
            <option value="all">All courses</option>
            <option value="free-course">Free courses</option>
            <option value="paid-course">Paid courses</option>
          </select>
        </div>

        {loading ? <p className="muted">Loading marketplace...</p> : null}
        {!loading && !visibleItems.length ? <p className="muted">No courses available.</p> : null}
        <div className="panel-list">
          {visibleItems.map((item) => {
            const isMine = String(item.seller?._id) === String(user?.id);
            const alreadyBought = purchaseItemIds.has(item._id);

            return (
              <article className="panel-card" key={item._id}>
                <h3>{item.title}</h3>
                <p className="muted">
                  Type: {getListingLabel(item)} | Seller: {item.seller?.fullName || item.seller?.email || "Unknown"} (
                  {item.seller?.role || "user"})
                </p>
                <p className="muted">
                  Tag: {item.courseTag} | Total Price: {item.currency} {item.price}
                </p>
                {item.resourceType === "subscription" ? (
                  <p className="muted">Plan: Basic | Duration: {item.subscriptionDurationDays || 30} days</p>
                ) : null}
                {Number(item.price || 0) > 0 ? (
                  <p className="muted">
                    Base: {item.currency} {item.basePrice || 0} | Platform Fee ({item.platformFeePercent || 0}%):{" "}
                    {item.currency} {item.platformFeeAmount || 0} | GST ({item.gstPercent || 0}%): {item.currency}{" "}
                    {item.gstAmount || 0}
                  </p>
                ) : null}
                {item.description ? <p className="muted">{item.description}</p> : null}
                <div className="panel-actions">
                  {!isMine ? (
                    <button
                      className="open-college-button"
                      disabled={busyId === item._id || alreadyBought}
                      onClick={() => handlePurchase(item._id)}
                      type="button"
                    >
                      {alreadyBought
                        ? item.resourceType === "subscription"
                          ? "Subscription Active"
                          : "Already Enrolled"
                        : item.resourceType === "subscription"
                          ? "Start Monthly Subscription"
                          : item.price > 0
                            ? "Buy Course"
                            : "Enroll Free"}
                    </button>
                  ) : null}
                  {isMine ? (
                    <button
                      className="action-button approve"
                      onClick={() => startEdit(item)}
                      type="button"
                    >
                      Edit
                    </button>
                  ) : null}
                  {isMine || user?.role === "admin" ? (
                    <button
                      className="action-button reject"
                      disabled={busyId === item._id}
                      onClick={() => handleArchive(item._id)}
                      type="button"
                    >
                      Archive
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="My Purchases" description="Your free enrollments and paid course purchases.">
        {!purchases.length ? <p className="muted">No purchases yet.</p> : null}
        <div className="panel-list">
          {purchases.map((purchase) => (
            <article className="panel-card" key={purchase._id}>
              <h3>{purchase.item?.title || "Course"}</h3>
              <p className="muted">
                Type: {purchase.purchaseType} | Total Paid: {purchase.currency} {purchase.amount}
              </p>
              {purchase.purchaseType === "monthly-subscription" ? (
                <p className="muted">
                  Plan: Basic Subscription | Active until:{" "}
                  {purchase.accessExpiresAt ? new Date(purchase.accessExpiresAt).toLocaleString() : "N/A"}
                </p>
              ) : null}
              <p className="muted">
                Base: {purchase.currency} {purchase.basePrice || 0} | Platform Fee: {purchase.currency}{" "}
                {purchase.platformFeeAmount || 0} | GST: {purchase.currency} {purchase.gstAmount || 0}
              </p>
              <p className="muted">
                Seller: {purchase.seller?.fullName || purchase.seller?.email || "Unknown"}
              </p>
              <p className="muted">{new Date(purchase.createdAt).toLocaleString()}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="My Listed Courses" description="Courses you are currently selling or sharing.">
        {!myItems.length ? <p className="muted">No listed courses yet.</p> : null}
        <div className="panel-list">
          {myItems.map((item) => (
            <article className="panel-card" key={item._id}>
              <h3>{item.title}</h3>
              <p className="muted">
                {getListingLabel(item)} | {item.courseTag} | Total: {item.currency} {item.price} |{" "}
                {item.isPublished ? "Published" : "Draft"}
              </p>
              {item.resourceType === "subscription" ? (
                <p className="muted">Plan: Basic | Duration: {item.subscriptionDurationDays || 30} days</p>
              ) : null}
              <p className="muted">
                Base: {item.currency} {item.basePrice || 0} | Platform Fee: {item.currency}{" "}
                {item.platformFeeAmount || 0} | GST: {item.currency} {item.gstAmount || 0}
              </p>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
