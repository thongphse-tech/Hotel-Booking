import { useState, useEffect } from "react";
import { catalogController } from "../../controllers/catalogController.js";
import { useLanguage } from "../../i18n.js";

export function ReviewManagement({ onRefresh }) {
  const [language] = useLanguage();
  const vi = language === "VI";
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    setLoading(true);
    try {
      setReviews(await catalogController.reviews(true));
    } catch (error) {
      console.error("Failed to load reviews:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id, currentStatus) {
    setLoading(true);
    try {
      await catalogController.approveReview(id, !currentStatus);
      await loadReviews();
    } catch (error) {
      alert(`${vi ? "Lỗi" : "Error"}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="management-section">
      <div className="section-header">
        <h2>{vi ? "Quản lý đánh giá" : "Manage Reviews"}</h2>
      </div>

      {loading && <p className="loading">{vi ? "Đang tải…" : "Loading..."}</p>}

      <table className="data-table">
        <thead>
          <tr>
            <th>{vi ? "Xếp hạng" : "Rating"}</th>
            <th>{vi ? "Bình luận" : "Comment"}</th>
            <th>{vi ? "Tác giả" : "Author"}</th>
            <th>{vi ? "Trạng thái" : "Status"}</th>
            <th>{vi ? "Thao tác" : "Actions"}</th>
          </tr>
        </thead>
        <tbody>
          {reviews.map((review) => (
            <tr key={review.id}>
              <td>
                <span className="stars">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
              </td>
              <td>{review.title && <strong>{review.title}: </strong>}{review.text}</td>
              <td>{review.author}</td>
              <td>
                <span className={`status ${review.isApproved ? "active" : "pending"}`}>
                  {review.isApproved ? (vi ? "Đã duyệt" : "Approved") : (vi ? "Chờ duyệt" : "Pending")}
                </span>
              </td>
              <td>
                <button onClick={() => handleApprove(review.id, review.isApproved)}>
                  {review.isApproved ? (vi ? "Từ chối" : "Reject") : (vi ? "Duyệt" : "Approve")}
                </button>
              </td>
            </tr>
          ))}
          {reviews.length === 0 && !loading && (
            <tr>
              <td colSpan="5" style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                {vi ? "Chưa có đánh giá nào cần kiểm duyệt." : "No reviews require moderation."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
