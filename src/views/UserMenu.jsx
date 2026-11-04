import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n.js";

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="user-menu-avatar-icon">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="user-menu-item-icon">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="user-menu-item-icon">
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
    </svg>
  );
}

export default function UserMenu({ user, onProfileClick, onLogoutClick }) {
  const [language] = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) setIsOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const displayName = user.fullName || user.role || "Account";
  const initials = displayName.trim().slice(0, 2).toUpperCase();

  function handleProfileClick() {
    setIsOpen(false);
    onProfileClick();
  }

  function handleLogoutClick() {
    setIsOpen(false);
    onLogoutClick();
  }

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        className="user-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="user-menu-avatar" aria-hidden="true">
          {initials || <UserIcon />}
        </span>
        <span className="user-menu-name">{displayName}</span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={`user-menu-chevron${isOpen ? " is-open" : ""}`}
        >
          <path d="m5 7.5 5 5 5-5" />
        </svg>
      </button>

      {isOpen && (
        <div className="user-menu-dropdown" role="menu" aria-label={language === "VI" ? "Menu người dùng" : "User menu"}>
          <button
            type="button"
            className="user-menu-item hover:bg-gray-100"
            role="menuitem"
            onClick={handleProfileClick}
          >
            <ProfileIcon />
            <span>{language === "VI" ? "Hồ sơ cá nhân" : "My Profile"}</span>
          </button>
          <div className="user-menu-divider" role="separator" />
          <button
            type="button"
            className="user-menu-item user-menu-item-logout hover:bg-gray-100"
            role="menuitem"
            onClick={handleLogoutClick}
          >
            <LogoutIcon />
            <span>{language === "VI" ? "Đăng xuất" : "Sign out"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
