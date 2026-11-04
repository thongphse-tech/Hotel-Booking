export function Notification({ notification, onClose }) {
  if (!notification) return null;

  const isSuccess = notification.type === "success";
  const isError = notification.type === "error";

  return (
    <div
      className={`notification-toast ${isSuccess ? "notification-success" : ""} ${isError ? "notification-error" : ""}`}
      role="alert"
    >
      <div className="notification-content">
        <span className="notification-icon">
          {isSuccess ? "✓" : isError ? "✕" : "ℹ"}
        </span>
        <span className="notification-message">{notification.message}</span>
      </div>
      <button
        className="notification-close"
        onClick={onClose}
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
}
