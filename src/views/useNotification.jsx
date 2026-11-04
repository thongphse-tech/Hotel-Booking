import { useState, useEffect, useCallback } from "react";

export function useNotification(autoDismissMs = 4000) {
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback((message, type = "success") => {
    setNotification({ message, type });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  useEffect(() => {
    if (notification && autoDismissMs > 0) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [notification, autoDismissMs]);

  return {
    notification,
    showNotification,
    hideNotification,
    setNotice: showNotification, // Alias for compatibility
    setMessage: showNotification // Alias for compatibility
  };
}
