import React from "react";
import { createRoot } from "react-dom/client";
import App from "./views/App.jsx";
import "./styles.css";
import "./tailwind.css";
import "./views/auth-split.css";
import "./views/modal-system.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
