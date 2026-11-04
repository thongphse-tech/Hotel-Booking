import { useCallback, useEffect, useId, useRef, useState } from "react";

export function useConfirmation() {
  const [request, setRequest] = useState(null);
  const resolver = useRef(null);
  const cancelButton = useRef(null);
  const id = useId();

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolver.current = resolve;
    setRequest(options);
  }), []);

  const close = useCallback((confirmed) => {
    resolver.current?.(confirmed);
    resolver.current = null;
    setRequest(null);
  }, []);

  useEffect(() => {
    if (!request) return undefined;
    cancelButton.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") close(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [request, close]);

  useEffect(() => () => {
    resolver.current?.(false);
    resolver.current = null;
  }, []);

  const dialog = request && (
    <div className="modal-overlay confirmation-overlay" onClick={(event) => {
      if (event.target === event.currentTarget) close(false);
    }}>
      <section
        className={`modal confirmation-dialog${request.tone === "danger" ? " is-danger" : ""}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-message`}
      >
        <span className="confirmation-icon" aria-hidden="true">!</span>
        <h3 id={`${id}-title`}>{request.title}</h3>
        <p id={`${id}-message`}>{request.message}</p>
        <div className="modal-actions">
          <button ref={cancelButton} type="button" onClick={() => close(false)}>
            {request.cancelLabel}
          </button>
          <button type="button" className="confirmation-submit" onClick={() => close(true)}>
            {request.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );

  return { confirm, dialog };
}
