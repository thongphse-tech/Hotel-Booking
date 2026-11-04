import { useLanguage } from "../i18n.js";

export default function LanguageToggle() {
  const [language, changeLanguage] = useLanguage();

  return (
    <div className="language-toggle" role="group" aria-label="Language">
      {["VI", "EN"].map((item) => (
        <button
          key={item}
          type="button"
          className={language === item ? "active" : ""}
          aria-pressed={language === item}
          onClick={() => changeLanguage(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
